import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { cancelSalesInvoice } from "@/lib/invoices/service";

const CancelSchema = z.object({
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "DELETE_INVOICE");

    const { id } = await params;
    const body = await req.json();
    const validated = CancelSchema.parse(body);

    const cancelledInvoice = await cancelSalesInvoice({
      tenantId: context.tenantId,
      invoiceId: id,
      cancelReason: validated.reason,
      userId: context.userId,
    });

    return NextResponse.json({
      success: true,
      message: `Invoice #${cancelledInvoice.invoiceNumber} has been successfully cancelled and stock restored.`,
      invoice: cancelledInvoice,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to cancel invoice";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
