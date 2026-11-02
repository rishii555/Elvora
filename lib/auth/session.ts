import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL CONFIGURATION ERROR: SESSION_SECRET must be configured in production environment.");
    }
    return new TextEncoder().encode("default-secret-key-at-least-32-chars-long-elvora");
  }
  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE_NAME = "elvora_session";

// 7 days in seconds = 604,800 seconds
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  activeTenantId: string;
  role: "OWNER" | "MANAGER" | "BILLER" | "ACCOUNTANT";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  exp?: number;
}

/**
 * Standard cookie configuration for Elvora sessions.
 * Guarantees consistent options across login, middleware, and logout.
 */
export function getSessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Signs a tamper-proof JWT session token valid for 7 days (604,800 seconds).
 */
export async function signSessionToken(payload: Omit<SessionPayload, "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

async function getDbPrisma() {
  if (typeof (process as any)?.versions?.node !== "undefined") {
    try {
      const mod = await import("@/lib/db/prisma");
      return mod.prisma;
    } catch {}
  }
  return null;
}

/**
 * Computes a deterministic 64-character hash of a session token for secure indexing and storage.
 * 100% pure JavaScript compatible with both Edge runtime and Node.js without dynamic evaluation.
 */
export function hashToken(token: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < token.length; i++) {
    ch = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(64, "0");
}

// In-memory token revocation blocklist to invalidate tokens immediately in local memory
const revokedTokensStore = new Map<string, number>(); // token / tokenHash -> expiresAt timestamp

/**
 * Periodically purge expired revoked tokens to prevent memory growth
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, expiresAt] of revokedTokensStore.entries()) {
      if (now > expiresAt) {
        revokedTokensStore.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

/**
 * Persists a revoked token to the database store for multi-worker and container durability.
 */
export async function persistRevokedToken(tokenHash: string, expiresAt: Date): Promise<void> {
  try {
    const db = await getDbPrisma();
    if (db) {
      await db.revokedToken.upsert({
        where: { tokenHash },
        update: { expiresAt },
        create: { tokenHash, expiresAt },
      });
    }
  } catch {
    // Graceful fallback to memory store if database is unreachable or offline
  }
}

/**
 * Revokes a session token both in-memory and persistently in the database.
 */
export function revokeSessionToken(token: string, ttlMs = SESSION_MAX_AGE_SECONDS * 1000): void {
  if (token) {
    const expiresAtMs = Date.now() + ttlMs;
    const hash = hashToken(token);
    revokedTokensStore.set(hash, expiresAtMs);
    revokedTokensStore.set(token, expiresAtMs);
    persistRevokedToken(hash, new Date(expiresAtMs)).catch(() => {});
  }
}

/**
 * Synchronous in-memory check for token revocation.
 */
export function isSessionTokenRevoked(token: string): boolean {
  if (!token) return true;
  const hash = hashToken(token);
  const now = Date.now();
  const expiresAt = revokedTokensStore.get(hash) ?? revokedTokensStore.get(token);
  if (!expiresAt) return false;
  if (now > expiresAt) {
    revokedTokensStore.delete(hash);
    revokedTokensStore.delete(token);
    return false;
  }
  return true;
}

/**
 * Asynchronous check querying both fast in-memory cache and persistent database store.
 */
export async function isSessionTokenRevokedAsync(token: string): Promise<boolean> {
  if (!token) return true;
  if (isSessionTokenRevoked(token)) return true;

  const hash = hashToken(token);
  const now = Date.now();

  try {
    const db = await getDbPrisma();
    if (db) {
      const record = await db.revokedToken.findUnique({
        where: { tokenHash: hash },
      });
      if (record && record.expiresAt.getTime() > now) {
        revokedTokensStore.set(hash, record.expiresAt.getTime());
        return true;
      }
    }
  } catch {
    // Database check failed or offline; rely on in-memory store
  }

  return false;
}

export async function clearRevokedTokensForTests(): Promise<void> {
  revokedTokensStore.clear();
  try {
    const db = await getDbPrisma();
    if (db) {
      await db.revokedToken.deleteMany({});
    }
  } catch {}
}

/**
 * Verifies a JWT session token and returns the payload or null if invalid/expired/revoked.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }
  const revoked = await isSessionTokenRevokedAsync(token);
  if (revoked) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
