import { PrismaClient } from "@prisma/client";
import { registerPrismaClient } from "@/lib/auth/session";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Security warning when local development connects to MongoDB Atlas
if (
  process.env.NODE_ENV !== "production" &&
  !globalForPrisma.prisma &&
  typeof process.env.DATABASE_URL === "string" &&
  (process.env.DATABASE_URL.includes("mongodb+srv") || process.env.DATABASE_URL.includes("mongodb.net"))
) {
  console.warn(
    "\n\x1b[33m%s\x1b[0m",
    "==================================================================\n" +
    "[ELVORA SECURITY WARNING] Local development is connected to MongoDB Atlas (Production Cluster).\n" +
    "[ELVORA SECURITY WARNING] Database Target: MongoDB Atlas (elvora)\n" +
    "[ELVORA SECURITY WARNING] STRICT ISOLATION ENFORCED: Local operations must use dedicated sandbox tenants only.\n" +
    "=================================================================="
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query", "error", "warn"] : ["error", "warn"],
  });

(globalThis as any).__elvora_prisma = prisma;
try {
  registerPrismaClient(() => prisma);
} catch {}

/**
 * Error thrown when a multi-document operation requiring ACID transaction guarantees
 * is executed against a MongoDB instance that does not support transactions (e.g. Standalone mongod).
 * Fails closed to prevent partial writes, orphaned ledger entries, or stock divergence.
 */
export class DatabaseTransactionUnavailableError extends Error {
  readonly code = "TRANSACTION_UNAVAILABLE";

  constructor(originalMessage?: string) {
    super(
      `ACID transaction failed: Multi-document operations require a MongoDB replica set or mongos cluster. ` +
      `The database server reported: "${originalMessage || "Transaction numbers are only allowed on a replica set member"}". ` +
      `To ensure financial and inventory data integrity, this operation has failed closed without executing partial writes. ` +
      `Ensure MongoDB is running as a replica set (e.g., 'mongod --replSet rs0' and 'rs.initiate()').`
    );
    this.name = "DatabaseTransactionUnavailableError";
  }
}

/**
 * Executes a callback within a transaction if the provided client supports it.
 * If the client is already an active interactive transaction (which does not have $transaction),
 * it safely executes the callback directly with the active transaction client.
 *
 * CRITICAL SAFETY REQUIREMENT:
 * If the client provides $transaction but the underlying database rejects transactions
 * (e.g., Standalone MongoDB without a replica set), this function FAILS CLOSED by throwing
 * DatabaseTransactionUnavailableError. It MUST NEVER silently fall back to non-transactional
 * execution for financial, ledger, invoice, payment, or stock operations.
 */
export async function runInTransaction<T>(
  client: any,
  fn: (tx: any) => Promise<T>,
  options: { maxWait?: number; timeout?: number } = { maxWait: 10000, timeout: 20000 }
): Promise<T> {
  if (typeof client?.$transaction === "function") {
    try {
      return await client.$transaction(fn, options);
    } catch (err: any) {
      if (
        typeof err?.message === "string" &&
        err.message.includes("Transaction numbers are only allowed on a replica set member")
      ) {
        // FAIL CLOSED: Never silently execute non-transactionally when the environment lacks replica set support.
        throw new DatabaseTransactionUnavailableError(err.message);
      }
      throw err;
    }
  }
  // When client has no $transaction method, it is already an active interactive transaction client (tx)
  return await fn(client);
}

export interface TransactionRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  idempotencyKey?: string;
}

/**
 * Identifies confirmed transient errors where re-running the entire transaction callback is safe.
 * Includes MongoDB error 112 (WriteConflict), error 251 (NoSuchTransaction), Prisma P2034,
 * and the driver TransientTransactionError label.
 */
