import prisma, { runTransactionWithRetry } from "@/lib/db/prisma";
import { Decimal } from "@/lib/finance/decimal";
import { CrossTenantReferenceError } from "@/lib/tenant/isolation";
import { consolidateVariantQuantities } from "@/lib/inventory/precision";
import { InsufficientStockError } from "@/lib/inventory/service";

export class LocationNotFoundError extends Error {
  constructor(locationId: string) {
    super(`Inventory location '${locationId}' not found`);
    this.name = "LocationNotFoundError";
  }
}

export class LocationNameExistsError extends Error {
  constructor(name: string) {
    super(`Inventory location with name '${name}' already exists for this tenant`);
    this.name = "LocationNameExistsError";
  }
}

export class LocationHasStockError extends Error {
  public readonly remainingStock: number;
  public readonly locationId: string;

  constructor(locationId: string, remainingStock: number) {
    super(
      `Cannot archive location containing active stock. Remaining inventory: ${remainingStock} units. Transfer or adjust inventory first.`
    );
    this.name = "LocationHasStockError";
    this.locationId = locationId;
    this.remainingStock = remainingStock;
  }
}

export class InvalidTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransferError";
  }
}

export interface CreateLocationInput {
  name: string;
  code?: string | null;
  address?: string | null;
  isDefault?: boolean;
}

export interface UpdateLocationInput {
  name?: string;
  code?: string | null;
  address?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface WarehouseTransferItem {
  variantId: string;
  quantity: number | string | Decimal;
  uom?: string;
}

export interface WarehouseTransferParams {
  tenantId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  items: WarehouseTransferItem[];
  notes?: string;
  idempotencyKey?: string;
  userId?: string;
}

/**
 * Ensures a default inventory location exists for the tenant.
 * Creates "Main Store Counter" if no location exists.
 */
export async function getOrCreateDefaultLocation(tenantId: string, client: any = prisma) {
  const existingDefault = await client.inventoryLocation.findFirst({
    where: { tenantId, isDefault: true, isActive: true },
  });
  if (existingDefault) return existingDefault;

  const existingAny = await client.inventoryLocation.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (existingAny) {
    return await client.inventoryLocation.update({
      where: { id: existingAny.id },
      data: { isDefault: true },
    });
  }

  return await client.inventoryLocation.create({
    data: {
      tenantId,
      name: "Main Store Counter",
      code: "LOC-MAIN",
      isDefault: true,
      isActive: true,
    },
  });
}

/**
 * Creates a new inventory location within the tenant boundary.
 * Enforces case-insensitive uniqueness on location name per tenant.
 */
export async function createInventoryLocation(
  tenantId: string,
  input: CreateLocationInput,
  client: any = prisma
) {
  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    throw new Error("Location name is required");
  }

