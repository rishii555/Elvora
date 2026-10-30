import prisma, { runInTransaction } from "@/lib/db/prisma";
import { Decimal } from "@/lib/finance/decimal";
import { hasPermission, TenantRole } from "@/lib/auth/permissions";
import { CrossTenantReferenceError, CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

export type StockAdjustmentReason =
  | "OPENING_STOCK"
  | "DAMAGED"
  | "SCRAPPED"
  | "AUDIT_CORRECTION"
  | "INTERNAL_USE"
  | "THEFT_OR_LOSS";

export class InsufficientStockError extends Error {
  public readonly variantId: string;
  public readonly availableStock: number;
  public readonly requestedQuantity: number;

  constructor(variantId: string, availableStock: number, requestedQuantity: number) {
    super(
      `Insufficient stock for item '${variantId}': Available ${availableStock}, requested ${requestedQuantity}. Business policy forbids negative inventory.`
    );
    this.name = "InsufficientStockError";
    this.variantId = variantId;
    this.availableStock = availableStock;
    this.requestedQuantity = requestedQuantity;
  }
}

export class DuplicateMovementError extends Error {
  constructor(message = "Stock movement for this transaction has already been recorded.") {
    super(message);
    this.name = "DuplicateMovementError";
  }
}

export interface StockAdjustmentParams {
  tenantId: string;
  userId?: string;
  variantId: string;
  locationId?: string | null;
  quantityDelta: number; // positive to increase, negative to decrease
  reason: StockAdjustmentReason;
  notes?: string;
  unitCost?: number;
}

export interface SaleDeductionItem {
  variantId: string;
  quantity: number;
  sellingPrice?: number;
}

export interface ProcessSaleDeductionParams {
  tenantId: string;
  salesInvoiceId: string;
  locationId?: string | null;
  items: SaleDeductionItem[];
  idempotencyKey?: string;
}

export interface PurchaseReceiptItem {
  variantId: string;
  quantity: number;
  purchasePrice: number;
  supplierItemCode?: string;
}

export interface ProcessPurchaseReceiptParams {
  tenantId: string;
  purchaseInvoiceId: string;
  supplierId?: string;
  locationId?: string | null;
  items: PurchaseReceiptItem[];
}

export interface StockReturnItem {
  variantId: string;
  quantity: number;
  unitCost?: number;
}

export interface ProcessStockReturnParams {
  tenantId: string;
  returnId: string;
  returnType: "SALES_RETURN" | "PURCHASE_RETURN";
  locationId?: string | null;
  items: StockReturnItem[];
}

export interface ListInventoryParams {
  tenantId: string;
  userRole: TenantRole;
  search?: string;
  categoryId?: string;
  brandId?: string;
  model?: string;
  colorFinish?: string;
  size?: string;
  stockStatus?: "ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "HEALTHY";
  page?: number;
  limit?: number;
}

/**
 * Records a manual stock adjustment with required audit reason and balance tracking.
 * Ensures tenant isolation and enforces negative stock policies.
 */
export async function recordStockAdjustment(
  params: StockAdjustmentParams,
  client: any = prisma
) {
  const { tenantId, variantId, locationId, quantityDelta, reason, notes, unitCost } = params;

  if (quantityDelta === 0) {
    throw new Error("Quantity delta cannot be zero for stock adjustment");
  }

  return await runInTransaction(client, async (tx: any) => {
    // 1. Fetch tenant policy for negative stock
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, allowNegativeStock: true },
    });
    if (!tenant) {
      throw new CrossTenantAccessDeniedError(`Tenant '${tenantId}' not found`);
    }

    // 2. Fetch variant with strict tenant boundary
    const variant = await tx.productVariant.findFirst({
      where: { id: variantId, tenantId },
      include: { product: true },
    });
    if (!variant) {
      throw new CrossTenantReferenceError(
        `Variant '${variantId}' does not belong to tenant '${tenantId}'`
      );
    }

    // 3. Check negative stock constraint
    const newBalance = variant.currentStock + quantityDelta;
    if (newBalance < 0 && !tenant.allowNegativeStock) {
      throw new InsufficientStockError(variant.id, variant.currentStock, Math.abs(quantityDelta));
    }

    // 4. Update variant stock
    const updatedVariant = await tx.productVariant.update({
      where: { id: variant.id },
      data: { currentStock: newBalance },
    });

    // 5. Determine movement type
    const movementType = quantityDelta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const movementCost = unitCost !== undefined ? unitCost : variant.purchasePrice;

    // 6. Record immutable movement ledger entry
    const movement = await tx.stockMovement.create({
      data: {
        tenantId,
        locationId: locationId || null,
        variantId: variant.id,
        type: movementType,
        quantity: Math.abs(quantityDelta),
        unitCost: movementCost,
        balanceAfter: newBalance,
        referenceType: "ADJUSTMENT",
        reason,
        notes: notes || `Manual stock adjustment (${reason})`,
      },
    });

    return { variant: updatedVariant, movement };
  });
}

