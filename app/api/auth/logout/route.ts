import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
  return response;
}
