import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { recordSupplierPayment } from "@/lib/purchases/service";

const SupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required"),
  purchaseInvoiceId: z.string().optional(),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  paymentDate: z.string().optional(),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]).default("BANK_TRANSFER"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "RECORD_PAYMENT");

    const body = await req.json();
    const validated = SupplierPaymentSchema.parse(body);

    const payment = await recordSupplierPayment({
      tenantId: context.tenantId,
      userId: context.userId,
      supplierId: validated.supplierId,
      purchaseInvoiceId: validated.purchaseInvoiceId,
      amount: validated.amount,
      paymentDate: validated.paymentDate ? new Date(validated.paymentDate) : new Date(),
      paymentMode: validated.paymentMode,
      referenceNumber: validated.referenceNumber,
      notes: validated.notes,
    });

    return NextResponse.json({
      success: true,
      message: `Supplier payment #${payment.paymentNumber} recorded successfully`,
      payment,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to record payment";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
