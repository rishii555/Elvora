import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { recordStockAdjustment, InsufficientStockError } from "@/lib/inventory/service";

const AdjustStockSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantityDelta: z.coerce.number().refine((n) => n !== 0, "Adjustment quantity cannot be 0"),
  reason: z.enum([
    "OPENING_STOCK",
    "DAMAGED",
    "SCRAPPED",
    "AUDIT_CORRECTION",
    "INTERNAL_USE",
    "THEFT_OR_LOSS",
  ]),
  notes: z.string().optional(),
  locationId: z.string().optional(),
  unitCost: z.coerce.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();
    const validated = AdjustStockSchema.parse(body);

    const result = await recordStockAdjustment({
      tenantId: context.tenantId,
      userId: context.userId,
      variantId: validated.variantId,
      locationId: validated.locationId || null,
      quantityDelta: validated.quantityDelta,
      reason: validated.reason,
      notes: validated.notes,
      unitCost: validated.unitCost,
    });

    return NextResponse.json({
      success: true,
      message: `Stock successfully adjusted by ${validated.quantityDelta > 0 ? "+" : ""}${validated.quantityDelta}`,
      variant: result.variant,
      movement: result.movement,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 422 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to record stock adjustment";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
