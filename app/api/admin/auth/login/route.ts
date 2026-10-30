import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { signPlatformAdminToken, ADMIN_COOKIE_NAME } from "@/lib/admin/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limiter";

const AdminLoginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password required"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce strict rate limiting on platform administration portal (5 attempts per 15 min)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = checkRateLimit(`admin-login:${ip}`, { windowMs: 15 * 60 * 1000, maxAttempts: 5 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Too many failed admin login attempts. Please retry in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() } }
      );
    }

    const json = await req.json();
    const { email, password } = AdminLoginSchema.parse(json);

    let admin = await prisma.platformAdminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Seed default master platform admin only in development / testing environments
    if (
      !admin &&
      process.env.NODE_ENV !== "production" &&
      email.toLowerCase() === "admin@elvora.com" &&
      password === "ElvoraAdmin2026!"
    ) {
      const passwordHash = await hashPassword("ElvoraAdmin2026!");
      admin = await prisma.platformAdminUser.create({
        data: {
          email: "admin@elvora.com",
          name: "Elvora Master Platform Admin",
          passwordHash,
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });
    }

    if (!admin) {
      return NextResponse.json({ success: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    if (!admin.isActive) {
      return NextResponse.json({ success: false, error: "Admin account has been deactivated" }, { status: 403 });
    }

    const isMatch = await verifyPassword(password, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    resetRateLimit(`admin-login:${ip}`);

    const token = await signPlatformAdminToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Platform administrator authenticated successfully",
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Platform admin login failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
