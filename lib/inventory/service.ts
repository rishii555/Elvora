import prisma, { runInTransaction } from "@/lib/db/prisma";
import { Decimal } from "@/lib/finance/decimal";
import { hasPermission, TenantRole } from "@/lib/auth/permissions";
import { CrossTenantReferenceError, CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";
import {
  parseAndValidateQuantity,
  consolidateVariantQuantities,
  toPrismaQuantity,
} from "@/lib/inventory/precision";

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
  quantityDelta: number | string | Decimal; // positive to increase, negative to decrease
  reason: StockAdjustmentReason;
  notes?: string;
  unitCost?: number;
}

export interface SaleDeductionItem {
  variantId: string;
  quantity: number | string | Decimal;
  uom?: string;
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
  quantity: number | string | Decimal;
  purchasePrice: number;
  uom?: string;
  supplierItemCode?: string;
}

export interface ProcessPurchaseReceiptParams {
  tenantId: string;
  purchaseInvoiceId: string;
  supplierId?: string;
  locationId?: string | null;
  items: PurchaseReceiptItem[];
  idempotencyKey?: string;
}

export interface StockReturnItem {
  variantId: string;
  quantity: number | string | Decimal;
  uom?: string;
  unitCost?: number;
}

export interface ProcessStockReturnParams {
  tenantId: string;
  returnId: string;
  returnType: "SALES_RETURN" | "PURCHASE_RETURN";
  locationId?: string | null;
  items: StockReturnItem[];
  idempotencyKey?: string;
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
  locationId?: string;
  page?: number;
  limit?: number;
}

// Helper to fetch variants supporting both real Prisma Client and test mocks
async function fetchVariantsBatch(tx: any, variantIds: string[], tenantId: string) {
  if (typeof tx.productVariant?.findMany === "function") {
    return await tx.productVariant.findMany({
      where: { id: { in: variantIds }, tenantId },
      include: { product: true },
    });
  }
  // Mock fallback for handcrafted unit tests
  const list: any[] = [];
  for (const id of variantIds) {
    const v = await tx.productVariant.findFirst({
      where: { id, tenantId },
      include: { product: true },
    });
    if (v) list.push(v);
  }
  return list;
}

// Helper to execute atomic decrement or fallback safely
async function atomicDecrementStock(
  tx: any,
  variantId: string,
  tenantId: string,
  qty: number,
  allowNegative: boolean,
  currentStockFallback: number
): Promise<{ balanceAfter: number; purchasePrice?: number }> {
  if (typeof tx.productVariant?.updateMany === "function") {
    if (!allowNegative) {
      const updateResult = await tx.productVariant.updateMany({
        where: { id: variantId, tenantId, currentStock: { gte: qty } },
        data: { currentStock: { decrement: qty } },
      });
      if (updateResult.count === 0) {
        const current = tx.productVariant.findUnique
          ? await tx.productVariant.findUnique({ where: { id: variantId }, select: { currentStock: true } })
          : await tx.productVariant.findFirst({ where: { id: variantId }, select: { currentStock: true } });
        throw new InsufficientStockError(variantId, current?.currentStock ?? currentStockFallback, qty);
      }
    } else {
      await tx.productVariant.updateMany({
        where: { id: variantId, tenantId },
        data: { currentStock: { decrement: qty } },
      });
    }

    const updated = tx.productVariant.findUnique
      ? await tx.productVariant.findUnique({ where: { id: variantId }, select: { currentStock: true, purchasePrice: true } })
      : await tx.productVariant.findFirst({ where: { id: variantId }, select: { currentStock: true, purchasePrice: true } });
    return {
      balanceAfter: updated?.currentStock ?? 0,
      purchasePrice: updated?.purchasePrice,
    };
  } else {
    // Legacy mock fallback
    const calcBalance = currentStockFallback - qty;
    if (calcBalance < 0 && !allowNegative) {
      throw new InsufficientStockError(variantId, currentStockFallback, qty);
    }
    const updated = await tx.productVariant.update({
      where: { id: variantId },
      data: { currentStock: calcBalance },
    });
    return {
      balanceAfter: calcBalance,
      purchasePrice: updated?.purchasePrice,
    };
  }
}

