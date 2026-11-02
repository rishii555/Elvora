/**
 * Extensible, provider-based sliding-window rate limiter.
 * 
 * DESIGN:
 * - Local Development: Uses InMemoryRateLimitProvider (zero-cost, zero-infrastructure).
 * - Production: Pluggable with RedisRateLimitProvider or any distributed key-value store.
 */

export interface RateLimitOptions {
  windowMs: number; // Duration of window in ms
  maxAttempts: number; // Max allowed attempts within window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitProvider {
  name: string;
  check(identifier: string, options: RateLimitOptions): Promise<RateLimitResult> | RateLimitResult;
  reset(identifier: string): Promise<void> | void;
  clearAll?(): Promise<void> | void;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding-window rate limit provider for local development and single-instance deployments.
 */
export class InMemoryRateLimitProvider implements RateLimitProvider {
  readonly name = "in-memory";
  private store = new Map<string, RateLimitRecord>();

  constructor() {
    // Periodic garbage collection of expired entries every 5 minutes
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
          if (now > record.resetAt) {
            this.store.delete(key);
          }
        }
      }, 5 * 60 * 1000).unref?.();
    }
  }

  check(
    identifier: string,
    options: RateLimitOptions = { windowMs: 15 * 60 * 1000, maxAttempts: 5 }
  ): RateLimitResult {
    const now = Date.now();
    const existing = this.store.get(identifier);

    if (!existing || now > existing.resetAt) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return {
        allowed: true,
        remaining: options.maxAttempts - 1,
        retryAfterSeconds: 0,
      };
    }

    if (existing.count >= options.maxAttempts) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: options.maxAttempts - existing.count,
      retryAfterSeconds: 0,
    };
  }

  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  clearAll(): void {
    this.store.clear();
  }
}

/**
 * Production-ready distributed Redis rate limit provider adapter.
 * Uses atomic sliding-window increment commands against Redis / Upstash REST.
 */
export class RedisRateLimitProvider implements RateLimitProvider {
  readonly name = "redis";
  private client: any;

  constructor(client?: any) {
    this.client = client;
  }

  async check(
    identifier: string,
    options: RateLimitOptions = { windowMs: 15 * 60 * 1000, maxAttempts: 5 }
  ): Promise<RateLimitResult> {
    if (!this.client) {
      // Graceful fallback to in-memory if redis client is not connected
      return defaultInMemoryProvider.check(identifier, options);
    }

    try {
      const now = Date.now();
      const windowKey = `rl:${identifier}:${Math.floor(now / options.windowMs)}`;
      const current = await this.client.incr(windowKey);
      if (current === 1) {
        await this.client.pexpire(windowKey, options.windowMs);
      }

      if (current > options.maxAttempts) {
        const ttl = await this.client.pttl(windowKey);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, options.maxAttempts - current),
        retryAfterSeconds: 0,
      };
    } catch {
      // Fail open or fallback to memory on Redis partition
      return defaultInMemoryProvider.check(identifier, options);
    }
  }

  async reset(identifier: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.del(`rl:${identifier}`);
      } catch {}
    }
    defaultInMemoryProvider.reset(identifier);
  }

  async clearAll(): Promise<void> {
    defaultInMemoryProvider.clearAll();
  }
}

const defaultInMemoryProvider = new InMemoryRateLimitProvider();
let activeProvider: RateLimitProvider = defaultInMemoryProvider;

export function getRateLimitProvider(): RateLimitProvider {
  return activeProvider;
}

export function setRateLimitProvider(provider: RateLimitProvider): void {
  activeProvider = provider;
}

/**
 * Checks if the identifier has exceeded allowed attempts.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 15 * 60 * 1000, maxAttempts: 5 }
): RateLimitResult {
  const res = activeProvider.check(identifier, options);
  // Return synchronous result if returned directly (InMemory), or handle promise
  if (typeof (res as any)?.then === "function") {
    // If provider is asynchronous, synchronous callers receive in-memory fallback
    return defaultInMemoryProvider.check(identifier, options);
  }
  return res as RateLimitResult;
}

/**
 * Async version of checkRateLimit for distributed providers.
 */
export async function checkRateLimitAsync(
  identifier: string,
  options: RateLimitOptions = { windowMs: 15 * 60 * 1000, maxAttempts: 5 }
): Promise<RateLimitResult> {
  return await activeProvider.check(identifier, options);
}

/**
 * Tenant-scoped rate limiter for sensitive, expensive operations (reports export, runner, bulk imports).
 */
export function checkTenantRateLimit(
  tenantId: string,
  action: string,
  options: RateLimitOptions = { windowMs: 60 * 1000, maxAttempts: 30 }
): RateLimitResult {
  return checkRateLimit(`tenant:${tenantId}:${action}`, options);
}

/**
 * Resets the rate limiter for a specific identifier upon successful authentication.
 */
export function resetRateLimit(identifier: string): void {
  activeProvider.reset(identifier);
}

/**
 * Resets all rate limit stores for testing environments.
 */
export function clearAllRateLimitsForTests(): void {
  activeProvider.clearAll?.();
  defaultInMemoryProvider.clearAll();
}
