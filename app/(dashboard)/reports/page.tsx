"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { TableSkeleton, CardsSkeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  Printer,
  TrendingUp, 
  Calculator, 
  Boxes,
  Scale,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Users,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ActiveTab = 
  | "SALES" 
  | "PROFIT" 
  | "GST" 
  | "STOCK" 
  | "RECEIVABLES_PAYABLES" 
  | "TRIAL_BALANCE" 
  | "RECONCILIATION";

type SalesBreakdown = "summary" | "product" | "brand" | "category" | "customer";
type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export default function ReportsIntelligencePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("SALES");
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [salesBreakdown, setSalesBreakdown] = useState<SalesBreakdown>("summary");

  const reportUrl = useMemo(() => {
    switch (activeTab) {
      case "SALES":
        return `/api/reports/sales?period=${period}&breakdown=${salesBreakdown}`;
      case "PROFIT":
        return `/api/reports/profit-loss?period=${period}`;
      case "GST":
        return `/api/reports/taxes?period=${period}`;
      case "STOCK":
        return `/api/reports/inventory`;
      case "RECEIVABLES_PAYABLES":
        return `/api/reports/receivables-payables`;
      case "TRIAL_BALANCE":
        return `/api/accounting/trial-balance`;
      case "RECONCILIATION":
        return `/api/accounting/reconciliation`;
      default:
        return null;
    }
  }, [activeTab, period, salesBreakdown]);

  const { data: currentData, isLoading, mutate } = useSWR<any>(reportUrl);

  const salesData = activeTab === "SALES" ? currentData : null;
  const pnlData = activeTab === "PROFIT" ? currentData : null;
  const taxData = activeTab === "GST" ? currentData : null;
  const stockData = activeTab === "STOCK" ? currentData : null;
  const receivablesData = activeTab === "RECEIVABLES_PAYABLES" ? currentData : null;
  const tbAccounts = activeTab === "TRIAL_BALANCE" ? currentData?.accounts || [] : [];
  const tbBalanced = activeTab === "TRIAL_BALANCE" ? (currentData?.isBalanced ?? true) : true;
  const tbDebits = activeTab === "TRIAL_BALANCE" ? (currentData?.totalDebits || 0) : 0;
  const tbCredits = activeTab === "TRIAL_BALANCE" ? (currentData?.totalCredits || 0) : 0;
  const reconciliation = activeTab === "RECONCILIATION" ? currentData : null;

  const fetchActiveReport = () => {
    mutate();
  };

  const handleExportCSV = () => {
    let url = "";
    if (activeTab === "SALES") {
      url = `/api/reports/sales?period=${period}&breakdown=${salesBreakdown}&format=csv`;
    } else if (activeTab === "PROFIT") {
      url = `/api/reports/profit-loss?period=${period}&format=csv`;
    } else if (activeTab === "GST") {
      url = `/api/reports/taxes?period=${period}&format=csv`;
    } else if (activeTab === "STOCK") {
      url = `/api/reports/inventory?format=csv`;
    } else if (activeTab === "RECEIVABLES_PAYABLES") {
      url = `/api/reports/receivables-payables?format=csv`;
    } else {
      url = `/api/reports/sales?format=csv`;
    }
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Business Intelligence</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Audit-grade reporting across sales, cost accounting, GST filings, inventory valuation & General Ledger
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          {["SALES", "PROFIT", "GST"].includes(activeTab) && (
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setPeriod("daily")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  period === "daily" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod("weekly")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  period === "weekly" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setPeriod("monthly")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  period === "monthly" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setPeriod("yearly")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  period === "yearly" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                FY 2026-27
              </button>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1 text-slate-600" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1 text-slate-600" /> Print Report
          </Button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block border-b border-slate-300 pb-3">
        <h2 className="text-xl font-bold text-slate-900">Elvora Business Report</h2>
        <p className="text-xs text-slate-500">Report Category: {activeTab} | Generated on {new Date().toLocaleDateString("en-IN")}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 print:hidden text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab("SALES")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold transition-colors ${
            activeTab === "SALES"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Sales Intelligence
        </button>
        <button
          onClick={() => setActiveTab("PROFIT")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold transition-colors ${
            activeTab === "PROFIT"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <DollarSign className="h-4 w-4" /> Profit & Loss
        </button>
        <button
          onClick={() => setActiveTab("GST")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold transition-colors ${
            activeTab === "GST"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calculator className="h-4 w-4" /> GST Tax Filing
        </button>
        <button
          onClick={() => setActiveTab("STOCK")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold transition-colors ${
            activeTab === "STOCK"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Boxes className="h-4 w-4" /> Stock Valuation & Low Stock
        </button>
        <button
          onClick={() => setActiveTab("RECEIVABLES_PAYABLES")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold transition-colors ${
            activeTab === "RECEIVABLES_PAYABLES"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" /> Dues & Payables
        </button>
        <button
          onClick={() => setActiveTab("TRIAL_BALANCE")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold transition-colors ${
            activeTab === "TRIAL_BALANCE"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Scale className="h-4 w-4" /> Trial Balance (GL)
        </button>
        <button
          onClick={() => setActiveTab("RECONCILIATION")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold transition-colors ${
            activeTab === "RECONCILIATION"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" /> Reconciliation
        </button>
      </div>

      {isLoading && !currentData ? (
        <div className="space-y-6">
          <CardsSkeleton count={4} />
          <TableSkeleton rows={5} cols={5} />
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------------- */}
          {/* TAB 1: SALES INTELLIGENCE & BREAKDOWNS */}
          {/* ------------------------------------------------------------- */}
      {activeTab === "SALES" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taxable Turnover</span>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatINR(salesData?.summary?.taxableTurnover || 0)}
              </p>
              <span className="text-xs text-slate-400">Net sales (goods & services)</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Output GST Collected</span>
              <p className="mt-2 text-xl font-bold text-amber-600">
                {formatINR(salesData?.summary?.totalTaxAmount || 0)}
              </p>
              <span className="text-xs text-slate-400">CGST + SGST + IGST liability</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Receipts Realized</span>
              <p className="mt-2 text-xl font-bold text-emerald-600">
                {formatINR(salesData?.summary?.totalPaidAmount || 0)}
              </p>
              <span className="text-xs text-slate-400">Realized Cash & UPI collections</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding Receivables</span>
              <p className="mt-2 text-xl font-bold text-rose-600">
                {formatINR(salesData?.summary?.totalOutstandingReceivables || 0)}
              </p>
              <span className="text-xs text-slate-400">Credit balance due from debtors</span>
            </div>
          </div>

          {/* Breakdown selector pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm print:hidden">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">Analyze Sales Breakdown by:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(["summary", "product", "brand", "category", "customer"] as SalesBreakdown[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSalesBreakdown(mode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition capitalize ${
                    salesBreakdown === mode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {mode === "summary" ? "Timeline / Date" : `By ${mode}`}
                </button>
              ))}
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 capitalize">
              Sales Breakdown ({salesBreakdown})
            </h3>
            <TableContainer>
              <Table>
                <TableHeader>
                  {salesBreakdown === "product" && (
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Units Sold</TableHead>
                      <TableHead className="text-right">Taxable Turnover</TableHead>
                      <TableHead className="text-right">Total Invoiced (with GST)</TableHead>
                    </TableRow>
                  )}
                  {salesBreakdown === "brand" && (
                    <TableRow>
                      <TableHead>Brand Name</TableHead>
                      <TableHead className="text-center">Units Sold</TableHead>
                      <TableHead className="text-right">Total Gross Billings</TableHead>
                    </TableRow>
                  )}
                  {salesBreakdown === "category" && (
                    <TableRow>
                      <TableHead>Category Name</TableHead>
                      <TableHead className="text-center">Units Sold</TableHead>
                      <TableHead className="text-right">Total Gross Billings</TableHead>
                    </TableRow>
                  )}
                  {salesBreakdown === "customer" && (
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead className="text-center">Bills Count</TableHead>
                      <TableHead className="text-right">Total Invoiced</TableHead>
                      <TableHead className="text-right">Paid Amount</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                    </TableRow>
                  )}
                  {salesBreakdown === "summary" && (
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Invoices</TableHead>
                      <TableHead className="text-right">Taxable Turnover</TableHead>
                      <TableHead className="text-right">GST Collected</TableHead>
                      <TableHead className="text-right">Total Invoiced</TableHead>
                      <TableHead className="text-right">Cash/Bank Collected</TableHead>
                      <TableHead className="text-right">Credit Balance</TableHead>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-slate-400">
                        Loading sales data...
                      </TableCell>
                    </TableRow>
                  ) : !salesData?.items || salesData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-slate-400">
                        No sales invoices recorded for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesData.items.map((it: any, idx: number) => (
                      <TableRow key={idx}>
                        {salesBreakdown === "product" && (
                          <>
                            <TableCell className="font-mono text-xs text-slate-700">{it.sku}</TableCell>
                            <TableCell className="font-semibold text-slate-900">{it.productName}</TableCell>
                            <TableCell className="text-xs text-slate-600">{it.variantName}</TableCell>
                            <TableCell className="text-xs text-slate-500">{it.brandName}</TableCell>
                            <TableCell className="text-xs text-slate-500">{it.categoryName}</TableCell>
                            <TableCell className="text-center font-bold">{it.unitsSold}</TableCell>
                            <TableCell className="text-right font-medium">{formatINR(it.taxableAmount)}</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{formatINR(it.totalAmount)}</TableCell>
                          </>
                        )}
                        {salesBreakdown === "brand" && (
                          <>
                            <TableCell className="font-bold text-slate-900">{it.brandName}</TableCell>
                            <TableCell className="text-center font-semibold">{it.unitsSold} units</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{formatINR(it.totalAmount)}</TableCell>
                          </>
                        )}
                        {salesBreakdown === "category" && (
                          <>
                            <TableCell className="font-bold text-slate-900">{it.categoryName}</TableCell>
                            <TableCell className="text-center font-semibold">{it.unitsSold} units</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{formatINR(it.totalAmount)}</TableCell>
                          </>
                        )}
                        {salesBreakdown === "customer" && (
                          <>
                            <TableCell className="font-bold text-slate-900">{it.customerName}</TableCell>
                            <TableCell className="text-xs text-slate-500">{it.phone}</TableCell>
                            <TableCell className="font-mono text-xs text-slate-600">{it.gstin}</TableCell>
                            <TableCell className="text-center font-semibold">{it.invoiceCount}</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{formatINR(it.totalAmount)}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">{formatINR(it.paidAmount)}</TableCell>
                            <TableCell className="text-right font-bold text-rose-600">{formatINR(it.balanceAmount)}</TableCell>
                          </>
                        )}
                        {salesBreakdown === "summary" && (
                          <>
                            <TableCell className="font-medium text-slate-800">{it.date}</TableCell>
                            <TableCell className="text-center font-semibold">{it.invoiceCount}</TableCell>
                            <TableCell className="text-right font-medium">{formatINR(it.taxableAmount)}</TableCell>
                            <TableCell className="text-right font-medium text-amber-600">{formatINR(it.taxAmount)}</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{formatINR(it.grandTotal)}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">{formatINR(it.paidAmount)}</TableCell>
                            <TableCell className="text-right font-bold text-rose-600">{formatINR(it.balanceAmount)}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PROFIT & LOSS INTELLIGENCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "PROFIT" && (
        <div className="space-y-6">
          {/* Statutory Compliance Banner */}
          <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-bold">Documented Cost Accounting Method (Statutory GST Compliant)</p>
              <p className="text-slate-600 mt-0.5">
                Output GST collected ({formatINR(pnlData?.statement?.outputTaxCollectedExcludedFromProfit || 0)}) is strictly excluded from revenue as a balance sheet liability. Gross profit reflects net taxable sales turnover minus the true purchase cost of items sold (COGS), adjusting for returned goods.
              </p>
            </div>
          </div>

          {pnlData?.calculationMethod?.hasIncompleteCosts && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>
                <strong>Estimated Profit Notice:</strong> {pnlData.calculationMethod.missingCostItemCount} sold items have unrecorded purchase prices. Net profit is projected on available historical purchase records.
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Sales Turnover</span>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatINR(pnlData?.statement?.netSalesTurnover || 0)}</p>
              <span className="text-xs text-slate-400">Turnover after deducting returns</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Trading Profit</span>
              <p className="mt-2 text-xl font-bold text-blue-600">{formatINR(pnlData?.statement?.grossProfit || 0)}</p>
              <span className="text-xs text-blue-700 font-semibold">{pnlData?.statement?.grossMarginPercent || 0}% Gross Margin</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estimated Net Profit</span>
              <p className="mt-2 text-xl font-bold text-emerald-600">{formatINR(pnlData?.statement?.estimatedNetProfit || 0)}</p>
              <span className="text-xs text-emerald-700 font-semibold">{pnlData?.statement?.netProfitMarginPercent || 0}% Net Margin</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Profit & Loss Line Items</h3>
            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              <div className="flex justify-between py-2.5">
                <span className="font-semibold text-slate-700">Gross Sales Turnover (Taxable Sales)</span>
                <span className="font-bold text-slate-900">{formatINR(pnlData?.statement?.grossSalesTurnover || 0)}</span>
              </div>
              <div className="flex justify-between py-2.5 text-slate-600">
                <span>Less: Customer Sales Returns & Credit Notes</span>
                <span className="text-rose-600 font-medium">- {formatINR(pnlData?.statement?.lessSalesReturns || 0)}</span>
              </div>
              <div className="flex justify-between py-2.5 font-bold text-slate-800 bg-slate-50 px-2 rounded-lg">
                <span>Net Operating Revenue (Net Sales Turnover)</span>
                <span>{formatINR(pnlData?.statement?.netSalesTurnover || 0)}</span>
              </div>
              <div className="flex justify-between py-2.5 text-slate-600">
                <span>Less: Cost of Goods Sold (Purchase Cost of Goods Dispatched)</span>
                <span className="text-rose-600 font-medium">- {formatINR(pnlData?.statement?.costOfGoodsSold?.netCostOfGoodsSold || 0)}</span>
              </div>
              <div className="flex justify-between py-2.5 font-bold text-blue-900 bg-blue-50/70 px-2 rounded-lg border border-blue-200/50">
                <span>Gross Trading Profit</span>
                <span>{formatINR(pnlData?.statement?.grossProfit || 0)}</span>
              </div>
              <div className="flex justify-between py-2.5 text-slate-600">
                <span>Less: Store Operating Overheads (Rent, Freight, Salaries, Utilities)</span>
                <span className="text-rose-600 font-medium">- {formatINR(pnlData?.statement?.operatingExpenses?.total || 0)}</span>
              </div>
              <div className="flex justify-between py-3 font-extrabold text-base text-slate-900 bg-emerald-50 px-2 rounded-lg border border-emerald-200">
                <span>Net Clean Profit (Take Home)</span>
                <span className="text-emerald-700">{formatINR(pnlData?.statement?.estimatedNetProfit || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: GST TAX FILING INTELLIGENCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "GST" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Output GST Liability</span>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatINR(taxData?.outwardSuppliesGSTR1?.totalOutputTax?.total || 0)}
              </p>
              <span className="text-xs text-slate-400">Collected from B2B & B2C invoices</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible Input Tax Credit (ITC)</span>
              <p className="mt-2 text-xl font-bold text-emerald-600">
                {formatINR(taxData?.inwardSuppliesITC?.eligibleITC?.total || 0)}
              </p>
              <span className="text-xs text-slate-400">Available from purchase bills</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Tax Payable (Challan)</span>
              <p className="mt-2 text-xl font-bold text-blue-600">
                {formatINR(taxData?.gstr3bSummary?.netCashTaxPayable || 0)}
              </p>
              <span className="text-xs text-emerald-700 font-semibold">
                {taxData?.gstr3bSummary?.itcCarryForward > 0
                  ? `ITC Carry Forward: ${formatINR(taxData.gstr3bSummary.itcCarryForward)}`
                  : "Due on 20th of month"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">GSTR-1 Outward Supplies Breakdown</h3>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filing Table / Supply Type</TableHead>
                    <TableHead className="text-right">Taxable Turnover</TableHead>
                    <TableHead className="text-right">CGST (9%)</TableHead>
                    <TableHead className="text-right">SGST (9%)</TableHead>
                    <TableHead className="text-right">IGST (18%)</TableHead>
                    <TableHead className="text-right">Total Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-slate-800">
                      Table 4: B2B Invoices (Registered Dealers with GSTIN)
                    </TableCell>
                    <TableCell className="text-right">{formatINR(taxData?.outwardSuppliesGSTR1?.b2b?.taxable || 0)}</TableCell>
                    <TableCell className="text-right">{formatINR(taxData?.outwardSuppliesGSTR1?.b2b?.cgst || 0)}</TableCell>
                    <TableCell className="text-right">{formatINR(taxData?.outwardSuppliesGSTR1?.b2b?.sgst || 0)}</TableCell>
                    <TableCell className="text-right">{formatINR(taxData?.outwardSuppliesGSTR1?.b2b?.igst || 0)}</TableCell>
                    <TableCell className="text-right font-bold">{formatINR(taxData?.outwardSuppliesGSTR1?.b2b?.totalTax || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-slate-800">
                      Table 7: B2C Retail Bills (Unregistered Walk-ins)
                    </TableCell>
                    <TableCell className="text-right">{formatINR(taxData?.outwardSuppliesGSTR1?.b2c?.taxable || 0)}</TableCell>
                    <TableCell className="text-right">{formatINR(taxData?.outwardSuppliesGSTR1?.b2c?.cgst || 0)}</TableCell>
                    <TableCell className="text-right">{formatINR(taxData?.outwardSuppliesGSTR1?.b2c?.sgst || 0)}</TableCell>
                    <TableCell className="text-right">{formatINR(taxData?.outwardSuppliesGSTR1?.b2c?.igst || 0)}</TableCell>
                    <TableCell className="text-right font-bold">{formatINR(taxData?.outwardSuppliesGSTR1?.b2c?.totalTax || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: STOCK VALUATION & LOW STOCK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "STOCK" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stock Valuation (at Cost)</span>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatINR(stockData?.summary?.inventoryValuationAtCost || 0)}</p>
              <span className="text-xs text-slate-400">Total capital deployed in inventory</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Retail Value (Selling Price)</span>
              <p className="mt-2 text-xl font-bold text-blue-600">{formatINR(stockData?.summary?.inventoryValuationAtRetail || 0)}</p>
              <span className="text-xs text-blue-700 font-semibold">{formatINR(stockData?.summary?.potentialGrossMargin || 0)} potential margin</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock Re-order Warnings</span>
              <p className="mt-2 text-xl font-bold text-rose-600">{stockData?.summary?.lowStockItemCount || 0}</p>
              <span className="text-xs text-rose-700 font-semibold">Variants below threshold</span>
            </div>
          </div>

          {/* Low Stock Items Alert Table */}
          {stockData?.lowStockAlerts?.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-bold text-rose-900">Low Stock Re-Order Urgent Warnings</h3>
              </div>
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-center">Current Stock</TableHead>
                      <TableHead className="text-center">Alert Limit</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Recommended Re-order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockData.lowStockAlerts.map((it: any) => (
                      <TableRow key={it.variantId}>
                        <TableCell className="font-mono text-xs font-bold text-rose-900">{it.sku}</TableCell>
                        <TableCell className="font-semibold text-slate-900">{it.productName}</TableCell>
                        <TableCell className="text-xs text-slate-600">{it.variantName}</TableCell>
                        <TableCell className="text-center font-bold text-rose-600">{it.currentStock}</TableCell>
                        <TableCell className="text-center text-slate-500">{it.minStockAlert}</TableCell>
                        <TableCell className="text-right font-medium">{formatINR(it.unitCost)}</TableCell>
                        <TableCell className="text-right font-bold text-blue-600">+{it.reorderRecommended} units</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          )}

          {/* Valuation by Category */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Inventory Valuation by Product Category</h3>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead className="text-center">Varieties Count</TableHead>
                    <TableHead className="text-center">Total Physical Stock</TableHead>
                    <TableHead className="text-right">Capital Valuation (Cost)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockData?.categoryValuation?.map((c: any) => (
                    <TableRow key={c.category}>
                      <TableCell className="font-bold text-slate-800">{c.category}</TableCell>
                      <TableCell className="text-center">{c.productCount} items</TableCell>
                      <TableCell className="text-center font-semibold">{c.units} units</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{formatINR(c.valuation)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: RECEIVABLES & PAYABLES SUMMARY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "RECEIVABLES_PAYABLES" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Customer Receivables (Debtors)</span>
              <p className="mt-2 text-xl font-bold text-rose-600">{formatINR(receivablesData?.summary?.totalOutstandingReceivables || 0)}</p>
              <span className="text-xs text-slate-400">Total credit due from customers</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier Payables (Creditors)</span>
              <p className="mt-2 text-xl font-bold text-amber-600">{formatINR(receivablesData?.summary?.totalOutstandingPayables || 0)}</p>
              <span className="text-xs text-slate-400">Total liability due to vendors</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Working Capital Exposure</span>
              <p className="mt-2 text-xl font-bold text-blue-600">{formatINR(receivablesData?.summary?.netWorkingCapitalExposure || 0)}</p>
              <span className="text-xs text-slate-400">Receivables minus Payables</span>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Customer Debtors */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Top Customer Outstanding Receivables</h3>
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesData?.customerReceivables?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-semibold text-slate-900">{c.name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{c.phone}</TableCell>
                        <TableCell className="text-right font-bold text-rose-600">{formatINR(c.outstandingBalance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>

            {/* Supplier Creditors */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Supplier Outstanding Payables</h3>
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Amount Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesData?.supplierPayables?.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold text-slate-900">{s.name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{s.phone}</TableCell>
                        <TableCell className="text-right font-bold text-amber-600">{formatINR(s.outstandingBalance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: TRIAL BALANCE (GL) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "TRIAL_BALANCE" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={tbBalanced ? "success" : "danger"} size="md">
                {tbBalanced ? "✓ TRIAL BALANCE BALANCED (Σ Dr == Σ Cr)" : "DISCREPANCY DETECTED"}
              </Badge>
              <span className="text-xs text-slate-500">Double-entry accounting invariant verified</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchActiveReport}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh GL
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Debit Balance</span>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatINR(tbDebits)}</p>
              <span className="text-xs text-slate-400">Assets & Operating Expenses</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Credit Balance</span>
              <p className="mt-2 text-xl font-bold text-emerald-600">{formatINR(tbCredits)}</p>
              <span className="text-xs text-slate-400">Liabilities, Equity & Revenues</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">General Ledger Chart of Accounts</h3>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Group Type</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead className="text-right">Net Debit (₹)</TableHead>
                    <TableHead className="text-right">Net Credit (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tbAccounts.map((acc: any) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-700">{acc.code}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{acc.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            acc.type === "ASSET"
                              ? "info"
                              : acc.type === "LIABILITY"
                              ? "warning"
                              : acc.type === "REVENUE"
                              ? "success"
                              : acc.type === "EXPENSE"
                              ? "danger"
                              : "default"
                          }
                          size="sm"
                        >
                          {acc.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{acc.category}</TableCell>
                      <TableCell className="text-right font-medium text-slate-800">
                        {acc.netDebit > 0 ? formatINR(acc.netDebit) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-800">
                        {acc.netCredit > 0 ? formatINR(acc.netCredit) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: SUBLEDGER RECONCILIATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "RECONCILIATION" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">General Ledger vs. Subledger Integrity</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Reconciles control accounts in the General Ledger against individual party subledgers (Customers & Suppliers) to detect discrepancies.
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Accounts Receivable */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 text-sm">Accounts Receivable (Sundry Debtors)</span>
                  <Badge variant={reconciliation?.subledgerReconciliation?.accountsReceivable?.isReconciled ? "success" : "warning"} size="sm">
                    {reconciliation?.subledgerReconciliation?.accountsReceivable?.isReconciled ? "RECONCILED" : "CHECK REQUIRED"}
                  </Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">General Ledger Balance (1030_ACCOUNTS_RECEIVABLE):</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(reconciliation?.subledgerReconciliation?.accountsReceivable?.glAccountBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sum of All Customer Outstanding Balances:</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(reconciliation?.subledgerReconciliation?.accountsReceivable?.customerSubledgerTotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <span className="text-slate-600">Discrepancy / Variance:</span>
                    <span className="text-emerald-600">
                      ₹{(reconciliation?.subledgerReconciliation?.accountsReceivable?.difference || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Accounts Payable */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 text-sm">Accounts Payable (Sundry Creditors)</span>
                  <Badge variant={reconciliation?.subledgerReconciliation?.accountsPayable?.isReconciled ? "success" : "warning"} size="sm">
                    {reconciliation?.subledgerReconciliation?.accountsPayable?.isReconciled ? "RECONCILED" : "CHECK REQUIRED"}
                  </Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">General Ledger Balance (2010_ACCOUNTS_PAYABLE):</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(reconciliation?.subledgerReconciliation?.accountsPayable?.glAccountBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sum of All Supplier Outstanding Balances:</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(reconciliation?.subledgerReconciliation?.accountsPayable?.supplierSubledgerTotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <span className="text-slate-600">Discrepancy / Variance:</span>
                    <span className="text-emerald-600">
                      ₹{(reconciliation?.subledgerReconciliation?.accountsPayable?.difference || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
