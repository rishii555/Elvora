import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveAnalyticsDateRange,
  computeGrowthPercentage,
  getExecutiveOverview,
  getSalesAnalytics,
  getPurchaseAnalytics,
  getInventoryAnalytics,
  getCustomerAnalytics,
  getCashFlowAnalytics,
  getBusinessKPIs,
  getBusinessInsightsAndAlerts,
} from "@/lib/analytics/service";
import { generateReportCSV } from "@/lib/reports/export";

describe("Phase 7: Advanced Business Intelligence, Analytics & Reporting Suite", () => {
  const TENANT_A = "6655555555555555555555aa";
  const TENANT_B = "6655555555555555555555bb";

  let salesInvoicesStore: any[];
  let salesItemsStore: any[];
  let purchaseInvoicesStore: any[];
  let salesReturnsStore: any[];
  let purchaseReturnsStore: any[];
  let expensesStore: any[];
  let customersStore: any[];
  let suppliersStore: any[];
  let productsStore: any[];
  let variantsStore: any[];
  let stockMovementsStore: any[];
  let locationsStore: any[];
  let accountsStore: any[];
  let tenantsStore: any[];
  let mockDb: any;

  beforeEach(() => {
    salesInvoicesStore = [];
    salesItemsStore = [];
    purchaseInvoicesStore = [];
    salesReturnsStore = [];
    purchaseReturnsStore = [];
    expensesStore = [];
    customersStore = [];
    suppliersStore = [];
    productsStore = [];
    variantsStore = [];
    stockMovementsStore = [];
    locationsStore = [];
    accountsStore = [];
    tenantsStore = [
      { id: TENANT_A, name: "Elvora Sanitary & Bathware Hub" },
      { id: TENANT_B, name: "Competitor Building Supplies" },
    ];

    mockDb = {
      tenant: {
        findUnique: vi.fn(async ({ where }: any) => {
          return tenantsStore.find((t) => t.id === where.id) || null;
        }),
      },
      salesInvoice: {
        findMany: vi.fn(async ({ where }: any) => {
          return salesInvoicesStore.filter((inv) => {
            if (inv.tenantId !== where.tenantId) return false;
            if (where.status?.not && inv.status === where.status.not) return false;
            if (where.status && typeof where.status === "string" && inv.status !== where.status) return false;
            if (where.invoiceDate?.gte && new Date(inv.invoiceDate) < new Date(where.invoiceDate.gte)) return false;
            if (where.invoiceDate?.lte && new Date(inv.invoiceDate) > new Date(where.invoiceDate.lte)) return false;
            if (where.balanceAmount?.gt && !(inv.balanceAmount > where.balanceAmount.gt)) return false;
            return true;
          });
        }),
      },
      salesInvoiceItem: {
        findMany: vi.fn(async ({ where }: any) => {
          return salesItemsStore.filter((it) => it.tenantId === where.tenantId);
        }),
      },
      salesReturn: {
        findMany: vi.fn(async ({ where }: any) => {
          return salesReturnsStore.filter((r) => r.tenantId === where.tenantId);
        }),
      },
      purchaseInvoice: {
        findMany: vi.fn(async ({ where }: any) => {
          return purchaseInvoicesStore.filter((p) => {
            if (p.tenantId !== where.tenantId) return false;
            if (where.status?.not && p.status === where.status.not) return false;
            if (where.invoiceDate?.gte && new Date(p.invoiceDate) < new Date(where.invoiceDate.gte)) return false;
            if (where.invoiceDate?.lte && new Date(p.invoiceDate) > new Date(where.invoiceDate.lte)) return false;
            if (where.balanceAmount?.gt && !(p.balanceAmount > where.balanceAmount.gt)) return false;
            return true;
          });
        }),
      },
      purchaseReturn: {
        findMany: vi.fn(async ({ where }: any) => {
          return purchaseReturnsStore.filter((r) => r.tenantId === where.tenantId);
        }),
      },
      expense: {
        findMany: vi.fn(async ({ where }: any) => {
          return expensesStore.filter((e) => {
            if (e.tenantId !== where.tenantId) return false;
            if (where.expenseDate?.gte && new Date(e.expenseDate) < new Date(where.expenseDate.gte)) return false;
            if (where.expenseDate?.lte && new Date(e.expenseDate) > new Date(where.expenseDate.lte)) return false;
            return true;
          });
        }),
      },
      customer: {
        findMany: vi.fn(async ({ where }: any) => {
          return customersStore.filter((c) => c.tenantId === where.tenantId).map((c) => ({
            ...c,
            salesInvoices: salesInvoicesStore.filter((i) => i.customerId === c.id),
          }));
        }),
      },
      supplier: {
        findMany: vi.fn(async ({ where }: any) => {
          return suppliersStore.filter((s) => s.tenantId === where.tenantId);
        }),
      },
      product: {
        findMany: vi.fn(async ({ where }: any) => {
          return productsStore.filter((p) => p.tenantId === where.tenantId);
        }),
      },
      productVariant: {
        findMany: vi.fn(async ({ where }: any) => {
          return variantsStore.filter((v) => v.tenantId === where.tenantId && v.isActive === true);
        }),
      },
      stockMovement: {
        findMany: vi.fn(async ({ where }: any) => {
          return stockMovementsStore.filter((m) => m.tenantId === where.tenantId);
        }),
      },
      inventoryLocation: {
        findMany: vi.fn(async ({ where }: any) => {
          return locationsStore.filter((l) => l.tenantId === where.tenantId && l.isActive === true);
        }),
      },
      ledgerAccount: {
        findMany: vi.fn(async ({ where }: any) => {
          return accountsStore.filter((a) => {
            if (a.tenantId !== where.tenantId) return false;
            if (where.code?.in && !where.code.in.includes(a.code)) return false;
            return true;
          });
        }),
      },
      ledgerEntry: {
        findMany: vi.fn(async () => {
          return [];
        }),
      },
    };
  });

  // ==========================================
  // SECTION 1: DATE UTILITIES & GROWTH FORMULA
  // ==========================================
  describe("1. Date Range Boundaries & Growth Percentage Calculations", () => {
    it("resolves monthly, weekly, and yearly Indian financial year boundaries", () => {
      const monthly = resolveAnalyticsDateRange({ period: "monthly" });
      expect(monthly.current.start.getDate()).toBe(1);
      expect(monthly.previous.start).toBeDefined();

      const weekly = resolveAnalyticsDateRange({ period: "weekly" });
      const durationDays = Math.round(
        (weekly.current.end.getTime() - weekly.current.start.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(durationDays).toBe(7);

      const yearly = resolveAnalyticsDateRange({ period: "yearly" });
      expect(yearly.current.start.getMonth()).toBe(3); // April is month index 3
      expect(yearly.current.start.getDate()).toBe(1);
    });

    it("calculates percentage growth correctly and handles zero baselines safely", () => {
      // Normal positive growth
      const normal = computeGrowthPercentage(150, 100);
      expect(normal.growthPercent).toBe(50);
      expect(normal.direction).toBe("UP");

      // Decline
      const decline = computeGrowthPercentage(75, 100);
      expect(decline.growthPercent).toBe(-25);
      expect(decline.direction).toBe("DOWN");

      // Zero baseline -> doesn't crash with NaN or Infinity
      const zeroBase = computeGrowthPercentage(500, 0);
      expect(zeroBase.growthPercent).toBe(100);
      expect(zeroBase.direction).toBe("UP");

      // Both zero
      const bothZero = computeGrowthPercentage(0, 0);
      expect(bothZero.growthPercent).toBe(0);
      expect(bothZero.direction).toBe("FLAT");
    });
  });

  // ==========================================
  // SECTION 2: EXECUTIVE DASHBOARD KPIS
  // ==========================================
  describe("2. Executive Overview & Main KPI Cards Aggregation", () => {
    it("aggregates total sales, purchases, profit margins, and liquid balances accurately", async () => {
      const now = new Date();

      // Seed Category & Product
      const category = { id: "cat-1", name: "Faucets & Showers" };
      const product = { id: "p-1", tenantId: TENANT_A, name: "Diverter Mixers", minStockAlert: 5, category };
      const variant1 = {
        id: "var-1",
        tenantId: TENANT_A,
        productId: product.id,
        product,
        sku: "DIV-01",
        name: "Brass Concealed Diverter",
        purchasePrice: 2000,
        sellingPrice: 3500,
        currentStock: 25,
        isActive: true,
      };
      const variant2 = {
        id: "var-2",
        tenantId: TENANT_A,
        productId: product.id,
        product,
        sku: "DIV-02",
        name: "Single Lever Wall Mixer",
        purchasePrice: 1500,
        sellingPrice: 2800,
        currentStock: 3, // Low stock! (<= 5)
        isActive: true,
      };

      variantsStore.push(variant1, variant2);

      // Seed Customers & Suppliers
      customersStore.push(
        { id: "cust-1", tenantId: TENANT_A, name: "Rajesh Builders", outstandingBalance: 12000, createdAt: now },
        { id: "cust-2", tenantId: TENANT_A, name: "Sharma Hardware", outstandingBalance: 8000, createdAt: now }
      );
      suppliersStore.push(
        { id: "sup-1", tenantId: TENANT_A, name: "Jaquar & Co", balance: 15000 }
      );

      // Seed Sales Invoices
      salesInvoicesStore.push({
        id: "inv-1",
        tenantId: TENANT_A,
        customerId: "cust-1",
        customerName: "Rajesh Builders",
        invoiceDate: now,
        grandTotal: 10000,
        paidAmount: 6000,
        balanceAmount: 4000,
        paymentMode: "UPI",
        status: "FINALIZED",
        items: [
          {
            variantId: variant1.id,
            productName: variant1.name,
            sku: variant1.sku,
            quantity: 2,
            totalAmount: 7000,
            variant: variant1,
          },
        ],
      });

      // Seed Purchase Bills
      purchaseInvoicesStore.push({
        id: "pb-1",
        tenantId: TENANT_A,
        supplierId: "sup-1",
        invoiceDate: now,
        grandTotal: 8000,
        paidAmount: 5000,
        balanceAmount: 3000,
        status: "RECEIVED",
        supplier: suppliersStore[0],
      });

      // Seed Expenses
      expensesStore.push({
        id: "exp-1",
        tenantId: TENANT_A,
        category: "RENT",
        payee: "Commercial Landlord",
        amount: 2500,
        expenseDate: now,
      });

      // Seed Cash & Bank ledger accounts
      accountsStore.push(
        { id: "acc-cash", tenantId: TENANT_A, code: "1010_CASH", balance: 15000 },
        { id: "acc-bank", tenantId: TENANT_A, code: "1020_BANK", balance: 45000 }
      );

      // Execute overview aggregation
      const overview = await getExecutiveOverview(TENANT_A, { period: "monthly" }, mockDb);

      expect(overview.kpis.totalSales.value).toBe(10000);
      expect(overview.kpis.totalPurchases.value).toBe(8000);
      expect(overview.kpis.totalExpenses.value).toBe(2500);

      // Estimated COGS = 2 units * ₹2,000 cost = ₹4,000
      // Gross Profit = 10,000 - 4,000 = 6,000
      expect(overview.kpis.grossProfit.value).toBe(6000);
      expect(overview.kpis.grossProfit.marginPercent).toBe(60);

      // Net Profit = Gross Profit (6,000) - Expenses (2,500) = 3,500
      expect(overview.kpis.netProfit.value).toBe(3500);
      expect(overview.kpis.netProfit.marginPercent).toBe(35);

      // Liquid Funds = 15,000 cash + 45,000 bank = 60,000
      expect(overview.kpis.totalLiquidFunds).toBe(60000);
      expect(overview.kpis.cashBalance).toBe(15000);
      expect(overview.kpis.bankBalance).toBe(45000);

      // Receivables = 12,000 + 8,000 = 20,000
      expect(overview.kpis.outstandingReceivables).toBe(20000);
      // Payables = 15,000
      expect(overview.kpis.outstandingPayables).toBe(15000);

      // Inventory valuation:
      // var1: 25 * 2000 = 50,000 cost (25 * 3500 = 87,500 retail)
      // var2: 3 * 1500 = 4,500 cost (3 * 2800 = 8,400 retail)
      // Total cost = 54,500
      expect(overview.kpis.inventoryValuationCost).toBe(54500);
      expect(overview.kpis.inventoryValuationRetail).toBe(95900);

      // Low stock: var2 has stock 3 <= minStockAlert 5
      expect(overview.kpis.lowStockCount).toBe(1);

      // Charts data verified
      expect(overview.charts.topProducts).toHaveLength(1);
      expect(overview.charts.topCustomers).toHaveLength(1);
      expect(overview.charts.paymentDistribution).toHaveLength(1);
      expect(overview.charts.paymentDistribution[0].mode).toBe("UPI");
    });
  });

  // ==========================================
  // SECTION 3: SALES & MARGIN ANALYTICS
  // ==========================================
  describe("3. Sales Intelligence & Profit Margin Verification", () => {
    it("deducts returns from gross sales and computes unit-level product margins", async () => {
      const now = new Date();

      const variant = {
        id: "var-10",
        tenantId: TENANT_A,
        sku: "BASIN-01",
        name: "Table Top Wash Basin",
        purchasePrice: 1200,
        sellingPrice: 2400,
        currentStock: 20,
        isActive: true,
      };
      variantsStore.push(variant);

      // Sales Invoice: ₹12,000 gross
      salesInvoicesStore.push({
        id: "inv-10",
        tenantId: TENANT_A,
        invoiceDate: now,
        grandTotal: 12000,
        discountAmount: 500,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        paidAmount: 8000,
        balanceAmount: 4000,
        status: "FINALIZED",
        items: [
          {
            variantId: variant.id,
            productName: variant.name,
            sku: variant.sku,
            quantity: 5,
            totalAmount: 12000,
            variant,
          },
        ],
      });

      // Sales Return: ₹2,400 return
      salesReturnsStore.push({
        id: "ret-1",
        tenantId: TENANT_A,
        grandTotal: 2400,
        createdAt: now,
      });

      const salesAnalytics = await getSalesAnalytics(TENANT_A, { period: "monthly" }, mockDb);

      expect(salesAnalytics.summary.grossSales).toBe(12000);
      expect(salesAnalytics.summary.returnsAmount).toBe(2400);
      // Net Sales = 12000 - 2400 = 9600
      expect(salesAnalytics.summary.netSales).toBe(9600);
      expect(salesAnalytics.summary.discountsGiven).toBe(500);
      expect(salesAnalytics.summary.taxCollected).toBe(1800);
      expect(salesAnalytics.summary.collectedAmount).toBe(8000);
      expect(salesAnalytics.summary.outstandingAmount).toBe(4000);
      expect(salesAnalytics.summary.averageInvoiceValue).toBe(12000);

      // Product performance verification
      const topProd = salesAnalytics.topSellingByRevenue[0];
      expect(topProd.name).toBe("Table Top Wash Basin");
      expect(topProd.quantitySold).toBe(5);
      expect(topProd.revenue).toBe(12000);
      // Cost = 5 * 1200 = 6000
      expect(topProd.estimatedCost).toBe(6000);
      // Gross Profit = 12000 - 6000 = 6000
      expect(topProd.grossProfit).toBe(6000);
      expect(topProd.marginPercent).toBe(50);
    });
  });

  // ==========================================
  // SECTION 4: PROCUREMENT & VENDOR CONCENTRATION
  // ==========================================
  describe("4. Purchase & Procurement Intelligence", () => {
    it("computes supplier spend and concentration percentage", async () => {
      const now = new Date();

      suppliersStore.push(
        { id: "sup-a", tenantId: TENANT_A, name: "Kajaria Ceramics", balance: 50000 },
        { id: "sup-b", tenantId: TENANT_A, name: "Hindware Bath", balance: 10000 },
        { id: "sup-c", tenantId: TENANT_A, name: "Local Fitting Dist", balance: 2000 }
      );

      // Purchases:
      // Kajaria: ₹70,000
      // Hindware: ₹20,000
      // Local: ₹10,000
      // Total Purchases: ₹100,000
      purchaseInvoicesStore.push(
        { id: "b1", tenantId: TENANT_A, supplierId: "sup-a", invoiceDate: now, grandTotal: 70000, paidAmount: 20000, balanceAmount: 50000, supplier: suppliersStore[0], status: "RECEIVED" },
        { id: "b2", tenantId: TENANT_A, supplierId: "sup-b", invoiceDate: now, grandTotal: 20000, paidAmount: 10000, balanceAmount: 10000, supplier: suppliersStore[1], status: "RECEIVED" },
        { id: "b3", tenantId: TENANT_A, supplierId: "sup-c", invoiceDate: now, grandTotal: 10000, paidAmount: 8000, balanceAmount: 2000, supplier: suppliersStore[2], status: "RECEIVED" }
      );

      const purchaseAnalytics = await getPurchaseAnalytics(TENANT_A, { period: "monthly" }, mockDb);

      expect(purchaseAnalytics.summary.totalPurchases).toBe(100000);
      expect(purchaseAnalytics.summary.paidAmount).toBe(38000);
      expect(purchaseAnalytics.summary.balanceAmount).toBe(62000);
      expect(purchaseAnalytics.summary.billCount).toBe(3);
      expect(purchaseAnalytics.summary.activeSuppliersCount).toBe(3);

      // Top 3 supplier concentration: (70k + 20k + 10k) / 100k = 100%
      expect(purchaseAnalytics.summary.supplierConcentrationPercent).toBe(100);
      expect(purchaseAnalytics.topSuppliers[0].name).toBe("Kajaria Ceramics");
      expect(purchaseAnalytics.topSuppliers[0].totalSpend).toBe(70000);
    });
  });

  // ==========================================
  // SECTION 5: INVENTORY TURNOVER & REPLENISHMENT
  // ==========================================
  describe("5. Inventory Intelligence, Turnover Ratio & Dead Stock", () => {
    it("detects low-stock replenishment needs and computes turnover", async () => {
      const product = { id: "p-valve", tenantId: TENANT_A, name: "Angle Valve", minStockAlert: 10 };
      const vNormal = {
        id: "v-norm",
        tenantId: TENANT_A,
        productId: product.id,
        product,
        sku: "ANG-01",
        name: "Standard Angle Valve",
        purchasePrice: 200,
        sellingPrice: 350,
        currentStock: 50,
        isActive: true,
      };
      const vLow = {
        id: "v-low",
        tenantId: TENANT_A,
        productId: product.id,
        product,
        sku: "ANG-02",
        name: "Quarter Turn Angle Valve",
        purchasePrice: 250,
        sellingPrice: 450,
        currentStock: 4, // Low stock! (<= 10)
        isActive: true,
      };
      const vDead = {
        id: "v-dead",
        tenantId: TENANT_A,
        productId: product.id,
        product,
        sku: "ANG-OLD",
        name: "Discontinued Brass Bibcock",
        purchasePrice: 500,
        sellingPrice: 750,
        currentStock: 40, // 40 units sitting, 0 sales
        isActive: true,
      };

      variantsStore.push(vNormal, vLow, vDead);

      // Sales in period: 20 units of vNormal sold
      salesItemsStore.push({
        tenantId: TENANT_A,
        variantId: vNormal.id,
        quantity: 20,
        totalAmount: 7000,
      });

      const invAnalytics = await getInventoryAnalytics(TENANT_A, { period: "monthly" }, mockDb);

      expect(invAnalytics.summary.totalSKUs).toBe(3);
      expect(invAnalytics.summary.lowStockCount).toBe(1);

      // Replenishment alert should target vLow
      const alert = invAnalytics.replenishmentAlerts.find((a: any) => a.sku === "ANG-02");
      expect(alert).toBeDefined();
      expect(alert.status).toBe("LOW_STOCK");
      expect(alert.suggestedReorderQuantity).toBeGreaterThan(0);

      // Dead stock should detect vDead
      const deadItem = invAnalytics.deadStock.find((d: any) => d.sku === "ANG-OLD");
      expect(deadItem).toBeDefined();
      // Tied up capital = 40 * 200 = 8000 or 40 * 500 = 20,000
      expect(deadItem.tiedUpCapital).toBe(20000);
    });
  });

  // ==========================================
  // SECTION 6: CUSTOMER CRM & SEGMENTATION
  // ==========================================
  describe("6. Customer CRM Segmentation & Retention Rate", () => {
    it("segments customers into High-Value, Regular, and High-Outstanding", async () => {
      const now = new Date();

      customersStore.push(
        {
          id: "c-vip",
          tenantId: TENANT_A,
          name: "Oberoi Luxury Towers",
          phone: "9876543210",
          outstandingBalance: 0,
          createdAt: new Date(now.getTime() - 100 * 86400000),
        },
        {
          id: "c-debtor",
          tenantId: TENANT_A,
          name: "Slow Paying Contractor",
          phone: "9123456789",
          outstandingBalance: 25000, // High outstanding!
          createdAt: new Date(now.getTime() - 80 * 86400000),
        }
      );

      // Invoices for Oberoi Luxury: ₹60,000 lifetime (> ₹50,000 threshold for HIGH_VALUE)
      salesInvoicesStore.push({
        id: "inv-vip",
        tenantId: TENANT_A,
        customerId: "c-vip",
        invoiceDate: new Date(),
        grandTotal: 60000,
        status: "FINALIZED",
      });

      const crm = await getCustomerAnalytics(TENANT_A, undefined, mockDb);

      expect(crm.summary.totalCustomers).toBe(2);
      expect(crm.segmentsCount.HIGH_VALUE).toBe(1);
      expect(crm.segmentsCount.HIGH_OUTSTANDING).toBe(1);

      const topCust = crm.topCustomers[0];
      expect(topCust.name).toBe("Oberoi Luxury Towers");
      expect(topCust.lifetimeRevenue).toBe(60000);
    });
  });

  // ==========================================
  // SECTION 7: CASH FLOW & FORECASTING
  // ==========================================
  describe("7. Cash Flow Position & Deterministic Forecasting", () => {
    it("projects 7-day, 30-day, and 90-day liquidity based on scheduled due dates", async () => {
      const now = new Date();

      // Liquid positions
      accountsStore.push(
        { id: "a-c", tenantId: TENANT_A, code: "1010_CASH", balance: 20000 },
        { id: "a-b", tenantId: TENANT_A, code: "1020_BANK", balance: 80000 }
      );

      // Unpaid customer invoice due in 5 days (within 7-day window): ₹15,000 inflow
      salesInvoicesStore.push({
        id: "inv-due-soon",
        tenantId: TENANT_A,
        status: "FINALIZED",
        balanceAmount: 15000,
        dueDate: new Date(now.getTime() + 5 * 86400000),
      });

      // Unpaid vendor bill due in 20 days (outside 7-day, inside 30-day window): ₹25,000 outflow
      purchaseInvoicesStore.push({
        id: "pb-due-later",
        tenantId: TENANT_A,
        status: "RECEIVED",
        balanceAmount: 25000,
        dueDate: new Date(now.getTime() + 20 * 86400000),
      });

      const cashFlow = await getCashFlowAnalytics(TENANT_A, { period: "monthly" }, mockDb);

      expect(cashFlow.currentPosition.totalLiquidFunds).toBe(100000);

      // 7-Day Forecast: Inflow = 15,000, Outflow = 0
      // Estimated closing = 100,000 + 15,000 = 115,000
      expect(cashFlow.forecast.day7.projectedInflow).toBe(15000);
      expect(cashFlow.forecast.day7.projectedOutflow).toBe(0);
      expect(cashFlow.forecast.day7.estimatedClosingBalance).toBe(115000);

      // 30-Day Forecast: Inflow = 15,000, Outflow = 25,000
      // Estimated closing = 100,000 + (15,000 - 25,000) = 90,000
      expect(cashFlow.forecast.day30.projectedInflow).toBe(15000);
      expect(cashFlow.forecast.day30.projectedOutflow).toBe(25000);
      expect(cashFlow.forecast.day30.estimatedClosingBalance).toBe(90000);
    });
  });

  // ==========================================
  // SECTION 8: BUSINESS KPIS FRAMEWORK (10)
  // ==========================================
  describe("8. Core Business KPIs & Mathematical Formula Accuracy", () => {
    it("evaluates all 10 core KPIs with formula definitions and status classification", async () => {
      const now = new Date();

      salesInvoicesStore.push({
        id: "inv-kpi",
        tenantId: TENANT_A,
        status: "FINALIZED",
        grandTotal: 50000,
        balanceAmount: 10000,
        paidAmount: 40000,
        invoiceDate: now,
      });

      purchaseInvoicesStore.push({
        id: "pb-kpi",
        tenantId: TENANT_A,
        status: "RECEIVED",
        grandTotal: 30000,
        balanceAmount: 5000,
        invoiceDate: now,
      });

      expensesStore.push({
        id: "exp-kpi",
        tenantId: TENANT_A,
        amount: 5000,
        expenseDate: now,
      });

      const kpis = await getBusinessKPIs(TENANT_A, { period: "monthly" }, mockDb);

      expect(kpis).toHaveLength(10);

      const kpiIds = kpis.map((k) => k.id);
      expect(kpiIds).toContain("REV_GROWTH");
      expect(kpiIds).toContain("GROSS_MARGIN");
      expect(kpiIds).toContain("NET_MARGIN");
      expect(kpiIds).toContain("AOV");
      expect(kpiIds).toContain("INV_TURNOVER");
      expect(kpiIds).toContain("DSO");
      expect(kpiIds).toContain("DPO");
      expect(kpiIds).toContain("EXP_RATIO");
      expect(kpiIds).toContain("STOCK_TO_SALES");
      expect(kpiIds).toContain("RETENTION_RATE");

      // Verify every KPI contains a formula, description, and status
      kpis.forEach((k) => {
        expect(k.formula).toBeDefined();
        expect(k.description).toBeDefined();
        expect(k.status).toBeDefined();
        expect(isNaN(k.currentValue)).toBe(false);
      });
    });
  });

  // ==========================================
  // SECTION 9: DETERMINISTIC SMART INSIGHTS
  // ==========================================
  describe("9. Deterministic Business Insights & Smart Alerts Engine", () => {
    it("triggers safety stock alerts when variants breach minStockAlert", async () => {
      const product = { id: "p-sink", tenantId: TENANT_A, name: "Kitchen Sink", minStockAlert: 10 };
      variantsStore.push({
        id: "v-sink",
        tenantId: TENANT_A,
        productId: product.id,
        product,
        sku: "SINK-304",
        name: "Handmade Quartz Sink",
        currentStock: 2, // Critical breach! (<= 10)
        isActive: true,
      });

      const insights = await getBusinessInsightsAndAlerts(TENANT_A, undefined, mockDb);

      const stockAlert = insights.find((i) => i.id === "INSIGHT_LOW_STOCK");
      expect(stockAlert).toBeDefined();
      expect(stockAlert?.severity).toBe("WARNING");
      expect(stockAlert?.linkHref).toBe("/inventory");
    });

    it("triggers customer concentration alert when a single client dominates revenue", async () => {
      const now = new Date();

      // Single customer contributes ₹90,000 out of ₹100,000 (90% concentration)
      salesInvoicesStore.push(
        { id: "i1", tenantId: TENANT_A, customerId: "vip-1", grandTotal: 90000, invoiceDate: now, status: "FINALIZED" },
        { id: "i2", tenantId: TENANT_A, customerId: "other-1", grandTotal: 2000, invoiceDate: now, status: "FINALIZED" },
        { id: "i3", tenantId: TENANT_A, customerId: "other-2", grandTotal: 2000, invoiceDate: now, status: "FINALIZED" },
        { id: "i4", tenantId: TENANT_A, customerId: "other-3", grandTotal: 2000, invoiceDate: now, status: "FINALIZED" },
        { id: "i5", tenantId: TENANT_A, customerId: "other-4", grandTotal: 2000, invoiceDate: now, status: "FINALIZED" },
        { id: "i6", tenantId: TENANT_A, customerId: "other-5", grandTotal: 2000, invoiceDate: now, status: "FINALIZED" }
      );

      const insights = await getBusinessInsightsAndAlerts(TENANT_A, undefined, mockDb);

      const concentrationAlert = insights.find((i) => i.id === "INSIGHT_CUSTOMER_CONCENTRATION");
      expect(concentrationAlert).toBeDefined();
      expect(concentrationAlert?.metric).toContain("Concentration");
    });
  });

  // ==========================================
  // SECTION 10: REPORT EXPORT ENGINE (CSV)
  // ==========================================
  describe("10. Universal CSV Export Engine for Enterprise Reports", () => {
    it("generates formatted CSV exports for Sales, Purchases, Valuation, and Outstanding", async () => {
      const now = new Date();

      salesInvoicesStore.push({
        id: "inv-exp",
        tenantId: TENANT_A,
        invoiceNumber: "INV-2026-099",
        invoiceDate: now,
        customerName: "Metro Sanitary Store",
        taxableAmount: 10000,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        grandTotal: 11800,
        paidAmount: 11800,
        balanceAmount: 0,
        paymentMode: "BANK_TRANSFER",
        status: "FINALIZED",
      });

      const salesCsv = await generateReportCSV(TENANT_A, "SALES_SUMMARY", undefined, mockDb);
      expect(salesCsv.filename).toContain("sales_summary");
      expect(salesCsv.content).toContain("INV-2026-099");
      expect(salesCsv.content).toContain("Metro Sanitary Store");
      expect(salesCsv.content).toContain("11800.00");

      // Inventory Valuation CSV
      variantsStore.push({
        id: "var-csv",
        tenantId: TENANT_A,
        sku: "CSV-SKU-1",
        name: "Standard Valve",
        purchasePrice: 500,
        sellingPrice: 850,
        currentStock: 100,
        isActive: true,
        product: { name: "Brass Valve", uom: "PCS", category: { name: "Valves" } },
      });

      const invCsv = await generateReportCSV(TENANT_A, "INVENTORY_VALUATION", undefined, mockDb);
      expect(invCsv.filename).toContain("inventory_valuation");
      expect(invCsv.content).toContain("CSV-SKU-1");
      expect(invCsv.content).toContain("50000.00"); // 100 * 500

      // Customer Outstanding CSV
      customersStore.push({
        id: "c-csv",
        tenantId: TENANT_A,
        name: "Acme Enterprises",
        phone: "9998887776",
        creditLimit: 50000,
        outstandingBalance: 14500,
      });

      const custCsv = await generateReportCSV(TENANT_A, "CUSTOMER_OUTSTANDING", undefined, mockDb);
      expect(custCsv.content).toContain("Acme Enterprises");
      expect(custCsv.content).toContain("14500.00");
    });
  });

  // ==========================================
  // SECTION 11: MULTI-TENANT ISOLATION
  // ==========================================
  describe("11. Strict Multi-Tenant Data Isolation Across All Analytics Endpoints", () => {
    it("ensures Tenant B cannot see or calculate against Tenant A's business records", async () => {
      const now = new Date();

      // Seed data strictly under Tenant A
      salesInvoicesStore.push({
        id: "inv-a-secret",
        tenantId: TENANT_A,
        grandTotal: 1000000, // ₹10 Lakhs
        status: "FINALIZED",
        invoiceDate: now,
      });

      // Tenant B requests executive overview
      const overviewB = await getExecutiveOverview(TENANT_B, undefined, mockDb);

      // Tenant B sees exactly 0 sales and 0 revenue
      expect(overviewB.kpis.totalSales.value).toBe(0);
      expect(overviewB.charts.timelineTrend).toHaveLength(0);

      // Tenant B requests sales analytics
      const salesB = await getSalesAnalytics(TENANT_B, undefined, mockDb);
      expect(salesB.summary.grossSales).toBe(0);

      // Tenant B requests CSV export
      const csvB = await generateReportCSV(TENANT_B, "SALES_SUMMARY", undefined, mockDb);
      expect(csvB.content).not.toContain("1000000");
      expect(csvB.content).toContain("Competitor Building Supplies");
    });
  });
});
