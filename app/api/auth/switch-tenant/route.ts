import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { signSessionToken, SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";

const switchTenantSchema = z.object({
  targetTenantId: z.string().min(1, "Target tenant ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const currentContext = await requireTenantContext(req);
    const body = await req.json();
    const { targetTenantId } = switchTenantSchema.parse(body);

    // If already in target tenant
    if (currentContext.tenantId === targetTenantId) {
      return NextResponse.json({
        success: true,
        message: "Already active in requested workspace",
        activeTenantId: targetTenantId,
      });
    }

    // Verify authorized membership in target tenant directly from the database
    const targetMembership = await prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: targetTenantId,
          userId: currentContext.userId,
        },
      },
      include: {
        tenant: true,
        user: true,
      },
    });

    if (!targetMembership || !targetMembership.tenant.isActive || !targetMembership.user.isActive) {
      return NextResponse.json(
        { error: "Access Denied: You are not an active member of this business workspace" },
        { status: 403 }
      );
    }

    // Crucial privilege isolation: derive role strictly from target tenant membership
    const newSessionToken = await signSessionToken({
      userId: targetMembership.userId,
      email: targetMembership.user.email,
      name: targetMembership.user.name,
      activeTenantId: targetMembership.tenantId,
      role: targetMembership.role,
    });

    const response = NextResponse.json({
      success: true,
      message: `Switched workspace to ${targetMembership.tenant.tradeName}`,
      tenant: {
        id: targetMembership.tenant.id,
        tradeName: targetMembership.tenant.tradeName,
        role: targetMembership.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, newSessionToken, getSessionCookieOptions());

    return response;
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
