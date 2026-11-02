import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma, { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { CustomAttributesSchema } from "@/lib/inventory/validation";
import { parseAndValidateQuantity } from "@/lib/inventory/precision";

const CreateVariantSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  colorFinish: z.string().optional(),
  customAttributes: CustomAttributesSchema.optional(),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  mrp: z.coerce.number().min(0).default(0),
  gstRate: z.coerce.number().default(18),
  openingStock: z.coerce.number().min(0).default(0),
});

const UpdateVariantSchema = z.object({
  id: z.string().min(1, "Variant ID is required"),
  name: z.string().optional(),
  barcode: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  colorFinish: z.string().optional().nullable(),
  customAttributes: CustomAttributesSchema.optional().nullable(),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  mrp: z.coerce.number().min(0).optional(),
  gstRate: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const variants = await prisma.productVariant.findMany({
      where: {
        tenantId: context.tenantId,
        productId,
      },
      orderBy: { createdAt: "asc" },
    });

    const canViewCost = hasPermission(context.role, "VIEW_PURCHASE_COSTS");
    const sanitizedVariants = variants.map((v: any) => ({
      ...v,
      purchasePrice: canViewCost ? v.purchasePrice : null,
    }));

    return NextResponse.json({
      success: true,
      variants: sanitizedVariants,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch variants";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();
    const validated = CreateVariantSchema.parse(body);

    // Verify parent product exists and belongs to this tenant
    const product = await prisma.product.findFirst({
      where: { id: validated.productId, tenantId: context.tenantId },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    try {
      parseAndValidateQuantity(validated.openingStock, product.uom, { allowZero: true });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }

    // Check SKU uniqueness within this tenant
    const existingSku = await prisma.productVariant.findFirst({
      where: { tenantId: context.tenantId, sku: validated.sku.trim() },
    });

    if (existingSku) {
      return NextResponse.json(
        { success: false, error: `SKU '${validated.sku}' already exists in your inventory` },
        { status: 400 }
      );
    }

    // Cost masking
    let effectiveCost = validated.purchasePrice;
    if (!hasPermission(context.role, "VIEW_PURCHASE_COSTS")) {
      effectiveCost = 0;
    }

    const variantName =
      validated.name ||
      [product.name, validated.model, validated.colorFinish, validated.size]
        .filter(Boolean)
        .join(" - ") ||
      "Standard Variant";

    const variant = await prisma.productVariant.create({
      data: {
        tenantId: context.tenantId,
        productId: product.id,
        name: variantName,
        sku: validated.sku.trim(),
        barcode: validated.barcode || null,
        model: validated.model || null,
        size: validated.size || null,
        colorFinish: validated.colorFinish || null,
        customAttributes: validated.customAttributes ? (validated.customAttributes as any) : undefined,
        purchasePrice: effectiveCost,
        sellingPrice: validated.sellingPrice,
        mrp: validated.mrp,
        gstRate: validated.gstRate,
        currentStock: validated.openingStock,
      },
    });

    // Record opening stock movement if stock > 0
    if (validated.openingStock > 0) {
      await prisma.stockMovement.create({
        data: {
          tenantId: context.tenantId,
          variantId: variant.id,
          type: "ADJUSTMENT_IN",
          quantity: validated.openingStock,
          unitCost: effectiveCost,
          balanceAfter: validated.openingStock,
          referenceType: "INITIAL_SETUP",
          reason: "OPENING_STOCK",
          notes: "Opening balance recorded on variant creation",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Variant created successfully",
        variant,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create variant";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();
    const validated = UpdateVariantSchema.parse(body);

    const variant = await prisma.productVariant.findFirst({
      where: { id: validated.id, tenantId: context.tenantId },
    });

    if (!variant) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.barcode !== undefined) updateData.barcode = validated.barcode;
    if (validated.model !== undefined) updateData.model = validated.model;
    if (validated.size !== undefined) updateData.size = validated.size;
    if (validated.colorFinish !== undefined) updateData.colorFinish = validated.colorFinish;
    if (validated.customAttributes !== undefined) updateData.customAttributes = validated.customAttributes;
    if (validated.sellingPrice !== undefined) updateData.sellingPrice = validated.sellingPrice;
    if (validated.mrp !== undefined) updateData.mrp = validated.mrp;
    if (validated.gstRate !== undefined) updateData.gstRate = validated.gstRate;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    if (validated.purchasePrice !== undefined) {
      if (hasPermission(context.role, "VIEW_PURCHASE_COSTS")) {
        updateData.purchasePrice = validated.purchasePrice;
      }
    }

    const updated = await prisma.productVariant.update({
      where: { id: variant.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Variant updated successfully",
      variant: updated,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update variant";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