/**
 * Deducts stock when a sales invoice is created or finalized.
 * Features idempotency to prevent double deductions on network retries.
 */
export async function processStockDeductionFromSale(
  params: ProcessSaleDeductionParams,
  client: any = prisma
) {
  const { tenantId, salesInvoiceId, locationId, items, idempotencyKey } = params;
  const refId = idempotencyKey || salesInvoiceId;

  // Idempotency check: see if movements for this reference already exist
  const existingMovements = await client.stockMovement.findMany({
    where: {
      tenantId,
      referenceId: refId,
      type: "SALE",
    },
  });

  if (existingMovements.length > 0) {
    // Already processed, return idempotently without duplicate deduction
    return { idempotent: true, movements: existingMovements };
  }

  return await runInTransaction(client, async (tx: any) => {
    // 1. Fetch tenant policy
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, allowNegativeStock: true },
    });
    if (!tenant) {
      throw new CrossTenantAccessDeniedError(`Tenant '${tenantId}' not found`);
    }

    const createdMovements = [];

    for (const item of items) {
      const variant = await tx.productVariant.findFirst({
        where: { id: item.variantId, tenantId },
        include: { product: true },
      });
      if (!variant) {
        throw new CrossTenantReferenceError(
          `Variant '${item.variantId}' does not belong to tenant '${tenantId}'`
        );
      }

      const newBalance = variant.currentStock - item.quantity;
      if (newBalance < 0 && !tenant.allowNegativeStock) {
        throw new InsufficientStockError(variant.id, variant.currentStock, item.quantity);
      }

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { currentStock: newBalance },
      });

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          locationId: locationId || null,
          variantId: variant.id,
          type: "SALE",
          quantity: item.quantity,
          unitCost: variant.purchasePrice,
          balanceAfter: newBalance,
          referenceType: "SALES_INVOICE",
          referenceId: refId,
          reason: "CUSTOMER_SALE",
          notes: `Deduction for invoice #${salesInvoiceId}`,
        },
      });

      createdMovements.push(movement);
    }

    return { idempotent: false, movements: createdMovements };
  });
}

/**
 * Increments stock when a purchase invoice is recorded.
 * Updates supplier pricing and stock ledger without duplicates.
 */
export async function processStockReceiptFromPurchase(
  params: ProcessPurchaseReceiptParams,
  client: any = prisma
) {
  const { tenantId, purchaseInvoiceId, supplierId, locationId, items } = params;

  // Check idempotency
  const existingMovements = await client.stockMovement.findMany({
    where: {
      tenantId,
      referenceId: purchaseInvoiceId,
      type: "PURCHASE",
    },
  });

  if (existingMovements.length > 0) {
    return { idempotent: true, movements: existingMovements };
  }

  return await runInTransaction(client, async (tx: any) => {
    const createdMovements = [];

    for (const item of items) {
      const variant = await tx.productVariant.findFirst({
        where: { id: item.variantId, tenantId },
      });
      if (!variant) {
        throw new CrossTenantReferenceError(
          `Variant '${item.variantId}' does not belong to tenant '${tenantId}'`
        );
      }

      // Update variant stock and optionally latest purchase price
      const newBalance = variant.currentStock + item.quantity;
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          currentStock: newBalance,
          purchasePrice: item.purchasePrice,
        },
      });

      // Update supplier-specific purchase price if supplier is provided
      if (supplierId) {
        const existingSupplierPrice = await tx.supplierProductPrice.findFirst({
          where: {
            tenantId,
            supplierId,
            variantId: variant.id,
          },
        });

        if (existingSupplierPrice) {
          await tx.supplierProductPrice.update({
            where: { id: existingSupplierPrice.id },
            data: {
              purchasePrice: item.purchasePrice,
              supplierItemCode: item.supplierItemCode || existingSupplierPrice.supplierItemCode,
            },
          });
        } else {
          await tx.supplierProductPrice.create({
            data: {
              tenantId,
              supplierId,
              variantId: variant.id,
              purchasePrice: item.purchasePrice,
              supplierItemCode: item.supplierItemCode || null,
            },
          });
        }
      }

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          locationId: locationId || null,
          variantId: variant.id,
          type: "PURCHASE",
          quantity: item.quantity,
          unitCost: item.purchasePrice,
          balanceAfter: newBalance,
          referenceType: "PURCHASE_INVOICE",
          referenceId: purchaseInvoiceId,
          reason: "PURCHASE_RECEIPT",
          notes: `Stock receipt from purchase bill #${purchaseInvoiceId}`,
        },
      });

      createdMovements.push(movement);
    }

    return { idempotent: false, movements: createdMovements };
  });
}

