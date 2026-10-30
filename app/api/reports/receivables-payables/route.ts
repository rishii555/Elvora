import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getReceivablesPayablesReport, generateCSV } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const format = searchParams.get("format") || "json";

    const report = await getReceivablesPayablesReport(context.tenantId);

    if (format === "csv") {
      let headers: string[];
      let rows: (string | number)[][];

      if (type === "receivables") {
        headers = ["Customer Name", "Phone", "GSTIN", "Credit Limit (₹)", "Outstanding Balance (₹)"];
        rows = report.customerReceivables.map((c: any) => [
          c.name,
          c.phone,
          c.gstin,
          c.creditLimit.toFixed(2),
          c.outstandingBalance.toFixed(2),
        ]);
      } else if (type === "payables") {
        headers = ["Supplier Name", "Company", "Phone", "GSTIN", "Outstanding Payable (₹)"];
        rows = report.supplierPayables.map((s: any) => [
          s.name,
          s.companyName,
          s.phone,
          s.gstin,
          s.outstandingBalance.toFixed(2),
        ]);
      } else {
        headers = ["Party Type", "Party Name", "Phone / Contact", "GSTIN", "Outstanding Balance (₹)"];
        const custRows = report.customerReceivables.map((c: any) => ["Customer (Debtor)", c.name, c.phone, c.gstin, c.outstandingBalance.toFixed(2)]);
        const suppRows = report.supplierPayables.map((s: any) => ["Supplier (Creditor)", s.name, s.phone, s.gstin, s.outstandingBalance.toFixed(2)]);
        rows = [...custRows, ...suppRows];
      }

      const csv = generateCSV(headers, rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="receivables-payables-${Date.now()}.csv"`,
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
    const message = error instanceof Error ? error.message : "Failed to generate receivables/payables report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
