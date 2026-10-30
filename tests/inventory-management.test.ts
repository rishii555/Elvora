import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordStockAdjustment,
  processStockDeductionFromSale,
  processStockReceiptFromPurchase,
  processStockReturn,
  calculateInventoryValuation,
  listInventoryItems,
  getVariantStockHistory,
  InsufficientStockError,
} from "@/lib/inventory/service";
import { parseInventoryCsv } from "@/lib/inventory/csv";
import { CrossTenantReferenceError, CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

describe("Sanitaryware & CP Fittings Inventory Management Suite", () => {
  const TENANT_A = "6612345678901234567890aa";
  const TENANT_B = "6612345678901234567890bb";
  const VARIANT_A = "6612345678901234567890a1";
  const VARIANT_B = "6612345678901234567890b1";
  const SUPPLIER_A = "6612345678901234567890s1";

  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      tenant: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === TENANT_A) {
            return { id: TENANT_A, allowNegativeStock: false };
          }
          if (where.id === TENANT_B) {
            return { id: TENANT_B, allowNegativeStock: true };
          }
          return null;
        }),
      },
      productVariant: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.id === VARIANT_A && where.tenantId === TENANT_A) {
            return {
              id: VARIANT_A,
              tenantId: TENANT_A,
              productId: "prod-1",
              name: "Single Lever Basin Mixer",
              sku: "MIX-CHROME-01",
              model: "Concealed Wall Mounted",
              size: "Universal",
              colorFinish: "Chrome Plated",
              purchasePrice: 1200,
              sellingPrice: 1950,
              mrp: 2400,
              gstRate: 18,
              currentStock: 10,
              isActive: true,
              product: { minStockAlert: 5, name: "Basin Mixer", uom: "PCS", hsnCode: "8481" },
            };
          }
          if (where.id === VARIANT_B && where.tenantId === TENANT_B) {
            return {
              id: VARIANT_B,
              tenantId: TENANT_B,
              productId: "prod-2",
              name: "Wall Hung Washbasin 18x12",
              sku: "WB-1812-WHT",
              model: "Rimless Glossy",
              size: "18x12 inch",
              colorFinish: "Glossy White",
              purchasePrice: 2100,
              sellingPrice: 3200,
              mrp: 3800,
              gstRate: 18,
              currentStock: 3,
              isActive: true,
              product: { minStockAlert: 5, name: "Washbasin", uom: "PCS", hsnCode: "6910" },
            };
          }
          return null;
        }),
        update: vi.fn(async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        })),
        count: vi.fn(async () => 1),
        findMany: vi.fn(async () => [
          {
            id: VARIANT_A,
            tenantId: TENANT_A,
            productId: "prod-1",
            name: "Single Lever Basin Mixer",
            sku: "MIX-CHROME-01",
            model: "Concealed Wall Mounted",
            size: "Universal",
            colorFinish: "Chrome Plated",
            purchasePrice: 1200,
            sellingPrice: 1950,
            mrp: 2400,
            gstRate: 18,
            currentStock: 10,
            isActive: true,
            product: {
              name: "Basin Mixer",
              code: "MIX-CHROME-01",
              barcode: "890123456789",
              uom: "PCS",
              hsnCode: "8481",
              minStockAlert: 5,
              brand: { name: "Jaquar" },
              category: { name: "CP Bathroom Fittings" },
            },
          },
        ]),
      },
      stockMovement: {
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => ({
          id: "mov-" + Date.now(),
          ...data,
          createdAt: new Date(),
        })),
      },
      supplierProductPrice: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ id: "spp-1", ...data })),
        update: vi.fn(async ({ data }: any) => data),
      },
      supplier: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.id === SUPPLIER_A && where.tenantId === TENANT_A) {
            return { id: SUPPLIER_A, tenantId: TENANT_A, name: "Parryware Direct" };
          }
          return null;
        }),
      },
      $transaction: vi.fn(async (callback: any) => callback(mockDb)),
    };
  });

  describe("Negative Stock Policies & Adjustments", () => {
    it("rejects stock reduction when negative stock is disallowed by policy", async () => {
      // Current stock is 10; requesting reduction of -15
      await expect(
        recordStockAdjustment(
          {
            tenantId: TENANT_A,
            variantId: VARIANT_A,
            quantityDelta: -15,
            reason: "DAMAGED",
            notes: "Damaged in transit",
          },
          mockDb
        )
      ).rejects.toThrow(InsufficientStockError);

      expect(mockDb.productVariant.update).not.toHaveBeenCalled();
      expect(mockDb.stockMovement.create).not.toHaveBeenCalled();
    });

    it("allows negative stock when tenant policy explicitly permits it", async () => {
      // Tenant B has allowNegativeStock = true; currentStock is 3, deduct 5 -> new balance -2
      const result = await recordStockAdjustment(
        {
          tenantId: TENANT_B,
          variantId: VARIANT_B,
          quantityDelta: -5,
          reason: "AUDIT_CORRECTION",
          notes: "Audit correction before physical verification",
        },
        mockDb
      );

      expect(result.variant.currentStock).toBe(-2);
      expect(mockDb.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_B,
            variantId: VARIANT_B,
            type: "ADJUSTMENT_OUT",
            quantity: 5,
            balanceAfter: -2,
            reason: "AUDIT_CORRECTION",
          }),
        })
      );
    });

    it("records opening stock movement on positive adjustment", async () => {
      const result = await recordStockAdjustment(
        {
          tenantId: TENANT_A,
          variantId: VARIANT_A,
          quantityDelta: 25,
          reason: "OPENING_STOCK",
          notes: "Initial inventory batch",
        },
        mockDb
      );

      expect(result.variant.currentStock).toBe(35);
      expect(result.movement.type).toBe("ADJUSTMENT_IN");
      expect(result.movement.balanceAfter).toBe(35);
      expect(result.movement.reason).toBe("OPENING_STOCK");
    });
  });

  describe("Sales Deductions & Idempotency", () => {
    it("deducts stock and records movement on customer sale", async () => {
      const result = await processStockDeductionFromSale(
        {
          tenantId: TENANT_A,
          salesInvoiceId: "INV-2026-0001",
          items: [{ variantId: VARIANT_A, quantity: 4 }],
        },
        mockDb
      );

      expect(result.idempotent).toBe(false);
      expect(mockDb.productVariant.update).toHaveBeenCalledWith({
        where: { id: VARIANT_A },
        data: { currentStock: 6 },
      });
      expect(mockDb.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A,
            type: "SALE",
            quantity: 4,
            balanceAfter: 6,
            referenceType: "SALES_INVOICE",
            referenceId: "INV-2026-0001",
          }),
        })
      );
    });

    it("prevents double deductions when invoice request is retried (idempotency)", async () => {
      // Simulate existing movement for this referenceId
      mockDb.stockMovement.findMany.mockResolvedValueOnce([
        { id: "mov-prior-1", referenceId: "INV-2026-0001", type: "SALE", quantity: 4 },
      ]);

      const result = await processStockDeductionFromSale(
        {
          tenantId: TENANT_A,
          salesInvoiceId: "INV-2026-0001",
          items: [{ variantId: VARIANT_A, quantity: 4 }],
        },
        mockDb
      );

      expect(result.idempotent).toBe(true);
      expect(mockDb.productVariant.update).not.toHaveBeenCalled();
      expect(mockDb.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  describe("Purchases, Returns & Supplier Pricing", () => {
    it("receipts stock from purchase invoice and updates supplier pricing", async () => {
      const result = await processStockReceiptFromPurchase(
        {
          tenantId: TENANT_A,
          purchaseInvoiceId: "PUR-2026-0099",
          supplierId: SUPPLIER_A,
          items: [
            {
              variantId: VARIANT_A,
              quantity: 20,
              purchasePrice: 1150,
              supplierItemCode: "JAQ-MIX-55",
            },
          ],
        },
        mockDb
      );

      expect(result.idempotent).toBe(false);
      expect(mockDb.productVariant.update).toHaveBeenCalledWith({
        where: { id: VARIANT_A },
        data: { currentStock: 30, purchasePrice: 1150 },
      });
      expect(mockDb.supplierProductPrice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A,
            supplierId: SUPPLIER_A,
            variantId: VARIANT_A,
            purchasePrice: 1150,
            supplierItemCode: "JAQ-MIX-55",
          }),
        })
      );
    });

    it("restores stock on customer sales return", async () => {
      const movements = await processStockReturn(
        {
          tenantId: TENANT_A,
          returnId: "RET-2026-0005",
          returnType: "SALES_RETURN",
          items: [{ variantId: VARIANT_A, quantity: 2 }],
        },
        mockDb
      );

      expect(mockDb.productVariant.update).toHaveBeenCalledWith({
        where: { id: VARIANT_A },
        data: { currentStock: 12 },
      });
      expect(movements[0].type).toBe("RETURN_IN");
      expect(movements[0].balanceAfter).toBe(12);
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("rejects cross-tenant stock adjustments", async () => {
      // Tenant A tries to adjust Tenant B's product variant
      await expect(
        recordStockAdjustment(
          {
            tenantId: TENANT_A,
            variantId: VARIANT_B,
            quantityDelta: 5,
            reason: "AUDIT_CORRECTION",
          },
          mockDb
        )
      ).rejects.toThrow(CrossTenantReferenceError);
    });

    it("rejects unauthorized stock history lookups across tenants", async () => {
      await expect(
        getVariantStockHistory(TENANT_A, VARIANT_B, "OWNER", 50, mockDb)
      ).rejects.toThrow(CrossTenantAccessDeniedError);
    });
  });

  describe("RBAC Purchase Cost Masking", () => {
    it("masks purchase cost and margin for BILLER role", async () => {
      const result = await listInventoryItems(
        {
          tenantId: TENANT_A,
          userRole: "BILLER",
        },
        mockDb
      );

      const item = result.items[0];
      expect(item.sellingPrice).toBe(1950);
      expect(item.purchasePrice).toBeNull();
      expect(item.margin).toBeNull();
    });

    it("reveals purchase cost and margin for OWNER role", async () => {
      const result = await listInventoryItems(
        {
          tenantId: TENANT_A,
          userRole: "OWNER",
        },
        mockDb
      );

      const item = result.items[0];
      expect(item.purchasePrice).toBe(1200);
      expect(item.margin).toBe(38); // round(((1950 - 1200) / 1950) * 100) = 38%
    });

    it("masks inventory valuation for BILLER and calculates for OWNER", async () => {
      const billerValuation = await calculateInventoryValuation(TENANT_A, "BILLER", mockDb);
      expect(billerValuation.isValuationMasked).toBe(true);
      expect(billerValuation.totalValuation).toBeNull();
      expect(billerValuation.totalSkus).toBe(1);

      const ownerValuation = await calculateInventoryValuation(TENANT_A, "OWNER", mockDb);
      expect(ownerValuation.isValuationMasked).toBe(false);
      expect(ownerValuation.totalValuation).toBe(12000); // 10 units * 1200
    });
  });

  describe("CSV Import Validation for Sanitaryware & CP Fittings", () => {
    it("parses valid sanitaryware CSV with model, finish, size and HSN", () => {
      const csv = `Product Name,SKU,Barcode,Brand,Category,Model,Size,Finish / Color,UOM,HSN Code,GST Rate,Purchase Cost,Selling Price,MRP,Current Stock,Min Stock Alert
Ceramic Table Top Basin,TT-BASIN-550,890456123,Kohler,Sanitaryware,Rimless Vessel,550x400 mm,Glossy White,PCS,6910,18,3500,5200,6000,15,3
Concealed Shower Diverter,DIV-MATTE-01,890456124,Jaquar,CP Fittings,High Flow 3-Inlet,Universal,Matte Black,PCS,8481,18,2800,4200,4900,8,2`;

      const parsed = parseInventoryCsv(csv);
      expect(parsed.success).toBe(true);
      expect(parsed.rows.length).toBe(2);

      const basin = parsed.rows[0];
      expect(basin.productName).toBe("Ceramic Table Top Basin");
      expect(basin.model).toBe("Rimless Vessel");
      expect(basin.size).toBe("550x400 mm");
      expect(basin.colorFinish).toBe("Glossy White");
      expect(basin.hsnCode).toBe("6910");
      expect(basin.gstRate).toBe(18);

      const diverter = parsed.rows[1];
      expect(diverter.colorFinish).toBe("Matte Black");
      expect(diverter.hsnCode).toBe("8481");
    });

    it("fails CSV parsing when required SKU column is missing", () => {
      const invalidCsv = `Product Name,Brand,Category
Ceramic Basin,Kohler,Sanitaryware`;

      const parsed = parseInventoryCsv(invalidCsv);
      expect(parsed.success).toBe(false);
      expect(parsed.errors[0]).toContain("must contain at least 'Product Name' and 'SKU'");
    });
  });
});
