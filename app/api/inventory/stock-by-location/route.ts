import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { getStockAcrossLocations } from "@/lib/inventory/warehouse-service";
import { CrossTenantReferenceError } from "@/lib/tenant/isolation";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const productId = searchParams.get("productId") || undefined;
    const variantId = searchParams.get("variantId") || undefined;

    if (!productId && !variantId) {
      return NextResponse.json(
        { success: false, error: "Either 'productId' or 'variantId' query parameter is required" },
        { status: 400 }
      );
    }

    const result = await getStockAcrossLocations(context.tenantId, { productId, variantId });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof CrossTenantReferenceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch stock across locations";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
