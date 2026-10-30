import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    return NextResponse.json({
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
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
