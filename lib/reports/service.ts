import prisma from "@/lib/db/prisma";
import { Decimal } from "@/lib/finance/decimal";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type SalesBreakdown = "summary" | "product" | "brand" | "category" | "customer";

export interface DateFilterOptions {
  period?: ReportPeriod;
  startDate?: Date | string;
  endDate?: Date | string;
}

/**
 * Resolves date boundaries based on standard period options.
 */
export function resolveDateFilter(options: DateFilterOptions = {}): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date = options.endDate ? new Date(options.endDate) : new Date(now);
  end.setHours(23, 59, 59, 999);

  if (options.startDate) {
    start = new Date(options.startDate);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (options.period) {
    case "daily":
      // Today only
      break;
    case "weekly":
      // Last 7 days
      start.setDate(now.getDate() - 6);
      break;
    case "monthly":
      // 1st of current month
      start.setDate(1);
      break;
    case "yearly": {
      // Current Indian Financial Year (starts April 1)
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11
      const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
      break;
    }
    default:
      // Default to current month
      start.setDate(1);
      break;
  }

  return { start, end };
}

// =========================================================================
// 1. SALES REPORT & BREAKDOWNS
// =========================================================================

export interface SalesReportOptions extends DateFilterOptions {
  breakdown?: SalesBreakdown;
  customerId?: string;
}

