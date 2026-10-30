import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/passwords";
import { signSessionToken, SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limiter";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce IP-based rate limiting (5 attempts per 15 min)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = checkRateLimit(`login:${ip}`, { windowMs: 15 * 60 * 1000, maxAttempts: 5 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() }
        }
      );
    }

    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // 2. Primary: Look up authenticated user in MongoDB Atlas database
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          memberships: {
            include: {
              tenant: true,
            },
          },
        },
      });
    } catch {
      // In case database connection is unreachable, will fall back below
    }

    if (user && user.isActive) {
      const isValid = await verifyPassword(password, user.passwordHash);
      if (isValid) {
        const activeMembership =
          user.memberships.find((m) => m.isDefault && m.tenant.isActive) ||
          user.memberships.find((m) => m.tenant.isActive);

        if (!activeMembership) {
          return NextResponse.json(
            { error: "No active shop accounts associated with this user" },
            { status: 403 }
          );
        }

        resetRateLimit(`login:${ip}`);

        const token = await signSessionToken({
          userId: user.id,
          email: user.email,
          name: user.name,
          activeTenantId: activeMembership.tenantId,
          role: activeMembership.role,
        });

        const response = NextResponse.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          tenant: {
            id: activeMembership.tenant.id,
            tradeName: activeMembership.tenant.tradeName,
            role: activeMembership.role,
          },
        });

        response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

        return response;
      }
    }

    // 3. Fallback: Instant test admin evaluation mode (STRICT GUARD: Prohibited in production)
    if (
      process.env.NODE_ENV !== "production" &&
      email.toLowerCase() === "admin@elvora.com" &&
      password === "admin123"
    ) {
      resetRateLimit(`login:${ip}`);
      const token = await signSessionToken({
        userId: "demo-admin-id",
        email: "admin@elvora.com",
        name: "Elvora Admin (Test)",
        activeTenantId: "demo-tenant-id",
        role: "OWNER",
      });

      const response = NextResponse.json({
        success: true,
        message: "Login successful (Demo Mode)",
        user: {
          id: "demo-admin-id",
          name: "Elvora Admin (Test)",
          email: "admin@elvora.com",
        },
        tenant: {
          id: "demo-tenant-id",
          tradeName: "Universal Enterprises (Demo)",
          role: "OWNER",
        },
      });

      response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

      return response;
    }

    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
