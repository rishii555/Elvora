import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getTenantSubscription, ensureDefaultPlans } from "@/lib/billing/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    await ensureDefaultPlans();

    const subscriptionData = await getTenantSubscription(context.tenantId);

    return NextResponse.json({
      success: true,
      ...subscriptionData,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load subscription details";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "EDIT_SHOP_PROFILE");

    return NextResponse.json({
      success: true,
      message: "Paid subscription checkout is disabled. Elvora operates on an administrator-approved model with free access for approved businesses.",
      status: "APPROVED",
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