// Helper to execute atomic increment or fallback safely
async function atomicIncrementStock(
  tx: any,
  variantId: string,
  tenantId: string,
  qty: number,
  currentStockFallback: number,
  purchasePrice?: number
): Promise<{ balanceAfter: number }> {
  if (typeof tx.productVariant?.updateMany === "function") {
    await tx.productVariant.updateMany({
      where: { id: variantId, tenantId },
      data: {
        currentStock: { increment: qty },
        ...(purchasePrice !== undefined ? { purchasePrice } : {}),
      },
    });

    const updated = tx.productVariant.findUnique
      ? await tx.productVariant.findUnique({ where: { id: variantId }, select: { currentStock: true } })
      : await tx.productVariant.findFirst({ where: { id: variantId }, select: { currentStock: true } });
    return { balanceAfter: updated?.currentStock ?? 0 };
  } else {
    // Legacy mock fallback
    const calcBalance = currentStockFallback + qty;
    await tx.productVariant.update({
      where: { id: variantId },
      data: {
        currentStock: calcBalance,
        ...(purchasePrice !== undefined ? { purchasePrice } : {}),
      },
    });
    return { balanceAfter: calcBalance };
  }
}

// Helper to resolve an active location for multi-warehouse synchronization
async function resolveLocationForSync(
  tx: any,
  tenantId: string,
  locationId?: string | null
): Promise<string | null> {
  if (locationId) {
    if (tx.inventoryLocation && typeof tx.inventoryLocation.findFirst === "function") {
      const loc = await tx.inventoryLocation.findFirst({
        where: { id: locationId, tenantId },
      });
      if (!loc) {
        throw new CrossTenantReferenceError(
          `Location '${locationId}' does not belong to tenant '${tenantId}'`
        );
      }
      if (!loc.isActive) {
        throw new Error(`Cannot operate on inactive location '${loc.name}'`);
      }
    }
    return locationId;
  }

  // Auto-resolve default location if model is available
  if (tx.inventoryLocation && typeof tx.inventoryLocation.findFirst === "function") {
    const defaultLoc = await tx.inventoryLocation.findFirst({
      where: { tenantId, isDefault: true, isActive: true },
      select: { id: true },
    });
    if (defaultLoc) return defaultLoc.id;

    const anyLoc = await tx.inventoryLocation.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (anyLoc) return anyLoc.id;
  }

  return null;
}

