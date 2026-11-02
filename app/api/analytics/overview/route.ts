import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getExecutiveOverview, AnalyticsPeriod } from "@/lib/analytics/service";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "monthly") as AnalyticsPeriod;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;

    const overview = await getExecutiveOverview(context.tenantId, {
      period,
      startDate,
      endDate,
      categoryId,
    });

    return NextResponse.json({
      success: true,
      ...overview,
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
    const message = error instanceof Error ? error.message : "Failed to load executive overview";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
