import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { getLocationStock, LocationNotFoundError } from "@/lib/inventory/warehouse-service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;

    const data = await getLocationStock(context.tenantId, id);

    return NextResponse.json({
      success: true,
      location: data.location,
      items: data.items,
      totalItems: data.items.length,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof LocationNotFoundError || error instanceof CrossTenantAccessDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch location stock";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
