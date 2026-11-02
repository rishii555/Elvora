import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { getLowStockInventory } from "@/lib/inventory/reservation-service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const locationId = searchParams.get("locationId") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 200);

    const data = await getLowStockInventory(context.tenantId, { locationId, limit });

    return NextResponse.json({
      success: true,
      lowStockItems: data.lowStockItems,
      totalLowStock: data.totalLowStock,
      locations: data.locations,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch low-stock inventory";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
