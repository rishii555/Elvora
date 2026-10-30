import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getPurchaseReport, generateCSV, ReportPeriod } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as ReportPeriod) || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const format = searchParams.get("format") || "json";

    const report = await getPurchaseReport(context.tenantId, {
      period,
      startDate,
      endDate,
      supplierId,
    });

    if (format === "csv") {
      const headers = [
        "Supplier Name",
        "Company",
        "Phone",
        "GSTIN",
        "Bills Count",
        "Total Spend (₹)",
        "Disbursed / Paid (₹)",
        "Period Unpaid Dues (₹)",
        "Total Ledger Payable (₹)",
      ];

      const rows = report.supplierBreakdown.map((s: any) => [
        s.name,
        s.companyName,
        s.phone,
        s.gstin,
        s.billsCount,
        s.totalSpendInPeriod.toFixed(2),
        s.paidInPeriod.toFixed(2),
        s.balanceOnBillsInPeriod.toFixed(2),
        s.totalOutstandingPayable.toFixed(2),
      ]);

      const csv = generateCSV(headers, rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="purchases-report-${Date.now()}.csv"`,
        },
      });
    }

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
    const message = error instanceof Error ? error.message : "Failed to generate purchases report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
