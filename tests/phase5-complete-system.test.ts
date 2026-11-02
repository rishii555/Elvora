import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  reserveStock,
  releaseStockReservation,
  consumeStockReservation,
  getVariantStockAvailability,
  getLowStockInventory,
  InsufficientAvailableStockError,
  InvalidReservationStateError,
  ReservationNotFoundError,
} from "@/lib/inventory/reservation-service";
import { QuantityPrecisionError } from "@/lib/inventory/precision";
import { CrossTenantReferenceError } from "@/lib/tenant/isolation";

describe("Phase 5 Complete: Stock Reservation & Intelligent Reorder Management Suite", () => {
  const TENANT_A = "66111111111111111111111a";
  const TENANT_B = "66222222222222222222222b";

  const LOC_MAIN = "66333333333333333333331a";
  const LOC_WH1 = "66333333333333333333332a";

  const VARIANT_PCS = "66444444444444444444441a"; // PCS
  const VARIANT_KG = "66444444444444444444442a";  // KG

  let mockLocations: any[];
  let mockLocationStocks: any[];
  let mockVariants: any[];
  let mockReservations: any[];
  let mockDb: any;

  beforeEach(() => {
    mockLocations = [
      {
        id: LOC_MAIN,
        tenantId: TENANT_A,
        name: "Main Counter Store",
        isDefault: true,
        isActive: true,
      },
      {
        id: LOC_WH1,
        tenantId: TENANT_A,
        name: "Central Godown",
        isDefault: false,
        isActive: true,
      },
    ];

    mockLocationStocks = [
      {
        id: "ls-1",
        tenantId: TENANT_A,
        locationId: LOC_MAIN,
        variantId: VARIANT_PCS,
        stock: 30.0,
      },
      {
        id: "ls-2",
        tenantId: TENANT_A,
        locationId: LOC_WH1,
        variantId: VARIANT_PCS,
        stock: 70.0,
      },
    ];

    mockVariants = [
      {
        id: VARIANT_PCS,
        tenantId: TENANT_A,
        productId: "p-pcs",
        name: "Sanitaryware Basin Mixer",
        sku: "MIX-01",
        currentStock: 100.0,
        purchasePrice: 1500,
        sellingPrice: 2200,
        isActive: true,
        product: {
          id: "p-pcs",
          tenantId: TENANT_A,
          name: "Basin Mixer",
          uom: "PCS",
          minStockAlert: 15,
        },
      },
      {
        id: VARIANT_KG,
        tenantId: TENANT_A,
        productId: "p-kg",
        name: "Industrial Copper Wire",
        sku: "COPPER-WIRE-01",
        currentStock: 50.0,
        purchasePrice: 600,
        sellingPrice: 850,
        isActive: true,
        product: {
          id: "p-kg",
          tenantId: TENANT_A,
          name: "Copper Wire",
          uom: "KG",
          minStockAlert: 10,
        },
      },
    ];

    mockReservations = [];

    mockDb = {
      productVariant: {
        findFirst: vi.fn(async ({ where }: any) => {
          return mockVariants.find((v) => {
            if (where.tenantId && v.tenantId !== where.tenantId) return false;
            if (where.id && v.id !== where.id) return false;
            return true;
          }) || null;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return mockVariants.filter((v) => {
            if (where.tenantId && v.tenantId !== where.tenantId) return false;
            return true;
          });
        }),
      },
      inventoryLocation: {
        findFirst: vi.fn(async ({ where }: any) => {
          return mockLocations.find((l) => {
            if (where.tenantId && l.tenantId !== where.tenantId) return false;
            if (where.id && l.id !== where.id) return false;
            return true;
          }) || null;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return mockLocations.filter((l) => {
            if (where.tenantId && l.tenantId !== where.tenantId) return false;
            return true;
          });
        }),
      },
      locationStock: {
        findUnique: vi.fn(async ({ where }: any) => {
          const { locationId, variantId } = where.locationId_variantId || {};
          return mockLocationStocks.find(
            (ls) => ls.locationId === locationId && ls.variantId === variantId
          ) || null;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return mockLocationStocks.filter((ls) => {
            if (where.tenantId && ls.tenantId !== where.tenantId) return false;
            if (where.locationId && ls.locationId !== where.locationId) return false;
            return true;
          });
        }),
      },
      stockReservation: {
        findFirst: vi.fn(async ({ where }: any) => {
          return mockReservations.find((r) => {
            if (where.tenantId && r.tenantId !== where.tenantId) return false;
            if (where.id && r.id !== where.id) return false;
            if (where.referenceType && r.referenceType !== where.referenceType) return false;
            if (where.referenceId && r.referenceId !== where.referenceId) return false;
            if (where.status?.in && !where.status.in.includes(r.status)) return false;
            return true;
          }) || null;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return mockReservations.filter((r) => {
            if (where.tenantId && r.tenantId !== where.tenantId) return false;
            if (where.variantId && r.variantId !== where.variantId) return false;
            if (where.locationId && r.locationId !== where.locationId) return false;
            if (where.status?.in && !where.status.in.includes(r.status)) return false;
            if (where.status && typeof where.status === "string" && r.status !== where.status) return false;
            return true;
          });
        }),
        create: vi.fn(async ({ data }: any) => {
          const newRes = {
            id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockReservations.push(newRes);
          return newRes;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const r = mockReservations.find((x) => x.id === where.id);
          if (r) Object.assign(r, data, { updatedAt: new Date() });
          return r;
        }),
      },
    };
  });

  // =========================================================================
  // 1. Stock Availability & Reservations
  // =========================================================================
  describe("1. Stock Availability & Real-Time Balance Calculations", () => {
    it("should calculate available stock as physicalStock minus active reservations", async () => {
      // 100 on hand, 0 reserved => 100 available
      const initAvail = await getVariantStockAvailability(TENANT_A, VARIANT_PCS, null, mockDb);
      expect(initAvail.physicalStock).toBe(100);
      expect(initAvail.reservedStock).toBe(0);
      expect(initAvail.availableStock).toBe(100);

      // Add active reservation for 25 units
      mockReservations.push({
        id: "res-1",
        tenantId: TENANT_A,
        variantId: VARIANT_PCS,
        quantity: 25,
        status: "CONFIRMED",
      });

      const updatedAvail = await getVariantStockAvailability(TENANT_A, VARIANT_PCS, null, mockDb);
      expect(updatedAvail.physicalStock).toBe(100);
      expect(updatedAvail.reservedStock).toBe(25);
      expect(updatedAvail.availableStock).toBe(75); // 100 - 25 = 75
    });

    it("should accurately scope availability to a specific warehouse location", async () => {
      // LOC_MAIN has 30 units on hand
      const mainAvail = await getVariantStockAvailability(TENANT_A, VARIANT_PCS, LOC_MAIN, mockDb);
      expect(mainAvail.physicalStock).toBe(30);
      expect(mainAvail.availableStock).toBe(30);

      // LOC_WH1 has 70 units on hand
      const wh1Avail = await getVariantStockAvailability(TENANT_A, VARIANT_PCS, LOC_WH1, mockDb);
      expect(wh1Avail.physicalStock).toBe(70);
      expect(wh1Avail.availableStock).toBe(70);
    });

    it("should successfully create a reservation when available stock is sufficient", async () => {
      const result = await reserveStock(
        {
          tenantId: TENANT_A,
          variantId: VARIANT_PCS,
          quantity: 20,
          referenceType: "SALES_ORDER",
          referenceId: "SO-1001",
          notes: "Customer pending order",
        },
        mockDb
      );

      expect(result.idempotent).toBe(false);
      expect(result.reservation.status).toBe("CONFIRMED");
      expect(result.reservation.quantity).toBe(20);
      expect(result.availability.availableStock).toBe(80); // 100 - 20 = 80
    });

    it("should reject reservation when requested quantity exceeds available stock", async () => {
      // Add existing reservation of 90 units (leaves only 10 available)
      mockReservations.push({
        id: "res-existing",
        tenantId: TENANT_A,
        variantId: VARIANT_PCS,
        quantity: 90,
        status: "CONFIRMED",
      });

      // Requesting 15 units must fail
      await expect(
        reserveStock(
          {
            tenantId: TENANT_A,
            variantId: VARIANT_PCS,
            quantity: 15,
            referenceType: "SALES_ORDER",
            referenceId: "SO-1002",
          },
          mockDb
        )
      ).rejects.toThrow(InsufficientAvailableStockError);
    });

    it("should reject fractional reservations for discrete UOMs (PCS)", async () => {
      await expect(
        reserveStock(
          {
            tenantId: TENANT_A,
            variantId: VARIANT_PCS,
            quantity: 5.25,
            referenceType: "ESTIMATE",
            referenceId: "EST-101",
          },
          mockDb
        )
      ).rejects.toThrow(QuantityPrecisionError);
    });

    it("should support fractional reservations for continuous UOMs (KG)", async () => {
      const result = await reserveStock(
        {
          tenantId: TENANT_A,
          variantId: VARIANT_KG,
          quantity: "12.350",
          referenceType: "PRODUCTION_ORDER",
          referenceId: "PO-KG-01",
        },
        mockDb
      );

      expect(result.reservation.quantity).toBe(12.35);
      expect(result.availability.availableStock).toBe(37.65); // 50 - 12.35 = 37.65
    });

    it("should handle idempotent reservation replay without duplicate commitment", async () => {
      const res1 = await reserveStock(
        {
          tenantId: TENANT_A,
          variantId: VARIANT_PCS,
          quantity: 10,
          referenceType: "ORDER_LOCK",
          referenceId: "LOCK-99",
        },
        mockDb
      );
      expect(res1.idempotent).toBe(false);

      // Replay
      const res2 = await reserveStock(
        {
          tenantId: TENANT_A,
          variantId: VARIANT_PCS,
          quantity: 10,
          referenceType: "ORDER_LOCK",
          referenceId: "LOCK-99",
        },
        mockDb
      );
      expect(res2.idempotent).toBe(true);
      expect(mockReservations.length).toBe(1);
    });

    it("should reject cross-tenant reservation requests", async () => {
      await expect(
        reserveStock(
          {
            tenantId: TENANT_B,
            variantId: VARIANT_PCS, // Belongs to TENANT_A
            quantity: 5,
            referenceType: "MANUAL",
            referenceId: "CROSS-1",
          },
          mockDb
        )
      ).rejects.toThrow(CrossTenantReferenceError);
    });
  });

  // =========================================================================
  // 2. Reservation Lifecycle: Release & Consume
  // =========================================================================
  describe("2. Reservation Lifecycle Operations", () => {
    it("should release an active reservation, restoring available stock", async () => {
      const reservation = await mockDb.stockReservation.create({
        data: {
          tenantId: TENANT_A,
          variantId: VARIANT_PCS,
          quantity: 15,
          status: "CONFIRMED",
          referenceType: "ORDER",
          referenceId: "ORD-REL-1",
        },
      });

      const releaseResult = await releaseStockReservation(TENANT_A, reservation.id, mockDb);
      expect(releaseResult.idempotent).toBe(false);
      expect(releaseResult.reservation.status).toBe("RELEASED");

      // Availability should now exclude the released reservation
      const avail = await getVariantStockAvailability(TENANT_A, VARIANT_PCS, null, mockDb);
      expect(avail.reservedStock).toBe(0);
      expect(avail.availableStock).toBe(100);
    });

    it("should consume an active reservation upon order fulfillment", async () => {
      const reservation = await mockDb.stockReservation.create({
        data: {
          tenantId: TENANT_A,
          variantId: VARIANT_PCS,
          quantity: 10,
          status: "CONFIRMED",
          referenceType: "INVOICE",
          referenceId: "INV-CONSUME-1",
        },
      });

      const consumeResult = await consumeStockReservation(TENANT_A, reservation.id, mockDb);
      expect(consumeResult.idempotent).toBe(false);
      expect(consumeResult.reservation.status).toBe("CONSUMED");
    });

    it("should reject consuming an already released reservation", async () => {
      const reservation = await mockDb.stockReservation.create({
        data: {
          tenantId: TENANT_A,
          variantId: VARIANT_PCS,
          quantity: 5,
          status: "RELEASED",
          referenceType: "ORDER",
          referenceId: "ORD-ERR-1",
        },
      });

      await expect(
        consumeStockReservation(TENANT_A, reservation.id, mockDb)
      ).rejects.toThrow(InvalidReservationStateError);
    });

    it("should reject releasing an already consumed reservation", async () => {
      const reservation = await mockDb.stockReservation.create({
        data: {
          tenantId: TENANT_A,
          variantId: VARIANT_PCS,
          quantity: 5,
          status: "CONSUMED",
          referenceType: "ORDER",
          referenceId: "ORD-ERR-2",
        },
      });

      await expect(
        releaseStockReservation(TENANT_A, reservation.id, mockDb)
      ).rejects.toThrow(InvalidReservationStateError);
    });

    it("should return not found for non-existent reservation ID", async () => {
      await expect(
        releaseStockReservation(TENANT_A, "non-existent-res", mockDb)
      ).rejects.toThrow(ReservationNotFoundError);
    });
  });

  // =========================================================================
  // 3. Low-Stock Monitoring & Reorder Suggestions
  // =========================================================================
  describe("3. Low-Stock & Replenishment Suggestions", () => {
    it("should flag an item as low stock when reservations reduce availableStock below safety alert", async () => {
      // Threshold is 15. Physical stock is 100.
      // Reserve 90 units => Available is 10 (which is <= 15!)
      mockReservations.push({
        id: "res-low",
        tenantId: TENANT_A,
        variantId: VARIANT_PCS,
        quantity: 90,
        status: "CONFIRMED",
      });

      const data = await getLowStockInventory(TENANT_A, {}, mockDb);
      expect(data.totalLowStock).toBeGreaterThan(0);

      const item = data.lowStockItems.find((i) => i.variantId === VARIANT_PCS);
      expect(item).toBeDefined();
      expect(item?.physicalStock).toBe(100);
      expect(item?.reservedStock).toBe(90);
      expect(item?.availableStock).toBe(10);
      expect(item?.threshold).toBe(15);
      // Suggested reorder: (15 * 2) - 10 = 20 units
      expect(item?.suggestedReorder).toBe(20);
    });

    it("should report zero low-stock items when all available stocks are healthy", async () => {
      // No reservations, physical stocks: 100 > 15 (PCS) and 50 > 10 (KG)
      const data = await getLowStockInventory(TENANT_A, {}, mockDb);
      expect(data.totalLowStock).toBe(0);
      expect(data.lowStockItems).toHaveLength(0);
    });

    it("should support location-filtered low-stock identification", async () => {
      // LOC_MAIN only has 30 units of VARIANT_PCS.
      // If we reserve 20 units at LOC_MAIN, available at LOC_MAIN is 10 <= 15!
      mockReservations.push({
        id: "res-main",
        tenantId: TENANT_A,
        locationId: LOC_MAIN,
        variantId: VARIANT_PCS,
        quantity: 20,
        status: "CONFIRMED",
      });

      const data = await getLowStockInventory(TENANT_A, { locationId: LOC_MAIN }, mockDb);
      const item = data.lowStockItems.find((i) => i.variantId === VARIANT_PCS);
      expect(item).toBeDefined();
      expect(item?.physicalStock).toBe(30);
      expect(item?.availableStock).toBe(10);
    });
  });
});
