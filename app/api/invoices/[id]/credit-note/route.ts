import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { createCreditNoteForInvoice } from "@/lib/invoices/service";

const CreditNoteSchema = z.object({
  reason: z.string().min(3, "Reason is required"),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().min(0),
      })
    )
    .min(1, "At least one item must be returned"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "CREATE_INVOICE");

    const { id } = await params;
    const body = await req.json();
    const validated = CreditNoteSchema.parse(body);

    const result = await createCreditNoteForInvoice({
      tenantId: context.tenantId,
      invoiceId: id,
      reason: validated.reason,
      items: validated.items,
      userId: context.userId,
    });

    return NextResponse.json({
      success: true,
      message: `Credit Note #${result.creditNote.noteNumber} issued successfully`,
      creditNote: result.creditNote,
      salesReturn: result.salesReturn,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create credit note";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