export async function getSalesReport(
  tenantId: string,
  options: SalesReportOptions = {},
  client: any = prisma
) {
  const { start, end } = resolveDateFilter(options);
  const breakdown = options.breakdown || "summary";

  const where: any = {
    tenantId,
    status: "FINALIZED",
    invoiceDate: { gte: start, lte: end },
  };

  if (options.customerId) {
    where.customerId = options.customerId;
  }

  const invoices = await client.salesInvoice.findMany({
    where,
    orderBy: { invoiceDate: "asc" },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  brand: true,
                  category: true,
                },
              },
            },
          },
        },
      },
      customer: true,
    },
  });

  let totalTaxable = new Decimal(0);
  let totalCgst = new Decimal(0);
  let totalSgst = new Decimal(0);
  let totalIgst = new Decimal(0);
  let totalTax = new Decimal(0);
  let totalGrand = new Decimal(0);
  let totalPaid = new Decimal(0);
  let totalBalance = new Decimal(0);

  invoices.forEach((inv: any) => {
    totalTaxable = totalTaxable.plus(inv.taxableAmount || 0);
    totalCgst = totalCgst.plus(inv.cgstAmount || 0);
    totalSgst = totalSgst.plus(inv.sgstAmount || 0);
    totalIgst = totalIgst.plus(inv.igstAmount || 0);
    totalTax = totalTax.plus(inv.taxTotal || (inv.cgstAmount + inv.sgstAmount + inv.igstAmount) || 0);
    totalGrand = totalGrand.plus(inv.grandTotal || 0);
    totalPaid = totalPaid.plus(inv.paidAmount || 0);
    totalBalance = totalBalance.plus(inv.balanceAmount || 0);
  });

  // Calculate breakdown items
  let breakdownData: any[] = [];

  if (breakdown === "product") {
    const productMap = new Map<string, any>();
    invoices.forEach((inv: any) => {
      inv.items.forEach((item: any) => {
        const key = item.variantId || item.productName;
        const existing = productMap.get(key) || {
          variantId: item.variantId,
          sku: item.sku || item.variant?.sku || "N/A",
          productName: item.productName,
          variantName: item.variantName || "Standard",
          brandName: item.variant?.product?.brand?.name || "General",
          categoryName: item.variant?.product?.category?.name || "General",
          unitsSold: 0,
          taxableAmount: 0,
          totalAmount: 0,
        };
        existing.unitsSold += item.quantity;
        existing.taxableAmount = new Decimal(existing.taxableAmount).plus(item.taxableAmount || 0).toNumber();
        existing.totalAmount = new Decimal(existing.totalAmount).plus(item.totalAmount || 0).toNumber();
        productMap.set(key, existing);
      });
    });
    breakdownData = Array.from(productMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  } else if (breakdown === "brand") {
    const brandMap = new Map<string, any>();
    invoices.forEach((inv: any) => {
      inv.items.forEach((item: any) => {
        const brandName = item.variant?.product?.brand?.name || "Unbranded / General";
        const existing = brandMap.get(brandName) || {
          brandName,
          unitsSold: 0,
          totalAmount: 0,
        };
        existing.unitsSold += item.quantity;
        existing.totalAmount = new Decimal(existing.totalAmount).plus(item.totalAmount || 0).toNumber();
        brandMap.set(brandName, existing);
      });
    });
    breakdownData = Array.from(brandMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  } else if (breakdown === "category") {
    const categoryMap = new Map<string, any>();
    invoices.forEach((inv: any) => {
      inv.items.forEach((item: any) => {
        const categoryName = item.variant?.product?.category?.name || "General Goods";
        const existing = categoryMap.get(categoryName) || {
          categoryName,
          unitsSold: 0,
          totalAmount: 0,
        };
        existing.unitsSold += item.quantity;
        existing.totalAmount = new Decimal(existing.totalAmount).plus(item.totalAmount || 0).toNumber();
        categoryMap.set(categoryName, existing);
      });
    });
    breakdownData = Array.from(categoryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  } else if (breakdown === "customer") {
    const customerMap = new Map<string, any>();
    invoices.forEach((inv: any) => {
      const key = inv.customerId || inv.customerName;
      const existing = customerMap.get(key) || {
        customerId: inv.customerId,
        customerName: inv.customerName,
        phone: inv.customerPhone || inv.customer?.phone || "—",
        gstin: inv.customerGstin || inv.customer?.gstin || "—",
        invoiceCount: 0,
        taxableAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
      };
      existing.invoiceCount += 1;
      existing.taxableAmount = new Decimal(existing.taxableAmount).plus(inv.taxableAmount || 0).toNumber();
      existing.totalAmount = new Decimal(existing.totalAmount).plus(inv.grandTotal || 0).toNumber();
      existing.paidAmount = new Decimal(existing.paidAmount).plus(inv.paidAmount || 0).toNumber();
      existing.balanceAmount = new Decimal(existing.balanceAmount).plus(inv.balanceAmount || 0).toNumber();
      customerMap.set(key, existing);
    });
    breakdownData = Array.from(customerMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  } else {
    // Default summary: group by date
    const dateMap = new Map<string, any>();
    invoices.forEach((inv: any) => {
      const dateKey = new Date(inv.invoiceDate).toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || {
        date: dateKey,
        invoiceCount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceAmount: 0,
      };
      existing.invoiceCount += 1;
      existing.taxableAmount = new Decimal(existing.taxableAmount).plus(inv.taxableAmount || 0).toNumber();
      existing.taxAmount = new Decimal(existing.taxAmount).plus(inv.taxTotal || 0).toNumber();
      existing.grandTotal = new Decimal(existing.grandTotal).plus(inv.grandTotal || 0).toNumber();
      existing.paidAmount = new Decimal(existing.paidAmount).plus(inv.paidAmount || 0).toNumber();
      existing.balanceAmount = new Decimal(existing.balanceAmount).plus(inv.balanceAmount || 0).toNumber();
      dateMap.set(dateKey, existing);
    });
    breakdownData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  return {
    dateRange: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      period: options.period || "custom",
    },
    breakdownType: breakdown,
    summary: {
      invoiceCount: invoices.length,
      taxableTurnover: totalTaxable.toNumber(),
      cgstAmount: totalCgst.toNumber(),
      sgstAmount: totalSgst.toNumber(),
      igstAmount: totalIgst.toNumber(),
      totalTaxAmount: totalTax.toNumber(),
      grandTotal: totalGrand.toNumber(),
      totalPaidAmount: totalPaid.toNumber(),
      totalOutstandingReceivables: totalBalance.toNumber(),
    },
    items: breakdownData,
    rawInvoicesCount: invoices.length,
  };
}

// =========================================================================
// 2. PURCHASE SUMMARY & SUPPLIER BALANCES
// =========================================================================

export interface PurchaseReportOptions extends DateFilterOptions {
  supplierId?: string;
}

export async function getPurchaseReport(
  tenantId: string,
  options: PurchaseReportOptions = {},
  client: any = prisma
) {
  const { start, end } = resolveDateFilter(options);

  const where: any = {
    tenantId,
    status: { in: ["RECEIVED", "COMPLETED"] },
    invoiceDate: { gte: start, lte: end },
  };

  if (options.supplierId) {
    where.supplierId = options.supplierId;
  }

  const [purchases, suppliers] = await Promise.all([
    client.purchaseInvoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      include: {
        supplier: true,
      },
    }),
    client.supplier.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

  let totalTaxable = new Decimal(0);
  let totalCgst = new Decimal(0);
  let totalSgst = new Decimal(0);
  let totalIgst = new Decimal(0);
  let totalTax = new Decimal(0);
  let totalFreight = new Decimal(0);
  let totalGrand = new Decimal(0);
  let totalPaid = new Decimal(0);
  let totalBalance = new Decimal(0);

  purchases.forEach((p: any) => {
    totalTaxable = totalTaxable.plus(p.taxableAmount || 0);
    totalCgst = totalCgst.plus(p.cgstAmount || 0);
    totalSgst = totalSgst.plus(p.sgstAmount || 0);
    totalIgst = totalIgst.plus(p.igstAmount || 0);
    totalTax = totalTax.plus(p.taxTotal || (p.cgstAmount + p.sgstAmount + p.igstAmount) || 0);
    totalFreight = totalFreight.plus(p.freightAmount || 0);
    totalGrand = totalGrand.plus(p.grandTotal || 0);
    totalPaid = totalPaid.plus(p.paidAmount || 0);
    totalBalance = totalBalance.plus(p.balanceAmount || 0);
  });

  // Supplier breakdown
  const supplierSpendMap = new Map<string, any>();
  purchases.forEach((p: any) => {
    const sId = p.supplierId;
    const existing = supplierSpendMap.get(sId) || {
      supplierId: sId,
      name: p.supplier?.name || "Unknown Supplier",
      companyName: p.supplier?.companyName || "—",
      gstin: p.supplier?.gstin || "—",
      billsCount: 0,
      totalSpend: 0,
      paidAmount: 0,
      balanceDueOnBills: 0,
    };
    existing.billsCount += 1;
    existing.totalSpend = new Decimal(existing.totalSpend).plus(p.grandTotal || 0).toNumber();
    existing.paidAmount = new Decimal(existing.paidAmount).plus(p.paidAmount || 0).toNumber();
    existing.balanceDueOnBills = new Decimal(existing.balanceDueOnBills).plus(p.balanceAmount || 0).toNumber();
    supplierSpendMap.set(sId, existing);
  });

  const supplierBreakdown = suppliers.map((s: any) => {
    const spend = supplierSpendMap.get(s.id) || {
      billsCount: 0,
      totalSpend: 0,
      paidAmount: 0,
      balanceDueOnBills: 0,
    };
    return {
      supplierId: s.id,
      name: s.name,
      companyName: s.companyName || "—",
      phone: s.phone,
      gstin: s.gstin || "—",
      billsCount: spend.billsCount,
      totalSpendInPeriod: spend.totalSpend,
      paidInPeriod: spend.paidAmount,
      balanceOnBillsInPeriod: spend.balanceDueOnBills,
      totalOutstandingPayable: s.balance || 0, // Actual ledger outstanding
    };
  });

  const totalOutstandingPayables = suppliers.reduce((sum: number, s: any) => sum + (s.balance || 0), 0);

  return {
    dateRange: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    summary: {
      billCount: purchases.length,
      taxableAmount: totalTaxable.toNumber(),
      inputCgst: totalCgst.toNumber(),
      inputSgst: totalSgst.toNumber(),
      inputIgst: totalIgst.toNumber(),
      totalInputTaxCredit: totalTax.toNumber(),
      totalFreightCharges: totalFreight.toNumber(),
      grandTotal: totalGrand.toNumber(),
      paidAmount: totalPaid.toNumber(),
      periodUnpaidBillsBalance: totalBalance.toNumber(),
      totalSupplierPayables: totalOutstandingPayables,
    },
    supplierBreakdown: supplierBreakdown.sort((a: any, b: any) => b.totalOutstandingPayable - a.totalOutstandingPayable),
    recentBills: purchases.slice(0, 50).map((p: any) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      supplierName: p.supplier?.name || "Vendor",
      date: p.invoiceDate,
      grandTotal: p.grandTotal,
      paidAmount: p.paidAmount,
      balanceAmount: p.balanceAmount,
      paymentStatus: p.paymentStatus,
    })),
  };
}

// =========================================================================
// 3. INVENTORY VALUATION, STOCK ON HAND & MOVEMENT HISTORY
// =========================================================================

export interface InventoryReportOptions {
  lowStockOnly?: boolean;
  categoryId?: string;
  brandId?: string;
  movementLimit?: number;
}

export async function getInventoryReport(
  tenantId: string,
  options: InventoryReportOptions = {},
  client: any = prisma
) {
  const [variants, movements] = await Promise.all([
    client.productVariant.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },
    }),
    client.stockMovement.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: options.movementLimit || 50,
      include: {
        variant: {
          include: { product: true },
        },
      },
    }),
  ]);

  let totalStockUnits = 0;
  let totalValuation = new Decimal(0);
  let totalSellingValuation = new Decimal(0);
  const lowStockItems: any[] = [];
  const categoryMap = new Map<string, { category: string; units: number; valuation: number; productCount: number }>();
  const brandMap = new Map<string, { brand: string; units: number; valuation: number; productCount: number }>();

  variants.forEach((v: any) => {
    const stock = Math.max(0, v.currentStock || 0);
    const cost = v.purchasePrice || 0;
    const sellPrice = v.sellingPrice || 0;
    const itemValuation = new Decimal(stock).times(cost);
    const itemSellingVal = new Decimal(stock).times(sellPrice);

    totalStockUnits += stock;
    totalValuation = totalValuation.plus(itemValuation);
    totalSellingValuation = totalSellingValuation.plus(itemSellingVal);

    const minAlert = v.product?.minStockAlert ?? 5;
    const isLow = v.currentStock <= minAlert;

    if (isLow) {
      lowStockItems.push({
        variantId: v.id,
        productId: v.productId,
        sku: v.sku,
        productName: v.product?.name || "Product",
        variantName: v.name,
        brandName: v.product?.brand?.name || "General",
        categoryName: v.product?.category?.name || "General",
        currentStock: v.currentStock,
        minStockAlert: minAlert,
        unitCost: cost,
        reorderRecommended: Math.max(0, minAlert * 2 - v.currentStock),
      });
    }

    // Category aggregation
    const catName = v.product?.category?.name || "Uncategorized";
    const cat = categoryMap.get(catName) || { category: catName, units: 0, valuation: 0, productCount: 0 };
    cat.units += stock;
    cat.valuation = new Decimal(cat.valuation).plus(itemValuation).toNumber();
    cat.productCount += 1;
    categoryMap.set(catName, cat);

    // Brand aggregation
    const brName = v.product?.brand?.name || "Unbranded";
    const br = brandMap.get(brName) || { brand: brName, units: 0, valuation: 0, productCount: 0 };
    br.units += stock;
    br.valuation = new Decimal(br.valuation).plus(itemValuation).toNumber();
    br.productCount += 1;
    brandMap.set(brName, br);
  });

  return {
    summary: {
      totalVariantCount: variants.length,
      totalStockUnits,
      inventoryValuationAtCost: totalValuation.toNumber(),
      inventoryValuationAtRetail: totalSellingValuation.toNumber(),
      potentialGrossMargin: totalSellingValuation.minus(totalValuation).toNumber(),
      lowStockItemCount: lowStockItems.length,
    },
    categoryValuation: Array.from(categoryMap.values()).sort((a, b) => b.valuation - a.valuation),
    brandValuation: Array.from(brandMap.values()).sort((a, b) => b.valuation - a.valuation),
    lowStockAlerts: lowStockItems.sort((a, b) => a.currentStock - b.currentStock),
    recentMovements: movements.map((m: any) => ({
      id: m.id,
      date: m.createdAt,
      type: m.type,
      productName: m.variant?.product?.name || "Item",
      variantName: m.variant?.name || "Standard",
      sku: m.variant?.sku,
      quantity: m.quantity,
      unitCost: m.unitCost,
      balanceAfter: m.balanceAfter,
      reason: m.reason || m.referenceType,
    })),
  };
}

