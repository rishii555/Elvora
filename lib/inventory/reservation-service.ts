import prisma, { runInTransaction } from "@/lib/db/prisma";
import { Decimal } from "@/lib/finance/decimal";
import { CrossTenantReferenceError } from "@/lib/tenant/isolation";
import {
  parseAndValidateQuantity,
  toPrismaQuantity,
} from "@/lib/inventory/precision";

export class InsufficientAvailableStockError extends Error {
  public readonly variantId: string;
  public readonly physicalStock: number;
  public readonly reservedStock: number;
  public readonly availableStock: number;
  public readonly requestedQuantity: number;

  constructor(
    variantId: string,
    physicalStock: number,
    reservedStock: number,
    availableStock: number,
    requestedQuantity: number
  ) {
    super(
      `Insufficient available stock for variant '${variantId}': Physical=${physicalStock}, Reserved=${reservedStock}, Available=${availableStock}, Requested=${requestedQuantity}.`
    );
    this.name = "InsufficientAvailableStockError";
    this.variantId = variantId;
    this.physicalStock = physicalStock;
    this.reservedStock = reservedStock;
    this.availableStock = availableStock;
    this.requestedQuantity = requestedQuantity;
  }
}

export class ReservationNotFoundError extends Error {
  constructor(id: string) {
    super(`Stock reservation '${id}' not found`);
    this.name = "ReservationNotFoundError";
  }
}

export class InvalidReservationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReservationStateError";
  }
}

export interface ReserveStockInput {
  tenantId: string;
  variantId: string;
  locationId?: string | null;
  quantity: number | string | Decimal;
  referenceType: string;
  referenceId: string;
  notes?: string;
  expiresAt?: Date | string | null;
}

export interface StockAvailabilityResult {
  variantId: string;
  variantName: string;
  sku: string;
  uom: string;
  locationId?: string | null;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  minStockAlert: number;
}

/**
 * Calculates real-time stock availability for a variant, distinguishing:
 * - physicalStock: Current physical stock on hand (from ProductVariant or LocationStock)
 * - reservedStock: Sum of active (PENDING, CONFIRMED) reservations
 * - availableStock: max(0, physicalStock - reservedStock)
 */
export async function getVariantStockAvailability(
  tenantId: string,
  variantId: string,
  locationId?: string | null,
  client: any = prisma
): Promise<StockAvailabilityResult> {
  const variant = await client.productVariant.findFirst({
    where: { id: variantId, tenantId },
    include: { product: true },
  });

  if (!variant) {
    throw new CrossTenantReferenceError(`Variant '${variantId}' does not belong to tenant '${tenantId}'`);
  }

  let physicalStock = variant.currentStock;

  if (locationId) {
    const locStock = await client.locationStock.findUnique({
      where: { locationId_variantId: { locationId, variantId } },
      select: { stock: true },
    });
    physicalStock = locStock?.stock ?? 0;
  }

  // Query active reservations
  const resWhere: any = {
    tenantId,
    variantId,
    status: { in: ["PENDING", "CONFIRMED"] },
  };
  if (locationId) {
    resWhere.locationId = locationId;
  }

  const activeReservations = await client.stockReservation.findMany({
    where: resWhere,
    select: { quantity: true },
  });

  const reservedDecimal = activeReservations.reduce(
    (acc: Decimal, r: any) => acc.plus(new Decimal(r.quantity)),
    new Decimal(0)
  );
  const reservedStock = reservedDecimal.toNumber();

  const physicalDecimal = new Decimal(physicalStock);
  const availableDecimal = physicalDecimal.minus(reservedDecimal);
  const availableStock = Math.max(0, availableDecimal.toNumber());

  return {
    variantId: variant.id,
    variantName: variant.name,
    sku: variant.sku,
    uom: variant.product.uom,
    locationId: locationId || null,
    physicalStock,
    reservedStock,
    availableStock,
    minStockAlert: variant.product.minStockAlert ?? 5,
  };
}

