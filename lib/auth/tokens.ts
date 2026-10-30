import crypto from "crypto";

export interface StoredToken {
  tokenHash: string;
  email: string;
  type: "PASSWORD_RESET" | "EMAIL_VERIFICATION";
  expiresAt: number; // Unix timestamp ms
  createdAt: number;
}

// In-memory token storage (persists per server lifecycle or fallback when DB token table not yet migrated)
const tokenStore = new Map<string, StoredToken>();

/**
 * Hashes a plaintext token with SHA-256 for secure storage.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a cryptographically strong random token and stores its SHA-256 hash.
 */
export function createVerificationToken(
  email: string,
  type: "PASSWORD_RESET" | "EMAIL_VERIFICATION",
  ttlMs = 60 * 60 * 1000 // 1 hour default
): { rawToken: string; expiresAt: Date } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAtMs = now + ttlMs;

  tokenStore.set(tokenHash, {
    tokenHash,
    email: email.toLowerCase(),
    type,
    expiresAt: expiresAtMs,
    createdAt: now,
  });

  return {
    rawToken,
    expiresAt: new Date(expiresAtMs),
  };
}

/**
 * Verifies a token's validity, expiration, and consumes it (one-time use).
 */
export function verifyAndConsumeToken(
  rawToken: string,
  type: "PASSWORD_RESET" | "EMAIL_VERIFICATION"
): { valid: boolean; email?: string; error?: string } {
  if (!rawToken || rawToken.length < 16) {
    return { valid: false, error: "Invalid token format" };
  }

  const tokenHash = hashToken(rawToken);
  const record = tokenStore.get(tokenHash);

  if (!record) {
    return { valid: false, error: "Token not found or already consumed" };
  }

  if (record.type !== type) {
    return { valid: false, error: "Invalid token type" };
  }

  if (Date.now() > record.expiresAt) {
    tokenStore.delete(tokenHash);
    return { valid: false, error: "Token has expired. Please request a new link." };
  }

  // Consume token immediately to prevent replay attacks
  tokenStore.delete(tokenHash);
  return { valid: true, email: record.email };
}
