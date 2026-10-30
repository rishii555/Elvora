import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { cancelPurchaseInvoice } from "@/lib/purchases/service";

const CancelSchema = z.object({
  reason: z.string().min(3, "Cancellation reason must be provided"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "RECORD_PURCHASE");

    const { id } = await params;
    const body = await req.json();
    const validated = CancelSchema.parse(body);

    const cancelled = await cancelPurchaseInvoice({
      tenantId: context.tenantId,
      userId: context.userId,
      purchaseInvoiceId: id,
      cancelReason: validated.reason,
    });

    return NextResponse.json({
      success: true,
      message: `Purchase bill #${cancelled.invoiceNumber} cancelled and stock reversed`,
      invoice: cancelled,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to cancel purchase";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
