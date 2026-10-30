import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getTaxSummaryReport, generateCSV, ReportPeriod } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as ReportPeriod) || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const format = searchParams.get("format") || "json";

    const report = await getTaxSummaryReport(context.tenantId, {
      period,
      startDate,
      endDate,
    });

    if (format === "csv") {
      const headers = ["GST Classification", "Taxable Turnover (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Total Tax (₹)"];
      const b2b = report.outwardSuppliesGSTR1.b2b;
      const b2c = report.outwardSuppliesGSTR1.b2c;
      const itc = report.inwardSuppliesITC.eligibleITC;

      const rows = [
        ["Outward: B2B Registered Sales (GSTR-1)", b2b.taxable.toFixed(2), b2b.cgst.toFixed(2), b2b.sgst.toFixed(2), b2b.igst.toFixed(2), b2b.totalTax.toFixed(2)],
        ["Outward: B2C Retail Bills (GSTR-1)", b2c.taxable.toFixed(2), b2c.cgst.toFixed(2), b2c.sgst.toFixed(2), b2c.igst.toFixed(2), b2c.totalTax.toFixed(2)],
        ["Inward: Eligible Input Tax Credit (ITC Asset)", report.inwardSuppliesITC.purchaseTaxableAmount.toFixed(2), itc.cgst.toFixed(2), itc.sgst.toFixed(2), itc.igst.toFixed(2), itc.total.toFixed(2)],
        ["Net Cash Tax Payable (GSTR-3B Challan)", "-", "-", "-", "-", report.gstr3bSummary.netCashTaxPayable.toFixed(2)],
      ];

      const csv = generateCSV(headers, rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="gst-tax-summary-${Date.now()}.csv"`,
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
    const message = error instanceof Error ? error.message : "Failed to generate tax summary report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
