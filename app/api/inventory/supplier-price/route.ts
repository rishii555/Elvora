import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { upsertSupplierPrice } from "@/lib/inventory/service";

const SupplierPriceSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required"),
  variantId: z.string().min(1, "Variant ID is required"),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be positive"),
  supplierItemCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_PURCHASE_COSTS");

    const body = await req.json();
    const validated = SupplierPriceSchema.parse(body);

    const result = await upsertSupplierPrice({
      tenantId: context.tenantId,
      supplierId: validated.supplierId,
      variantId: validated.variantId,
      purchasePrice: validated.purchasePrice,
      supplierItemCode: validated.supplierItemCode,
    });

    return NextResponse.json({
      success: true,
      message: "Supplier purchase price saved",
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to set supplier price";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
