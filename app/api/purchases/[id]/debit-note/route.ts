import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { createPurchaseReturn } from "@/lib/purchases/service";

const DebitNoteSchema = z.object({
  reason: z.string().min(3, "Debit note reason is required"),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitCost: z.coerce.number().optional(),
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
    requirePermission(context.role, "RECORD_PURCHASE");

    const { id } = await params;
    const body = await req.json();
    const validated = DebitNoteSchema.parse(body);

    const result = await createPurchaseReturn({
      tenantId: context.tenantId,
      userId: context.userId,
      purchaseInvoiceId: id,
      reason: validated.reason,
      items: validated.items,
    });

    return NextResponse.json({
      success: true,
      message: `Debit Note #${result.debitNote.noteNumber} issued and stock returned to vendor`,
      purchaseReturn: result.purchaseReturn,
      debitNote: result.debitNote,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create debit note";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
