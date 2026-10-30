import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { verifyAndConsumeToken } from "@/lib/auth/tokens";

const resetPasswordSchema = z.object({
  token: z.string().min(16, "Invalid reset token format"),
  password: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = checkRateLimit(`reset-pw:${ip}`, { windowMs: 15 * 60 * 1000, maxAttempts: 5 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many password reset attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() }
        }
      );
    }

    const body = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const verification = verifyAndConsumeToken(token, "PASSWORD_RESET");
    if (!verification.valid || !verification.email) {
      return NextResponse.json({ error: verification.error || "Invalid or expired token" }, { status: 400 });
    }

    const newHash = await hashPassword(password);

    await prisma.user.update({
      where: { email: verification.email },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You may now sign in.",
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
