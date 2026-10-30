import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";
import { clearTenantContextCache } from "@/lib/tenant/context";

export async function POST() {
  const start = performance.now();
  clearTenantContextCache();
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
  response.headers.set("Server-Timing", `total;dur=${(performance.now() - start).toFixed(1)}`);
  return response;
}
