import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/auth/rate-limiter";

const statusCheckSchema = z.object({
  email: z.string().email(),
});

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = checkRateLimit(`status-check:${ip}`, { windowMs: 60 * 1000, maxAttempts: 20 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many status checks. Please wait a moment." }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");
    if (!emailParam) {
      return NextResponse.json({ error: "Email query parameter required" }, { status: 400 });
    }

    const { email } = statusCheckSchema.parse({ email: emailParam.toLowerCase().trim() });

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: {
              select: {
                id: true,
                tradeName: true,
                approvalStatus: true,
                rejectionReason: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "No registration found with this email" }, { status: 404 });
    }

    const primaryMembership = user.memberships[0];
    const tenantStatus = primaryMembership?.tenant?.approvalStatus || "PENDING";
    const userStatus = user.approvalStatus || "PENDING";

    // Effective status: if either is REJECTED or SUSPENDED, that takes precedence
    let effectiveStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" = "PENDING";
    if (tenantStatus === "REJECTED" || userStatus === "REJECTED") {
      effectiveStatus = "REJECTED";
    } else if (tenantStatus === "SUSPENDED" || userStatus === "SUSPENDED") {
      effectiveStatus = "SUSPENDED";
    } else if (tenantStatus === "APPROVED" && userStatus === "APPROVED") {
      effectiveStatus = "APPROVED";
    }

    return NextResponse.json({
      success: true,
      email: user.email,
      name: user.name,
      businessName: primaryMembership?.tenant?.tradeName || "Your Business",
      status: effectiveStatus,
      rejectionReason: primaryMembership?.tenant?.rejectionReason || user.rejectionReason || null,
      registeredAt: user.createdAt,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
