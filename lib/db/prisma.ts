import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query", "error", "warn"] : ["error", "warn"],
  });

/**
 * Executes a callback within a transaction if the provided client supports it.
 * If the client is already an active interactive transaction (which does not have $transaction),
 * it safely executes the callback directly with the active transaction client.
 */
export async function runInTransaction<T>(
  client: any,
  fn: (tx: any) => Promise<T>
): Promise<T> {
  if (typeof client?.$transaction === "function") {
    return await client.$transaction(fn);
  }
  return await fn(client);
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
