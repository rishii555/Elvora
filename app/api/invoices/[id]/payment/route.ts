import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordCustomerPayment } from "@/lib/invoices/service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

const CustomerPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  paymentMode: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]).default("CASH"),
  paymentDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "RECORD_PAYMENT");

    const { id } = await params;
    const body = await req.json();
    const validated = CustomerPaymentSchema.parse(body);

    const result = await recordCustomerPayment({
      tenantId: context.tenantId,
      invoiceId: id,
      amount: validated.amount,
      paymentMode: validated.paymentMode,
      paymentDate: validated.paymentDate ? new Date(validated.paymentDate) : new Date(),
      referenceNumber: validated.referenceNumber,
      notes: validated.notes,
    });

    return NextResponse.json({
      success: true,
      message: `Payment #${result.payment.paymentNumber} of ₹${result.appliedAmount} recorded successfully`,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof CrossTenantAccessDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to record payment";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