/**
 * Handles stock movements for sales and purchase returns.
 */
export async function processStockReturn(
  params: ProcessStockReturnParams,
  client: any = prisma
) {
  const { tenantId, returnId, returnType, locationId, items } = params;

  return await runInTransaction(client, async (tx: any) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, allowNegativeStock: true },
    });
    if (!tenant) {
      throw new CrossTenantAccessDeniedError(`Tenant '${tenantId}' not found`);
    }

    const createdMovements = [];

    for (const item of items) {
      const variant = await tx.productVariant.findFirst({
        where: { id: item.variantId, tenantId },
      });
      if (!variant) {
        throw new CrossTenantReferenceError(
          `Variant '${item.variantId}' does not belong to tenant '${tenantId}'`
        );
      }

      const isSalesReturn = returnType === "SALES_RETURN";
      const delta = isSalesReturn ? item.quantity : -item.quantity;
      const newBalance = variant.currentStock + delta;

      if (newBalance < 0 && !tenant.allowNegativeStock) {
        throw new InsufficientStockError(variant.id, variant.currentStock, item.quantity);
      }

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { currentStock: newBalance },
      });

      const movementType = isSalesReturn ? "RETURN_IN" : "RETURN_OUT";

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          locationId: locationId || null,
          variantId: variant.id,
          type: movementType,
          quantity: item.quantity,
          unitCost: item.unitCost || variant.purchasePrice,
          balanceAfter: newBalance,
          referenceType: returnType,
          referenceId: returnId,
          reason: isSalesReturn ? "CUSTOMER_SALES_RETURN" : "PURCHASE_RETURN_TO_SUPPLIER",
          notes: `Return adjustment for ${returnType} #${returnId}`,
        },
      });

      createdMovements.push(movement);
    }

    return createdMovements;
  });
}

/**
 * Calculates tenant inventory valuation, low-stock metrics, and total units.
 */
export async function calculateInventoryValuation(
  tenantId: string,
  userRole: TenantRole = "OWNER",
  client: any = prisma
) {
  const variants = await client.productVariant.findMany({
    where: { tenantId, isActive: true },
    include: {
      product: {
        select: { minStockAlert: true, name: true },
      },
    },
  });

  let totalUnits = 0;
  let totalValuation = new Decimal(0);
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const v of variants) {
    totalUnits += v.currentStock;
    const itemValuation = new Decimal(Math.max(0, v.currentStock)).mul(new Decimal(v.purchasePrice));
    totalValuation = totalValuation.add(itemValuation);

    const minAlert = v.product?.minStockAlert ?? 5;
    if (v.currentStock <= 0) {
      outOfStockCount++;
      lowStockCount++;
    } else if (v.currentStock <= minAlert) {
      lowStockCount++;
    }
  }

  const canViewCost = hasPermission(userRole, "VIEW_PURCHASE_COSTS");

  return {
    totalSkus: variants.length,
    totalUnits,
    lowStockCount,
    outOfStockCount,
    totalValuation: canViewCost ? totalValuation.toNumber() : null,
    isValuationMasked: !canViewCost,
  };
}

/**
 * Retrieves paginated catalog with product variants/attributes filters and RBAC cost masking.
 */
