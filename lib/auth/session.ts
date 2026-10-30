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
