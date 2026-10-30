import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSalesReport,
  getPurchaseReport,
  getInventoryReport,
  getProfitLossReport,
  getTaxSummaryReport,
  getReceivablesPayablesReport,
  generateCSV,
} from "@/lib/reports/service";

describe("ShopLedger Comprehensive Reporting & Reconciliation Suite", () => {
  const TENANT_A = "6644444444444444444444aa";
  const TENANT_B = "6644444444444444444444bb";

  const CUST_A = "6644444444444444444444c1";
  const CUST_B = "6644444444444444444444c2";

  const SUPP_A = "6644444444444444444444s1";
  const SUPP_B = "6644444444444444444444s2";

  const VAR_A1 = "6644444444444444444444v1";
  const VAR_A2 = "6644444444444444444444v2";
  const VAR_B1 = "6644444444444444444444v3";

  let salesInvoicesStore: any[];
  let salesReturnsStore: any[];
  let purchaseInvoicesStore: any[];
  let productVariantsStore: any[];
  let stockMovementsStore: any[];
  let expensesStore: any[];
  let customersStore: any[];
  let suppliersStore: any[];
  let tenantStore: any[];
  let mockDb: any;

  beforeEach(() => {
    salesInvoicesStore = [];
    salesReturnsStore = [];
    purchaseInvoicesStore = [];
    productVariantsStore = [];
    stockMovementsStore = [];
    expensesStore = [];
    customersStore = [];
    suppliersStore = [];
    tenantStore = [
      { id: TENANT_A, legalName: "Elvora Sanitarywares UP", gstin: "09AAACE1234F1Z5", stateCode: "09" },
      { id: TENANT_B, legalName: "Shop B Ceramics MH", gstin: "27BBBCE5678G1Z2", stateCode: "27" },
    ];

    mockDb = {
      tenant: {
        findUnique: vi.fn(async ({ where }: any) => {
          return tenantStore.find((t) => t.id === where.id) || null;
        }),
      },
      salesInvoice: {
        findMany: vi.fn(async ({ where }: any) => {
          return salesInvoicesStore.filter((inv) => {
            if (inv.tenantId !== where.tenantId) return false;
            if (where.status?.in && !where.status.in.includes(inv.status)) return false;
            if (where.customerId && inv.customerId !== where.customerId) return false;
            if (where.balanceAmount?.gt !== undefined && !(inv.balanceAmount > where.balanceAmount.gt)) return false;
            if (where.invoiceDate?.gte && new Date(inv.invoiceDate) < where.invoiceDate.gte) return false;
            if (where.invoiceDate?.lte && new Date(inv.invoiceDate) > where.invoiceDate.lte) return false;
            return true;
          });
        }),
      },
      salesReturn: {
        findMany: vi.fn(async ({ where }: any) => {
          return salesReturnsStore.filter((sr) => {
            if (sr.tenantId !== where.tenantId) return false;
            if (where.returnDate?.gte && new Date(sr.returnDate) < where.returnDate.gte) return false;
            if (where.returnDate?.lte && new Date(sr.returnDate) > where.returnDate.lte) return false;
            return true;
          });
        }),
      },
      purchaseInvoice: {
        findMany: vi.fn(async ({ where }: any) => {
          return purchaseInvoicesStore.filter((p) => {
            if (p.tenantId !== where.tenantId) return false;
            if (where.status?.in && !where.status.in.includes(p.status)) return false;
            if (where.status && typeof where.status === "string" && p.status !== where.status) return false;
            if (where.supplierId && p.supplierId !== where.supplierId) return false;
            if (where.balanceAmount?.gt !== undefined && !(p.balanceAmount > where.balanceAmount.gt)) return false;
            if (where.invoiceDate?.gte && new Date(p.invoiceDate) < where.invoiceDate.gte) return false;
            if (where.invoiceDate?.lte && new Date(p.invoiceDate) > where.invoiceDate.lte) return false;
            return true;
          });
        }),
      },
      productVariant: {
        findMany: vi.fn(async ({ where }: any) => {
          return productVariantsStore.filter((v) => {
            if (v.tenantId !== where.tenantId) return false;
            if (where.isActive !== undefined && v.isActive !== where.isActive) return false;
            return true;
          });
        }),
      },
      stockMovement: {
        findMany: vi.fn(async ({ where, take }: any) => {
          const list = stockMovementsStore.filter((m) => m.tenantId === where.tenantId);
          return take ? list.slice(0, take) : list;
        }),
      },
      expense: {
        findMany: vi.fn(async ({ where }: any) => {
          return expensesStore.filter((e) => {
            if (e.tenantId !== where.tenantId) return false;
            if (where.expenseDate?.gte && new Date(e.expenseDate) < where.expenseDate.gte) return false;
            if (where.expenseDate?.lte && new Date(e.expenseDate) > where.expenseDate.lte) return false;
            return true;
          });
        }),
      },
      customer: {
        findMany: vi.fn(async ({ where }: any) => {
          return customersStore.filter((c) => {
            if (c.tenantId !== where.tenantId) return false;
            if (where.outstandingBalance?.gt !== undefined && !(c.outstandingBalance > where.outstandingBalance.gt)) return false;
            return true;
          });
        }),
      },
      supplier: {
        findMany: vi.fn(async ({ where }: any) => {
          return suppliersStore.filter((s) => {
            if (s.tenantId !== where.tenantId) return false;
            if (where.balance?.gt !== undefined && !(s.balance > where.balance.gt)) return false;
            return true;
          });
        }),
      },
    };

    // Seed master catalog
    productVariantsStore.push(
      {
        id: VAR_A1,
        tenantId: TENANT_A,
        productId: "prod-a1",
        name: "Wall Hung Ceramic Washbasin",
        sku: "JQR-BASIN-01",
        purchasePrice: 2000,
        sellingPrice: 3500,
        currentStock: 12,
        isActive: true,
        product: {
          name: "Premium Basin Series",
          minStockAlert: 5,
          brand: { name: "Jaquar" },
          category: { name: "Sanitaryware" },
        },
      },
      {
        id: VAR_A2,
        tenantId: TENANT_A,
        productId: "prod-a2",
        name: "Single Lever Basin Mixer Tap",
        sku: "CERA-TAP-02",
        purchasePrice: 1200,
        sellingPrice: 2200,
        currentStock: 3, // Low stock!
        isActive: true,
        product: {
          name: "Chrome Faucets",
          minStockAlert: 5,
          brand: { name: "Cera" },
          category: { name: "CP Fittings" },
        },
      },
      {
        id: VAR_B1,
        tenantId: TENANT_B,
        productId: "prod-b1",
        name: "Tenant B Tiles",
        sku: "TILE-B-01",
        purchasePrice: 500,
        sellingPrice: 900,
        currentStock: 100,
        isActive: true,
        product: {
          name: "Vitrified Tiles",
          minStockAlert: 20,
          brand: { name: "Kajaria" },
          category: { name: "Tiles" },
        },
      }
    );

    // Seed Customers
    customersStore.push(
      {
        id: CUST_A,
        tenantId: TENANT_A,
        name: "Apex Luxury Interiors",
        phone: "9876543210",
        gstin: "09AAACA9999F1Z1",
        outstandingBalance: 5900,
        creditLimit: 50000,
      },
      {
        id: CUST_B,
        tenantId: TENANT_B,
        name: "Shop B Local Buyer",
        phone: "9123456789",
        gstin: null,
        outstandingBalance: 1200,
        creditLimit: 10000,
      }
    );

    // Seed Suppliers
    suppliersStore.push(
      {
        id: SUPP_A,
        tenantId: TENANT_A,
        name: "Jaquar & Company Ltd",
        companyName: "Jaquar India Ltd",
        phone: "9811122233",
        gstin: "06AAACJ1234F1Z0",
        balance: 14000,
      },
      {
        id: SUPP_B,
        tenantId: TENANT_B,
        name: "Morbi Tiles Suppliers",
        companyName: "Morbi Ceramic Hub",
        phone: "9822233344",
        gstin: "24AAACC7777H1Z4",
        balance: 25000,
      }
    );
  });

  describe("1. Sales Reports & Multi-Dimensional Breakdowns", () => {
    beforeEach(() => {
      // Invoice 1: B2B Credit sale to Apex (4 basins: 4 * 3500 = 14,000 + 18% GST = 16,520)
      salesInvoicesStore.push({
        id: "inv-01",
        tenantId: TENANT_A,
        invoiceNumber: "INV-2627-001",
        customerId: CUST_A,
        customerName: "Apex Luxury Interiors",
        customerPhone: "9876543210",
        customerGstin: "09AAACA9999F1Z1",
        invoiceDate: new Date("2026-10-25T10:00:00Z"),
        taxableAmount: 14000,
        cgstAmount: 1260,
        sgstAmount: 1260,
        igstAmount: 0,
        taxTotal: 2520,
        grandTotal: 16520,
        paidAmount: 10620,
        balanceAmount: 5900,
        status: "FINALIZED",
        items: [
          {
            variantId: VAR_A1,
            sku: "JQR-BASIN-01",
            productName: "Premium Basin Series",
            variantName: "Wall Hung Ceramic Washbasin",
            quantity: 4,
            unitPrice: 3500,
            taxableAmount: 14000,
            totalAmount: 16520,
            variant: productVariantsStore.find((v) => v.id === VAR_A1),
          },
        ],
      });

      // Invoice 2: B2C Cash retail sale (2 taps: 2 * 2200 = 4,400 + 18% GST = 5,192)
      salesInvoicesStore.push({
        id: "inv-02",
        tenantId: TENANT_A,
        invoiceNumber: "INV-2627-002",
        customerId: null,
        customerName: "Ramesh Sharma (Walk-in)",
        customerPhone: "9899900000",
        customerGstin: null,
        invoiceDate: new Date("2026-10-28T14:30:00Z"),
        taxableAmount: 4400,
        cgstAmount: 396,
        sgstAmount: 396,
        igstAmount: 0,
        taxTotal: 792,
        grandTotal: 5192,
        paidAmount: 5192,
        balanceAmount: 0,
        status: "FINALIZED",
        items: [
          {
            variantId: VAR_A2,
            sku: "CERA-TAP-02",
            productName: "Chrome Faucets",
            variantName: "Single Lever Basin Mixer Tap",
            quantity: 2,
            unitPrice: 2200,
            taxableAmount: 4400,
            totalAmount: 5192,
            variant: productVariantsStore.find((v) => v.id === VAR_A2),
          },
        ],
      });

      // Tenant B invoice: should NOT appear in Tenant A reports
      salesInvoicesStore.push({
        id: "inv-b-01",
        tenantId: TENANT_B,
        invoiceNumber: "INV-B-001",
        customerId: CUST_B,
        customerName: "Shop B Local Buyer",
        invoiceDate: new Date("2026-10-28T15:00:00Z"),
        taxableAmount: 9000,
        cgstAmount: 810,
        sgstAmount: 810,
        igstAmount: 0,
        taxTotal: 1620,
        grandTotal: 10620,
        paidAmount: 9420,
        balanceAmount: 1200,
        status: "FINALIZED",
        items: [
          {
            variantId: VAR_B1,
            sku: "TILE-B-01",
            productName: "Vitrified Tiles",
            variantName: "Tenant B Tiles",
            quantity: 10,
            unitPrice: 900,
            taxableAmount: 9000,
            totalAmount: 10620,
            variant: productVariantsStore.find((v) => v.id === VAR_B1),
          },
        ],
      });
    });

    it("generates sales summary accurately separating taxable turnover, taxes, collections and dues", async () => {
      const report = await getSalesReport(TENANT_A, { period: "monthly" }, mockDb);

      expect(report.summary.invoiceCount).toBe(2);
      expect(report.summary.taxableTurnover).toBe(18400); // 14,000 + 4,400
      expect(report.summary.cgstAmount).toBe(1656); // 1260 + 396
      expect(report.summary.sgstAmount).toBe(1656);
      expect(report.summary.totalTaxAmount).toBe(3312);
      expect(report.summary.grandTotal).toBe(21712); // 16,520 + 5,192
      expect(report.summary.totalPaidAmount).toBe(15812); // 10,620 + 5,192
      expect(report.summary.totalOutstandingReceivables).toBe(5900);
    });

    it("generates sales breakdown by product", async () => {
      const report = await getSalesReport(TENANT_A, { breakdown: "product" }, mockDb);

      expect(report.items.length).toBe(2);
      const basin = report.items.find((i: any) => i.sku === "JQR-BASIN-01");
      const tap = report.items.find((i: any) => i.sku === "CERA-TAP-02");

      expect(basin?.unitsSold).toBe(4);
      expect(basin?.totalAmount).toBe(16520);
      expect(tap?.unitsSold).toBe(2);
      expect(tap?.totalAmount).toBe(5192);
    });

    it("generates sales breakdown by brand and category", async () => {
      const brandReport = await getSalesReport(TENANT_A, { breakdown: "brand" }, mockDb);
      expect(brandReport.items.length).toBe(2);
      expect(brandReport.items[0].brandName).toBe("Jaquar");
      expect(brandReport.items[0].totalAmount).toBe(16520);

      const catReport = await getSalesReport(TENANT_A, { breakdown: "category" }, mockDb);
      expect(catReport.items.length).toBe(2);
      expect(catReport.items[0].categoryName).toBe("Sanitaryware");
      expect(catReport.items[0].totalAmount).toBe(16520);
    });

    it("generates sales breakdown by customer", async () => {
      const custReport = await getSalesReport(TENANT_A, { breakdown: "customer" }, mockDb);
      const apex = custReport.items.find((c: any) => c.customerName === "Apex Luxury Interiors");

      expect(apex?.totalAmount).toBe(16520);
      expect(apex?.paidAmount).toBe(10620);
      expect(apex?.balanceAmount).toBe(5900);
    });
  });

  describe("2. Purchase Summaries & Supplier Balances", () => {
    beforeEach(() => {
      // Purchase 1: 10 basins from Jaquar (10 * 2000 = 20,000 + 18% GST = 23,600 + 400 freight = 24,000)
      purchaseInvoicesStore.push({
        id: "pur-01",
        tenantId: TENANT_A,
        supplierId: SUPP_A,
        invoiceNumber: "JQR-BILL-101",
        invoiceDate: new Date("2026-10-20T10:00:00Z"),
        taxableAmount: 20000,
        cgstAmount: 1800,
        sgstAmount: 1800,
        igstAmount: 0,
        taxTotal: 3600,
        freightAmount: 400,
        grandTotal: 24000,
        paidAmount: 10000,
        balanceAmount: 14000,
        status: "RECEIVED",
        supplier: suppliersStore.find((s) => s.id === SUPP_A),
      });

      // Tenant B purchase
      purchaseInvoicesStore.push({
        id: "pur-b-01",
        tenantId: TENANT_B,
        supplierId: SUPP_B,
        invoiceNumber: "MORBI-BILL-50",
        invoiceDate: new Date("2026-10-22T10:00:00Z"),
        taxableAmount: 25000,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 4500,
        taxTotal: 4500,
        freightAmount: 1000,
        grandTotal: 30500,
        paidAmount: 5500,
        balanceAmount: 25000,
        status: "RECEIVED",
        supplier: suppliersStore.find((s) => s.id === SUPP_B),
      });
    });

    it("computes purchase summaries, freight, ITC and supplier payables accurately", async () => {
      const report = await getPurchaseReport(TENANT_A, {}, mockDb);

      expect(report.summary.billCount).toBe(1);
      expect(report.summary.taxableAmount).toBe(20000);
      expect(report.summary.totalInputTaxCredit).toBe(3600);
      expect(report.summary.totalFreightCharges).toBe(400);
      expect(report.summary.grandTotal).toBe(24000);
      expect(report.summary.periodUnpaidBillsBalance).toBe(14000);
      expect(report.summary.totalSupplierPayables).toBe(14000);

      expect(report.supplierBreakdown[0].name).toBe("Jaquar & Company Ltd");
      expect(report.supplierBreakdown[0].totalSpendInPeriod).toBe(24000);
    });
  });

  describe("3. Inventory Valuation & Low Stock Alerts", () => {
    beforeEach(() => {
      stockMovementsStore.push(
        {
          id: "mov-01",
          tenantId: TENANT_A,
          variantId: VAR_A1,
          type: "PURCHASE_IN",
          quantity: 10,
          unitCost: 2000,
          balanceAfter: 12,
          reason: "VENDOR_PURCHASE",
          createdAt: new Date(),
          variant: productVariantsStore.find((v) => v.id === VAR_A1),
        },
        {
          id: "mov-02",
          tenantId: TENANT_A,
          variantId: VAR_A2,
          type: "SALE_OUT",
          quantity: -2,
          unitCost: 1200,
          balanceAfter: 3,
          reason: "SALE_INVOICE",
          createdAt: new Date(),
          variant: productVariantsStore.find((v) => v.id === VAR_A2),
        }
      );
    });

    it("evaluates stock valuation at purchase cost and flags items needing re-order", async () => {
      const report = await getInventoryReport(TENANT_A, {}, mockDb);

      // VAR_A1: 12 units * ₹2000 = ₹24,000
      // VAR_A2: 3 units * ₹1200 = ₹3,600
      // Total valuation at cost: ₹27,600
      expect(report.summary.totalVariantCount).toBe(2); // Only Tenant A variants
      expect(report.summary.totalStockUnits).toBe(15);
      expect(report.summary.inventoryValuationAtCost).toBe(27600);

      // VAR_A2 currentStock is 3, minStockAlert is 5 -> Low Stock!
      expect(report.summary.lowStockItemCount).toBe(1);
      expect(report.lowStockAlerts[0].sku).toBe("CERA-TAP-02");
      expect(report.lowStockAlerts[0].currentStock).toBe(3);
      expect(report.lowStockAlerts[0].minStockAlert).toBe(5);

      // Audited movement count
      expect(report.recentMovements.length).toBe(2);
    });
  });

  describe("4. Profit & Loss Intelligence (Documented Cost Method)", () => {
    beforeEach(() => {
      // Sales:
      // Item 1: 4 basins sold @ ₹3500 (cost ₹2000) -> Taxable ₹14,000, Cost ₹8,000
      // Item 2: 2 taps sold @ ₹2200 (cost ₹1200) -> Taxable ₹4,400, Cost ₹2,400
      // Gross taxable turnover: ₹18,400, Raw COGS: ₹10,400
      salesInvoicesStore.push({
        id: "inv-01",
        tenantId: TENANT_A,
        taxableAmount: 14000,
        cgstAmount: 1260,
        sgstAmount: 1260,
        igstAmount: 0,
        taxTotal: 2520,
        grandTotal: 16520,
        status: "FINALIZED",
        invoiceDate: new Date(),
        items: [
          {
            variantId: VAR_A1,
            quantity: 4,
            taxableAmount: 14000,
            variant: productVariantsStore.find((v) => v.id === VAR_A1),
          },
        ],
      });

      salesInvoicesStore.push({
        id: "inv-02",
        tenantId: TENANT_A,
        taxableAmount: 4400,
        cgstAmount: 396,
        sgstAmount: 396,
        igstAmount: 0,
        taxTotal: 792,
        grandTotal: 5192,
        status: "FINALIZED",
        invoiceDate: new Date(),
        items: [
          {
            variantId: VAR_A2,
            quantity: 2,
            taxableAmount: 4400,
            variant: productVariantsStore.find((v) => v.id === VAR_A2),
          },
        ],
      });

      // Sales Return: 1 basin returned (Taxable ₹3,500, Cost reversed ₹2,000)
      salesReturnsStore.push({
        id: "sr-01",
        tenantId: TENANT_A,
        returnDate: new Date(),
        subtotal: 3500,
        items: [
          {
            variantId: VAR_A1,
            quantity: 1,
            variant: productVariantsStore.find((v) => v.id === VAR_A1),
          },
        ],
      });

      // Operating Expenses: Rent ₹4,000, Freight ₹900
      expensesStore.push(
        {
          id: "exp-01",
          tenantId: TENANT_A,
          category: "RENT",
          amount: 4000,
          expenseDate: new Date(),
        },
        {
          id: "exp-02",
          tenantId: TENANT_A,
          category: "FREIGHT",
          amount: 900,
          expenseDate: new Date(),
        }
      );
    });

    it("calculates gross profit and net profit strictly excluding GST from revenues", async () => {
      const pnl = await getProfitLossReport(TENANT_A, {}, mockDb);

      const s = pnl.statement;

      // Verification of formula:
      // Gross Taxable Turnover: 18,400
      expect(s.grossSalesTurnover).toBe(18400);
      // Less Returns: 3,500
      expect(s.lessSalesReturns).toBe(3500);
      // Net Sales Turnover: 18,400 - 3,500 = 14,900
      expect(s.netSalesTurnover).toBe(14900);

      // COGS:
      // Raw product cost: (4 * 2000) + (2 * 1200) = 10,400
      expect(s.costOfGoodsSold.rawProductCost).toBe(10400);
      // Less returned item cost reversal: 1 * 2000 = 2,000
      expect(s.costOfGoodsSold.lessReturnedGoodsCostReversal).toBe(2000);
      // Net COGS: 10,400 - 2,000 = 8,400
      expect(s.costOfGoodsSold.netCostOfGoodsSold).toBe(8400);

      // Gross Profit: Net Sales Turnover (14,900) - Net COGS (8,400) = 6,500
      expect(s.grossProfit).toBe(6500);

      // Operating Overheads: Rent 4000 + Freight 900 = 4,900
      expect(s.operatingExpenses.total).toBe(4900);

      // Net Profit: Gross Profit (6,500) - Overheads (4,900) = 1,600
      expect(s.estimatedNetProfit).toBe(1600);

      // Output GST collected (3,312) is separated and strictly NOT counted in profit!
      expect(s.outputTaxCollectedExcludedFromProfit).toBe(3312);
      expect(pnl.calculationMethod.hasIncompleteCosts).toBe(false);
    });

    it("flags estimated profit when sold items have incomplete purchase costs", async () => {
      // Add sale item with variant missing purchase cost (0)
      const missingCostVar = {
        id: "var-zero-cost",
        tenantId: TENANT_A,
        name: "Old Stock Fitting",
        purchasePrice: 0, // Incomplete cost data!
      };

      salesInvoicesStore.push({
        id: "inv-03",
        tenantId: TENANT_A,
        taxableAmount: 1000,
        cgstAmount: 90,
        sgstAmount: 90,
        igstAmount: 0,
        taxTotal: 180,
        grandTotal: 1180,
        status: "FINALIZED",
        invoiceDate: new Date(),
        items: [
          {
            variantId: "var-zero-cost",
            quantity: 1,
            taxableAmount: 1000,
            variant: missingCostVar,
          },
        ],
      });

      const pnl = await getProfitLossReport(TENANT_A, {}, mockDb);
      expect(pnl.calculationMethod.hasIncompleteCosts).toBe(true);
      expect(pnl.calculationMethod.missingCostItemCount).toBeGreaterThan(0);
      expect(pnl.calculationMethod.isEstimated).toBe(true);
    });
  });

  describe("5. Tax Summaries (GSTR-1 & GSTR-3B Ready)", () => {
    beforeEach(() => {
      // B2B Invoices: 14,000 taxable (CGST 1260, SGST 1260)
      salesInvoicesStore.push({
        id: "inv-01",
        tenantId: TENANT_A,
        customerGstin: "09AAACA9999F1Z1", // Registered!
        taxableAmount: 14000,
        cgstAmount: 1260,
        sgstAmount: 1260,
        igstAmount: 0,
        taxTotal: 2520,
        status: "FINALIZED",
        invoiceDate: new Date(),
      });

      // B2C Invoices: 4,400 taxable (CGST 396, SGST 396)
      salesInvoicesStore.push({
        id: "inv-02",
        tenantId: TENANT_A,
        customerGstin: null, // Unregistered walk-in
        taxableAmount: 4400,
        cgstAmount: 396,
        sgstAmount: 396,
        igstAmount: 0,
        taxTotal: 792,
        status: "FINALIZED",
        invoiceDate: new Date(),
      });

      // Purchases (ITC): 20,000 taxable (CGST 1800, SGST 1800)
      purchaseInvoicesStore.push({
        id: "pur-01",
        tenantId: TENANT_A,
        taxableAmount: 20000,
        cgstAmount: 1800,
        sgstAmount: 1800,
        igstAmount: 0,
        status: "RECEIVED",
        invoiceDate: new Date(),
      });
    });

    it("generates GSTR-1 outward and GSTR-3B net tax payable calculations", async () => {
      const taxReport = await getTaxSummaryReport(TENANT_A, {}, mockDb);

      const gstr1 = taxReport.outwardSuppliesGSTR1;
      expect(gstr1.b2b.taxable).toBe(14000);
      expect(gstr1.b2b.totalTax).toBe(2520);
      expect(gstr1.b2c.taxable).toBe(4400);
      expect(gstr1.b2c.totalTax).toBe(792);

      const totalOutput = gstr1.totalOutputTax.total;
      expect(totalOutput).toBe(3312); // 2520 + 792

      const itc = taxReport.inwardSuppliesITC.eligibleITC.total;
      expect(itc).toBe(3600); // 1800 + 1800

      // Since ITC (3600) > Output Tax (3312), Net Cash Tax is 0 and ITC carry forward is 288!
      expect(taxReport.gstr3bSummary.netCashTaxPayable).toBe(0);
      expect(taxReport.gstr3bSummary.itcCarryForward).toBe(288);
    });
  });

  describe("6. Receivables & Payables Intelligence", () => {
    it("reports customer receivables and supplier payables with net exposure", async () => {
      const report = await getReceivablesPayablesReport(TENANT_A, mockDb);

      // Customer A has outstanding balance of 5900
      expect(report.summary.totalCustomersWithDues).toBe(1);
      expect(report.summary.totalOutstandingReceivables).toBe(5900);

      // Supplier A has balance of 14000
      expect(report.summary.totalSuppliersWithDues).toBe(1);
      expect(report.summary.totalOutstandingPayables).toBe(14000);

      // Net working capital exposure = 5900 - 14000 = -8100
      expect(report.summary.netWorkingCapitalExposure).toBe(-8100);
    });
  });

  describe("7. Universal CSV Data Export", () => {
    it("generates correctly formatted, RFC-compliant CSV with escaped commas and quotes", () => {
      const headers = ["Product Name", "SKU", "Price (₹)", "Description"];
      const rows = [
        ["Basin Mixer, Single Lever", "TAP-01", 1500, 'Chrome "Mirror" finish'],
        ["Wall Hung Basin", "BAS-02", 3200, "Standard ceramic"],
      ];

      const csv = generateCSV(headers, rows);
      expect(csv).toContain('"Product Name","SKU","Price (₹)","Description"');
      expect(csv).toContain('"Basin Mixer, Single Lever"');
      expect(csv).toContain('"Chrome ""Mirror"" finish"');
    });
  });

  describe("8. Strict Multi-Tenant Isolation & Anti-Leak Safeguards", () => {
    it("guarantees Tenant A's reports never include or leak Tenant B's data", async () => {
      // Add Tenant B data
      salesInvoicesStore.push({
        id: "inv-b-99",
        tenantId: TENANT_B,
        taxableAmount: 100000,
        cgstAmount: 9000,
        sgstAmount: 9000,
        igstAmount: 0,
        taxTotal: 18000,
        grandTotal: 118000,
        status: "FINALIZED",
        invoiceDate: new Date(),
        items: [],
      });

      const reportA = await getSalesReport(TENANT_A, {}, mockDb);
      const reportB = await getSalesReport(TENANT_B, {}, mockDb);

      // Tenant A must not see Tenant B's 100,000 turnover
      expect(reportA.summary.taxableTurnover).not.toBe(100000);
      expect(reportB.summary.taxableTurnover).toBe(100000);

      const pnlA = await getProfitLossReport(TENANT_A, {}, mockDb);
      const pnlB = await getProfitLossReport(TENANT_B, {}, mockDb);

      expect(pnlA.statement.grossSalesTurnover).not.toBe(100000);
      expect(pnlB.statement.grossSalesTurnover).toBe(100000);
    });
  });
});