export async function listInventoryItems(params: ListInventoryParams, client: any = prisma) {
  const {
    tenantId,
    userRole,
    search,
    categoryId,
    brandId,
    model,
    colorFinish,
    size,
    stockStatus = "ALL",
    page = 1,
    limit = 20,
  } = params;

  const canViewCost = hasPermission(userRole, "VIEW_PURCHASE_COSTS");

  // Build filter query
  const where: any = {
    tenantId,
    isActive: true,
  };

  if (model) {
    where.model = { contains: model, mode: "insensitive" };
  }
  if (colorFinish) {
    where.colorFinish = { contains: colorFinish, mode: "insensitive" };
  }
  if (size) {
    where.size = { contains: size, mode: "insensitive" };
  }

  // Stock status filtering
  if (stockStatus === "OUT_OF_STOCK") {
    where.currentStock = { lte: 0 };
  } else if (stockStatus === "HEALTHY") {
    where.currentStock = { gt: 10 };
  }

  // Product-level filters
  const productWhere: any = {};
  if (categoryId) productWhere.categoryId = categoryId;
  if (brandId) productWhere.brandId = brandId;

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { sku: { contains: s, mode: "insensitive" } },
      { barcode: { contains: s, mode: "insensitive" } },
      { model: { contains: s, mode: "insensitive" } },
      { colorFinish: { contains: s, mode: "insensitive" } },
      { product: { name: { contains: s, mode: "insensitive" } } },
      { product: { code: { contains: s, mode: "insensitive" } } },
    ];
  }

  if (Object.keys(productWhere).length > 0) {
    where.product = {
      ...(where.product || {}),
      ...productWhere,
    };
  }

  const skip = (page - 1) * limit;

  const [totalCount, variants] = await Promise.all([
    client.productVariant.count({ where }),
    client.productVariant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },
    }),
  ]);

  // Apply RBAC masking & format items
  const items = variants.map((v: any) => {
    const isLow = v.currentStock <= (v.product?.minStockAlert ?? 5);
    return {
      id: v.id,
      productId: v.productId,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      barcode: v.barcode || v.product.barcode || "",
      brand: v.product.brand?.name || "Generic",
      category: v.product.category?.name || "General",
      model: v.model || "",
      size: v.size || "",
      colorFinish: v.colorFinish || "",
      uom: v.product.uom,
      hsnCode: v.product.hsnCode || "",
      sellingPrice: v.sellingPrice,
      mrp: v.mrp,
      gstRate: v.gstRate,
      currentStock: v.currentStock,
      minStockAlert: v.product.minStockAlert,
      isLowStock: isLow,
      isActive: v.isActive,
      // RBAC: mask purchase cost if user is BILLER or lacking permission
      purchasePrice: canViewCost ? v.purchasePrice : null,
      margin: canViewCost && v.sellingPrice > 0
        ? Math.round(((v.sellingPrice - v.purchasePrice) / v.sellingPrice) * 100)
        : null,
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

/**
 * Retrieves chronological movement history for a variant with strict tenant boundary.
 */
export async function getVariantStockHistory(
  tenantId: string,
  variantId: string,
  userRole: TenantRole = "OWNER",
  limit = 50,
  client: any = prisma
) {
  const canViewCost = hasPermission(userRole, "VIEW_PURCHASE_COSTS");

  // Validate variant ownership
  const variant = await client.productVariant.findFirst({
    where: { id: variantId, tenantId },
    select: { id: true, name: true, sku: true },
  });

  if (!variant) {
    throw new CrossTenantAccessDeniedError(`Variant '${variantId}' not found under tenant`);
  }

  const movements = await client.stockMovement.findMany({
    where: { tenantId, variantId },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      location: {
        select: { id: true, name: true },
      },
    },
  });

  return movements.map((m: any) => ({
    id: m.id,
    type: m.type,
    quantity: m.quantity,
    unitCost: canViewCost ? m.unitCost : null,
    balanceAfter: m.balanceAfter,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    reason: m.reason,
    notes: m.notes,
    locationName: m.location?.name || "Main Godown",
    createdAt: m.createdAt,
  }));
}

/**
 * Upserts a supplier-specific purchase price for a variant.
 */
export async function upsertSupplierPrice(
  params: {
    tenantId: string;
    supplierId: string;
    variantId: string;
    purchasePrice: number;
    supplierItemCode?: string;
  },
  client: any = prisma
) {
  const { tenantId, supplierId, variantId, purchasePrice, supplierItemCode } = params;

  // Validate supplier and variant ownership
  const [supplier, variant] = await Promise.all([
    client.supplier.findFirst({ where: { id: supplierId, tenantId } }),
    client.productVariant.findFirst({ where: { id: variantId, tenantId } }),
  ]);

  if (!supplier) throw new CrossTenantReferenceError("Supplier not found for tenant");
  if (!variant) throw new CrossTenantReferenceError("Variant not found for tenant");

  const existing = await client.supplierProductPrice.findFirst({
    where: { tenantId, supplierId, variantId },
  });

  if (existing) {
    return await client.supplierProductPrice.update({
      where: { id: existing.id },
      data: {
        purchasePrice,
        supplierItemCode: supplierItemCode || existing.supplierItemCode,
      },
    });
  }

  return await client.supplierProductPrice.create({
    data: {
      tenantId,
      supplierId,
      variantId,
      purchasePrice,
      supplierItemCode: supplierItemCode || null,
    },
  });
}
