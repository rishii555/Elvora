import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { getInvoicePrintDetails } from "@/lib/invoices/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;

    const details = await getInvoicePrintDetails(context.tenantId, id);

    return NextResponse.json({
      success: true,
      ...details,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load invoice";
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}
