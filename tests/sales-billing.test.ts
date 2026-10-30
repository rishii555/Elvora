import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
  getStateNameByCode,
  convertNumberToWordsINR,
} from "@/lib/finance/decimal";
import {
  createSalesInvoice,
  cancelSalesInvoice,
  createCreditNoteForInvoice,
} from "@/lib/invoices/service";

describe("Sales Billing & Indian GST Compliance Engine", () => {
  const TENANT_GST = "6611111111111111111111aa";
  const TENANT_NONGST = "6611111111111111111111bb";
  const VARIANT_1 = "661111111111111111111101";
  const VARIANT_NONGST = "661111111111111111111102";

  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      tenant: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === TENANT_GST) {
            return {
              id: TENANT_GST,
              legalName: "Elvora Sanitarywares Private Limited",
              tradeName: "Elvora Luxury Bath",
              gstin: "09AAACE1234F1Z5",
              stateCode: "09", // Uttar Pradesh
              phone: "9876543210",
              address: "Sector 62, Noida, UP",
              allowNegativeStock: false,
            };
          }
          if (where.id === TENANT_NONGST) {
            return {
              id: TENANT_NONGST,
              legalName: "Sharma Traders",
              tradeName: "Sharma Hardware Store",
              gstin: null, // Unregistered
              stateCode: "09",
              phone: "9876543211",
              address: "Varanasi, UP",
              allowNegativeStock: false,
            };
          }
          return null;
        }),
      },
      invoiceSequence: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ id: "seq-1", ...data })),
        update: vi.fn(async ({ data }: any) => data),
      },
      productVariant: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.id === VARIANT_1 && where.tenantId === TENANT_GST) {
            return {
              id: VARIANT_1,
              tenantId: TENANT_GST,
              name: "Chrome Plated - Concealed",
              sku: "JAQ-MIX-01",
              currentStock: 25,
              purchasePrice: 1500,
              sellingPrice: 2500,
              gstRate: 18,
              product: {
                name: "Single Lever Basin Mixer",
                code: "JAQ-MIX-01",
                uom: "PCS",
                hsnCode: "8481",
              },
            };
          }
          if (where.id === VARIANT_NONGST && where.tenantId === TENANT_NONGST) {
            return {
              id: VARIANT_NONGST,
              tenantId: TENANT_NONGST,
              name: "Standard Bib Tap",
              sku: "TAP-STD-01",
              currentStock: 50,
              purchasePrice: 500,
              sellingPrice: 850,
              gstRate: 18,
              product: {
                name: "Brass Bib Cock",
                code: "TAP-STD-01",
                uom: "PCS",
                hsnCode: "8481",
              },
            };
          }
          return null;
        }),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
      salesInvoice: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.idempotencyKey === "IDEMP-KEY-EXISTING-123") {
            return {
              id: "inv-existing-99",
              tenantId: TENANT_GST,
              invoiceNumber: "INV-2627-0099",
              grandTotal: 2950,
              items: [],
            };
          }
          if (where.id === "inv-to-cancel") {
            return {
              id: "inv-to-cancel",
              tenantId: TENANT_GST,
              invoiceNumber: "INV-2627-0005",
              status: "FINALIZED",
              grandTotal: 2950,
              paidAmount: 2950,
              balanceAmount: 0,
              isInterState: false,
              items: [
                {
                  id: "item-c1",
                  variantId: VARIANT_1,
                  quantity: 2,
                  unitPrice: 2500,
                  gstRate: 18,
                  taxableAmount: 5000,
                  totalAmount: 5900,
                },
              ],
            };
          }
          return null;
        }),
        create: vi.fn(async ({ data }: any) => ({
          id: "inv-" + Date.now(),
          ...data,
          items: data.items?.create || [],
        })),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
        count: vi.fn(async () => 1),
        findMany: vi.fn(async () => []),
      },
      stockMovement: {
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => ({ id: "mov-" + Date.now(), ...data })),
      },
      customer: {
        update: vi.fn(async () => ({})),
      },
      salesReturn: {
        create: vi.fn(async ({ data }: any) => ({ id: "ret-1", ...data })),
      },
      creditDebitNote: {
        create: vi.fn(async ({ data }: any) => ({ id: "crn-1", ...data })),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockDb)),
    };
  });

  describe("Tax Calculations & Decimal Math", () => {
    it("computes intra-state tax split accurately (50% CGST + 50% SGST)", () => {
      // 2 units @ Rs 1000 each = Rs 2000 gross. 18% GST -> Rs 360 tax (Rs 180 CGST + Rs 180 SGST)
      const res = calculateInvoiceItem({
        quantity: 2,
        unitPrice: 1000,
        gstRate: 18,
        isInterState: false,
      });

      expect(res.taxableAmount).toBe("2000.00");
      expect(res.cgstAmount).toBe("180.00");
      expect(res.sgstAmount).toBe("180.00");
      expect(res.igstAmount).toBe("0.00");
      expect(res.totalAmount).toBe("2360.00");
    });

    it("computes inter-state tax accurately (100% IGST, 0% CGST/SGST)", () => {
      const res = calculateInvoiceItem({
        quantity: 1,
        unitPrice: 5000,
        gstRate: 18,
        isInterState: true,
      });

      expect(res.taxableAmount).toBe("5000.00");
      expect(res.cgstAmount).toBe("0.00");
      expect(res.sgstAmount).toBe("0.00");
      expect(res.igstAmount).toBe("900.00");
      expect(res.totalAmount).toBe("5900.00");
    });

    it("handles tax-inclusive pricing with reverse tax extraction", () => {
      // 1 unit @ Rs 1180 tax-inclusive at 18% GST -> Taxable must be exactly Rs 1000.00, Tax Rs 180.00
      const res = calculateInvoiceItem({
        quantity: 1,
        unitPrice: 1180,
        gstRate: 18,
        isInterState: false,
        isTaxInclusive: true,
      });

      expect(res.taxableAmount).toBe("1000.00");
      expect(res.cgstAmount).toBe("90.00");
      expect(res.sgstAmount).toBe("90.00");
      expect(res.totalTaxAmount).toBe("180.00");
      expect(res.totalAmount).toBe("1180.00");
    });

    it("applies line-item discount before tax calculation", () => {
      // Rs 1000 price with 10% discount -> Rs 900 taxable. 18% GST on 900 = Rs 162. Total = Rs 1062
      const res = calculateInvoiceItem({
        quantity: 1,
        unitPrice: 1000,
        discountPercent: 10,
        gstRate: 18,
        isInterState: true,
      });

      expect(res.grossAmount).toBe("1000.00");
      expect(res.discountAmount).toBe("100.00");
      expect(res.taxableAmount).toBe("900.00");
      expect(res.igstAmount).toBe("162.00");
      expect(res.totalAmount).toBe("1062.00");
    });

    it("rounds grand total to nearest rupee and exposes explicit round-off", () => {
      const item1 = calculateInvoiceItem({
        quantity: 1,
        unitPrice: 153.25,
        gstRate: 18,
        isInterState: false,
      });

      const summary = calculateInvoiceSummary({
        items: [item1],
      });

      // 153.25 + 18% tax (27.585) = 180.835 -> rounded = 181.00; roundOff = +0.165 -> 0.17
      expect(Number(summary.grandTotal)).toBe(181);
      expect(Number(summary.rawGrandTotal)).toBeCloseTo(180.84, 1);
      expect(Number(summary.roundOff)).toBeCloseTo(0.16, 1);
    });

    it("converts amounts into standard Indian English words", () => {
      expect(convertNumberToWordsINR(2850)).toBe("Two Thousand Eight Hundred and Fifty Rupees Only");
      expect(convertNumberToWordsINR(105420.5)).toBe(
        "One Lakh Five Thousand Four Hundred and Twenty Rupees and Fifty Paise Only"
      );
      expect(convertNumberToWordsINR(0)).toBe("Zero Rupees Only");
    });

    it("resolves Indian GST state codes correctly", () => {
      expect(getStateNameByCode("09")).toBe("Uttar Pradesh");
      expect(getStateNameByCode("27")).toBe("Maharashtra");
      expect(getStateNameByCode("07")).toBe("Delhi");
      expect(getStateNameByCode("33")).toBe("Tamil Nadu");
    });
  });

  describe("Invoice Creation, Sequential Numbering & Workflows", () => {
    it("creates GST Tax Invoice with atomic sequential numbering and stock deduction", async () => {
      const result = await createSalesInvoice(
        {
          tenantId: TENANT_GST,
          userId: "usr-1",
          customerName: "Radha Construction",
          customerGstin: "09AAACR9999F1Z9",
          customerStateCode: "09", // Intra-state UP
          items: [{ variantId: VARIANT_1, quantity: 2, unitPrice: 2500 }],
          paidAmount: 5900,
          paymentMode: "UPI",
          status: "FINALIZED",
        },
        mockDb
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.invoice.invoiceType).toBe("B2B_TAX_INVOICE");
      expect(result.invoice.isInterState).toBe(false);
      expect(result.invoice.taxableAmount).toBe(5000);
      expect(result.invoice.cgstAmount).toBe(450);
      expect(result.invoice.sgstAmount).toBe(450);
      expect(result.invoice.grandTotal).toBe(5900);
      expect(result.invoice.balanceAmount).toBe(0);

      // Verify stock movement was triggered
      expect(mockDb.stockMovement.create).toHaveBeenCalled();
    });

    it("supports unregistered business without falsely claiming GST registration", async () => {
      const result = await createSalesInvoice(
        {
          tenantId: TENANT_NONGST,
          userId: "usr-1",
          customerName: "Ramesh Kumar (Retail)",
          items: [{ variantId: VARIANT_NONGST, quantity: 1, unitPrice: 850 }],
          paidAmount: 850,
          paymentMode: "CASH",
        },
        mockDb
      );

      // For unregistered tenant, tax must be 0 and document is B2C Retail Bill / Bill of Supply
      expect(result.invoice.cgstAmount).toBe(0);
      expect(result.invoice.sgstAmount).toBe(0);
      expect(result.invoice.igstAmount).toBe(0);
      expect(result.invoice.grandTotal).toBe(850);
    });

    it("prevents duplicate creation under retry with idempotency key", async () => {
      const result = await createSalesInvoice(
        {
          tenantId: TENANT_GST,
          userId: "usr-1",
          customerName: "Radha Construction",
          items: [{ variantId: VARIANT_1, quantity: 1, unitPrice: 2500 }],
          idempotencyKey: "IDEMP-KEY-EXISTING-123",
        },
        mockDb
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.invoice.id).toBe("inv-existing-99");
      expect(mockDb.salesInvoice.create).not.toHaveBeenCalled();
    });
  });

  describe("Controlled Cancellations & Returns", () => {
    it("cancels an invoice, records reason, and restores stock", async () => {
      const cancelled = await cancelSalesInvoice(
        {
          tenantId: TENANT_GST,
          invoiceId: "inv-to-cancel",
          cancelReason: "Customer cancelled order before delivery",
          userId: "admin-1",
        },
        mockDb
      );

      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancelReason).toBe("Customer cancelled order before delivery");
      // Verify stock was restored via RETURN_IN movement
      expect(mockDb.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "RETURN_IN",
            reason: "CUSTOMER_SALES_RETURN",
          }),
        })
      );
    });

    it("issues Credit Note for returns and replenishes inventory", async () => {
      const result = await createCreditNoteForInvoice(
        {
          tenantId: TENANT_GST,
          invoiceId: "inv-to-cancel",
          reason: "Product finish scratched on delivery",
          items: [{ variantId: VARIANT_1, quantity: 1, unitPrice: 2500 }],
          userId: "admin-1",
        },
        mockDb
      );

      expect(result.creditNote.noteType).toBe("CREDIT_NOTE");
      expect(result.salesReturn.grandTotal).toBe(2950); // 2500 + 18% GST
      expect(mockDb.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "RETURN_IN",
          }),
        })
      );
    });
  });
});