  return await runTransactionWithRetry(
    client,
    async (tx: any) => {
    // 1. Case-insensitive uniqueness check per tenant
    const existing = await tx.inventoryLocation.findFirst({
      where: {
        tenantId,
        name: { equals: trimmedName, mode: "insensitive" },
      },
    });

    if (existing) {
      throw new LocationNameExistsError(trimmedName);
    }

    // 2. Default location management
    const isDefault = input.isDefault ?? false;
    if (isDefault) {
      await tx.inventoryLocation.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // 3. Create location
    return await tx.inventoryLocation.create({
      data: {
        tenantId,
        name: trimmedName,
        code: input.code?.trim() || null,
        address: input.address?.trim() || null,
        isDefault,
        isActive: true,
      },
    });
  });
}

/**
 * Updates an inventory location with tenant isolation and archive safeguards.
 * Prevents deactivating a location with non-zero stock.
 */
export async function updateInventoryLocation(
  tenantId: string,
  locationId: string,
  input: UpdateLocationInput,
  client: any = prisma
) {
  return await runTransactionWithRetry(
    client,
    async (tx: any) => {
    const location = await tx.inventoryLocation.findFirst({
      where: { id: locationId, tenantId },
    });

    if (!location) {
      throw new LocationNotFoundError(locationId);
    }

    // Name uniqueness check if name is being changed
    if (input.name && input.name.trim().toLowerCase() !== location.name.toLowerCase()) {
      const duplicate = await tx.inventoryLocation.findFirst({
        where: {
          tenantId,
          name: { equals: input.name.trim(), mode: "insensitive" },
          id: { not: locationId },
        },
      });
      if (duplicate) {
        throw new LocationNameExistsError(input.name.trim());
      }
    }

    // Archiving / deactivation validation: MUST verify zero remaining stock
    if (input.isActive === false && location.isActive === true) {
      if (tx.locationStock && typeof tx.locationStock.findMany === "function") {
        const nonZeroStocks = await tx.locationStock.findMany({
          where: {
            tenantId,
            locationId,
            stock: { gt: 0.0001 },
          },
        });

        if (nonZeroStocks.length > 0) {
          const totalRemaining = nonZeroStocks.reduce(
            (sum: number, s: any) => sum + (s.stock || 0),
            0
          );
          throw new LocationHasStockError(locationId, totalRemaining);
        }
      }

      // If archiving the default location, reassign default to another active location if available
      if (location.isDefault) {
        const otherActive = await tx.inventoryLocation.findFirst({
          where: { tenantId, id: { not: locationId }, isActive: true },
        });
        if (otherActive) {
          await tx.inventoryLocation.update({
            where: { id: otherActive.id },
            data: { isDefault: true },
          });
        }
      }
    }

    // Default status management
    if (input.isDefault === true) {
      await tx.inventoryLocation.updateMany({
        where: { tenantId, isDefault: true, id: { not: locationId } },
        data: { isDefault: false },
      });
    }

    return await tx.inventoryLocation.update({
      where: { id: locationId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  });
}

/**
 * Archives (deactivates) an inventory location after verifying zero active stock.
 */
export async function archiveInventoryLocation(
  tenantId: string,
  locationId: string,
  client: any = prisma
) {
  return await updateInventoryLocation(tenantId, locationId, { isActive: false }, client);
}

/**
 * Lists inventory locations with stock summaries (totalSkus, totalUnits) for the tenant.
 */
export async function listInventoryLocations(
  tenantId: string,
  options?: { includeInactive?: boolean; search?: string },
  client: any = prisma
) {
  const where: any = { tenantId };
  if (!options?.includeInactive) {
    where.isActive = true;
  }
  if (options?.search?.trim()) {
    where.name = { contains: options.search.trim(), mode: "insensitive" };
  }

  const locations = await client.inventoryLocation.findMany({
    where,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      stocks: {
        where: { stock: { gt: 0 } },
        select: { stock: true, variantId: true },
      },
    },
  });

  return locations.map((loc: any) => {
    const totalUnits = (loc.stocks || []).reduce(
      (sum: number, s: any) => sum + (s.stock || 0),
      0
    );
    const totalSkus = (loc.stocks || []).length;
    const { stocks, ...rest } = loc;
    return {
      ...rest,
      totalUnits,
      totalSkus,
    };
  });
}

/**
 * Fetches all stock items currently held at a specific inventory location.
 */
export async function getLocationStock(
  tenantId: string,
  locationId: string,
  client: any = prisma
) {
  const location = await client.inventoryLocation.findFirst({
    where: { id: locationId, tenantId },
  });
  if (!location) {
    throw new LocationNotFoundError(locationId);
  }

  const stocks = await client.locationStock.findMany({
    where: { tenantId, locationId },
    include: {
      variant: {
        include: {
          product: {
            select: { name: true, uom: true, minStockAlert: true, hsnCode: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    location,
    items: stocks.map((s: any) => ({
      id: s.id,
      variantId: s.variantId,
      variantName: s.variant?.name || "Standard",
      sku: s.variant?.sku || "",
      barcode: s.variant?.barcode || null,
      productName: s.variant?.product?.name || "",
      uom: s.variant?.product?.uom || "PCS",
      stock: s.stock,
      purchasePrice: s.variant?.purchasePrice || 0,
      sellingPrice: s.variant?.sellingPrice || 0,
      minStockAlert: s.variant?.product?.minStockAlert ?? 5,
    })),
  };
}

/**
 * Returns location-by-location breakdown for a product or variant.
 * Guarantees tenant isolation and verifies variant ownership.
 */
export async function getStockAcrossLocations(
  tenantId: string,
  query: { productId?: string; variantId?: string },
  client: any = prisma
) {
  const { productId, variantId } = query;

  if (variantId) {
    const variant = await client.productVariant.findFirst({
      where: { id: variantId, tenantId },
      include: { product: true },
    });
    if (!variant) {
      throw new CrossTenantReferenceError(`Variant '${variantId}' does not belong to tenant '${tenantId}'`);
    }

    const locations = await client.inventoryLocation.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    const locationStocks = await client.locationStock.findMany({
      where: { tenantId, variantId },
    });

    const stockMap = new Map<string, number>(
      locationStocks.map((ls: any) => [ls.locationId, ls.stock])
    );

    const breakdown = locations.map((loc: any) => ({
      locationId: loc.id,
      locationName: loc.name,
      isDefault: loc.isDefault,
      stock: stockMap.get(loc.id) ?? 0,
    }));

    const aggregateStock = breakdown.reduce((sum: number, b: any) => sum + b.stock, 0);

    return {
      variantId: variant.id,
      variantName: variant.name,
      sku: variant.sku,
      productName: variant.product.name,
      uom: variant.product.uom,
      currentStock: variant.currentStock,
      aggregateStock,
      locations: breakdown,
    };
  }

  if (productId) {
    const product = await client.product.findFirst({
      where: { id: productId, tenantId },
      include: { variants: true },
    });
    if (!product) {
      throw new CrossTenantReferenceError(`Product '${productId}' does not belong to tenant '${tenantId}'`);
    }

    const locations = await client.inventoryLocation.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    const variantIds = product.variants.map((v: any) => v.id);
    const locationStocks = await client.locationStock.findMany({
      where: { tenantId, variantId: { in: variantIds } },
    });

    const stockMap = new Map<string, number>();
    for (const ls of locationStocks) {
      stockMap.set(`${ls.variantId}:${ls.locationId}`, ls.stock);
    }

    const variantsBreakdown = product.variants.map((v: any) => {
      const breakdown = locations.map((loc: any) => ({
        locationId: loc.id,
        locationName: loc.name,
        isDefault: loc.isDefault,
        stock: stockMap.get(`${v.id}:${loc.id}`) ?? 0,
      }));
      const aggregateStock = breakdown.reduce((sum: number, b: any) => sum + b.stock, 0);
      return {
        variantId: v.id,
        variantName: v.name,
        sku: v.sku,
        currentStock: v.currentStock,
        aggregateStock,
        locations: breakdown,
      };
    });

    return {
      productId: product.id,
      productName: product.name,
      uom: product.uom,
      variants: variantsBreakdown,
    };
  }

  throw new Error("Either variantId or productId must be provided");
}

/**
 * Executes an atomic warehouse-to-warehouse stock transfer.
 * 
 * Safeguards:
 * - Validates source and destination locations belong to the same tenant.
 * - Rejects transfers where source and destination are the same location.
 * - Enforces active location status (no transfers to/from archived locations).
 * - Performs arbitrary-precision Decimal validation and duplicate variant SKU consolidation.
 * - Atomically decrements source LocationStock with conditional `stock: { gte: qty }` (fails closed).
 * - Atomically increments/upserts destination LocationStock.
 * - ProductVariant.currentStock is invariant under transfer (total stock does not drift).
 * - Records double immutable StockMovement ledger entries with accurate post-update balances.
 * - Idempotency protection with stable referenceId.
 */
export async function executeWarehouseTransfer(
  params: WarehouseTransferParams,
  client: any = prisma
) {
  const { tenantId, sourceLocationId, destinationLocationId, items, notes, idempotencyKey } = params;

  // 1. Source and Destination validation
  if (!sourceLocationId || !destinationLocationId) {
    throw new InvalidTransferError("Source and destination location IDs are required");
  }

  if (sourceLocationId === destinationLocationId) {
    throw new InvalidTransferError("Source and destination locations cannot be the same");
  }

  if (!items || items.length === 0) {
    throw new InvalidTransferError("Transfer items list cannot be empty");
  }

  const transferId = idempotencyKey || `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // 2. Idempotency check
  if (idempotencyKey) {
    const existingMovements = await client.stockMovement.findMany({
      where: {
        tenantId,
        referenceId: idempotencyKey,
        referenceType: "WAREHOUSE_TRANSFER",
        type: "TRANSFER",
      },
    });

    if (existingMovements.length > 0) {
      return {
        idempotent: true,
        transferId: idempotencyKey,
        movements: existingMovements,
      };
    }
  }

  return await runTransactionWithRetry(
    client,
    async (tx: any) => {
    // 3. Verify both locations exist, belong to tenant, and are active
    const [sourceLocation, destLocation] = await Promise.all([
      tx.inventoryLocation.findFirst({ where: { id: sourceLocationId, tenantId } }),
      tx.inventoryLocation.findFirst({ where: { id: destinationLocationId, tenantId } }),
    ]);

    if (!sourceLocation) {
      throw new CrossTenantReferenceError(
        `Source location '${sourceLocationId}' does not belong to tenant '${tenantId}'`
      );
    }
    if (!destLocation) {
      throw new CrossTenantReferenceError(
        `Destination location '${destinationLocationId}' does not belong to tenant '${tenantId}'`
      );
    }

    if (!sourceLocation.isActive) {
      throw new InvalidTransferError(`Source location '${sourceLocation.name}' is archived or inactive`);
    }
    if (!destLocation.isActive) {
      throw new InvalidTransferError(`Destination location '${destLocation.name}' is archived or inactive`);
    }

    // 4. Batch fetch variants and verify tenant ownership
    const variantIds = Array.from(new Set(items.map((i) => i.variantId)));
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds }, tenantId },
      include: { product: true },
    });
    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));

    for (const item of items) {
      if (!variantMap.has(item.variantId)) {
        throw new CrossTenantReferenceError(
          `Variant '${item.variantId}' does not belong to tenant '${tenantId}'`
        );
      }
    }

    // 5. Consolidate variant quantities with Decimal precision and UOM validation
    const itemsWithUom = items.map((it) => {
      const v = variantMap.get(it.variantId)!;
      return {
        ...it,
        uom: it.uom || v.product.uom,
      };
    });
    const consolidatedItems = consolidateVariantQuantities(itemsWithUom);

    const createdMovements: any[] = [];

    // 6. Execute atomic transfer for each consolidated variant
    for (const consolidated of consolidatedItems) {
      const variant = variantMap.get(consolidated.variantId)!;
      const qty = consolidated.totalQuantityNumber;

      // Check if source location stock record exists. If missing, and it is the default location,
      // self-heal/seed it from variant.currentStock.
      let srcStockRecord = await tx.locationStock.findUnique({
        where: { locationId_variantId: { locationId: sourceLocationId, variantId: consolidated.variantId } },
      });

      if (!srcStockRecord && sourceLocation.isDefault && variant.currentStock > 0) {
        srcStockRecord = await tx.locationStock.create({
          data: {
            tenantId,
            locationId: sourceLocationId,
            variantId: consolidated.variantId,
            stock: variant.currentStock,
          },
        });
      }

      // Atomic conditional decrement from source location stock
      const decResult = await tx.locationStock.updateMany({
        where: {
          tenantId,
          locationId: sourceLocationId,
          variantId: consolidated.variantId,
          stock: { gte: qty },
        },
        data: { stock: { decrement: qty } },
      });

      if (decResult.count === 0) {
        const available = srcStockRecord?.stock ?? 0;
        throw new InsufficientStockError(consolidated.variantId, available, qty);
      }

      // Atomic increment at destination location stock
      const incResult = await tx.locationStock.updateMany({
        where: {
          tenantId,
          locationId: destinationLocationId,
          variantId: consolidated.variantId,
        },
        data: { stock: { increment: qty } },
      });

      if (incResult.count === 0) {
        await tx.locationStock.create({
          data: {
            tenantId,
            locationId: destinationLocationId,
            variantId: consolidated.variantId,
            stock: qty,
          },
        });
      }

      // Read updated balances for accurate audit ledger recording
      const [updatedSrc, updatedDest] = await Promise.all([
        tx.locationStock.findUnique({
          where: { locationId_variantId: { locationId: sourceLocationId, variantId: consolidated.variantId } },
          select: { stock: true },
        }),
        tx.locationStock.findUnique({
          where: { locationId_variantId: { locationId: destinationLocationId, variantId: consolidated.variantId } },
          select: { stock: true },
        }),
      ]);

      const sourceBalanceAfter = updatedSrc?.stock ?? 0;
      const destBalanceAfter = updatedDest?.stock ?? qty;

      // Note: ProductVariant.currentStock is invariant under warehouse transfer.
      // Total inventory across all warehouses remains unchanged.

      // Record double ledger entries
      // 1. Source: Transfer OUT
      const outMovement = await tx.stockMovement.create({
        data: {
          tenantId,
          locationId: sourceLocationId,
          variantId: consolidated.variantId,
          type: "TRANSFER",
          quantity: qty,
          unitCost: variant.purchasePrice,
          balanceAfter: sourceBalanceAfter,
          referenceType: "WAREHOUSE_TRANSFER",
          referenceId: transferId,
          reason: "WAREHOUSE_TRANSFER_OUT",
          notes: notes
            ? `${notes} (Transfer OUT to ${destLocation.name})`
            : `Transfer OUT to ${destLocation.name}`,
        },
      });

      // 2. Destination: Transfer IN
      const inMovement = await tx.stockMovement.create({
        data: {
          tenantId,
          locationId: destinationLocationId,
          variantId: consolidated.variantId,
          type: "TRANSFER",
          quantity: qty,
          unitCost: variant.purchasePrice,
          balanceAfter: destBalanceAfter,
          referenceType: "WAREHOUSE_TRANSFER",
          referenceId: transferId,
          reason: "WAREHOUSE_TRANSFER_IN",
          notes: notes
            ? `${notes} (Transfer IN from ${sourceLocation.name})`
            : `Transfer IN from ${sourceLocation.name}`,
        },
      });

      createdMovements.push(outMovement, inMovement);
    }

    return {
      idempotent: false,
      transferId,
      movements: createdMovements,
    };
  }, { maxRetries: 4, baseDelayMs: 50, maxDelayMs: 500, idempotencyKey });
}
