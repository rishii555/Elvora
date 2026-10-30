import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

function getAdminSessionSecret(): Uint8Array {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_JWT_SECRET ||
    process.env.SESSION_SECRET;
  if (!secret) {
    return new TextEncoder().encode("default-secret-key-at-least-32-chars-long-platform-admin");
  }
  return new TextEncoder().encode(secret);
}

export const ADMIN_COOKIE_NAME = "elvora_platform_admin_session";

export interface PlatformAdminPayload {
  adminId: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "SUPPORT_AGENT";
  isPlatformAdmin: true;
}

export class PlatformAdminAuthError extends Error {
  constructor(message = "Unauthorized: Platform administrator access required") {
    super(message);
    this.name = "PlatformAdminAuthError";
  }
}

export async function signPlatformAdminToken(payload: Omit<PlatformAdminPayload, "isPlatformAdmin">): Promise<string> {
  return new SignJWT({ ...payload, isPlatformAdmin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getAdminSessionSecret());
}

export async function verifyPlatformAdminToken(token: string): Promise<PlatformAdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAdminSessionSecret());
    if (!payload.isPlatformAdmin) return null;
    return payload as unknown as PlatformAdminPayload;
  } catch {
    return null;
  }
}

export async function requirePlatformAdminContext(req: NextRequest): Promise<PlatformAdminPayload> {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) {
    throw new PlatformAdminAuthError("Authentication required: No platform administrator session found");
  }

  const payload = await verifyPlatformAdminToken(cookie);
  if (!payload || !payload.adminId) {
    throw new PlatformAdminAuthError("Invalid or expired platform administrator session");
  }

  return payload;
}
