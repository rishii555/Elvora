import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInventoryLocation,
  updateInventoryLocation,
  archiveInventoryLocation,
  getLocationStock,
  getStockAcrossLocations,
  executeWarehouseTransfer,
  LocationNameExistsError,
  LocationHasStockError,
  LocationNotFoundError,
  InvalidTransferError,
} from "@/lib/inventory/warehouse-service";
import {
  recordStockAdjustment,
  processStockDeductionFromSale,
  processStockReceiptFromPurchase,
  processStockReturn,
  InsufficientStockError,
} from "@/lib/inventory/service";
import { QuantityPrecisionError } from "@/lib/inventory/precision";
import { CrossTenantReferenceError } from "@/lib/tenant/isolation";

describe("Phase 5B: Advanced Inventory & Multi-Warehouse Management Suite", () => {
  const TENANT_A = "66111111111111111111111a";
  const TENANT_B = "66222222222222222222222b";

  const LOC_MAIN_A = "66333333333333333333331a";
  const LOC_WH1_A = "66333333333333333333332a";
  const LOC_MAIN_B = "66333333333333333333331b";

  const VARIANT_A_PCS = "66444444444444444444441a"; // Discrete UOM: PCS
  const VARIANT_A_KG = "66444444444444444444442a";  // Continuous UOM: KG

  let mockLocations: any[];
  let mockLocationStocks: any[];
  let mockVariants: any[];
  let mockMovements: any[];
  let mockTenant: any;
  let mockDb: any;

  beforeEach(() => {
    mockLocations = [
      {
        id: LOC_MAIN_A,
        tenantId: TENANT_A,
        name: "Main Counter Store",
        code: "LOC-MAIN",
        address: "Shop 101, Hardware Market",
        isDefault: true,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
      {
        id: LOC_WH1_A,
        tenantId: TENANT_A,
        name: "Central Godown",
        code: "WH-1",
        address: "Plot 42, Industrial Area",
        isDefault: false,
        isActive: true,
        createdAt: new Date("2026-01-02"),
        updatedAt: new Date("2026-01-02"),
      },
      {
        id: LOC_MAIN_B,
        tenantId: TENANT_B,
        name: "Main Counter Store", // Same name, different tenant
        code: "LOC-B-MAIN",
        address: "Tenant B Address",
        isDefault: true,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ];

    mockLocationStocks = [
      {
        id: "ls-1",
        tenantId: TENANT_A,
        locationId: LOC_MAIN_A,
        variantId: VARIANT_A_PCS,
        stock: 40.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "ls-2",
        tenantId: TENANT_A,
        locationId: LOC_WH1_A,
        variantId: VARIANT_A_PCS,
        stock: 60.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "ls-3",
        tenantId: TENANT_A,
        locationId: LOC_MAIN_A,
        variantId: VARIANT_A_KG,
        stock: 25.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockVariants = [
      {
        id: VARIANT_A_PCS,
        tenantId: TENANT_A,
        productId: "prod-pcs-1",
        name: "Single Lever Basin Mixer Chrome",
        sku: "MIX-CHR-01",
        currentStock: 100.0, // 40 + 60 = 100
        purchasePrice: 1500,
        sellingPrice: 2400,
        isActive: true,
        product: {
          id: "prod-pcs-1",
          tenantId: TENANT_A,
          name: "Basin Mixer",
          uom: "PCS",
          minStockAlert: 10,
          hsnCode: "8481",
        },
      },
      {
        id: VARIANT_A_KG,
        tenantId: TENANT_A,
        productId: "prod-kg-1",
        name: "Brass Waste Coupling Scrap",
        sku: "BRASS-CP-01",
        currentStock: 25.5,
        purchasePrice: 400,
        sellingPrice: 550,
        isActive: true,
        product: {
          id: "prod-kg-1",
          tenantId: TENANT_A,
          name: "Brass Scrap",
          uom: "KG",
          minStockAlert: 5,
          hsnCode: "7404",
        },
      },
    ];

    mockMovements = [];

    mockTenant = {
      id: TENANT_A,
      allowNegativeStock: false,
    };

    mockDb = {
      tenant: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === TENANT_A) return mockTenant;
          if (where.id === TENANT_B) return { id: TENANT_B, allowNegativeStock: false };
          return null;
        }),
      },
      inventoryLocation: {
        findFirst: vi.fn(async ({ where }: any) => {
          return mockLocations.find((l) => {
            if (where.tenantId && l.tenantId !== where.tenantId) return false;
            if (where.id) {
              if (typeof where.id === "object" && where.id.not) {
                if (l.id === where.id.not) return false;
              } else if (l.id !== where.id) {
                return false;
              }
            }
            if (where.name?.equals) {
              if (l.name.toLowerCase() !== where.name.equals.toLowerCase()) return false;
            }
            if (where.name && typeof where.name === "string") {
              if (l.name !== where.name) return false;
            }
            if (where.isDefault !== undefined && l.isDefault !== where.isDefault) return false;
            if (where.isActive !== undefined && l.isActive !== where.isActive) return false;
            return true;
          }) || null;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return mockLocations.filter((l) => {
            if (where?.tenantId && l.tenantId !== where.tenantId) return false;
            if (where?.isActive !== undefined && l.isActive !== where.isActive) return false;
            return true;
          });
        }),
        create: vi.fn(async ({ data }: any) => {
          const newLoc = {
            id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockLocations.push(newLoc);
          return newLoc;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const loc = mockLocations.find((l) => l.id === where.id);
          if (loc) {
            Object.assign(loc, data, { updatedAt: new Date() });
            return loc;
          }
          return null;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const l of mockLocations) {
            if (where.tenantId && l.tenantId !== where.tenantId) continue;
            if (where.id && typeof where.id === "object" && where.id.not && l.id === where.id.not) continue;
            if (where.isDefault !== undefined && l.isDefault !== where.isDefault) continue;
            Object.assign(l, data);
            count++;
          }
          return { count };
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
            if (where.variantId && ls.variantId !== where.variantId) return false;
            if (where.stock?.gt !== undefined && ls.stock <= where.stock.gt) return false;
            return true;
          });
        }),
        create: vi.fn(async ({ data }: any) => {
          const newLs = {
            id: `ls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockLocationStocks.push(newLs);
          return newLs;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const ls of mockLocationStocks) {
            if (where.tenantId && ls.tenantId !== where.tenantId) continue;
            if (where.locationId && ls.locationId !== where.locationId) continue;
            if (where.variantId && ls.variantId !== where.variantId) continue;
            if (where.stock?.gte !== undefined && ls.stock < where.stock.gte) continue;

            if (data.stock?.decrement !== undefined) {
              ls.stock -= data.stock.decrement;
              count++;
            } else if (data.stock?.increment !== undefined) {
              ls.stock += data.stock.increment;
              count++;
            } else if (data.stock !== undefined) {
              ls.stock = data.stock;
              count++;
            }
          }
          return { count };
        }),
      },
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
            if (where.id?.in && !where.id.in.includes(v.id)) return false;
            return true;
          });
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const v of mockVariants) {
            if (where.tenantId && v.tenantId !== where.tenantId) continue;
            if (where.id && v.id !== where.id) continue;
            if (where.currentStock?.gte !== undefined && v.currentStock < where.currentStock.gte) continue;

            if (data.currentStock?.decrement !== undefined) {
              v.currentStock -= data.currentStock.decrement;
              count++;
            } else if (data.currentStock?.increment !== undefined) {
              v.currentStock += data.currentStock.increment;
              count++;
            }
          }
          return { count };
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const v = mockVariants.find((x) => x.id === where.id);
          if (v) Object.assign(v, data);
          return v;
        }),
      },
      stockMovement: {
        findMany: vi.fn(async ({ where }: any) => {
          return mockMovements.filter((m) => {
            if (where.tenantId && m.tenantId !== where.tenantId) return false;
            if (where.referenceId && m.referenceId !== where.referenceId) return false;
            if (where.type && m.type !== where.type) return false;
            return true;
          });
        }),
        create: vi.fn(async ({ data }: any) => {
          const movement = {
            id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...data,
            createdAt: new Date(),
          };
          mockMovements.push(movement);
          return movement;
        }),
      },
    };
  });

  // =========================================================================
  // 1. Warehouse Location Management & Validation
  // =========================================================================
  describe("1. Location CRUD & Lifecycle Rules", () => {
    it("should successfully create a new inventory location", async () => {
      const loc = await createInventoryLocation(
        TENANT_A,
        {
          name: "South Extension Showroom",
          code: "WH-SOUTH",
          address: "G-12, Ring Road",
          isDefault: false,
        },
        mockDb
      );

      expect(loc.name).toBe("South Extension Showroom");
      expect(loc.tenantId).toBe(TENANT_A);
      expect(loc.isActive).toBe(true);
      expect(loc.isDefault).toBe(false);
    });

    it("should reject duplicate location names within the same tenant (case-insensitive)", async () => {
      await expect(
        createInventoryLocation(
          TENANT_A,
          { name: "central godown" }, // Existing is "Central Godown"
          mockDb
        )
      ).rejects.toThrow(LocationNameExistsError);
    });

    it("should allow different tenants to use the same location name (tenant isolation)", async () => {
      // Both TENANT_A and TENANT_B can have "North Depot"
      const locA = await createInventoryLocation(
        TENANT_A,
        { name: "North Depot" },
        mockDb
      );
      const locB = await createInventoryLocation(
        TENANT_B,
        { name: "North Depot" },
        mockDb
      );

      expect(locA.name).toBe("North Depot");
      expect(locB.name).toBe("North Depot");
      expect(locA.tenantId).toBe(TENANT_A);
      expect(locB.tenantId).toBe(TENANT_B);
    });

    it("should unset existing default location when creating a new default location", async () => {
      const newDefault = await createInventoryLocation(
        TENANT_A,
        { name: "Brand New Primary Hub", isDefault: true },
        mockDb
      );

      expect(newDefault.isDefault).toBe(true);

      const oldMain = mockLocations.find((l) => l.id === LOC_MAIN_A);
      expect(oldMain?.isDefault).toBe(false);
    });

    it("should prevent archiving a location if ANY variant has remaining positive stock", async () => {
      // LOC_MAIN_A has 40 PCS and 25.5 KG of active stock
      await expect(
        archiveInventoryLocation(TENANT_A, LOC_MAIN_A, mockDb)
      ).rejects.toThrow(LocationHasStockError);

      const loc = mockLocations.find((l) => l.id === LOC_MAIN_A);
      expect(loc?.isActive).toBe(true); // Must remain active
    });

    it("should allow archiving a location once all stock has been transferred or adjusted to 0", async () => {
      // Set all stock at WH1 to 0
      const wh1Stock = mockLocationStocks.find((ls) => ls.locationId === LOC_WH1_A);
      if (wh1Stock) wh1Stock.stock = 0.0;

      const archived = await archiveInventoryLocation(TENANT_A, LOC_WH1_A, mockDb);
      expect(archived.isActive).toBe(false);
    });

    it("should prevent cross-tenant location updates or access", async () => {
      // TENANT_B cannot update TENANT_A's location
      await expect(
        updateInventoryLocation(TENANT_B, LOC_MAIN_A, { name: "Hacked" }, mockDb)
      ).rejects.toThrow(LocationNotFoundError);
    });
  });

  // =========================================================================
  // 2. Warehouse-to-Warehouse Stock Transfer
  // =========================================================================
  describe("2. Warehouse-to-Warehouse Transfer Workflow", () => {
    it("should execute an atomic transfer between warehouses, maintaining aggregate variant stock invariance", async () => {
      const initialSourceStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_PCS
      )?.stock!;
      const initialDestStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_WH1_A && ls.variantId === VARIANT_A_PCS
      )?.stock!;
      const initialTotalVariantStock = mockVariants.find((v) => v.id === VARIANT_A_PCS)?.currentStock!;

      const result = await executeWarehouseTransfer(
        {
          tenantId: TENANT_A,
          sourceLocationId: LOC_MAIN_A,
          destinationLocationId: LOC_WH1_A,
          items: [{ variantId: VARIANT_A_PCS, quantity: 15 }],
          notes: "Relocating display units to central godown",
        },
        mockDb
      );

      expect(result.idempotent).toBe(false);
      expect(result.movements).toHaveLength(2);

      // Verify source decremented
      const updatedSourceStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_PCS
      )?.stock;
      expect(updatedSourceStock).toBe(initialSourceStock - 15); // 40 - 15 = 25

      // Verify destination incremented
      const updatedDestStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_WH1_A && ls.variantId === VARIANT_A_PCS
      )?.stock;
      expect(updatedDestStock).toBe(initialDestStock + 15); // 60 + 15 = 75

      // CRITICAL: Total variant stock is invariant under internal transfer
      const updatedTotalVariantStock = mockVariants.find((v) => v.id === VARIANT_A_PCS)?.currentStock;
      expect(updatedTotalVariantStock).toBe(initialTotalVariantStock); // Still 100

      // Verify double immutable stock movements
      const [outMovement, inMovement] = result.movements;
      expect(outMovement.type).toBe("TRANSFER");
      expect(outMovement.locationId).toBe(LOC_MAIN_A);
      expect(outMovement.quantity).toBe(15);
      expect(outMovement.balanceAfter).toBe(25);
      expect(outMovement.reason).toBe("WAREHOUSE_TRANSFER_OUT");

      expect(inMovement.type).toBe("TRANSFER");
      expect(inMovement.locationId).toBe(LOC_WH1_A);
      expect(inMovement.quantity).toBe(15);
      expect(inMovement.balanceAfter).toBe(75);
      expect(inMovement.reason).toBe("WAREHOUSE_TRANSFER_IN");
    });

    it("should reject transfer when source warehouse has insufficient stock", async () => {
      // LOC_MAIN_A only has 40 units of VARIANT_A_PCS
      await expect(
        executeWarehouseTransfer(
          {
            tenantId: TENANT_A,
            sourceLocationId: LOC_MAIN_A,
            destinationLocationId: LOC_WH1_A,
            items: [{ variantId: VARIANT_A_PCS, quantity: 50 }],
          },
          mockDb
        )
      ).rejects.toThrow(InsufficientStockError);

      // Source stock must remain unchanged
      const srcStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_PCS
      )?.stock;
      expect(srcStock).toBe(40);
    });

    it("should reject transfer when source and destination locations are identical", async () => {
      await expect(
        executeWarehouseTransfer(
          {
            tenantId: TENANT_A,
            sourceLocationId: LOC_MAIN_A,
            destinationLocationId: LOC_MAIN_A,
            items: [{ variantId: VARIANT_A_PCS, quantity: 5 }],
          },
          mockDb
        )
      ).rejects.toThrow(InvalidTransferError);
    });

    it("should reject cross-tenant transfer attempts", async () => {
      // Source belongs to TENANT_A, Destination belongs to TENANT_B
      await expect(
        executeWarehouseTransfer(
          {
            tenantId: TENANT_A,
            sourceLocationId: LOC_MAIN_A,
            destinationLocationId: LOC_MAIN_B,
            items: [{ variantId: VARIANT_A_PCS, quantity: 5 }],
          },
          mockDb
        )
      ).rejects.toThrow(CrossTenantReferenceError);
    });

    it("should reject transfers involving an archived / inactive location", async () => {
      const wh1 = mockLocations.find((l) => l.id === LOC_WH1_A);
      if (wh1) wh1.isActive = false;

      await expect(
        executeWarehouseTransfer(
          {
            tenantId: TENANT_A,
            sourceLocationId: LOC_MAIN_A,
            destinationLocationId: LOC_WH1_A,
            items: [{ variantId: VARIANT_A_PCS, quantity: 5 }],
          },
          mockDb
        )
      ).rejects.toThrow(InvalidTransferError);
    });

    it("should support fractional transfers for continuous UOMs (KG, MTR)", async () => {
      // Initial KG stock at LOC_MAIN_A is 25.5
      const result = await executeWarehouseTransfer(
        {
          tenantId: TENANT_A,
          sourceLocationId: LOC_MAIN_A,
          destinationLocationId: LOC_WH1_A,
          items: [{ variantId: VARIANT_A_KG, quantity: "12.350" }],
        },
        mockDb
      );

      expect(result.idempotent).toBe(false);
      const srcStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_KG
      )?.stock;
      expect(srcStock).toBe(13.15); // 25.5 - 12.350 = 13.15

      const destStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_WH1_A && ls.variantId === VARIANT_A_KG
      )?.stock;
      expect(destStock).toBe(12.35);
    });

    it("should reject fractional transfers for discrete UOMs (PCS, BOX, SET, PAIR)", async () => {
      await expect(
        executeWarehouseTransfer(
          {
            tenantId: TENANT_A,
            sourceLocationId: LOC_MAIN_A,
            destinationLocationId: LOC_WH1_A,
            items: [{ variantId: VARIANT_A_PCS, quantity: 4.5 }],
          },
          mockDb
        )
      ).rejects.toThrow(QuantityPrecisionError);
    });

    it("should consolidate duplicate variant line items within a transfer request", async () => {
      const result = await executeWarehouseTransfer(
        {
          tenantId: TENANT_A,
          sourceLocationId: LOC_MAIN_A,
          destinationLocationId: LOC_WH1_A,
          items: [
            { variantId: VARIANT_A_PCS, quantity: 5 },
            { variantId: VARIANT_A_PCS, quantity: 10 },
          ],
        },
        mockDb
      );

      // Consolidated to 15 PCS
      expect(result.movements).toHaveLength(2); // 1 out + 1 in
      expect(result.movements[0].quantity).toBe(15);
      expect(result.movements[1].quantity).toBe(15);
    });

    it("should handle idempotent transfer replay safely", async () => {
      const idempotencyKey = "TRF-IDEMP-TEST-999";

      // First run
      const res1 = await executeWarehouseTransfer(
        {
          tenantId: TENANT_A,
          sourceLocationId: LOC_MAIN_A,
          destinationLocationId: LOC_WH1_A,
          items: [{ variantId: VARIANT_A_PCS, quantity: 5 }],
          idempotencyKey,
        },
        mockDb
      );
      expect(res1.idempotent).toBe(false);

      // Replay with identical key
      const res2 = await executeWarehouseTransfer(
        {
          tenantId: TENANT_A,
          sourceLocationId: LOC_MAIN_A,
          destinationLocationId: LOC_WH1_A,
          items: [{ variantId: VARIANT_A_PCS, quantity: 5 }],
          idempotencyKey,
        },
        mockDb
      );

      expect(res2.idempotent).toBe(true);
      expect(res2.transferId).toBe(idempotencyKey);
      // Ensure stock was NOT decremented a second time (only 5 units deducted total)
      const srcStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_PCS
      )?.stock;
      expect(srcStock).toBe(35); // 40 - 5 = 35
    });
  });

  // =========================================================================
  // 3. Location Stock & Variant Stock Synchronization in Core Operations
  // =========================================================================
  describe("3. Operational Synchronization Across Movements", () => {
    it("should adjust both variant stock and location stock in recordStockAdjustment", async () => {
      const result = await recordStockAdjustment(
        {
          tenantId: TENANT_A,
          variantId: VARIANT_A_PCS,
          locationId: LOC_MAIN_A,
          quantityDelta: 10,
          reason: "AUDIT_CORRECTION",
        },
        mockDb
      );

      // Variant stock updated
      expect(result.variant.currentStock).toBe(110); // 100 + 10

      // Location stock updated
      const locStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_PCS
      )?.stock;
      expect(locStock).toBe(50); // 40 + 10
    });

    it("should deduct both variant stock and location stock in processStockDeductionFromSale", async () => {
      await processStockDeductionFromSale(
        {
          tenantId: TENANT_A,
          salesInvoiceId: "INV-SALE-SYNC-1",
          locationId: LOC_MAIN_A,
          items: [{ variantId: VARIANT_A_PCS, quantity: 5 }],
        },
        mockDb
      );

      const variant = mockVariants.find((v) => v.id === VARIANT_A_PCS);
      expect(variant?.currentStock).toBe(95); // 100 - 5

      const locStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_PCS
      );
      expect(locStock?.stock).toBe(35); // 40 - 5
    });

    it("should increment both variant stock and location stock in processStockReceiptFromPurchase", async () => {
      await processStockReceiptFromPurchase(
        {
          tenantId: TENANT_A,
          purchaseInvoiceId: "PUR-REC-SYNC-1",
          locationId: LOC_WH1_A,
          items: [{ variantId: VARIANT_A_PCS, quantity: 20, purchasePrice: 1500 }],
        },
        mockDb
      );

      const variant = mockVariants.find((v) => v.id === VARIANT_A_PCS);
      expect(variant?.currentStock).toBe(120); // 100 + 20

      const locStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_WH1_A && ls.variantId === VARIANT_A_PCS
      );
      expect(locStock?.stock).toBe(80); // 60 + 20
    });

    it("should synchronize location stock in returns (RETURN_IN increment, RETURN_OUT decrement)", async () => {
      // Customer return in: +3 PCS at LOC_MAIN_A
      await processStockReturn(
        {
          tenantId: TENANT_A,
          returnId: "RET-IN-1",
          returnType: "SALES_RETURN",
          locationId: LOC_MAIN_A,
          items: [{ variantId: VARIANT_A_PCS, quantity: 3 }],
        },
        mockDb
      );

      let locStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_PCS
      );
      expect(locStock?.stock).toBe(43); // 40 + 3

      // Purchase return out: -3 PCS at LOC_MAIN_A
      await processStockReturn(
        {
          tenantId: TENANT_A,
          returnId: "RET-OUT-1",
          returnType: "PURCHASE_RETURN",
          locationId: LOC_MAIN_A,
          items: [{ variantId: VARIANT_A_PCS, quantity: 3 }],
        },
        mockDb
      );

      locStock = mockLocationStocks.find(
        (ls) => ls.locationId === LOC_MAIN_A && ls.variantId === VARIANT_A_PCS
      );
      expect(locStock?.stock).toBe(40); // 43 - 3 = 40
    });

    it("should accurately report stock breakdown across locations matching variant stock", async () => {
      const breakdown = await getStockAcrossLocations(
        TENANT_A,
        { variantId: VARIANT_A_PCS },
        mockDb
      );

      expect(breakdown.variantId).toBe(VARIANT_A_PCS);
      expect(breakdown.aggregateStock).toBe(100);
      expect(breakdown.currentStock).toBe(100);
      expect(breakdown.locations).toHaveLength(2);

      const locMain = breakdown.locations.find((l: any) => l.locationId === LOC_MAIN_A);
      const locWh1 = breakdown.locations.find((l: any) => l.locationId === LOC_WH1_A);

      expect(locMain?.stock).toBe(40);
      expect(locWh1?.stock).toBe(60);
    });

    it("should fetch all stock items for a warehouse location", async () => {
      const locStockData = await getLocationStock(TENANT_A, LOC_MAIN_A, mockDb);

      expect(locStockData.location.id).toBe(LOC_MAIN_A);
      expect(locStockData.items).toHaveLength(2); // VARIANT_A_PCS and VARIANT_A_KG
      const pcsItem = locStockData.items.find((i: any) => i.variantId === VARIANT_A_PCS);
      expect(pcsItem?.stock).toBe(40);
    });
  });
});
