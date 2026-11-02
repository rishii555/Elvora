import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma, { runInTransaction, DatabaseTransactionUnavailableError } from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { checkPlanLimit } from "@/lib/billing/service";
import { PlanLimitExceededError } from "@/lib/billing/types";
import {
  listInventoryItems,
  calculateInventoryValuation,
} from "@/lib/inventory/service";
import { CustomAttributesSchema } from "@/lib/inventory/validation";
import { parseAndValidateQuantity } from "@/lib/inventory/precision";

const CreateProductVariantInputSchema = z.object({
  name: z.string().optional(),
  sku: z.string().min(1, "Variant SKU is required"),
  barcode: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  colorFinish: z.string().optional(),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  mrp: z.coerce.number().min(0).default(0),
  gstRate: z.coerce.number().default(18),
  openingStock: z.coerce.number().min(0).default(0),
  customAttributes: CustomAttributesSchema.optional(),
});

const CreateProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  brand: z.string().default("Generic"),
  category: z.string().default("General"),
  model: z.string().optional(),
  size: z.string().optional(),
  colorFinish: z.string().optional(),
  uom: z.enum(["PCS", "SET", "PAIR", "BOX", "MTR", "KG"]).default("PCS"),
  hsnCode: z.string().default("0000"),
  gstRate: z.coerce.number().default(18),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  mrp: z.coerce.number().min(0).default(0),
  openingStock: z.coerce.number().min(0).default(0),
  minStockAlert: z.coerce.number().min(0).default(5),
  description: z.string().optional(),
  customAttributes: CustomAttributesSchema.optional(),
  variants: z.array(CreateProductVariantInputSchema).optional(),
}).superRefine((data, ctx) => {
  try {
    parseAndValidateQuantity(data.openingStock, data.uom, { allowZero: true });
  } catch (err: any) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["openingStock"],
      message: err.message,
    });
  }
  if (data.variants && data.variants.length > 0) {
    data.variants.forEach((v, index) => {
      try {
        parseAndValidateQuantity(v.openingStock, data.uom, { allowZero: true });
      } catch (err: any) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "openingStock"],
          message: err.message,
        });
      }
    });
  }
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const brandId = searchParams.get("brandId") || undefined;
    const model = searchParams.get("model") || undefined;
    const colorFinish = searchParams.get("colorFinish") || undefined;
    const size = searchParams.get("size") || undefined;
    const stockStatus = (searchParams.get("stockStatus") || "ALL") as any;
    const locationId = searchParams.get("locationId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const [itemsResult, valuation] = await Promise.all([
      listInventoryItems({
        tenantId: context.tenantId,
        userRole: context.role,
        search,
        categoryId,
        brandId,
        model,
        colorFinish,
        size,
        stockStatus,
        locationId,
        page,
        limit,
      }),
      calculateInventoryValuation(context.tenantId, context.role),
    ]);

    return NextResponse.json({
      success: true,
      tenant: {
        id: context.tenantId,
        name: context.tenantName,
        role: context.role,
      },
      valuation,
      ...itemsResult,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch inventory";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();
    const validated = CreateProductSchema.parse(body);

    // Enforce server-side commercial plan limit
    await checkPlanLimit(context.tenantId, "PRODUCT_CREATION", prisma);

    // If user lacks VIEW_PURCHASE_COSTS, enforce default purchasePrice = 0
    let effectiveCost = validated.purchasePrice;
    if (!hasPermission(context.role, "VIEW_PURCHASE_COSTS")) {
      effectiveCost = 0;
    }

    const result = await runInTransaction(prisma, async (tx: any) => {
      // 1. Resolve or create Brand
      let brand = await tx.brand.findFirst({
        where: { tenantId: context.tenantId, name: validated.brand },
      });
      if (!brand) {
        brand = await tx.brand.create({
          data: { tenantId: context.tenantId, name: validated.brand },
        });
      }

      // 2. Resolve or create Category
      let category = await tx.category.findFirst({
        where: { tenantId: context.tenantId, name: validated.category },
      });
      if (!category) {
        category = await tx.category.create({
          data: { tenantId: context.tenantId, name: validated.category },
        });
      }

      // 3. Check SKU duplicate within tenant (for primary SKU and any explicit variants)
      const skusToCheck = [validated.sku];
      if (validated.variants && validated.variants.length > 0) {
        validated.variants.forEach((v) => {
          if (!skusToCheck.includes(v.sku)) skusToCheck.push(v.sku);
        });
      }

      const existingSku = await tx.productVariant.findFirst({
        where: {
          tenantId: context.tenantId,
          sku: { in: skusToCheck },
        },
      });
      if (existingSku) {
        throw new Error(`SKU '${existingSku.sku}' already exists in your inventory`);
      }

      // 4. Create Product
      const product = await tx.product.create({
        data: {
          tenantId: context.tenantId,
          name: validated.name,
          code: validated.sku,
          barcode: validated.barcode || null,
          brandId: brand.id,
          categoryId: category.id,
          hsnCode: validated.hsnCode,
          uom: validated.uom,
          description: validated.description || null,
          minStockAlert: validated.minStockAlert,
        },
      });

      // 5. Resolve default location for initial stock tracking
      let defaultLocId: string | null = null;
      if (tx.inventoryLocation && typeof tx.inventoryLocation.findFirst === "function") {
        const dLoc = await tx.inventoryLocation.findFirst({
          where: { tenantId: context.tenantId, isDefault: true, isActive: true },
          select: { id: true },
        });
        defaultLocId = dLoc?.id ?? null;
      }

      // 6. Create Variants
      const createdVariants: any[] = [];

      if (validated.variants && validated.variants.length > 0) {
        for (const v of validated.variants) {
          let varCost = v.purchasePrice;
          if (!hasPermission(context.role, "VIEW_PURCHASE_COSTS")) {
            varCost = 0;
          }

          const variantName =
            v.name ||
            [validated.name, v.model, v.colorFinish, v.size].filter(Boolean).join(" - ") ||
            "Standard";

          const variant = await tx.productVariant.create({
            data: {
              tenantId: context.tenantId,
              productId: product.id,
              name: variantName,
              sku: v.sku,
              barcode: v.barcode || null,
              model: v.model || null,
              size: v.size || null,
              colorFinish: v.colorFinish || null,
              customAttributes: v.customAttributes ? (v.customAttributes as any) : undefined,
              purchasePrice: varCost,
              sellingPrice: v.sellingPrice,
              mrp: v.mrp,
              gstRate: v.gstRate,
              currentStock: v.openingStock,
            },
          });

          if (v.openingStock > 0) {
            if (defaultLocId && tx.locationStock && typeof tx.locationStock.create === "function") {
              await tx.locationStock.create({
                data: {
                  tenantId: context.tenantId,
                  locationId: defaultLocId,
                  variantId: variant.id,
                  stock: v.openingStock,
                },
              });
            }

            await tx.stockMovement.create({
              data: {
                tenantId: context.tenantId,
                locationId: defaultLocId,
                variantId: variant.id,
                type: "ADJUSTMENT_IN",
                quantity: v.openingStock,
                unitCost: varCost,
                balanceAfter: v.openingStock,
                referenceType: "INITIAL_SETUP",
                reason: "OPENING_STOCK",
                notes: "Opening balance recorded on item creation",
              },
            });
          }

          createdVariants.push(variant);
        }
      } else {
        const variant = await tx.productVariant.create({
          data: {
            tenantId: context.tenantId,
            productId: product.id,
            name: validated.model ? `${validated.name} - ${validated.model}` : "Standard",
            sku: validated.sku,
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

        if (validated.openingStock > 0) {
          if (defaultLocId && tx.locationStock && typeof tx.locationStock.create === "function") {
            await tx.locationStock.create({
              data: {
                tenantId: context.tenantId,
                locationId: defaultLocId,
                variantId: variant.id,
                stock: validated.openingStock,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              tenantId: context.tenantId,
              locationId: defaultLocId,
              variantId: variant.id,
              type: "ADJUSTMENT_IN",
              quantity: validated.openingStock,
              unitCost: effectiveCost,
              balanceAfter: validated.openingStock,
              referenceType: "INITIAL_SETUP",
              reason: "OPENING_STOCK",
              notes: "Opening balance recorded on item creation",
            },
          });
        }

        createdVariants.push(variant);
      }

      return {
        product,
        variant: createdVariants[0],
        variants: createdVariants,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Product created successfully",
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PlanLimitExceededError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "PLAN_LIMIT_EXCEEDED",
          limitType: error.limitType,
          currentUsage: error.currentUsage,
          maxLimit: error.maxLimit,
        },
        { status: 403 }
      );
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
