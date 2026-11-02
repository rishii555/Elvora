import { prisma } from "./prisma";

export interface IdempotencyResult<T> {
  cached: boolean;
  data: T;
}

export class ConcurrentMutationConflictError extends Error {
  readonly code = "CONCURRENT_MUTATION_IN_PROGRESS";
  constructor(message = "A mutation with this idempotency key is currently being processed. Please wait.") {
    super(message);
    this.name = "ConcurrentMutationConflictError";
  }
}

// In-memory fallback map for offline unit tests or environments without active DB
const inMemoryIdempotency = new Map<string, { status: string; responseJson?: string; expiresAt: number }>();

/**
 * Executes a state-changing financial, billing, or inventory mutation guarded by an idempotency key.
 * Guarantees that network retries or double-clicks do not create duplicate invoices, payments, or movements.
 */
export async function withIdempotency<T>(
  tenantId: string,
  key: string,
  action: string,
  fn: () => Promise<T>,
  ttlSeconds = 24 * 60 * 60, // 24 hours
  client: any = prisma
): Promise<IdempotencyResult<T>> {
  if (!key) {
    // No key provided; execute normally
    const result = await fn();
    return { cached: false, data: result };
  }

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const cacheKey = `${tenantId}:${key}`;

  // 0. Synchronous memory lock to prevent event-loop race conditions between parallel async calls
  const inMem = inMemoryIdempotency.get(cacheKey);
  if (inMem) {
    if (inMem.status === "COMPLETED" && inMem.responseJson) {
      return {
        cached: true,
        data: JSON.parse(inMem.responseJson) as T,
      };
    }
    if (inMem.status === "PENDING" && Date.now() < inMem.expiresAt) {
      throw new ConcurrentMutationConflictError();
    }
  }
  inMemoryIdempotency.set(cacheKey, {
    status: "PENDING",
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  // 1. Try DB-backed check first
  try {
    const existing = await client.idempotencyRecord.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
    });

    if (existing) {
      if (existing.status === "COMPLETED" && existing.responseJson) {
        inMemoryIdempotency.set(cacheKey, {
          status: "COMPLETED",
          responseJson: existing.responseJson,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return {
          cached: true,
          data: JSON.parse(existing.responseJson) as T,
        };
      }
      if (existing.status === "PENDING") {
        throw new ConcurrentMutationConflictError();
      }
    }

    // Insert PENDING record
    await client.idempotencyRecord.upsert({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
      update: {
        status: "PENDING",
        expiresAt,
      },
      create: {
        tenantId,
        key,
        action,
        status: "PENDING",
        expiresAt,
      },
    });
  } catch (err: any) {
    if (err instanceof ConcurrentMutationConflictError) {
      throw err;
    }
    // DB offline or mock test; in-memory lock already set
  }

  // 2. Execute mutation
  try {
    const result = await fn();
    const serialized = JSON.stringify(result);

    // Save COMPLETED state
    try {
      await client.idempotencyRecord.update({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
        data: {
          status: "COMPLETED",
          responseJson: serialized,
        },
      });
    } catch {}

    inMemoryIdempotency.set(cacheKey, {
      status: "COMPLETED",
      responseJson: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return { cached: false, data: result };
  } catch (mutationErr: any) {
    // Record failure or remove pending lock
    try {
      await client.idempotencyRecord.update({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
        data: {
          status: "FAILED",
        },
      });
    } catch {}

    inMemoryIdempotency.delete(cacheKey);
    throw mutationErr;
  }
}

export async function clearIdempotencyForTests(): Promise<void> {
  inMemoryIdempotency.clear();
  try {
    await prisma.idempotencyRecord.deleteMany({});
  } catch (err: any) {
    if (process.env.NODE_ENV === "test") {
      console.warn("[clearIdempotencyForTests] Database cleanup notice:", err?.message || err);
    }
  }
}
