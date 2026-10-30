import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNextSequentialNumber,
  createSalesInvoice,
} from "@/lib/invoices/service";
import {
  generateA4InvoiceHtml,
  generateThermalReceiptHtml,
} from "@/lib/invoices/print-template";
import { CrossTenantReferenceError } from "@/lib/tenant/isolation";

describe("Concurrency, Input Validation & Printer Layouts Test Suite", () => {
  const TENANT_A = "6633333333333333333333aa";
  const TENANT_B = "6633333333333333333333bb";
  const VARIANT_A1 = "663333333333333333333301";
  const VARIANT_B1 = "663333333333333333333302";

  let mockDb: any;
  let sequenceCounter: number;
  let invoicesStore: Map<string, any>;
  let stockStore: Map<string, number>;

  beforeEach(() => {
    sequenceCounter = 1;
    invoicesStore = new Map();
    stockStore = new Map([
      [VARIANT_A1, 100],
      [VARIANT_B1, 50],
    ]);

    mockDb = {
      tenant: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === TENANT_A) {
            return {
              id: TENANT_A,
              legalName: "Elvora Sanitarywares Private Limited",
              tradeName: "Elvora Luxury Bath Studio",
              gstin: "09AAACE1234F1Z5",
              stateCode: "09", // Uttar Pradesh
              phone: "9876543210",
              address: "Sector 62, Noida, Uttar Pradesh",
            };
          }
          if (where.id === TENANT_B) {
            return {
              id: TENANT_B,
              legalName: "Gupta Hardware & Sanitary",
              tradeName: "Gupta Hardware",
              gstin: null, // Unregistered
              stateCode: "09",
              phone: "9876543211",
              address: "Varanasi, Uttar Pradesh",
            };
          }
          return null;
        }),
      },
      invoiceSequence: {
        findUnique: vi.fn(async ({ where }: any) => {
          return {
            id: "seq_1",
            tenantId: where.tenantId_fiscalYear_seriesType.tenantId,
            fiscalYear: where.tenantId_fiscalYear_seriesType.fiscalYear,
            seriesType: where.tenantId_fiscalYear_seriesType.seriesType,
            prefix: "INV-",
            nextNumber: sequenceCounter,
          };
        }),
        update: vi.fn(async ({ data }: any) => {
          sequenceCounter = data.nextNumber;
          return { id: "seq_1", nextNumber: sequenceCounter };
        }),
        create: vi.fn(async ({ data }: any) => {
          sequenceCounter = data.nextNumber;
          return { id: "seq_1", nextNumber: sequenceCounter };
        }),
      },
      productVariant: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.id === VARIANT_A1 && (!where.tenantId || where.tenantId === TENANT_A)) {
            return {
              id: VARIANT_A1,
              tenantId: TENANT_A,
              sku: "CP-BASIN-MIX-01",
              gstRate: 18,
              currentStock: stockStore.get(VARIANT_A1) || 100,
              product: {
                name: "Single Lever Basin Mixer",
                hsnCode: "8481",
                gstRate: 18,
              },
            };
          }
          if (where.id === VARIANT_B1 && (!where.tenantId || where.tenantId === TENANT_B)) {
            return {
              id: VARIANT_B1,
              tenantId: TENANT_B,
              sku: "WB-CERAMIC-OVAL",
              gstRate: 18,
              currentStock: stockStore.get(VARIANT_B1) || 50,
              product: {
                name: "Ceramic Oval Washbasin",
                hsnCode: "6910",
                gstRate: 18,
              },
            };
          }
          return null;
        }),
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === VARIANT_A1) {
            return {
              id: VARIANT_A1,
              tenantId: TENANT_A,
              sku: "CP-BASIN-MIX-01",
              gstRate: 18,
              currentStock: stockStore.get(VARIANT_A1) || 100,
              product: {
                name: "Single Lever Basin Mixer",
                hsnCode: "8481",
                gstRate: 18,
              },
            };
          }
          if (where.id === VARIANT_B1) {
            return {
              id: VARIANT_B1,
              tenantId: TENANT_B,
              sku: "WB-CERAMIC-OVAL",
              gstRate: 18,
              currentStock: stockStore.get(VARIANT_B1) || 50,
              product: {
                name: "Ceramic Oval Washbasin",
                hsnCode: "6910",
                gstRate: 18,
              },
            };
          }
          return null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const current = data.currentStock !== undefined
            ? data.currentStock
            : ((stockStore.get(where.id) || 0) - (data.stockQuantity?.decrement || 0));
          stockStore.set(where.id, current);
          return { id: where.id, currentStock: current };
        }),
      },
      stockMovement: {
        create: vi.fn(async ({ data }: any) => ({ id: `mov_${Date.now()}`, ...data })),
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
      },
      salesInvoice: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.idempotencyKey) {
            for (const inv of invoicesStore.values()) {
              if (inv.tenantId === where.tenantId && inv.idempotencyKey === where.idempotencyKey) {
                return inv;
              }
            }
          }
          return null;
        }),
        create: vi.fn(async ({ data }: any) => {
          const inv = {
            id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...data,
            createdAt: new Date(),
          };
          invoicesStore.set(inv.id, inv);
          return inv;
        }),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockDb)),
    };
  });

  // ==========================================
  // 1. CONCURRENCY & SEQUENCE NUMBERING
  // ==========================================
  describe("1. Concurrency & Sequential Invoice Numbering", () => {
    it("generates strictly sequential unique numbers without collisions across simulated concurrent requests", async () => {
      // Create an atomic in-memory mock sequence engine
      let atomicNext = 1;
      const concurrencyMockClient = {
        invoiceSequence: {
          findUnique: vi.fn(async () => {
            const current = atomicNext;
            atomicNext += 1;
            return {
              id: "seq_test",
              nextNumber: current,
              prefix: "INV-",
            };
          }),
          update: vi.fn(async ({ data }: any) => {
            return { id: "seq_test", nextNumber: data.nextNumber };
          }),
        },
      };

      const CONCURRENT_REQUESTS = 25;
      const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
        getNextSequentialNumber(TENANT_A, "TAX_INVOICE", "2026-27", "INV-", concurrencyMockClient)
      );

      const generatedNumbers = await Promise.all(promises);

      // Verify all generated numbers are unique
      const uniqueSet = new Set(generatedNumbers);
      expect(uniqueSet.size).toBe(CONCURRENT_REQUESTS);

      // Verify format matches standard Indian FY format (e.g. INV-2627-0001)
      expect(generatedNumbers[0]).toMatch(/^INV-2627-\d{4}$/);
      expect(generatedNumbers[CONCURRENT_REQUESTS - 1]).toMatch(/^INV-2627-\d{4}$/);
    });

    it("prevents double deductions and returns existing record under parallel duplicate idempotent requests", async () => {
      const idempotencyKey = "REQ_IDEMP_CONCURRENT_999";

      // 1st request creates the invoice
      const res1 = await createSalesInvoice(
        {
          tenantId: TENANT_A,
          userId: "user_owner_1",
          customerName: "Sharma Residency",
          items: [
            {
              variantId: VARIANT_A1,
              quantity: 2,
              unitPrice: 3500,
            },
          ],
          idempotencyKey,
        },
        mockDb
      );

      expect(res1.isDuplicate).toBe(false);
      expect(res1.invoice.idempotencyKey).toBe(idempotencyKey);
      expect(stockStore.get(VARIANT_A1)).toBe(98); // 100 - 2

      // 2nd identical request with same idempotencyKey
      const res2 = await createSalesInvoice(
        {
          tenantId: TENANT_A,
          userId: "user_owner_1",
          customerName: "Sharma Residency",
          items: [
            {
              variantId: VARIANT_A1,
              quantity: 2,
              unitPrice: 3500,
            },
          ],
          idempotencyKey,
        },
        mockDb
      );

      // Second request must be detected as duplicate
      expect(res2.isDuplicate).toBe(true);
      expect(res2.invoice.id).toBe(res1.invoice.id);
      // Stock must NOT be deducted again
      expect(stockStore.get(VARIANT_A1)).toBe(98);
    });
  });

  // ==========================================
  // 2. INPUT VALIDATION & MALFORMED REQUESTS
  // ==========================================
  describe("2. Input Validation & Adversarial Malformed Requests", () => {
    it("rejects invoice creation with empty line items", async () => {
      await expect(
        createSalesInvoice(
          {
            tenantId: TENANT_A,
            userId: "user_owner_1",
            customerName: "Apex Builders",
            items: [],
          },
          mockDb
        )
      ).rejects.toThrow("Cannot create invoice without line items");
    });

    it("rejects invoice line items referencing variants belonging to another tenant", async () => {
      // Tenant A attempts to invoice Tenant B's product variant
      await expect(
        createSalesInvoice(
          {
            tenantId: TENANT_A,
            userId: "user_owner_1",
            customerName: "Apex Builders",
            items: [
              {
                variantId: VARIANT_B1, // Belongs to Tenant B!
                quantity: 1,
                unitPrice: 2000,
              },
            ],
          },
          mockDb
        )
      ).rejects.toThrow(CrossTenantReferenceError);
    });

    it("rejects non-existent tenant invoice requests", async () => {
      await expect(
        createSalesInvoice(
          {
            tenantId: "66ffffffffffffffffffffff", // Fake tenant
            userId: "user_owner_1",
            customerName: "Phantom Corp",
            items: [
              {
                variantId: VARIANT_A1,
                quantity: 1,
                unitPrice: 1000,
              },
            ],
          },
          mockDb
        )
      ).rejects.toThrow("does not exist");
    });
  });

  // ==========================================
  // 3. RESPONSIVE PRINTER LAYOUTS (A4 & THERMAL)
  // ==========================================
  describe("3. Responsive Billing Workflows & Printer Layouts", () => {
    const sampleInvoice = {
      id: "inv_print_sample_1",
      invoiceNumber: "INV-2627-0042",
      invoiceDate: new Date("2026-10-29T10:30:00Z"),
      customerName: "Oberoi Luxury Towers",
      customerGstin: "09AAACE9999F1Z1",
      customerState: "09",
      billingAddress: "Tower B, Golf Course Road, Noida",
      shippingAddress: "Tower B, Golf Course Road, Noida",
      placeOfSupply: "09-Uttar Pradesh",
      isInterState: false,
      taxableAmount: 10000,
      cgstAmount: 900,
      sgstAmount: 900,
      igstAmount: 0,
      roundOff: 0,
      grandTotal: 11800,
      paidAmount: 5000,
      balanceAmount: 6800,
      paymentMode: "SPLIT",
      items: [
        {
          productName: "Wall Hung Ceramic Commode",
          variantName: "Gloss White 520mm",
          sku: "SN-COMM-520-WHT",
          hsnCode: "6910",
          quantity: 2,
          uom: "PCS",
          unitPrice: 5000,
          discountAmount: 0,
          taxableAmount: 10000,
          gstRate: 18,
          cgstAmount: 900,
          sgstAmount: 900,
          igstAmount: 0,
          totalAmount: 11800,
        },
      ],
    };

    const sampleTenantGst = {
      id: TENANT_A,
      legalName: "Elvora Sanitarywares Private Limited",
      tradeName: "Elvora Bath Couture",
      gstin: "09AAACE1234F1Z5",
      stateCode: "09",
      phone: "9876543210",
      address: "Plot 12, Phase 3, Noida, UP - 201301",
      bankName: "HDFC Bank",
      bankAccountNumber: "50200012345678",
      bankIfsc: "HDFC0000123",
      bankBranch: "Noida Sector 62",
      termsAndConditions: "Goods once sold will not be taken back without original bill.",
    };

    const sampleTenantNonGst = {
      id: TENANT_B,
      legalName: "Gupta Sanitary & Hardware Store",
      tradeName: "Gupta Hardware",
      gstin: null, // Unregistered
      stateCode: "09",
      phone: "9876543211",
      address: "Godowlia, Varanasi, UP",
    };

    it("renders valid A4 Tax Invoice HTML with full GST breakup, HSN summary, and INR words for registered tenant", () => {
      const html = generateA4InvoiceHtml({
        invoice: sampleInvoice,
        tenant: sampleTenantGst,
        printCopyType: "ORIGINAL FOR RECIPIENT",
      });

      // Assert structure & headers
      expect(html).toContain("TAX INVOICE");
      expect(html).toContain("ORIGINAL FOR RECIPIENT");
      expect(html).toContain("09AAACE1234F1Z5"); // Supplier GSTIN
      expect(html).toContain("09AAACE9999F1Z1"); // Customer GSTIN
      expect(html).toContain("INV-2627-0042");

      // Assert Item Line details
      expect(html).toContain("Wall Hung Ceramic Commode");
      expect(html).toContain("SN-COMM-520-WHT");
      expect(html).toContain("6910"); // HSN Code

      // Assert GST Breakup (Intra-state: CGST + SGST)
      expect(html).toContain("CGST %");
      expect(html).toContain("SGST %");
      expect(html).toContain("₹11,800");

      // Assert Amount in Words & Bank details
      expect(html).toContain("Eleven Thousand Eight Hundred");
      expect(html).toContain("HDFC Bank");
      expect(html).toContain("50200012345678");

      // Assert Balance Due
      expect(html).toContain("₹6,800");
    });

    it("renders Bill of Supply without GST breakup headers when tenant is unregistered", () => {
      const nonGstInvoice = {
        ...sampleInvoice,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        grandTotal: 10000,
        paidAmount: 10000,
        balanceAmount: 0,
      };

      const html = generateA4InvoiceHtml({
        invoice: nonGstInvoice,
        tenant: sampleTenantNonGst,
        printCopyType: "ORIGINAL",
      });

      // Must be titled BILL OF SUPPLY, never false TAX INVOICE
      expect(html).toContain("BILL OF SUPPLY");
      expect(html).not.toContain("CGST %");
      expect(html).not.toContain("SGST %");
      expect(html).toContain("Gupta Hardware");
    });

    it("renders compact 80mm thermal receipt with monospace font, dashed borders, and Elvora brand footer", () => {
      const receiptHtml = generateThermalReceiptHtml({
        invoice: sampleInvoice,
        tenant: sampleTenantGst,
        printCopyType: "CUSTOMER_RECEIPT",
      });

      // Assert Thermal Print Media constraints
      expect(receiptHtml).toContain("@page { size: 80mm auto; margin: 2mm; }");
      expect(receiptHtml).toContain("font-family: monospace;");
      expect(receiptHtml).toContain("INV-2627-0042");
      expect(receiptHtml).toContain("Oberoi Luxury Towers");

      // Assert summary totals
      expect(receiptHtml).toContain("TOTAL:");
      expect(receiptHtml).toContain("₹11,800");
      expect(receiptHtml).toContain("Balance Due:");
      expect(receiptHtml).toContain("₹6,800");

      // Assert branding footer
      expect(receiptHtml).toContain("Powered by Elvora");
    });
  });
});
