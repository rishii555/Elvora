import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSupplier,
  createPurchaseInvoice,
  recordSupplierPayment,
  createPurchaseReturn,
  cancelPurchaseInvoice,
  getSupplierStatement,
} from "@/lib/purchases/service";
import { CrossTenantReferenceError, CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

describe("Purchase & Supplier Management Suite", () => {
  const TENANT_A = "6622222222222222222222aa";
  const TENANT_B = "6622222222222222222222bb";
  const SUPPLIER_A = "6622222222222222222222s1";
  const SUPPLIER_B = "6622222222222222222222s2";
  const VARIANT_A = "6622222222222222222222v1";

  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      tenant: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === TENANT_A) {
            return {
              id: TENANT_A,
              legalName: "Elvora Sanitarywares",
              stateCode: "09", // Uttar Pradesh
              allowNegativeStock: false,
            };
          }
          if (where.id === TENANT_B) {
            return {
              id: TENANT_B,
              legalName: "Shop B",
              stateCode: "27", // Maharashtra
              allowNegativeStock: true,
            };
          }
          return null;
        }),
      },
      supplier: {
        create: vi.fn(async ({ data }: any) => ({
          id: "sup-" + Date.now(),
          ...data,
        })),
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.id === SUPPLIER_A && where.tenantId === TENANT_A) {
            return {
              id: SUPPLIER_A,
              tenantId: TENANT_A,
              name: "Jaquar Bath Fittings Ltd",
              companyName: "Jaquar & Company Pvt Ltd",
              gstin: "06AAACJ1234F1Z0",
              stateCode: "06", // Haryana (Inter-state to UP)
              phone: "9876500000",
              balance: 15000,
            };
          }
          if (where.id === SUPPLIER_B && where.tenantId === TENANT_B) {
            return {
              id: SUPPLIER_B,
              tenantId: TENANT_B,
              name: "Cera Sanitaryware Morbi",
              companyName: "Cera Sanitaryware Ltd",
              gstin: "24AAACC5678G1Z1",
              stateCode: "24", // Gujarat
              phone: "9876500001",
              balance: 0,
            };
          }
          return null;
        }),
        findMany: vi.fn(async () => []),
        update: vi.fn(async ({ data }: any) => data),
      },
      invoiceSequence: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ id: "seq-1", ...data })),
        update: vi.fn(async ({ data }: any) => data),
      },
      productVariant: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.id === VARIANT_A && where.tenantId === TENANT_A) {
            return {
              id: VARIANT_A,
              tenantId: TENANT_A,
              name: "Single Lever Basin Mixer - Chrome",
              sku: "JAQ-MIX-CRM-01",
              currentStock: 10,
              purchasePrice: 1800,
              gstRate: 18,
              product: {
                name: "Single Lever Basin Mixer",
                code: "JAQ-MIX-CRM-01",
                uom: "PCS",
                minStockAlert: 5,
              },
            };
          }
          return null;
        }),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
      supplierProductPrice: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ id: "spp-1", ...data })),
        update: vi.fn(async ({ data }: any) => data),
      },
      stockMovement: {
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => ({ id: "mov-" + Date.now(), ...data })),
      },
      purchaseInvoice: {
        findUnique: vi.fn(async ({ where }: any) => {
          const key = where.tenantId_supplierId_invoiceNumber;
          if (key && key.invoiceNumber === "DUP-BILL-100") {
            return {
              id: "pinv-dup",
              tenantId: TENANT_A,
              supplierId: SUPPLIER_A,
              invoiceNumber: "DUP-BILL-100",
              invoiceDate: new Date("2026-05-10"),
            };
          }
          return null;
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.id === "pinv-cancel-1" && where.tenantId === TENANT_A) {
            return {
              id: "pinv-cancel-1",
              tenantId: TENANT_A,
              supplierId: SUPPLIER_A,
              invoiceNumber: "JAQ-BILL-882",
              invoiceDate: new Date(),
              status: "RECEIVED",
              grandTotal: 11800,
              paidAmount: 5000,
              balanceAmount: 6800,
              isInterState: true,
              supplier: { id: SUPPLIER_A, name: "Jaquar Bath Fittings Ltd" },
              items: [
                {
                  id: "pitem-1",
                  variantId: VARIANT_A,
                  quantity: 5,
                  unitCost: 2000,
                  gstRate: 18,
                  totalAmount: 11800,
                },
              ],
            };
          }
          return null;
        }),
        create: vi.fn(async ({ data }: any) => ({
          id: "pinv-" + Date.now(),
          ...data,
          items: data.items?.create || [],
        })),
        findMany: vi.fn(async ({ where }: any) => {
          if (where.id === "pinv-bill-target") {
            return [
              {
                id: "pinv-bill-target",
                tenantId: TENANT_A,
                supplierId: SUPPLIER_A,
                invoiceNumber: "BILL-TARGET-1",
                grandTotal: 10000,
                paidAmount: 2000,
                balanceAmount: 8000,
              },
            ];
          }
          return [];
        }),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
      payment: {
        create: vi.fn(async ({ data }: any) => ({
          id: "pay-" + Date.now(),
          ...data,
        })),
        findMany: vi.fn(async () => []),
      },
      paymentAllocation: {
        create: vi.fn(async ({ data }: any) => ({
          id: "alloc-" + Date.now(),
          ...data,
        })),
      },
      purchaseReturn: {
        create: vi.fn(async ({ data }: any) => ({
          id: "pret-" + Date.now(),
          ...data,
        })),
        findMany: vi.fn(async () => []),
      },
      creditDebitNote: {
        create: vi.fn(async ({ data }: any) => ({
          id: "cdn-" + Date.now(),
          ...data,
        })),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockDb)),
    };
  });

  describe("Supplier Creation & Profiles", () => {
    it("creates a supplier with verified GSTIN and state code", async () => {
      const supplier = await createSupplier(
        {
          tenantId: TENANT_A,
          name: "Kohler India Corp",
          companyName: "Kohler India Corporation Pvt Ltd",
          gstin: "06AAACK8821F1ZX",
          phone: "9811223344",
          address: "Gurugram, Haryana",
          stateCode: "06",
          openingBalance: 25000,
        },
        mockDb
      );

      expect(supplier.name).toBe("Kohler India Corp");
      expect(supplier.gstin).toBe("06AAACK8821F1ZX");
      expect(supplier.balance).toBe(25000);
      expect(mockDb.supplier.create).toHaveBeenCalled();
    });
  });

  describe("Purchase Invoices & Duplicate Protection", () => {
    it("prevents entering duplicate supplier invoice numbers for the same vendor", async () => {
      await expect(
        createPurchaseInvoice(
          {
            tenantId: TENANT_A,
            userId: "admin-1",
            supplierId: SUPPLIER_A,
            invoiceNumber: "DUP-BILL-100", // Already exists
            invoiceDate: new Date(),
            items: [{ variantId: VARIANT_A, quantity: 10, unitCost: 1800 }],
          },
          mockDb
        )
      ).rejects.toThrow(/Duplicate supplier bill/);

      expect(mockDb.purchaseInvoice.create).not.toHaveBeenCalled();
    });

    it("calculates inter-state IGST, logs stock receipt, and updates supplier balance", async () => {
      // Tenant A is in UP (09); Supplier A is in Haryana (06) -> Inter-State IGST (18%)
      const invoice = await createPurchaseInvoice(
        {
          tenantId: TENANT_A,
          userId: "admin-1",
          supplierId: SUPPLIER_A,
          invoiceNumber: "JAQ-NEW-901",
          invoiceDate: new Date(),
          items: [{ variantId: VARIANT_A, quantity: 10, unitCost: 1800, supplierItemCode: "JAQ-MIX-55" }],
          freightAmount: 200,
          paidAmount: 5000,
          paymentMode: "BANK_TRANSFER",
        },
        mockDb
      );

      expect(invoice.isInterState).toBe(true);
      expect(invoice.subtotal).toBe(18000);
      expect(invoice.igstAmount).toBe(3240); // 18% of 18000
      expect(invoice.cgstAmount).toBe(0);
      expect(invoice.sgstAmount).toBe(0);
      // Total = 18000 + 3240 + 200 (freight) = 21440
      expect(invoice.grandTotal).toBe(21440);
      expect(invoice.paidAmount).toBe(5000);
      expect(invoice.balanceAmount).toBe(16440);
      expect(invoice.paymentStatus).toBe("PARTIALLY_PAID");

      // Verify stock increment & movement
      expect(mockDb.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: VARIANT_A },
          data: expect.objectContaining({ currentStock: 20, purchasePrice: 1800 }),
        })
      );
      expect(mockDb.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "PURCHASE",
            quantity: 10,
            unitCost: 1800,
          }),
        })
      );

      // Verify supplier balance increment by unpaid balance
      expect(mockDb.supplier.update).toHaveBeenCalledWith({
        where: { id: SUPPLIER_A },
        data: { balance: { increment: 16440 } },
      });
    });
  });

  describe("Supplier Payments & Allocation", () => {
    it("records supplier payment, knocks off invoice balance, and decrements vendor balance", async () => {
      const payment = await recordSupplierPayment(
        {
          tenantId: TENANT_A,
          userId: "admin-1",
          supplierId: SUPPLIER_A,
          purchaseInvoiceId: "pinv-bill-target",
          amount: 5000,
          paymentMode: "BANK_TRANSFER",
          referenceNumber: "UTR987654321",
        },
        mockDb
      );

      expect(payment.amount).toBe(5000);
      expect(payment.paymentType).toBe("SUPPLIER_PAYMENT");

      // Verify purchase bill allocation update
      expect(mockDb.purchaseInvoice.update).toHaveBeenCalledWith({
        where: { id: "pinv-bill-target" },
        data: {
          paidAmount: 7000, // 2000 initial + 5000
          balanceAmount: 3000, // 8000 - 5000
          paymentStatus: "PARTIALLY_PAID",
        },
      });

      // Verify vendor balance decrement
      expect(mockDb.supplier.update).toHaveBeenCalledWith({
        where: { id: SUPPLIER_A },
        data: { balance: { decrement: 5000 } },
      });
    });
  });

  describe("Purchase Returns & Controlled Cancellations", () => {
    it("issues Debit Note, returns stock to vendor (RETURN_OUT), and adjusts balance", async () => {
      const result = await createPurchaseReturn(
        {
          tenantId: TENANT_A,
          userId: "admin-1",
          purchaseInvoiceId: "pinv-cancel-1",
          reason: "2 units defective cartridge",
          items: [{ variantId: VARIANT_A, quantity: 2, unitCost: 2000 }],
        },
        mockDb
      );

      expect(result.debitNote.noteType).toBe("DEBIT_NOTE");
      expect(result.purchaseReturn.grandTotal).toBe(4720); // 4000 + 18% IGST (720)

      // Stock deducted via RETURN_OUT
      expect(mockDb.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "RETURN_OUT",
            reason: "PURCHASE_RETURN_TO_SUPPLIER",
          }),
        })
      );

      // Supplier balance decremented by debit note value
      expect(mockDb.supplier.update).toHaveBeenCalledWith({
        where: { id: SUPPLIER_A },
        data: { balance: { decrement: 4720 } },
      });
    });

    it("soft-cancels a purchase bill without deleting historical records and reverses stock", async () => {
      const cancelled = await cancelPurchaseInvoice(
        {
          tenantId: TENANT_A,
          userId: "admin-1",
          purchaseInvoiceId: "pinv-cancel-1",
          cancelReason: "Entered wrong supplier bill by mistake",
        },
        mockDb
      );

      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancelReason).toBe("Entered wrong supplier bill by mistake");

      // Stock reversed via RETURN_OUT
      expect(mockDb.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "RETURN_OUT",
            referenceId: "pinv-cancel-1",
          }),
        })
      );

      // Reverts unpaid balance from supplier balance
      expect(mockDb.supplier.update).toHaveBeenCalledWith({
        where: { id: SUPPLIER_A },
        data: { balance: { decrement: 6800 } },
      });
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("blocks cross-tenant purchase billing against another tenant's supplier", async () => {
      // Tenant A tries to enter purchase against Tenant B's supplier
      await expect(
        createPurchaseInvoice(
          {
            tenantId: TENANT_A,
            userId: "admin-1",
            supplierId: SUPPLIER_B,
            invoiceNumber: "CROSS-BILL-01",
            invoiceDate: new Date(),
            items: [{ variantId: VARIANT_A, quantity: 5, unitCost: 1500 }],
          },
          mockDb
        )
      ).rejects.toThrow(CrossTenantReferenceError);
    });

    it("blocks cross-tenant supplier statement lookups", async () => {
      await expect(
        getSupplierStatement(TENANT_A, SUPPLIER_B, mockDb)
      ).rejects.toThrow(CrossTenantAccessDeniedError);
    });
  });
});