/**
 * Creates a stock reservation against available inventory.
 * Validates UOM precision, verifies availableStock >= requestedQuantity,
 * and records the reservation atomically.
 */
export async function reserveStock(input: ReserveStockInput, client: any = prisma) {
  const { tenantId, variantId, locationId, quantity, referenceType, referenceId, notes, expiresAt } = input;

  return await runInTransaction(client, async (tx: any) => {
    // 1. Fetch variant with tenant boundary
    const variant = await tx.productVariant.findFirst({
      where: { id: variantId, tenantId },
      include: { product: true },
    });
    if (!variant) {
      throw new CrossTenantReferenceError(`Variant '${variantId}' does not belong to tenant '${tenantId}'`);
    }

    // 2. Validate location if supplied
    if (locationId) {
      const location = await tx.inventoryLocation.findFirst({
        where: { id: locationId, tenantId },
      });
      if (!location) {
        throw new CrossTenantReferenceError(`Location '${locationId}' does not belong to tenant '${tenantId}'`);
      }
      if (!location.isActive) {
        throw new InvalidReservationStateError(`Cannot reserve stock in inactive location '${location.name}'`);
      }
    }

    // 3. Precision validation against UOM
    const validatedQtyDecimal = parseAndValidateQuantity(quantity, variant.product.uom);
    const requestedQty = toPrismaQuantity(validatedQtyDecimal);

    // 4. Calculate available stock
    const availability = await getVariantStockAvailability(tenantId, variantId, locationId, tx);

    if (requestedQty > availability.availableStock) {
      throw new InsufficientAvailableStockError(
        variantId,
        availability.physicalStock,
        availability.reservedStock,
        availability.availableStock,
        requestedQty
      );
    }

    // 5. Idempotency check: see if reservation for this reference already exists
    const existing = await tx.stockReservation.findFirst({
      where: {
        tenantId,
        referenceType,
        referenceId,
        variantId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (existing) {
      return {
        idempotent: true,
        reservation: existing,
        availability,
      };
    }

    // 6. Create reservation
    const reservation = await tx.stockReservation.create({
      data: {
        tenantId,
        locationId: locationId || null,
        variantId,
        quantity: requestedQty,
        status: "CONFIRMED",
        referenceType,
        referenceId,
        notes: notes || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        variant: {
          include: { product: true },
        },
        location: true,
      },
    });

    const newAvailable = Math.max(0, availability.availableStock - requestedQty);

    return {
      idempotent: false,
      reservation,
      availability: {
        ...availability,
        reservedStock: availability.reservedStock + requestedQty,
        availableStock: newAvailable,
      },
    };
  });
}

/**
 * Releases an active stock reservation back to available inventory.
 */
export async function releaseStockReservation(
  tenantId: string,
  reservationId: string,
  client: any = prisma
) {
  return await runInTransaction(client, async (tx: any) => {
    const reservation = await tx.stockReservation.findFirst({
      where: { id: reservationId, tenantId },
    });

    if (!reservation) {
      throw new ReservationNotFoundError(reservationId);
    }

    if (reservation.status === "RELEASED") {
      return { idempotent: true, reservation };
    }

    if (reservation.status === "CONSUMED") {
      throw new InvalidReservationStateError("Cannot release an already consumed reservation");
    }

    const updated = await tx.stockReservation.update({
      where: { id: reservationId },
      data: { status: "RELEASED" },
    });

    return { idempotent: false, reservation: updated };
  });
}

/**
 * Marks a stock reservation as consumed when the related order/invoice completes.
 */
export async function consumeStockReservation(
  tenantId: string,
  reservationId: string,
  client: any = prisma
) {
  return await runInTransaction(client, async (tx: any) => {
    const reservation = await tx.stockReservation.findFirst({
      where: { id: reservationId, tenantId },
    });

    if (!reservation) {
      throw new ReservationNotFoundError(reservationId);
    }

    if (reservation.status === "CONSUMED") {
      return { idempotent: true, reservation };
    }

    if (reservation.status === "RELEASED") {
      throw new InvalidReservationStateError("Cannot consume an already released reservation");
    }

    const updated = await tx.stockReservation.update({
      where: { id: reservationId },
      data: { status: "CONSUMED" },
    });

    return { idempotent: false, reservation: updated };
  });
}

/**
 * Lists stock reservations with filtering and status counts.
 */
export async function listStockReservations(
  tenantId: string,
  options?: {
    variantId?: string;
    locationId?: string;
    status?: "PENDING" | "CONFIRMED" | "RELEASED" | "CONSUMED" | "ALL_ACTIVE";
    limit?: number;
  },
  client: any = prisma
) {
  const where: any = { tenantId };

  if (options?.variantId) where.variantId = options.variantId;
  if (options?.locationId) where.locationId = options.locationId;

  if (options?.status === "ALL_ACTIVE") {
    where.status = { in: ["PENDING", "CONFIRMED"] };
  } else if (options?.status) {
    where.status = options.status;
  }

  const reservations = await client.stockReservation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit || 50,
    include: {
      location: { select: { id: true, name: true, code: true } },
      variant: {
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          product: { select: { name: true, uom: true } },
        },
      },
    },
  });

  return reservations;
}

