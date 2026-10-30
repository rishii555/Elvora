import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { getSupplierStatement } from "@/lib/purchases/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;

    const statement = await getSupplierStatement(context.tenantId, id);

    return NextResponse.json({
      success: true,
      ...statement,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load supplier statement";
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}
