import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { generateInventoryCsv } from "@/lib/inventory/csv";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const csvData = await generateInventoryCsv(context.tenantId, context.role);

    const filename = `elvora-inventory-${context.tenantName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to export inventory";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