export function isTransientTransactionError(error: any): boolean {
  if (!error) return false;

  // Prisma WriteConflict code
  if (error?.code === "P2034") return true;

  // MongoDB native error codes
  if (error?.code === 112 || error?.code === 251) return true;

  // Driver error labels
  if (typeof error?.hasErrorLabel === "function") {
    if (error.hasErrorLabel("TransientTransactionError")) return true;
  }

  // Error message inspection
  if (typeof error?.message === "string") {
    if (
      error.message.includes("WriteConflict") ||
      error.message.includes("TransientTransactionError") ||
      error.message.includes("could not serialize access")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Identifies ambiguous commit outcomes where the commit status cannot be confirmed.
 * Re-running transactions on ambiguous commit can create duplicate financial/inventory records
 * unless protected by an explicit idempotency key.
 */
export function isAmbiguousCommitError(error: any): boolean {
  if (!error) return false;

  if (typeof error?.hasErrorLabel === "function") {
    if (error.hasErrorLabel("UnknownTransactionCommitResult")) return true;
  }

  if (typeof error?.message === "string") {
    if (error.message.includes("UnknownTransactionCommitResult")) return true;
  }

  return false;
}

export class AmbiguousTransactionCommitError extends Error {
  readonly code = "AMBIGUOUS_TRANSACTION_COMMIT";
  constructor(message: string) {
    super(
      `Transaction commit result is ambiguous (network timeout or failover during commit). ` +
      `The mutation may have completed on the database server. To prevent duplicate invoices, payments, ` +
      `or stock entries, this transaction was not automatically retried without a verified idempotency key. Details: ${message}`
    );
    this.name = "AmbiguousTransactionCommitError";
  }
}

/**
 * Executes a transaction with bounded exponential backoff and randomized full jitter for transient conflicts.
 *
 * Safety Rules:
 * 1. Retries confirmed transient failures only (WriteConflict, NoSuchTransaction, TransientTransactionError).
 * 2. Rejects blind retry on UnknownTransactionCommitResult unless a non-empty idempotencyKey is provided.
 * 3. Never introduces nested retry loops: if client is already an active tx client, passes through directly.
 * 4. Preserves fail-closed behavior for Standalone MongoDB (DatabaseTransactionUnavailableError).
 * 5. Callbacks must be side-effect free (no emails, SMS, external HTTP requests).
 */
export async function runTransactionWithRetry<T>(
  client: any,
  fn: (tx: any) => Promise<T>,
  options: TransactionRetryOptions = {}
): Promise<T> {
  // If client is already inside an active interactive transaction (no $transaction method),
  // pass through directly without a nested retry loop.
  if (typeof client?.$transaction !== "function") {
    return await fn(client);
  }

  const {
    maxRetries = 3,
    baseDelayMs = 50,
    maxDelayMs = 500,
    idempotencyKey,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await runInTransaction(client, fn);
    } catch (err: any) {
      attempt++;

      // Standalone MongoDB or permanent fail-closed errors must rethrow immediately
      if (err instanceof DatabaseTransactionUnavailableError) {
        throw err;
      }

      // Check ambiguous commit error
      if (isAmbiguousCommitError(err)) {
        if (!idempotencyKey || idempotencyKey.trim() === "") {
          throw new AmbiguousTransactionCommitError(err.message);
        }
        // If an idempotencyKey is present, retry is safe because unique constraints protect against duplicates
      } else if (!isTransientTransactionError(err)) {
        // Business logic, schema, or validation error - do not retry
        throw err;
      }

      if (attempt > maxRetries) {
        throw err;
      }

      // Exponential backoff with full jitter
      const cap = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const jitteredDelay = Math.floor(Math.random() * cap);
      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }
}

/**
 * Safely executes idempotent onboarding or setup operations where each step
 * is self-contained and independently safe without requiring multi-document ACID transactions.
 * STRICTLY restricted to non-financial, non-ledger, non-invoice operations.
 */
export async function runSafeOnboardingOperation<T>(
  client: any,
  fn: (tx: any) => Promise<T>
): Promise<T> {
  if (typeof client?.$transaction === "function") {
    try {
      return await client.$transaction(fn);
    } catch (err: any) {
      if (
        typeof err?.message === "string" &&
        err.message.includes("Transaction numbers are only allowed on a replica set member")
      ) {
        // Allowed ONLY for idempotent onboarding setup
        return await fn(client);
      }
      throw err;
    }
  }
  return await fn(client);
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
