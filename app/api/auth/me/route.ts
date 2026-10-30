import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";

export async function GET(req: NextRequest) {
  const start = performance.now();
  try {
    const authStart = performance.now();
    const context = await requireTenantContext(req);
    const authDuration = performance.now() - authStart;

    const totalDuration = performance.now() - start;

    const response = NextResponse.json({
      user: {
        id: context.userId,
        name: context.userName,
        email: context.userEmail,
      },
      tenant: {
        id: context.tenantId,
        name: context.tenantName,
        role: context.role,
      },
      approvalStatus: "APPROVED",
    });

    response.headers.set(
      "Server-Timing",
      `auth;dur=${authDuration.toFixed(1)}, total;dur=${totalDuration.toFixed(1)}`
    );

    return response;
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
