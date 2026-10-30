import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { createVerificationToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email/service";

const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email required"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = checkRateLimit(`forgot-pw:${ip}`, { windowMs: 15 * 60 * 1000, maxAttempts: 5 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many password reset requests. Please retry in ${rateLimit.retryAfterSeconds} seconds.` },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() }
        }
      );
    }

    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Look up user; if not found or inactive, return same success message to avoid account enumeration
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user && user.isActive) {
      const { rawToken } = createVerificationToken(user.email, "PASSWORD_RESET", 60 * 60 * 1000);
      await sendPasswordResetEmail(user.email, rawToken);
    }

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, password reset instructions have been sent.",
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
