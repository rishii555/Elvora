import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getPurchaseAnalytics, AnalyticsPeriod } from "@/lib/analytics/service";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_PURCHASE_COSTS");

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "monthly") as AnalyticsPeriod;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;

    const data = await getPurchaseAnalytics(context.tenantId, {
      period,
      startDate,
      endDate,
      supplierId,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Failed to load purchase analytics";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