// Helper to atomically synchronize location stock decrement
async function syncLocationDecrement(
  tx: any,
  tenantId: string,
  locationId: string,
  variantId: string,
  qty: number,
  allowNegative: boolean,
  currentVariantStockFallback: number
) {
  if (!tx.locationStock || typeof tx.locationStock.updateMany !== "function") return;

  if (!allowNegative) {
    const res = await tx.locationStock.updateMany({
      where: { tenantId, locationId, variantId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    if (res.count === 0) {
      const locStock = tx.locationStock.findUnique
        ? await tx.locationStock.findUnique({
            where: { locationId_variantId: { locationId, variantId } },
            select: { stock: true },
          })
        : null;

      if (!locStock && currentVariantStockFallback >= qty) {
        await tx.locationStock.create({
          data: {
            tenantId,
            locationId,
            variantId,
            stock: currentVariantStockFallback - qty,
          },
        });
        return;
      }
      throw new InsufficientStockError(variantId, locStock?.stock ?? 0, qty);
    }
  } else {
    const res = await tx.locationStock.updateMany({
      where: { tenantId, locationId, variantId },
      data: { stock: { decrement: qty } },
    });
    if (res.count === 0) {
      await tx.locationStock.create({
        data: { tenantId, locationId, variantId, stock: -qty },
      });
    }
  }
}

// Helper to atomically synchronize location stock increment
async function syncLocationIncrement(
  tx: any,
  tenantId: string,
  locationId: string,
  variantId: string,
  qty: number
) {
  if (!tx.locationStock || typeof tx.locationStock.updateMany !== "function") return;

  const res = await tx.locationStock.updateMany({
    where: { tenantId, locationId, variantId },
    data: { stock: { increment: qty } },
  });
  if (res.count === 0) {
    await tx.locationStock.create({
      data: { tenantId, locationId, variantId, stock: qty },
    });
  }
}

/**
 * Records a manual stock adjustment with required audit reason and balance tracking.
 * Ensures tenant isolation, precision validation, atomic conditional updates, and negative stock enforcement.
 */
export async function recordStockAdjustment(
  params: StockAdjustmentParams,
  client: any = prisma
) {
  const { tenantId, variantId, locationId, quantityDelta, reason, notes, unitCost } = params;

  if (quantityDelta === 0 || quantityDelta === "0") {
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

    // 3. Validate precision against UOM
    const deltaDecimal = new Decimal(quantityDelta);
    const absQtyDecimal = parseAndValidateQuantity(deltaDecimal.abs(), variant.product.uom);
    const absQty = toPrismaQuantity(absQtyDecimal);
    const isDecrement = deltaDecimal.isNegative();

    // 4. Atomic conditional update
    let newBalance: number;
    if (isDecrement) {
      const res = await atomicDecrementStock(
        tx,
        variantId,
        tenantId,
        absQty,
        tenant.allowNegativeStock,
        variant.currentStock
      );
      newBalance = res.balanceAfter;
    } else {
      const res = await atomicIncrementStock(
        tx,
        variantId,
        tenantId,
        absQty,
        variant.currentStock
      );
      newBalance = res.balanceAfter;
    }

    const updatedRecord = tx.productVariant?.findUnique
      ? await tx.productVariant.findUnique({ where: { id: variant.id }, include: { product: true } })
      : await tx.productVariant.findFirst({ where: { id: variant.id, tenantId }, include: { product: true } });

    const updatedVariant = updatedRecord
      ? { ...updatedRecord, currentStock: newBalance }
      : { ...variant, currentStock: newBalance };

    // 5. Synchronize LocationStock if location is resolved and model is available
    const resolvedLocId = await resolveLocationForSync(tx, tenantId, locationId);
    if (resolvedLocId) {
      if (isDecrement) {
        await syncLocationDecrement(
          tx,
          tenantId,
          resolvedLocId,
          variantId,
          absQty,
          tenant.allowNegativeStock,
          variant.currentStock
        );
      } else {
        await syncLocationIncrement(tx, tenantId, resolvedLocId, variantId, absQty);
      }
    }

    const movementType = !isDecrement ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const movementCost = unitCost !== undefined ? unitCost : variant.purchasePrice;

    // 6. Record immutable movement ledger entry
    const movement = await tx.stockMovement.create({
      data: {
        tenantId,
        locationId: resolvedLocId || locationId || null,
        variantId: variant.id,
        type: movementType,
        quantity: absQty,
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
 * Features idempotency, Decimal SKU consolidation, and atomic conditional stock deduction.
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

    // 2. Fetch and validate variants
    const variantIds = Array.from(new Set(items.map((i) => i.variantId)));
    const variants = await fetchVariantsBatch(tx, variantIds, tenantId);
    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));

    for (const item of items) {
      if (!variantMap.has(item.variantId)) {
        throw new CrossTenantReferenceError(
          `Variant '${item.variantId}' does not belong to tenant '${tenantId}'`
        );
      }
    }

    // 3. Consolidate duplicate variantId items using Decimal arithmetic
    const itemsWithUom = items.map((it) => {
      const variant = variantMap.get(it.variantId)!;
      return {
        ...it,
        uom: it.uom || variant.product.uom,
      };
    });
    const consolidatedItems = consolidateVariantQuantities(itemsWithUom);

    const createdMovements = [];

    // 4. Resolve location for synchronization if applicable
    const resolvedLocId = await resolveLocationForSync(tx, tenantId, locationId);

    // 5. Atomic conditional deduction for each consolidated variant
    for (const consolidated of consolidatedItems) {
      const variant = variantMap.get(consolidated.variantId)!;
      const qtyToDeduct = consolidated.totalQuantityNumber;

      const decResult = await atomicDecrementStock(
        tx,
        consolidated.variantId,
        tenantId,
        qtyToDeduct,
        tenant.allowNegativeStock,
        variant.currentStock
      );

      if (resolvedLocId) {
        await syncLocationDecrement(
          tx,
          tenantId,
          resolvedLocId,
          consolidated.variantId,
          qtyToDeduct,
          tenant.allowNegativeStock,
          variant.currentStock
        );
      }

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          locationId: resolvedLocId || locationId || null,
          variantId: consolidated.variantId,
          type: "SALE",
          quantity: qtyToDeduct,
          unitCost: decResult.purchasePrice ?? variant.purchasePrice,
          balanceAfter: decResult.balanceAfter,
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
 * Features Decimal SKU consolidation, atomic increment, and idempotent ledger recording.
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
    // 1. Fetch and validate variants
    const variantIds = Array.from(new Set(items.map((i) => i.variantId)));
    const variants = await fetchVariantsBatch(tx, variantIds, tenantId);
    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));

    for (const item of items) {
      if (!variantMap.has(item.variantId)) {
        throw new CrossTenantReferenceError(
          `Variant '${item.variantId}' does not belong to tenant '${tenantId}'`
        );
      }
    }

    // 2. Consolidate duplicate variantId items using Decimal arithmetic
    const itemsWithUom = items.map((it) => {
      const variant = variantMap.get(it.variantId)!;
      return {
        ...it,
        uom: it.uom || variant.product.uom,
      };
    });
    const consolidatedItems = consolidateVariantQuantities(itemsWithUom);

    const resolvedLocId = await resolveLocationForSync(tx, tenantId, locationId);
    const createdMovements = [];

    for (const consolidated of consolidatedItems) {
      const variant = variantMap.get(consolidated.variantId)!;
      const matchingRawItem = items.find((i) => i.variantId === consolidated.variantId);
      const purchasePrice = matchingRawItem?.purchasePrice ?? variant.purchasePrice;
      const qtyToAdd = consolidated.totalQuantityNumber;

      const incResult = await atomicIncrementStock(
        tx,
        consolidated.variantId,
        tenantId,
        qtyToAdd,
        variant.currentStock,
        purchasePrice
      );

      if (resolvedLocId) {
        await syncLocationIncrement(tx, tenantId, resolvedLocId, consolidated.variantId, qtyToAdd);
      }

      // Update supplier-specific purchase price if supplier is provided
      if (supplierId && tx.supplierProductPrice) {
        const existingSupplierPrice = await tx.supplierProductPrice.findFirst({
          where: {
            tenantId,
            supplierId,
            variantId: consolidated.variantId,
          },
        });

        if (existingSupplierPrice) {
          await tx.supplierProductPrice.update({
            where: { id: existingSupplierPrice.id },
            data: {
              purchasePrice,
              supplierItemCode: matchingRawItem?.supplierItemCode || existingSupplierPrice.supplierItemCode,
            },
          });
        } else {
          await tx.supplierProductPrice.create({
            data: {
              tenantId,
              supplierId,
              variantId: consolidated.variantId,
              purchasePrice,
              supplierItemCode: matchingRawItem?.supplierItemCode || null,
            },
          });
        }
      }

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          locationId: resolvedLocId || locationId || null,
          variantId: consolidated.variantId,
          type: "PURCHASE",
          quantity: qtyToAdd,
          unitCost: purchasePrice,
          balanceAfter: incResult.balanceAfter,
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
 * Handles stock movements for sales and purchase returns with Decimal SKU consolidation.
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

    // 1. Fetch and validate variants
    const variantIds = Array.from(new Set(items.map((i) => i.variantId)));
    const variants = await fetchVariantsBatch(tx, variantIds, tenantId);
    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));

    for (const item of items) {
      if (!variantMap.has(item.variantId)) {
        throw new CrossTenantReferenceError(
          `Variant '${item.variantId}' does not belong to tenant '${tenantId}'`
        );
      }
    }

    // 2. Consolidate duplicate variantId items using Decimal arithmetic
    const itemsWithUom = items.map((it) => {
      const variant = variantMap.get(it.variantId)!;
      return {
        ...it,
        uom: it.uom || variant.product.uom,
      };
    });
    const consolidatedItems = consolidateVariantQuantities(itemsWithUom);

    const isSalesReturn = returnType === "SALES_RETURN";
    const movementType = isSalesReturn ? "RETURN_IN" : "RETURN_OUT";
    const resolvedLocId = await resolveLocationForSync(tx, tenantId, locationId);
    const createdMovements = [];

    for (const consolidated of consolidatedItems) {
      const variant = variantMap.get(consolidated.variantId)!;
      const matchingRawItem = items.find((i) => i.variantId === consolidated.variantId);
      const qty = consolidated.totalQuantityNumber;

      let balanceAfter: number;
      if (isSalesReturn) {
        // Sales return: put stock back (increment)
        const res = await atomicIncrementStock(
          tx,
          consolidated.variantId,
          tenantId,
          qty,
          variant.currentStock
        );
        balanceAfter = res.balanceAfter;

        if (resolvedLocId) {
          await syncLocationIncrement(tx, tenantId, resolvedLocId, consolidated.variantId, qty);
        }
      } else {
        // Purchase return: send stock back to vendor (decrement)
        const res = await atomicDecrementStock(
          tx,
          consolidated.variantId,
          tenantId,
          qty,
          tenant.allowNegativeStock,
          variant.currentStock
        );
        balanceAfter = res.balanceAfter;

        if (resolvedLocId) {
          await syncLocationDecrement(
            tx,
            tenantId,
            resolvedLocId,
            consolidated.variantId,
            qty,
            tenant.allowNegativeStock,
            variant.currentStock
          );
        }
      }

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          locationId: resolvedLocId || locationId || null,
          variantId: consolidated.variantId,
          type: movementType,
          quantity: qty,
          unitCost: matchingRawItem?.unitCost || variant.purchasePrice,
          balanceAfter,
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

  let totalUnitsDecimal = new Decimal(0);
  let totalValuation = new Decimal(0);
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const v of variants) {
    totalUnitsDecimal = totalUnitsDecimal.plus(new Decimal(v.currentStock));
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
    totalUnits: totalUnitsDecimal.toNumber(),
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
    locationId,
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

  // Fetch location-specific stock if locationId provided
  const locStockMap = new Map<string, number>();
  if (locationId && client.locationStock && typeof client.locationStock.findMany === "function") {
    const locStocks = await client.locationStock.findMany({
      where: { tenantId, locationId, variantId: { in: variants.map((v: any) => v.id) } },
      select: { variantId: true, stock: true },
    });
    for (const ls of locStocks) {
      locStockMap.set(ls.variantId, ls.stock);
    }
  }

  // Fetch active reservations for variants
  const reservationMap = new Map<string, number>();
  if (client.stockReservation && typeof client.stockReservation.findMany === "function") {
    const resWhere: any = {
      tenantId,
      status: { in: ["PENDING", "CONFIRMED"] },
      variantId: { in: variants.map((v: any) => v.id) },
    };
    if (locationId) resWhere.locationId = locationId;

    const resList = await client.stockReservation.findMany({
      where: resWhere,
      select: { variantId: true, quantity: true },
    });
    for (const r of resList) {
      const cur = reservationMap.get(r.variantId) || 0;
      reservationMap.set(r.variantId, cur + r.quantity);
    }
  }

  // Apply RBAC masking & format items
  const items = variants.map((v: any) => {
    const physicalStock = locationId ? (locStockMap.get(v.id) ?? 0) : v.currentStock;
    const reservedStock = reservationMap.get(v.id) ?? 0;
    const availableStock = Math.max(0, physicalStock - reservedStock);
    const isLow = availableStock <= (v.product?.minStockAlert ?? 5);

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
      currentStock: physicalStock,
      physicalStock,
      reservedStock,
      availableStock,
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