/**
 * Retrieves low-stock inventory items, comparing physical, reserved, and available stock
 * against alert thresholds. Computes intelligent reorder recommendations.
 */
export async function getLowStockInventory(
  tenantId: string,
  options?: { locationId?: string; limit?: number },
  client: any = prisma
) {
  const where: any = { tenantId, isActive: true };

  const [variants, locations, activeReservations] = await Promise.all([
    client.productVariant.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, uom: true, minStockAlert: true } },
      },
    }),
    client.inventoryLocation.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, isDefault: true },
    }),
    client.stockReservation.findMany({
      where: { tenantId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { variantId: true, locationId: true, quantity: true },
    }),
  ]);

  // Map active reservations by variantId and optional locationId
  const reservationMap = new Map<string, Decimal>();
  for (const r of activeReservations) {
    if (r.locationId) {
      const key = `${r.variantId}:${r.locationId}`;
      const cur = reservationMap.get(key) || new Decimal(0);
      reservationMap.set(key, cur.plus(new Decimal(r.quantity)));
    }

    // Track aggregate per variantId
    const aggCur = reservationMap.get(r.variantId) || new Decimal(0);
    reservationMap.set(r.variantId, aggCur.plus(new Decimal(r.quantity)));
  }

  let locationStocksMap = new Map<string, number>();
  if (options?.locationId) {
    const locStocks = await client.locationStock.findMany({
      where: { tenantId, locationId: options.locationId },
    });
    for (const ls of locStocks) {
      locationStocksMap.set(ls.variantId, ls.stock);
    }
  }

  const lowStockItems = [];

  for (const v of variants) {
    const threshold = v.product?.minStockAlert ?? 5;
    let physicalStock = v.currentStock;

    if (options?.locationId) {
      physicalStock = locationStocksMap.get(v.id) ?? 0;
    }

    const resKey = options?.locationId ? `${v.id}:${options.locationId}` : v.id;
    const reservedStock = (reservationMap.get(resKey) || new Decimal(0)).toNumber();
    const availableStock = Math.max(0, physicalStock - reservedStock);

    const isLowStock = availableStock <= threshold;
    const isOutOfStock = availableStock <= 0;

    if (isLowStock) {
      // Intelligent reorder suggestion: replenish to double threshold + active reservations
      const suggestedReorder = Math.max(0, threshold * 2 - availableStock);

      lowStockItems.push({
        variantId: v.id,
        variantName: v.name,
        sku: v.sku,
        productName: v.product.name,
        uom: v.product.uom,
        purchasePrice: v.purchasePrice,
        sellingPrice: v.sellingPrice,
        threshold,
        physicalStock,
        reservedStock,
        availableStock,
        isOutOfStock,
        suggestedReorder,
      });
    }
  }

  return {
    lowStockItems,
    totalLowStock: lowStockItems.length,
    locations,
  };
}
