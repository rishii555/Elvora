import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

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

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  activeTenantId: string;
  role: "OWNER" | "MANAGER" | "BILLER" | "ACCOUNTANT";
  exp?: number;
}

/**
 * Hashes a plaintext password using bcrypt with salt rounds = 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares a plaintext password with a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Signs a tamper-proof JWT session token valid for 7 days.
 */
export async function signSessionToken(payload: Omit<SessionPayload, "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

/**
 * Verifies a JWT session token and returns the payload or null if invalid/expired.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
