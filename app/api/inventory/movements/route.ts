import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { getVariantStockHistory } from "@/lib/inventory/service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("variantId");

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: "variantId parameter is required" },
        { status: 400 }
      );
    }

    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const movements = await getVariantStockHistory(
      context.tenantId,
      variantId,
      context.role,
      limit
    );

    return NextResponse.json({
      success: true,
      movements,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load stock movements";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
