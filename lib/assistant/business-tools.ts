import {
  AssistantIntent,
  AssistantKpi,
  AssistantStructuredItem,
  BusinessToolExecutionResult,
  ParsedDateRange,
} from "./types";
import {
  getSalesAnalytics,
  getInventoryAnalytics,
  getCustomerAnalytics,
  getPurchaseAnalytics,
  getExecutiveOverview,
} from "@/lib/analytics/service";
import {
  getProfitAndLossStatement,
  getCashAndBankBook,
  getTrialBalance,
  getBalanceSheet,
} from "@/lib/accounting/service";
import { ELVORA_SUPPORT_ARTICLES } from "./support-knowledge";
import { TenantRole, hasPermission } from "@/lib/auth/permissions";

/**
 * Standard Indian Rupee Currency Formatter
 */
export function formatINR(amount: number | null | undefined): string {
  const num = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const isNegative = num < 0;
  const absAmount = Math.abs(num);
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export class BusinessToolsRegistry {
  /**
   * Executes a business tool based on the recognized intent and caller role.
   */
  static async execute(
    intent: AssistantIntent,
    tenantId: string,
    userRole: TenantRole,
    dateRange: ParsedDateRange,
    supportTopic?: string
  ): Promise<BusinessToolExecutionResult> {
    const periodLabelEn = dateRange.labelEn;
    const periodLabelHinglish = dateRange.labelHinglish;
    const periodLabelHi = dateRange.labelHi || dateRange.labelHinglish || dateRange.labelEn;

    try {
      switch (intent) {
        // =====================================================================
        // 1. SALES SUMMARY & INVOICE METRICS
        // =====================================================================
        case "SALES_SUMMARY":
        case "INVOICE_METRICS": {
          if (!hasPermission(userRole, "CREATE_INVOICE") && !hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("VIEW_FINANCIAL_REPORTS", intent);
          }

          const analytics = await getSalesAnalytics(tenantId, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          const revenue = analytics.summary.grossSales;
          const invoiceCount = analytics.summary.invoiceCount;
          const aov = analytics.summary.averageInvoiceValue;
          const paidAmount = analytics.summary.collectedAmount;
          const pendingAmount = analytics.summary.outstandingAmount;
          const growth = analytics.summary.growth.growthPercent;

          const kpis: AssistantKpi[] = [
            { label: "Total Sales", value: formatINR(revenue), change: `${growth}%` },
            { label: "Total Invoices", value: invoiceCount.toString() },
            { label: "Average Bill Value", value: formatINR(aov) },
            { label: "Pending (Udhar)", value: formatINR(pendingAmount) },
          ];

          const items: AssistantStructuredItem[] = (analytics.topSellingByRevenue || []).slice(0, 5).map((p: any) => ({
            id: p.variantId,
            title: p.name,
            subtitle: `${p.quantity} units sold`,
            value: formatINR(p.revenue),
            badge: `${p.percentage || 0}% of sales`,
            status: "info",
          }));

          const textEn = `During **${periodLabelEn}**, your shop generated **${formatINR(revenue)}** in total sales across **${invoiceCount} invoices** (Average Bill: **${formatINR(aov)}**). Received: **${formatINR(paidAmount)}**, Outstanding: **${formatINR(pendingAmount)}**.`;
          const textHinglish = `**${periodLabelHinglish}** me aapki dukaan ki total sales **${formatINR(revenue)}** rahi hain. Kul **${invoiceCount} bills** generate hue (Average Bill Value: **${formatINR(aov)}**). Received Cash/UPI: **${formatINR(paidAmount)}**, baaki Udhar: **${formatINR(pendingAmount)}**.`;
          const textHi = `**${periodLabelHi}** में आपकी दुकान की कुल बिक्री **${formatINR(revenue)}** रही है। कुल **${invoiceCount} बिल** बने (औसत बिल मूल्य: **${formatINR(aov)}**)। प्राप्त राशि: **${formatINR(paidAmount)}**, बकाया उधार: **${formatINR(pendingAmount)}**।`;

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: periodLabelEn,
              sourceModule: "Invoices & Analytics",
              navigationLink: { href: "/invoices", label: "View All Invoices" },
              kpis,
              items: items.length > 0 ? items : undefined,
              suggestedFollowUps: [
                "Top selling products dikhao",
                "Mera profit kitna hua?",
                "Customers ka kitna udhar baaki hai?",
              ],
            },
          };
        }

        // =====================================================================
        // 2. SALES COMPARISON
        // =====================================================================
        case "SALES_COMPARISON": {
          if (!hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("VIEW_FINANCIAL_REPORTS", intent);
          }

          const analytics = await getSalesAnalytics(tenantId, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          const curRev = analytics.summary.grossSales;
          const growth = analytics.summary.growth.growthPercent;
          const isGrowthPositive = growth >= 0;

          const kpis: AssistantKpi[] = [
            { label: "Current Period Sales", value: formatINR(curRev) },
            { label: "Growth / Variance", value: `${isGrowthPositive ? "+" : ""}${growth}%`, isPositive: isGrowthPositive },
            { label: "Total Invoices", value: analytics.summary.invoiceCount.toString() },
          ];

          const textEn = `Sales comparison: During **${periodLabelEn}**, gross sales reached **${formatINR(curRev)}** (${isGrowthPositive ? "Up" : "Down"} by **${Math.abs(growth)}%** compared to the prior period).`;
          const textHinglish = `Sales comparison: **${periodLabelHinglish}** me sales **${formatINR(curRev)}** rahi hain (Pichle dauran ke mukable **${Math.abs(growth)}%** ${isGrowthPositive ? "badhotari" : "ghatotari"}).`;
          const textHi = `बिक्री तुलना: **${periodLabelHi}** में आपकी बिक्री **${formatINR(curRev)}** रही (पिछले समान समय की तुलना में **${Math.abs(growth)}%** ${isGrowthPositive ? "बढ़ी है" : "घटी है"})।`;

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: periodLabelEn,
              sourceModule: "BI & Analytics",
              navigationLink: { href: "/analytics", label: "Open Detailed BI Charts" },
              kpis,
              suggestedFollowUps: [
                "Top selling products kaunse hain?",
                "Is mahine ka kharcha kitna hai?",
              ],
            },
          };
        }

        // =====================================================================
        // 3. TOP SELLING PRODUCTS
        // =====================================================================
        case "TOP_SELLING_PRODUCTS": {
          if (!hasPermission(userRole, "CREATE_INVOICE") && !hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("VIEW_FINANCIAL_REPORTS", intent);
          }

          const analytics = await getSalesAnalytics(tenantId, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          const topItems = (analytics.topSellingByRevenue || []).slice(0, 5);
          if (topItems.length === 0) {
            return {
              success: true,
              intent,
              textEn: `No product sales recorded during **${periodLabelEn}**.`,
              textHinglish: `**${periodLabelHinglish}** ke dauran koi product sales record nahi mili.`,
              textHi: `**${periodLabelHi}** के दौरान कोई उत्पाद बिक्री रिकॉर्ड नहीं हुई।`,
              structuredData: {
                intent,
                periodLabel: periodLabelEn,
                sourceModule: "Inventory & POS",
                navigationLink: { href: "/pos", label: "Create First Bill in POS" },
              },
            };
          }

          const items: AssistantStructuredItem[] = topItems.map((p: any, idx: number) => ({
            id: p.variantId,
            title: `${idx + 1}. ${p.name}`,
            subtitle: `${p.quantity} units sold`,
            value: formatINR(p.revenue),
            badge: `${p.percentage || 0}% of sales`,
            status: "success",
          }));

          const textEn = `Here are your top-selling products for **${periodLabelEn}**:\n` +
            topItems.map((p: any, i: number) => `${i + 1}. **${p.name}** — ${p.quantity} units (${formatINR(p.revenue)})`).join("\n");
          const textHinglish = `**${periodLabelHinglish}** me aapke sabse jyada bikne wale top products ye hain:\n` +
            topItems.map((p: any, i: number) => `${i + 1}. **${p.name}** — ${p.quantity} units (${formatINR(p.revenue)})`).join("\n");
          const textHi = `**${periodLabelHi}** में आपकी दुकान के सबसे ज्यादा बिकने वाले शीर्ष उत्पाद:\n` +
            topItems.map((p: any, i: number) => `${i + 1}. **${p.name}** — ${p.quantity} यूनिट बिकीं (**${formatINR(p.revenue)}**, ${p.percentage || 0}%)`).join("\n");

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: periodLabelEn,
              sourceModule: "Sales Analytics",
              navigationLink: { href: "/analytics", label: "View Full Sales Report" },
              items,
              suggestedFollowUps: [
                "Kaunse product ka stock kam hai?",
                "Total sales kitni hui?",
              ],
            },
          };
        }

        // =====================================================================
        // 4. PROFIT & LOSS STATEMENT
        // =====================================================================
        case "PROFIT_AND_LOSS": {
          if (!hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("VIEW_FINANCIAL_REPORTS", intent);
          }

          const pnl = await getProfitAndLossStatement(tenantId, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          const rev = pnl.revenue.totalRevenue;
          const cogs = pnl.costOfGoodsSold.totalCOGS;
          const grossProfit = pnl.grossProfit;
          const expenses = pnl.operatingExpenses.totalExpenses;
          const netProfit = pnl.netProfit;
          const isNetProfitPositive = netProfit >= 0;

          const kpis: AssistantKpi[] = [
            { label: "Total Revenue", value: formatINR(rev) },
            { label: "Cost of Goods (COGS)", value: formatINR(cogs) },
            { label: "Gross Profit", value: formatINR(grossProfit) },
            { label: "Operating Expenses", value: formatINR(expenses) },
            {
              label: "Net Profit",
              value: formatINR(netProfit),
              isPositive: isNetProfitPositive,
              change: isNetProfitPositive ? "Profitable" : "Operating Loss",
            },
          ];

          const textEn = `Financial summary for **${periodLabelEn}**:\n- **Total Revenue**: ${formatINR(rev)}\n- **Cost of Goods**: ${formatINR(cogs)}\n- **Gross Profit**: ${formatINR(grossProfit)}\n- **Operating Expenses**: ${formatINR(expenses)}\n- **Net Profit**: **${formatINR(netProfit)}** (${pnl.netMarginPercent.toFixed(1)}% margin).`;
          const textHinglish = `**${periodLabelHinglish}** ka Profit & Loss summary:\n- **Total Sales Revenue**: ${formatINR(rev)}\n- **Maal ki Lagat (COGS)**: ${formatINR(cogs)}\n- **Gross Profit**: ${formatINR(grossProfit)}\n- **Dukaan ke Kharche**: ${formatINR(expenses)}\n- **Shuddh Munafa (Net Profit)**: **${formatINR(netProfit)}** (${pnl.netMarginPercent.toFixed(1)}% margin).`;
          const textHi = `**${periodLabelHi}** का लाभ और हानि विवरण (P&L):\n- **कुल बिक्री रेवेन्यू**: ${formatINR(rev)}\n- **माल की लागत (COGS)**: ${formatINR(cogs)}\n- **सकल लाभ (Gross Profit)**: ${formatINR(grossProfit)}\n- **दुकान के कुल खर्चे**: ${formatINR(expenses)}\n- **शुद्ध मुनाफा (Net Profit)**: **${formatINR(netProfit)}** (मार्जिन: ${pnl.netMarginPercent.toFixed(1)}%)।`;

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: periodLabelEn,
              sourceModule: "Accounting P&L",
              navigationLink: { href: "/accounting", label: "Open Accounting & Ledger" },
              kpis,
              suggestedFollowUps: [
                "Kharche kis category me sabse jyada hue?",
                "Cash aur Bank me kitna balance hai?",
              ],
            },
          };
        }

        // =====================================================================
        // 5. EXPENSES SUMMARY
        // =====================================================================
        case "EXPENSE_SUMMARY": {
          if (!hasPermission(userRole, "RECORD_EXPENSE") && !hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("VIEW_FINANCIAL_REPORTS", intent);
          }

          const overview = await getExecutiveOverview(tenantId, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          const totalExpenses = overview.kpis.totalExpenses.value;
          const expenseDist = overview.charts.expenseDistribution || [];

          const kpis: AssistantKpi[] = [
            { label: "Total Expenses", value: formatINR(totalExpenses) },
            { label: "Expense Growth", value: `${overview.kpis.totalExpenses.growthPercent}%` },
          ];

          const items: AssistantStructuredItem[] = expenseDist.slice(0, 5).map((c: any) => ({
            id: c.category,
            title: c.category,
            value: formatINR(c.amount),
            badge: `${c.percentage || 0}%`,
            status: "warning",
          }));

          const textEn = `During **${periodLabelEn}**, total shop expenses were **${formatINR(totalExpenses)}**. Highest category: **${expenseDist[0]?.category || "None"}** (${formatINR(expenseDist[0]?.amount || 0)}).`;
          const textHinglish = `**${periodLabelHinglish}** me kul dukaan ke kharche **${formatINR(totalExpenses)}** hue hain. Sabse bada kharcha: **${expenseDist[0]?.category || "None"}** (${formatINR(expenseDist[0]?.amount || 0)}).`;
          const textHi = `**${periodLabelHi}** में दुकान का कुल परिचालन खर्च **${formatINR(totalExpenses)}** रहा। सबसे बड़ा खर्च: **${expenseDist[0]?.category || "कोई नहीं"}** (${formatINR(expenseDist[0]?.amount || 0)})।`;

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: periodLabelEn,
              sourceModule: "Expenses & Cashbook",
              navigationLink: { href: "/expenses", label: "View Expenses List" },
              kpis,
              items: items.length > 0 ? items : undefined,
              suggestedFollowUps: [
                "Net profit kitna bacha?",
                "Cash balance kitna hai?",
              ],
            },
          };
        }

        // =====================================================================
        // 6. INVENTORY: LOW STOCK & OUT OF STOCK
        // =====================================================================
        case "INVENTORY_LOW_STOCK":
        case "INVENTORY_OUT_OF_STOCK":
        case "INVENTORY_REORDER": {
          if (!hasPermission(userRole, "MANAGE_INVENTORY") && !hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("MANAGE_INVENTORY", intent);
          }

          const inv = await getInventoryAnalytics(tenantId);
          const alerts = inv.replenishmentAlerts || [];
          const lowStockCount = inv.summary.lowStockCount;
          const outOfStockCount = inv.summary.outOfStockCount;

          const isOutCheck = intent === "INVENTORY_OUT_OF_STOCK";
          const filteredAlerts = isOutCheck
            ? alerts.filter((a: any) => a.currentStock <= 0)
            : alerts;

          const count = isOutCheck ? outOfStockCount : lowStockCount;

          const items: AssistantStructuredItem[] = filteredAlerts.slice(0, 6).map((item: any) => ({
            id: item.variantId,
            title: item.productName,
            subtitle: `Current stock: ${item.currentStock} | Reorder at: ${item.reorderLevel}`,
            value: `${item.currentStock} left`,
            status: item.currentStock <= 0 ? "danger" : "warning",
            badge: item.currentStock <= 0 ? "OUT OF STOCK" : "REORDER NOW",
          }));

          const kpis: AssistantKpi[] = [
            { label: "Low Stock Items", value: lowStockCount.toString(), isPositive: lowStockCount === 0 },
            { label: "Out of Stock Items", value: outOfStockCount.toString(), isPositive: outOfStockCount === 0 },
            { label: "Total SKUs", value: inv.summary.totalSKUs.toString() },
          ];

          let textEn = "";
          let textHinglish = "";
          let textHi = "";

          if (isOutCheck) {
            textEn = count > 0
              ? `You currently have **${count} items** completely **Out of Stock**.`
              : `Great news! You have **0 out-of-stock items** right now.`;
            textHinglish = count > 0
              ? `Aapke **${count} items** bilkul **Out of Stock** ho chuke hain.`
              : `Badhiya! Filhal koi bhi item out of stock nahi hai.`;
            textHi = count > 0
              ? `🚨 आपकी दुकान में **${count} प्रोडक्ट्स** का स्टॉक शून्य (0) हो चुका है (Out of Stock)।`
              : `बधाई हो! वर्तमान में आपकी दुकान में कोई भी उत्पाद आउट-ऑफ-स्टॉक नहीं है।`;
          } else {
            textEn = count > 0
              ? `Alert: **${count} items** are running below their reorder thresholds and require replenishment.`
              : `All items currently have healthy inventory levels above their minimum reorder thresholds.`;
            textHinglish = count > 0
              ? `Savdhan: **${count} items** ka stock warning level se neeche hai aur reorder karne ki zaroorat hai.`
              : `Sabhi items ka stock level bilkul safe hai.`;
            textHi = count > 0
              ? `⚠️ ध्यान दें: आपकी दुकान में **${count} प्रोडक्ट्स** का स्टॉक न्यूनतम स्तर से कम है। कृपया रीऑर्डर करें।`
              : `आपकी दुकान में सभी उत्पादों का स्टॉक स्तर पूरी तरह सुरक्षित है।`;
          }

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: "Real-time",
              sourceModule: "Inventory & Stock",
              navigationLink: { href: "/inventory", label: "Open Inventory & Stock" },
              kpis,
              items: items.length > 0 ? items : undefined,
              suggestedFollowUps: [
                "Total inventory value kitni hai?",
                "Suppliers ko kitna payment baaki hai?",
              ],
            },
          };
        }

        // =====================================================================
        // 7. INVENTORY: CURRENT STOCK & VALUATION
        // =====================================================================
        case "INVENTORY_CURRENT_STOCK":
        case "INVENTORY_VALUATION": {
          if (!hasPermission(userRole, "MANAGE_INVENTORY") && !hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("MANAGE_INVENTORY", intent);
          }

          const inv = await getInventoryAnalytics(tenantId);
          const valuation = inv.summary.totalCostValuation;
          const retailValuation = inv.summary.totalRetailValuation;
          const totalUnits = inv.summary.totalPhysicalStock;
          const totalSKUs = inv.summary.totalSKUs;
          const lowStockCount = inv.summary.lowStockCount;
          const outOfStockCount = inv.summary.outOfStockCount;

          const kpis: AssistantKpi[] = [
            { label: "Cost Valuation", value: formatINR(valuation) },
            { label: "Retail Value", value: formatINR(retailValuation) },
            { label: "Total Physical Units", value: totalUnits.toString() },
            { label: "Total SKUs", value: totalSKUs.toString() },
          ];

          const items: AssistantStructuredItem[] = (inv.warehouseDistribution || []).slice(0, 5).map((w: any) => ({
            id: w.locationId,
            title: w.name,
            subtitle: `Location Code: ${w.code}`,
            value: `${w.totalUnits} units`,
            badge: "GODOWN",
            status: "info",
          }));

          const textEn = `Your current catalog across **${totalSKUs} SKUs** (${totalUnits} total units) has a total cost valuation of **${formatINR(valuation)}** (Retail potential: **${formatINR(retailValuation)}**). Status: **${lowStockCount} low-stock**, **${outOfStockCount} out-of-stock**.`;
          const textHinglish = `Aapki dukaan me kul **${totalSKUs} SKUs** (${totalUnits} total units) hain jinki cost valuation **${formatINR(valuation)}** hai (Bikri value: **${formatINR(retailValuation)}**). Isme **${lowStockCount} items low-stock** aur **${outOfStockCount} out-of-stock** hain.`;
          const textHi = `आपकी दुकान में कुल **${totalSKUs} प्रकार के प्रोडक्ट्स** (${totalUnits} कुल यूनिट्स) हैं, जिनका खरीद लागत मूल्य (Cost Valuation) **${formatINR(valuation)}** तथा अनुमानित खुदरा मूल्य **${formatINR(retailValuation)}** है। (स्थिति: **${lowStockCount} कम स्टॉक**, **${outOfStockCount} आउट-ऑफ-स्टॉक**)।`;

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: "Real-time",
              sourceModule: "Inventory & Warehouses",
              navigationLink: { href: "/inventory", label: "Manage Products & Stock" },
              kpis,
              items: items.length > 0 ? items : undefined,
              suggestedFollowUps: [
                "Kaunse products low stock hain?",
                "Aaj kitna sale hua?",
              ],
            },
          };
        }

        // =====================================================================
        // 8. CUSTOMER OUTSTANDING & TOP CUSTOMERS
        // =====================================================================
        case "CUSTOMER_OUTSTANDING":
        case "TOP_CUSTOMERS": {
          if (!hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("VIEW_FINANCIAL_REPORTS", intent);
          }

          const custAnalytics = await getCustomerAnalytics(tenantId);
          const totalReceivables = custAnalytics.summary.totalOutstandingReceivables;
          const topCusts = custAnalytics.topCustomers || [];

          const isTopCustomersQuery = intent === "TOP_CUSTOMERS";

          const kpis: AssistantKpi[] = [
            { label: "Total Udhar (Receivables)", value: formatINR(totalReceivables) },
            { label: "Active Customers", value: custAnalytics.summary.activeCustomers.toString() },
            { label: "Total Registered", value: custAnalytics.summary.totalCustomers.toString() },
          ];

          const items: AssistantStructuredItem[] = topCusts.slice(0, 5).map((c: any) => ({
            id: c.id,
            title: c.name,
            subtitle: `${c.orderCount || 0} orders | Phone: ${c.phone || "N/A"}`,
            value: isTopCustomersQuery ? formatINR(c.lifetimeRevenue) : formatINR(c.outstandingBalance),
            badge: isTopCustomersQuery ? "TOP CLIENT" : "PENDING UDHAR",
            status: isTopCustomersQuery ? "success" : "warning",
          }));

          let textEn = "";
          let textHinglish = "";
          let textHi = "";

          if (isTopCustomersQuery) {
            textEn = `Here are your top customers by sales volume:\n` +
              topCusts.slice(0, 5).map((c: any, i: number) => `${i + 1}. **${c.name}** — ${formatINR(c.lifetimeRevenue)} (${c.orderCount || 0} orders)`).join("\n");
            textHinglish = `Aapke sabse bade top customers ye hain:\n` +
              topCusts.slice(0, 5).map((c: any, i: number) => `${i + 1}. **${c.name}** — ${formatINR(c.lifetimeRevenue)} (${c.orderCount || 0} orders)`).join("\n");
            textHi = `आपकी दुकान के शीर्ष ग्राहक:\n` +
              topCusts.slice(0, 5).map((c: any, i: number) => `${i + 1}. **${c.name}** — कुल बिक्री **${formatINR(c.lifetimeRevenue)}** (${c.orderCount || 0} बिल)`).join("\n");
          } else {
            textEn = `Total customer outstanding (Udhar) across all accounts is **${formatINR(totalReceivables)}**. Top customer balances:\n` +
              topCusts.filter((c: any) => c.outstandingBalance > 0).slice(0, 3).map((d: any) => `• **${d.name}**: ${formatINR(d.outstandingBalance)}`).join("\n");
            textHinglish = `Customers ke paas kul Udhar (Receivables) **${formatINR(totalReceivables)}** baaki hai. In grahako par udhar pending hai:\n` +
              topCusts.filter((c: any) => c.outstandingBalance > 0).slice(0, 3).map((d: any) => `• **${d.name}**: ${formatINR(d.outstandingBalance)}`).join("\n");
            textHi = `ग्राहकों के पास कुल बकाया उधार (Receivables) **${formatINR(totalReceivables)}** है। शीर्ष बकाया ग्राहक:\n` +
              topCusts.filter((c: any) => c.outstandingBalance > 0).slice(0, 3).map((d: any) => `• **${d.name}**: ${formatINR(d.outstandingBalance)}`).join("\n");
          }

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: "Real-time Ledger",
              sourceModule: "Customers & Khata",
              navigationLink: { href: "/customers", label: "Open Customers & Udhar" },
              kpis,
              items: items.length > 0 ? items : undefined,
              suggestedFollowUps: [
                "Suppliers ko kitna dena hai?",
                "Cash balance kitna hai?",
              ],
            },
          };
        }

        // =====================================================================
        // 9. SUPPLIER OUTSTANDING & PURCHASES
        // =====================================================================
        case "SUPPLIER_OUTSTANDING":
        case "PURCHASE_SUMMARY": {
          if (!hasPermission(userRole, "VIEW_PURCHASE_COSTS") && !hasPermission(userRole, "RECORD_PURCHASE")) {
            return this.permissionDenied("VIEW_PURCHASE_COSTS", intent);
          }

          const purchases = await getPurchaseAnalytics(tenantId, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          const totalPurchases = purchases.summary.totalPurchases;
          const pendingPayables = purchases.summary.balanceAmount;
          const paidPurchases = purchases.summary.paidAmount;
          const supplierCount = purchases.summary.activeSuppliersCount;

          const kpis: AssistantKpi[] = [
            { label: "Total Purchases", value: formatINR(totalPurchases) },
            { label: "Pending Payables", value: formatINR(pendingPayables) },
            { label: "Paid to Suppliers", value: formatINR(paidPurchases) },
            { label: "Active Suppliers", value: supplierCount.toString() },
          ];

          const items: AssistantStructuredItem[] = (purchases.topSuppliers || []).slice(0, 5).map((s: any) => ({
            id: s.id,
            title: s.name,
            subtitle: `${s.billsCount} bills | Balance: ${formatINR(s.currentBalance)}`,
            value: formatINR(s.totalSpend),
            badge: "SUPPLIER",
            status: "info",
          }));

          const textEn = `During **${periodLabelEn}**, total goods purchased amounted to **${formatINR(totalPurchases)}**. Paid: **${formatINR(paidPurchases)}**, Pending balance to suppliers: **${formatINR(pendingPayables)}**.`;
          const textHinglish = `**${periodLabelHinglish}** me kul **${formatINR(totalPurchases)}** ka maal kharida gaya. Paid: **${formatINR(paidPurchases)}**, Suppliers ko baaki dena (Payables): **${formatINR(pendingPayables)}**.`;
          const textHi = `**${periodLabelHi}** में कुल **${formatINR(totalPurchases)}** का माल खरीदा गया। चुकाया गया: **${formatINR(paidPurchases)}**, सप्लायर्स को कुल देय बकाया (Payables): **${formatINR(pendingPayables)}**।`;

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: periodLabelEn,
              sourceModule: "Purchases & Suppliers",
              navigationLink: { href: "/purchases", label: "Open Purchases & Suppliers" },
              kpis,
              items: items.length > 0 ? items : undefined,
              suggestedFollowUps: [
                "Dukaan me kitna stock hai?",
                "Is mahine ka profit kitna hua?",
              ],
            },
          };
        }

        // =====================================================================
        // 10. CASH & BANK BALANCE
        // =====================================================================
        case "CASH_BANK_BALANCE": {
          if (!hasPermission(userRole, "MANAGE_ACCOUNTING") && !hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("VIEW_FINANCIAL_REPORTS", intent);
          }

          const cashBank = await getCashAndBankBook(tenantId);
          const cashBalance = cashBank.totalCashOnHand;
          const bankBalance = cashBank.totalBankBalance;
          const totalLiquidity = cashBank.totalLiquidFunds;

          const kpis: AssistantKpi[] = [
            { label: "Total Liquid Balance", value: formatINR(totalLiquidity) },
            { label: "Cash in Hand", value: formatINR(cashBalance) },
            { label: "Bank Accounts", value: formatINR(bankBalance) },
          ];

          const items: AssistantStructuredItem[] = (cashBank.accounts || []).map((acc: any) => ({
            id: acc.id,
            title: acc.name,
            subtitle: `Account Code: ${acc.code}`,
            value: formatINR(acc.closingBalance),
            badge: acc.category || "CASH/BANK",
            status: acc.closingBalance >= 0 ? "success" : "danger",
          }));

          const textEn = `Total available liquid cash & bank balance is **${formatINR(totalLiquidity)}** (Cash in hand: **${formatINR(cashBalance)}**, Bank accounts: **${formatINR(bankBalance)}**).`;
          const textHinglish = `Dukaan me kul liquid balance **${formatINR(totalLiquidity)}** hai (Galle me Cash: **${formatINR(cashBalance)}**, Bank me jama: **${formatINR(bankBalance)}**).`;
          const textHi = `दुकान में कुल उपलब्ध तरल राशि (Liquid Balance) **${formatINR(totalLiquidity)}** है (नकद रोकड़: **${formatINR(cashBalance)}**, बैंक खातों में: **${formatINR(bankBalance)}**)।`;

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: "Real-time",
              sourceModule: "Accounting & Cashbook",
              navigationLink: { href: "/accounting", label: "Open Cash & Bank Accounts" },
              kpis,
              items,
              suggestedFollowUps: [
                "Aaj ki sales kitni hui?",
                "Customer udhar kitna baaki hai?",
              ],
            },
          };
        }

        // =====================================================================
        // 11. TRIAL BALANCE & BALANCE SHEET
        // =====================================================================
        case "TRIAL_BALANCE":
        case "BALANCE_SHEET": {
          if (!hasPermission(userRole, "MANAGE_ACCOUNTING")) {
            return this.permissionDenied("MANAGE_ACCOUNTING", intent);
          }

          if (intent === "TRIAL_BALANCE") {
            const tb = await getTrialBalance(tenantId);
            const isBalanced = tb.isBalanced;

            const kpis: AssistantKpi[] = [
              { label: "Total Debits", value: formatINR(tb.totalDebits) },
              { label: "Total Credits", value: formatINR(tb.totalCredits) },
              { label: "Status", value: isBalanced ? "BALANCED (OK)" : "DISCREPANCY", isPositive: isBalanced },
            ];

            const textEn = `Trial Balance status: Total Debits = **${formatINR(tb.totalDebits)}**, Total Credits = **${formatINR(tb.totalCredits)}** (${isBalanced ? "Perfect balance maintained" : "Discrepancy detected"}).`;
            const textHinglish = `Trial Balance report: Total Debits = **${formatINR(tb.totalDebits)}**, Total Credits = **${formatINR(tb.totalCredits)}** (${isBalanced ? "Khata bilkul barabar (Balanced) hai" : "Antar mila"}).`;
            const textHi = `ट्रायल बैलेंस रिपोर्ट: कुल डेबिट = **${formatINR(tb.totalDebits)}**, कुल क्रेडिट = **${formatINR(tb.totalCredits)}** (${isBalanced ? "खाता पूर्णतः संतुलित (Balanced) है" : "अंतर पाया गया"})।`;

            return {
              success: true,
              intent,
              textEn,
              textHinglish,
              textHi,
              structuredData: {
                intent,
                periodLabel: "As of Today",
                sourceModule: "Double-Entry Accounting",
                navigationLink: { href: "/accounting", label: "Open Full Trial Balance" },
                kpis,
              },
            };
          } else {
            const bs = await getBalanceSheet(tenantId);
            const isBalanced = bs.isBalanced;

            const kpis: AssistantKpi[] = [
              { label: "Total Assets", value: formatINR(bs.assets.total) },
              { label: "Total Liabilities", value: formatINR(bs.liabilities.total) },
              { label: "Equity & Retained", value: formatINR(bs.equity.total) },
            ];

            const textEn = `Balance Sheet: Assets = **${formatINR(bs.assets.total)}**, Liabilities = **${formatINR(bs.liabilities.total)}**, Equity = **${formatINR(bs.equity.total)}** (${isBalanced ? "Balanced" : "Review Required"}).`;
            const textHinglish = `Balance Sheet: Assets = **${formatINR(bs.assets.total)}**, Liabilities = **${formatINR(bs.liabilities.total)}**, Equity = **${formatINR(bs.equity.total)}** (${isBalanced ? "Barabar (Balanced) hai" : "Review zaroori hai"}).`;
            const textHi = `बैलेंस शीट सारांश: कुल परिसंपत्तियां (Assets) = **${formatINR(bs.assets.total)}**, कुल देनदारियां (Liabilities) = **${formatINR(bs.liabilities.total)}**, इक्विटी = **${formatINR(bs.equity.total)}** (${isBalanced ? "संतुलित (Balanced)" : "समीक्षा आवश्यक"})।`;

            return {
              success: true,
              intent,
              textEn,
              textHinglish,
              textHi,
              structuredData: {
                intent,
                periodLabel: "As of Today",
                sourceModule: "Double-Entry Accounting",
                navigationLink: { href: "/accounting", label: "Open Balance Sheet" },
                kpis,
              },
            };
          }
        }

        // =====================================================================
        // 12. BUSINESS OVERVIEW
        // =====================================================================
        case "BUSINESS_OVERVIEW": {
          if (!hasPermission(userRole, "VIEW_FINANCIAL_REPORTS")) {
            return this.permissionDenied("VIEW_FINANCIAL_REPORTS", intent);
          }

          const overview = await getExecutiveOverview(tenantId, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          const revenue = overview.kpis.totalSales.value;
          const expenses = overview.kpis.totalExpenses.value;
          const netProfit = overview.kpis.netProfit.value;
          const receivables = overview.kpis.outstandingReceivables;
          const valuation = overview.kpis.inventoryValuationCost;

          const kpis: AssistantKpi[] = [
            { label: "Sales Revenue", value: formatINR(revenue) },
            { label: "Net Profit", value: formatINR(netProfit), isPositive: netProfit >= 0 },
            { label: "Operating Expenses", value: formatINR(expenses) },
            { label: "Stock Valuation", value: formatINR(valuation) },
            { label: "Udhar Receivables", value: formatINR(receivables) },
          ];

          const textEn = `Executive business overview for **${periodLabelEn}**:\n` +
            `• **Sales**: ${formatINR(revenue)} (${overview.kpis.invoiceCount} bills)\n` +
            `• **Expenses**: ${formatINR(expenses)}\n` +
            `• **Net Profit**: ${formatINR(netProfit)}\n` +
            `• **Stock Valuation**: ${formatINR(valuation)}\n` +
            `• **Customer Receivables**: ${formatINR(receivables)}`;

          const textHinglish = `**${periodLabelHinglish}** ka dukaan overview:\n` +
            `• **Sales**: ${formatINR(revenue)} (${overview.kpis.invoiceCount} bills)\n` +
            `• **Kharche**: ${formatINR(expenses)}\n` +
            `• **Shuddh Munafa**: ${formatINR(netProfit)}\n` +
            `• **Stock Valuation**: ${formatINR(valuation)}\n` +
            `• **Grahako se Udhar**: ${formatINR(receivables)}`;

          const textHi = `**${periodLabelHi}** का दुकान सारांश:\n` +
            `• **कुल बिक्री**: ${formatINR(revenue)} (${overview.kpis.invoiceCount} बिल)\n` +
            `• **कुल खर्चे**: ${formatINR(expenses)}\n` +
            `• **शुद्ध मुनाफा (Net Profit)**: ${formatINR(netProfit)}\n` +
            `• **स्टॉक वैल्यू**: ${formatINR(valuation)}\n` +
            `• **ग्राहकों का बकाया उधार**: ${formatINR(receivables)}`;

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: periodLabelEn,
              sourceModule: "Executive Dashboard",
              navigationLink: { href: "/dashboard", label: "Open Executive Dashboard" },
              kpis,
              suggestedFollowUps: [
                "Top selling products dikhao",
                "Low stock products kaunse hain?",
                "Customer udhar list dikhao",
              ],
            },
          };
        }

        // =====================================================================
        // 13. ELVORA SUPPORT & HOW-TO
        // =====================================================================
        case "ELVORA_SUPPORT": {
          const article = ELVORA_SUPPORT_ARTICLES.find((a) => a.id === supportTopic) || ELVORA_SUPPORT_ARTICLES[0];

          const textEn = `### ${article.titleEn}\n${article.summaryEn}\n\n**Step-by-step instructions:**\n` +
            article.stepsEn.map((s, idx) => `${idx + 1}. ${s}`).join("\n");

          const textHinglish = `### ${article.titleHinglish}\n${article.summaryHinglish}\n\n**Step-by-step instructions:**\n` +
            article.stepsHinglish.map((s, idx) => `${idx + 1}. ${s}`).join("\n");

          const textHi = `### ${article.titleHi || article.titleEn}\n${article.summaryHi || article.summaryEn}\n\n**कदम-दर-कदम निर्देश:**\n` +
            (article.stepsHi || article.stepsEn).map((s, idx) => `${idx + 1}. ${s}`).join("\n");

          return {
            success: true,
            intent,
            textEn,
            textHinglish,
            textHi,
            structuredData: {
              intent,
              periodLabel: "Help & Guide",
              sourceModule: article.moduleName,
              navigationLink: { href: article.navigationPath, label: `Go to ${article.moduleName}` },
              suggestedFollowUps: [
                "Counter POS me bill kaise banaye?",
                "GST invoice kaise generate kare?",
                "Low stock warning kaise dekhe?",
              ],
            },
          };
        }

        // =====================================================================
        // 14. AMBIGUOUS OR UNKNOWN QUERIES
        // =====================================================================
        case "AMBIGUOUS_QUERY":
        default: {
          return {
            success: true,
            intent: "UNKNOWN_QUERY",
            textEn: "I couldn't quite understand that query. You can ask about **Sales**, **Profit & Loss**, **Expenses**, **Low Stock**, **Customer Udhar**, **Cash Balance**, or ask for help with any **Elvora feature**.",
            textHinglish: "Mujhe aapka sawaal theek se samajh nahi aaya. Aap **Aaj ki Sales**, **Is Month ka Profit**, **Low Stock**, **Customer Udhar**, **Cash Balance**, ya Elvora ke kisi feature ke baare me pooch sakte hain.",
            textHi: "मुझे आपका सवाल पूरी तरह समझ नहीं आया। आप **बिक्री**, **मुनाफा व नुकसान**, **खर्च**, **कम स्टॉक**, **ग्राहक उधार**, **कैश बैलेंस**, या **एल्बोरा के किसी फ़ीचर** के बारे में पूछ सकते हैं।",
            structuredData: {
              intent: "UNKNOWN_QUERY",
              periodLabel: "General",
              sourceModule: "Elvora Assistant",
              suggestedFollowUps: [
                "Aaj kitna sale hua?",
                "Is month ka profit kitna hai?",
                "Kaunse product ka stock kam hai?",
                "Grahako ka kitna udhar baaki hai?",
                "Counter POS kaise use karein?",
              ],
            },
          };
        }
      }
    } catch (err: any) {
      console.error("[BusinessToolsRegistry] Error executing tool:", err);
      return {
        success: false,
        intent,
        textEn: `An error occurred while calculating this information: ${err.message || "Database service unavailable"}.`,
        textHinglish: `Is jankari ko process karne me technical samasya aayi: ${err.message || "Database service unavailable"}.`,
        textHi: `इस जानकारी को प्रोसेस करने में तकनीकी समस्या आई: ${err.message || "डेटाबेस सेवा अनुपलब्ध"}।`,
      };
    }
  }

  private static permissionDenied(requiredPermission: string, intent: AssistantIntent): BusinessToolExecutionResult {
    return {
      success: false,
      intent,
      textEn: `Access Restricted: Your current staff role does not have the required permission (**${requiredPermission}**) to view these financial figures. Please contact your shop administrator.`,
      textHinglish: `Suraksha Rukaawat: Aapke role ke paas is financial data ko dekhne ki permission (**${requiredPermission}**) nahi hai. Kripya dukaan ke Owner ya Manager se sampark karein.`,
      textHi: `सुरक्षा प्रतिबंध: आपके वर्तमान रोल के पास इस वित्तीय डेटा को देखने की अनुमति (**${requiredPermission}**) नहीं है। कृपया दुकान व्यवस्थापक से संपर्क करें।`,
      error: "PERMISSION_DENIED",
    };
  }
}