// =========================================================================
// 4. PROFIT & LOSS INTELLIGENCE (DOCUMENTED COST METHOD)
// =========================================================================

export interface ProfitLossOptions extends DateFilterOptions {}

/**
 * Calculates Gross Profit and Estimated Net Profit using documented cost accounting:
 * - Taxable Sales Revenue = Net sales turnover (excluding output GST liabilities)
 * - Cost of Goods Sold (COGS) = Sum of (units sold * variant purchase price)
 * - Sales Returns = Taxable returns deduction from revenue & COGS reversal
 * - Gross Profit = Taxable Sales - Sales Returns - Net COGS
 * - Operating Expenses = Total overhead expenses (rent, freight, electricity, wages, etc.)
 * - Net Profit = Gross Profit - Operating Expenses
 *
 * Statutory Rule: Never count GST collected as profit.
 */
export async function getProfitLossReport(
  tenantId: string,
  options: ProfitLossOptions = {},
  client: any = prisma
) {
  const { start, end } = resolveDateFilter(options);

  const [invoices, salesReturns, expenses] = await Promise.all([
    client.salesInvoice.findMany({
      where: {
        tenantId,
        status: "FINALIZED",
        invoiceDate: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    }),
    client.salesReturn.findMany({
      where: {
        tenantId,
        returnDate: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    }),
    client.expense.findMany({
      where: {
        tenantId,
        expenseDate: { gte: start, lte: end },
      },
    }),
  ]);

  let totalTaxableSales = new Decimal(0);
  let totalOutputTax = new Decimal(0);
  let totalGrossInvoiced = new Decimal(0);
  let rawCOGS = new Decimal(0);
  let missingCostCount = 0;

  invoices.forEach((inv: any) => {
    totalTaxableSales = totalTaxableSales.plus(inv.taxableAmount || 0);
    totalOutputTax = totalOutputTax.plus(inv.taxTotal || (inv.cgstAmount + inv.sgstAmount + inv.igstAmount) || 0);
    totalGrossInvoiced = totalGrossInvoiced.plus(inv.grandTotal || 0);

    inv.items.forEach((it: any) => {
      const purchasePrice = it.variant?.purchasePrice;
      if (purchasePrice === undefined || purchasePrice === null || purchasePrice <= 0) {
        missingCostCount += 1;
      }
      const unitCost = purchasePrice && purchasePrice > 0 ? purchasePrice : 0;
      rawCOGS = rawCOGS.plus(new Decimal(it.quantity).times(unitCost));
    });
  });

  // Sales Returns calculations
  let returnsTaxableAmount = new Decimal(0);
  let cogsReversedFromReturns = new Decimal(0);

  salesReturns.forEach((sr: any) => {
    returnsTaxableAmount = returnsTaxableAmount.plus(sr.subtotal || 0);
    sr.items.forEach((it: any) => {
      const unitCost = it.variant?.purchasePrice || 0;
      cogsReversedFromReturns = cogsReversedFromReturns.plus(new Decimal(it.quantity).times(unitCost));
    });
  });

  // Net calculations
  const netSalesTurnover = totalTaxableSales.minus(returnsTaxableAmount);
  const netCOGS = rawCOGS.minus(cogsReversedFromReturns);
  const grossProfit = netSalesTurnover.minus(netCOGS);

  const grossMarginPercent = netSalesTurnover.greaterThan(0)
    ? grossProfit.dividedBy(netSalesTurnover).times(100).toNumber()
    : 0;

  // Operating Expenses Breakdown
  const expenseByCategoryMap = new Map<string, number>();
  let totalOperatingExpenses = new Decimal(0);

  expenses.forEach((e: any) => {
    const cat = e.category || "GENERAL_EXPENSE";
    const amt = e.amount || 0;
    totalOperatingExpenses = totalOperatingExpenses.plus(amt);
    expenseByCategoryMap.set(cat, (expenseByCategoryMap.get(cat) || 0) + amt);
  });

  const netProfit = grossProfit.minus(totalOperatingExpenses);
  const netMarginPercent = netSalesTurnover.greaterThan(0)
    ? netProfit.dividedBy(netSalesTurnover).times(100).toNumber()
    : 0;

  return {
    dateRange: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    calculationMethod: {
      method: "Taxable Turnover minus FIFO/Purchase Cost of Goods Sold minus Operating Expenses",
      statutoryTaxCompliance: "Strict: Output GST collected is separated as government liability and excluded from profit",
      hasIncompleteCosts: missingCostCount > 0,
      missingCostItemCount: missingCostCount,
      isEstimated: missingCostCount > 0,
    },
    statement: {
      grossSalesTurnover: totalTaxableSales.toNumber(),
      lessSalesReturns: returnsTaxableAmount.toNumber(),
      netSalesTurnover: netSalesTurnover.toNumber(),
      outputTaxCollectedExcludedFromProfit: totalOutputTax.toNumber(),
      grossInvoicedBillings: totalGrossInvoiced.toNumber(),
      costOfGoodsSold: {
        rawProductCost: rawCOGS.toNumber(),
        lessReturnedGoodsCostReversal: cogsReversedFromReturns.toNumber(),
        netCostOfGoodsSold: netCOGS.toNumber(),
      },
      grossProfit: grossProfit.toNumber(),
      grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
      operatingExpenses: {
        total: totalOperatingExpenses.toNumber(),
        breakdown: Array.from(expenseByCategoryMap.entries()).map(([category, amount]) => ({
          category,
          amount,
        })),
      },
      estimatedNetProfit: netProfit.toNumber(),
      netProfitMarginPercent: Math.round(netMarginPercent * 100) / 100,
    },
  };
}

// =========================================================================
// 5. TAXABLE SALES & GST SUMMARIES (GSTR-1 & GSTR-3B READY)
// =========================================================================

export async function getTaxSummaryReport(
  tenantId: string,
  options: DateFilterOptions = {},
  client: any = prisma
) {
  const { start, end } = resolveDateFilter(options);

  const [invoices, purchases, tenant] = await Promise.all([
    client.salesInvoice.findMany({
      where: {
        tenantId,
        status: "FINALIZED",
        invoiceDate: { gte: start, lte: end },
      },
    }),
    client.purchaseInvoice.findMany({
      where: {
        tenantId,
        status: { in: ["RECEIVED", "COMPLETED"] },
        invoiceDate: { gte: start, lte: end },
      },
    }),
    client.tenant.findUnique({
      where: { id: tenantId },
      select: { gstin: true, legalName: true, stateCode: true },
    }),
  ]);

  // 1. Outward Supplies (Sales)
  let b2bTaxable = new Decimal(0);
  let b2bCgst = new Decimal(0);
  let b2bSgst = new Decimal(0);
  let b2bIgst = new Decimal(0);

  let b2cTaxable = new Decimal(0);
  let b2cCgst = new Decimal(0);
  let b2cSgst = new Decimal(0);
  let b2cIgst = new Decimal(0);

  invoices.forEach((inv: any) => {
    const isB2B = Boolean(inv.customerGstin && inv.customerGstin.trim().length === 15);
    const taxable = new Decimal(inv.taxableAmount || 0);
    const cgst = new Decimal(inv.cgstAmount || 0);
    const sgst = new Decimal(inv.sgstAmount || 0);
    const igst = new Decimal(inv.igstAmount || 0);

    if (isB2B) {
      b2bTaxable = b2bTaxable.plus(taxable);
      b2bCgst = b2bCgst.plus(cgst);
      b2bSgst = b2bSgst.plus(sgst);
      b2bIgst = b2bIgst.plus(igst);
    } else {
      b2cTaxable = b2cTaxable.plus(taxable);
      b2cCgst = b2cCgst.plus(cgst);
      b2cSgst = b2cSgst.plus(sgst);
      b2cIgst = b2cIgst.plus(igst);
    }
  });

  const totalOutputCgst = b2bCgst.plus(b2cCgst);
  const totalOutputSgst = b2bSgst.plus(b2cSgst);
  const totalOutputIgst = b2bIgst.plus(b2cIgst);
  const totalOutputTax = totalOutputCgst.plus(totalOutputSgst).plus(totalOutputIgst);
  const totalTaxableTurnover = b2bTaxable.plus(b2cTaxable);

  // 2. Inward Supplies (Input Tax Credit / ITC)
  let itcCgst = new Decimal(0);
  let itcSgst = new Decimal(0);
  let itcIgst = new Decimal(0);
  let purchaseTaxable = new Decimal(0);

  purchases.forEach((p: any) => {
    purchaseTaxable = purchaseTaxable.plus(p.taxableAmount || 0);
    itcCgst = itcCgst.plus(p.cgstAmount || 0);
    itcSgst = itcSgst.plus(p.sgstAmount || 0);
    itcIgst = itcIgst.plus(p.igstAmount || 0);
  });

  const totalInputTaxCredit = itcCgst.plus(itcSgst).plus(itcIgst);

  // 3. Net Tax Payable Calculation
  const netCgstPayable = Decimal.max(0, totalOutputCgst.minus(itcCgst));
  const netSgstPayable = Decimal.max(0, totalOutputSgst.minus(itcSgst));
  const netIgstPayable = Decimal.max(0, totalOutputIgst.minus(itcIgst));
  const netChallanPayable = netCgstPayable.plus(netSgstPayable).plus(netIgstPayable);

  return {
    tenant: {
      legalName: tenant?.legalName,
      gstin: tenant?.gstin || "Unregistered",
      stateCode: tenant?.stateCode || "09",
    },
    dateRange: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    outwardSuppliesGSTR1: {
      totalTaxableTurnover: totalTaxableTurnover.toNumber(),
      b2b: {
        taxable: b2bTaxable.toNumber(),
        cgst: b2bCgst.toNumber(),
        sgst: b2bSgst.toNumber(),
        igst: b2bIgst.toNumber(),
        totalTax: b2bCgst.plus(b2bSgst).plus(b2bIgst).toNumber(),
      },
      b2c: {
        taxable: b2cTaxable.toNumber(),
        cgst: b2cCgst.toNumber(),
        sgst: b2cSgst.toNumber(),
        igst: b2cIgst.toNumber(),
        totalTax: b2cCgst.plus(b2cSgst).plus(b2cIgst).toNumber(),
      },
      totalOutputTax: {
        cgst: totalOutputCgst.toNumber(),
        sgst: totalOutputSgst.toNumber(),
        igst: totalOutputIgst.toNumber(),
        total: totalOutputTax.toNumber(),
      },
    },
    inwardSuppliesITC: {
      purchaseTaxableAmount: purchaseTaxable.toNumber(),
      eligibleITC: {
        cgst: itcCgst.toNumber(),
        sgst: itcSgst.toNumber(),
        igst: itcIgst.toNumber(),
        total: totalInputTaxCredit.toNumber(),
      },
    },
    gstr3bSummary: {
      grossOutputLiability: totalOutputTax.toNumber(),
      lessInputTaxCreditSetoff: totalInputTaxCredit.toNumber(),
      netCashTaxPayable: netChallanPayable.toNumber(),
      itcCarryForward: Decimal.max(0, totalInputTaxCredit.minus(totalOutputTax)).toNumber(),
    },
  };
}

// =========================================================================
// 6. RECEIVABLES & PAYABLES SUMMARY
// =========================================================================

export async function getReceivablesPayablesReport(tenantId: string, client: any = prisma) {
  const [customers, suppliers, unpaidInvoices, unpaidBills] = await Promise.all([
    client.customer.findMany({
      where: { tenantId, outstandingBalance: { gt: 0 } },
      orderBy: { outstandingBalance: "desc" },
    }),
    client.supplier.findMany({
      where: { tenantId, balance: { gt: 0 } },
      orderBy: { balance: "desc" },
    }),
    client.salesInvoice.findMany({
      where: { tenantId, balanceAmount: { gt: 0 }, status: "FINALIZED" },
      orderBy: { invoiceDate: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        invoiceDate: true,
        dueDate: true,
        grandTotal: true,
        balanceAmount: true,
      },
    }),
    client.purchaseInvoice.findMany({
      where: { tenantId, balanceAmount: { gt: 0 }, status: "RECEIVED" },
      orderBy: { invoiceDate: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        supplier: { select: { name: true } },
        invoiceDate: true,
        grandTotal: true,
        balanceAmount: true,
      },
    }),
  ]);

  const totalReceivables = customers.reduce((sum: number, c: any) => sum + (c.outstandingBalance || 0), 0);
  const totalPayables = suppliers.reduce((sum: number, s: any) => sum + (s.balance || 0), 0);

  return {
    summary: {
      totalCustomersWithDues: customers.length,
      totalOutstandingReceivables: totalReceivables,
      totalSuppliersWithDues: suppliers.length,
      totalOutstandingPayables: totalPayables,
      netWorkingCapitalExposure: totalReceivables - totalPayables,
    },
    customerReceivables: customers.map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      gstin: c.gstin || "—",
      outstandingBalance: c.outstandingBalance,
      creditLimit: c.creditLimit,
    })),
    supplierPayables: suppliers.map((s: any) => ({
      id: s.id,
      name: s.name,
      companyName: s.companyName || "—",
      phone: s.phone,
      gstin: s.gstin || "—",
      outstandingBalance: s.balance,
    })),
    unpaidSalesInvoices: unpaidInvoices,
    unpaidPurchaseBills: unpaidBills.map((b: any) => ({
      id: b.id,
      billNumber: b.invoiceNumber,
      supplierName: b.supplier?.name || "Vendor",
      date: b.invoiceDate,
      grandTotal: b.grandTotal,
      balanceAmount: b.balanceAmount,
    })),
  };
}

// =========================================================================
// 7. UNIVERSAL CSV EXPORT ENGINE
// =========================================================================

export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (val: string | number) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(",");
  const rowLines = rows.map((r) => r.map(escapeCell).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}
