import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getInventoryReport, generateCSV } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const categoryId = searchParams.get("categoryId") || undefined;
    const brandId = searchParams.get("brandId") || undefined;
    const format = searchParams.get("format") || "json";

    const report = await getInventoryReport(context.tenantId, {
      lowStockOnly,
      categoryId,
      brandId,
    });

    if (format === "csv") {
      let headers: string[];
      let rows: (string | number)[][];

      if (lowStockOnly) {
        headers = ["SKU", "Product Name", "Variant", "Brand", "Category", "Current Stock", "Min Stock Alert", "Unit Cost (₹)", "Reorder Qty"];
        rows = report.lowStockAlerts.map((it: any) => [
          it.sku,
          it.productName,
          it.variantName,
          it.brandName,
          it.categoryName,
          it.currentStock,
          it.minStockAlert,
          it.unitCost.toFixed(2),
          it.reorderRecommended,
        ]);
      } else {
        headers = ["Category", "Product Varieties", "Total Units in Stock", "Valuation at Purchase Cost (₹)"];
        rows = report.categoryValuation.map((cat: any) => [
          cat.category,
          cat.productCount,
          cat.units,
          cat.valuation.toFixed(2),
        ]);
      }

      const csv = generateCSV(headers, rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="inventory-report-${Date.now()}.csv"`,
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
    const message = error instanceof Error ? error.message : "Failed to generate inventory report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
