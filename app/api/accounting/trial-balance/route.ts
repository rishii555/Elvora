import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getTrialBalance } from "@/lib/accounting/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const asOfStr = searchParams.get("asOfDate");
    const asOfDate = asOfStr ? new Date(asOfStr) : new Date();

    const report = await getTrialBalance(context.tenantId, asOfDate);

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to load Trial Balance";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
