/**
 * Lightweight, production-ready sliding-window rate limiter.
 * Designed to prevent brute-force attacks and credential stuffing on sensitive authentication endpoints.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic garbage collection of expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  windowMs: number; // Duration of window in ms
  maxAttempts: number; // Max allowed attempts within window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks if the identifier (e.g. IP + endpoint or email) has exceeded allowed attempts.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 15 * 60 * 1000, maxAttempts: 5 }
): RateLimitResult {
  const now = Date.now();
  const existing = rateLimitStore.get(identifier);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(identifier, {
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

/**
 * Resets the rate limiter for a specific identifier upon successful authentication.
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
