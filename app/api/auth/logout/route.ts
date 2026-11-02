import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSessionCookieOptions, revokeSessionToken } from "@/lib/auth/session";
import { clearTenantContextCache } from "@/lib/tenant/context";

export async function POST(req: NextRequest) {
  const start = performance.now();
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    revokeSessionToken(token);
  }
  clearTenantContextCache();
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
  response.headers.set("Server-Timing", `total;dur=${(performance.now() - start).toFixed(1)}`);
  return response;
}
