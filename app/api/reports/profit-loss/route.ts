import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getProfitLossReport, generateCSV, ReportPeriod } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as ReportPeriod) || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const format = searchParams.get("format") || "json";

    const report = await getProfitLossReport(context.tenantId, {
      period,
      startDate,
      endDate,
    });

    if (format === "csv") {
      const headers = ["P&L Metric / Line Item", "Amount (₹)", "Notes / Accounting Basis"];
      const s = report.statement;
      const rows = [
        ["Gross Sales Turnover (Taxable)", s.grossSalesTurnover.toFixed(2), "Turnover from finalized sales invoices"],
        ["Less: Sales Returns", (-s.lessSalesReturns).toFixed(2), "Taxable amount of customer returns"],
        ["Net Sales Turnover", s.netSalesTurnover.toFixed(2), "Net operating revenue (Turnover)"],
        ["Less: Cost of Goods Sold (COGS)", (-s.costOfGoodsSold.netCostOfGoodsSold).toFixed(2), "Purchase cost of variants sold (less returns)"],
        ["Gross Trading Profit", s.grossProfit.toFixed(2), `Gross Margin: ${s.grossMarginPercent}%`],
        ["Less: Operating Overheads", (-s.operatingExpenses.total).toFixed(2), "Shop rent, freight, wages, utilities, tea"],
        ["Estimated Net Profit", s.estimatedNetProfit.toFixed(2), `Net Margin: ${s.netProfitMarginPercent}%`],
        ["Excluded: Output GST Liabilities", s.outputTaxCollectedExcludedFromProfit.toFixed(2), "Collected for Govt, strictly excluded from profit"],
      ];

      const csv = generateCSV(headers, rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="profit-loss-statement-${Date.now()}.csv"`,
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
    const message = error instanceof Error ? error.message : "Failed to generate P&L report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
