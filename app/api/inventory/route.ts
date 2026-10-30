import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { checkPlanLimit } from "@/lib/billing/service";
import { PlanLimitExceededError } from "@/lib/billing/types";
import {
  listInventoryItems,
  calculateInventoryValuation,
} from "@/lib/inventory/service";

const CreateProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  brand: z.string().default("Generic"),
  category: z.string().default("General"),
  model: z.string().optional(),
  size: z.string().optional(),
  colorFinish: z.string().optional(),
  uom: z.enum(["PCS", "SET", "BOX", "MTR", "PAIR", "KG", "LTR", "PKT"]).default("PCS"),
  hsnCode: z.string().default("0000"),
  gstRate: z.coerce.number().default(18),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  mrp: z.coerce.number().min(0).default(0),
  openingStock: z.coerce.number().min(0).default(0),
  minStockAlert: z.coerce.number().min(0).default(5),
  description: z.string().optional(),
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

    const result = await prisma.$transaction(async (tx: any) => {
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

      // 3. Check SKU duplicate within tenant
      const existingSku = await tx.productVariant.findFirst({
        where: { tenantId: context.tenantId, sku: validated.sku },
      });
      if (existingSku) {
        throw new Error(`SKU '${validated.sku}' already exists in your inventory`);
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

      // 5. Create Product Variant
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
          purchasePrice: effectiveCost,
          sellingPrice: validated.sellingPrice,
          mrp: validated.mrp,
          gstRate: validated.gstRate,
          currentStock: validated.openingStock,
        },
      });

      // 6. Record opening stock movement if stock > 0
      if (validated.openingStock > 0) {
        await tx.stockMovement.create({
          data: {
            tenantId: context.tenantId,
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

      return { product, variant };
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
