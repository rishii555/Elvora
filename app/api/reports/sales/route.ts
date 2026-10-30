import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getSalesReport, generateCSV, ReportPeriod, SalesBreakdown } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as ReportPeriod) || undefined;
    const breakdown = (searchParams.get("breakdown") as SalesBreakdown) || "summary";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const format = searchParams.get("format") || "json";

    const report = await getSalesReport(context.tenantId, {
      period,
      breakdown,
      startDate,
      endDate,
      customerId,
    });

    if (format === "csv") {
      let headers: string[] = [];
      let rows: (string | number)[][] = [];

      if (breakdown === "product") {
        headers = ["SKU", "Product Name", "Variant", "Brand", "Category", "Units Sold", "Taxable Turnover (₹)", "Total Sales (₹)"];
        rows = report.items.map((it: any) => [
          it.sku,
          it.productName,
          it.variantName,
          it.brandName,
          it.categoryName,
          it.unitsSold,
          it.taxableAmount.toFixed(2),
          it.totalAmount.toFixed(2),
        ]);
      } else if (breakdown === "brand") {
        headers = ["Brand Name", "Units Sold", "Total Sales (₹)"];
        rows = report.items.map((it: any) => [it.brandName, it.unitsSold, it.totalAmount.toFixed(2)]);
      } else if (breakdown === "category") {
        headers = ["Category Name", "Units Sold", "Total Sales (₹)"];
        rows = report.items.map((it: any) => [it.categoryName, it.unitsSold, it.totalAmount.toFixed(2)]);
      } else if (breakdown === "customer") {
        headers = ["Customer Name", "Phone", "GSTIN", "Invoices", "Taxable Amount (₹)", "Total Sales (₹)", "Paid (₹)", "Outstanding (₹)"];
        rows = report.items.map((it: any) => [
          it.customerName,
          it.phone,
          it.gstin,
          it.invoiceCount,
          it.taxableAmount.toFixed(2),
          it.totalAmount.toFixed(2),
          it.paidAmount.toFixed(2),
          it.balanceAmount.toFixed(2),
        ]);
      } else {
        headers = ["Date", "Invoices Count", "Taxable Turnover (₹)", "GST Tax (₹)", "Total Sales (₹)", "Receipts Collected (₹)", "Credit Balance (₹)"];
        rows = report.items.map((it: any) => [
          it.date,
          it.invoiceCount,
          it.taxableAmount.toFixed(2),
          it.taxAmount.toFixed(2),
          it.grandTotal.toFixed(2),
          it.paidAmount.toFixed(2),
          it.balanceAmount.toFixed(2),
        ]);
      }

      const csv = generateCSV(headers, rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sales-report-${breakdown}-${Date.now()}.csv"`,
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
    const message = error instanceof Error ? error.message : "Failed to generate sales report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
