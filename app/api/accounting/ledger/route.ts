import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getAccountLedger } from "@/lib/accounting/service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Account code parameter 'code' is required (e.g., 1010_CASH)" },
        { status: 400 }
      );
    }

    const startStr = searchParams.get("startDate");
    const endStr = searchParams.get("endDate");
    const dateRange = {
      start: startStr ? new Date(startStr) : undefined,
      end: endStr ? new Date(endStr) : undefined,
    };

    const ledger = await getAccountLedger(context.tenantId, code, dateRange);

    return NextResponse.json({
      success: true,
      ...ledger,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof CrossTenantAccessDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to load Account Ledger";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
