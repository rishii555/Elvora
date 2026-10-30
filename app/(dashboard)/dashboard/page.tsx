"use client";

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { 
  Receipt, 
  Boxes, 
  CreditCard, 
  Plus, 
  AlertTriangle, 
  ArrowRight,
  Truck,
  TrendingUp,
  FileText,
  DollarSign,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { DashboardMetricsResult, DateRangeKey } from "@/lib/dashboard/metrics";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "this_month", label: "This Month" },
  { key: "90d", label: "Last 90 Days" },
  { key: "this_year", label: "This Year" },
];

export default function DashboardOverviewPage() {
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const { data, error, isLoading: loading, mutate } = useSWR<DashboardMetricsResult>(
    `/api/dashboard/metrics?range=${dateRange}`
  );
  const fetchMetrics = () => mutate();
  const [activeRecentTab, setActiveRecentTab] = useState<"sales" | "purchases">("sales");

  // Max sales calculation for trend chart scaling
  const maxTrendSale = data?.salesTrend?.length
    ? Math.max(...data.salesTrend.map((t) => t.sales), 1000)
    : 1000;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Live authorized financial indicators, stock levels, and daily revenue movements.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setDateRange(opt.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  dateRange === opt.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1.5"
            title="Refresh metrics"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Quick Action Ribbon */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Actions:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/pos">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Receipt className="mr-1.5 h-3.5 w-3.5" />
                New Invoice (POS)
              </Button>
            </Link>
            <Link href="/inventory">
              <Button size="sm" variant="outline" className="border-slate-300">
                <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Add Product
              </Button>
            </Link>
            <Link href="/purchases">
              <Button size="sm" variant="outline" className="border-slate-300">
                <Truck className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Record Purchase
              </Button>
            </Link>
            <Link href="/expenses">
              <Button size="sm" variant="outline" className="border-slate-300">
                <DollarSign className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Add Expense
              </Button>
            </Link>
            <Link href="/payments">
              <Button size="sm" variant="outline" className="border-slate-300">
                <CreditCard className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Receive Payment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Unable to fetch dashboard metrics</p>
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={fetchMetrics} className="border-rose-300 bg-white text-rose-700 hover:bg-rose-100">
            Try Again
          </Button>
        </div>
      )}

      {/* Summary Cards: 6 Core KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Today's Sales */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today&apos;s Sales</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {loading ? (
              <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h2 className="text-xl font-bold text-slate-900">
                {formatINR(data?.summary?.todaySales || 0)}
              </h2>
            )}
            <p className="mt-1 text-[11px] text-slate-400">Excludes canceled bills</p>
          </div>
        </div>

        {/* 2. Monthly Sales */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Monthly Sales</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {loading ? (
              <div className="h-7 w-28 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h2 className="text-xl font-bold text-slate-900">
                {formatINR(data?.summary?.monthlySales || 0)}
              </h2>
            )}
            <p className="mt-1 text-[11px] text-emerald-600 font-medium">Month-to-date net revenue</p>
          </div>
        </div>

        {/* 3. Invoices Count */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Invoice Count</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {loading ? (
              <div className="h-7 w-16 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h2 className="text-xl font-bold text-slate-900">
                {data?.summary?.invoiceCount || 0}
              </h2>
            )}
            <p className="mt-1 text-[11px] text-slate-400">In selected period</p>
          </div>
        </div>

        {/* 4. Outstanding Receivables */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Receivables</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {loading ? (
              <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h2 className="text-xl font-bold text-amber-700">
                {formatINR(data?.summary?.outstandingReceivables || 0)}
              </h2>
            )}
            <p className="mt-1 text-[11px] text-slate-400">Total customer dues</p>
          </div>
        </div>

        {/* 5. Low-Stock Products */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Low Stock Alert</span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {loading ? (
              <div className="h-7 w-14 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h2 className="text-xl font-bold text-rose-700">
                {data?.summary?.lowStockCount || 0}
              </h2>
            )}
            <p className="mt-1 text-[11px] text-slate-400">Items below threshold</p>
          </div>
        </div>

        {/* 6. Estimated Profit */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Estimated Profit</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {loading ? (
              <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-xl font-bold text-slate-900">
                  {formatINR(data?.summary?.estimatedProfit || 0)}
                </h2>
                <span className="text-[11px] font-semibold text-emerald-600">
                  {data?.summary?.profitMarginPercent || 0}%
                </span>
              </div>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              {data?.summary?.hasIncompleteCostData ? (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 inline" /> Partial cost data
                </span>
              ) : (
                "Taxable revenue - COGS"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Daily Sales Movement Trend</h2>
            <p className="text-xs text-slate-500">
              Aggregated daily gross sales for {data?.dateRange?.label || "selected period"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 inline-block"></span>
              Sales Volume (₹)
            </div>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="mt-6">
          {loading ? (
            <div className="h-56 w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
              Calculating trend aggregations...
            </div>
          ) : !data?.salesTrend?.length || data.salesTrend.every((d) => d.sales === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center p-6">
              <Receipt className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-700">No Sales Recorded In This Period</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                Generate new invoices through the POS Counter to track your revenue velocity and daily trends.
              </p>
              <Link href="/pos" className="mt-3">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Create First Invoice
                </Button>
              </Link>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-end pt-6">
              {/* Bars container */}
              <div className="flex items-end gap-1.5 sm:gap-2.5 h-48 w-full border-b border-slate-200 pb-2 px-1">
                {data.salesTrend.map((point) => {
                  const heightPercent = Math.max(4, Math.round((point.sales / maxTrendSale) * 100));
                  return (
                    <div
                      key={point.date}
                      className="group relative flex-1 flex flex-col items-center h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute -top-12 z-20 hidden -translate-x-1/2 flex-col items-center rounded-md bg-slate-900 px-2.5 py-1 text-center text-[10px] text-white shadow-md group-hover:flex">
                        <span className="font-semibold">{point.formattedDate}</span>
                        <span>{formatINR(point.sales)} ({point.invoiceCount} bills)</span>
                      </div>

                      {/* Bar visual */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          point.sales > 0
                            ? "bg-blue-600 group-hover:bg-blue-700 shadow-sm"
                            : "bg-slate-200 group-hover:bg-slate-300"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels (render subset to prevent crowding on small screens) */}
              <div className="flex justify-between pt-2 text-[10px] text-slate-400">
                <span>{data.salesTrend[0]?.formattedDate}</span>
                {data.salesTrend.length > 10 && (
                  <span>
                    {data.salesTrend[Math.floor(data.salesTrend.length / 2)]?.formattedDate}
                  </span>
                )}
                <span>{data.salesTrend[data.salesTrend.length - 1]?.formattedDate}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Critical Alerts: Low-Stock & Pending Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low-Stock Alert Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-rose-50 p-1.5 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Low Stock Reorder Alerts
                </h3>
                <p className="text-[11px] text-slate-400">Items reaching critical reorder levels</p>
              </div>
            </div>
            <Link href="/inventory" className="text-[11px] font-semibold text-blue-600 hover:underline">
              Manage Stock
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {loading ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
              </div>
            ) : !data?.alerts?.lowStock?.length ? (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                <span>All physical inventory levels are healthy and above reorder limits.</span>
              </div>
            ) : (
              data.alerts.lowStock.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-medium text-slate-900">{item.productName}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.variantName} • SKU: <span className="font-mono">{item.sku}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-600">
                      {item.currentStock} {item.unit}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Alert at ≤ {item.minStockAlert} {item.unit}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Receivables Alert Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-amber-50 p-1.5 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Pending Customer Payments
                </h3>
                <p className="text-[11px] text-slate-400">Outstanding credit balances awaiting clearance</p>
              </div>
            </div>
            <Link href="/payments" className="text-[11px] font-semibold text-blue-600 hover:underline">
              View All Balances
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {loading ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
              </div>
            ) : !data?.alerts?.pendingPayments?.length ? (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                <span>Zero overdue receivables. All sales invoices are cleared.</span>
              </div>
            ) : (
              data.alerts.pendingPayments.slice(0, 4).map((pay) => (
                <div key={pay.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-medium text-slate-900">{pay.customerName}</p>
                    <p className="text-[11px] text-slate-400">
                      Invoice: <span className="font-mono">{pay.invoiceNumber}</span>
                      {pay.daysOverdue > 0 && ` • ${pay.daysOverdue} days open`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-700">
                      {formatINR(pay.balanceAmount)}
                    </span>
                    <Link href={`/payments?invoice=${pay.invoiceNumber}`}>
                      <p className="text-[10px] text-blue-600 hover:underline">Receive Pay</p>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity: Sales Invoices vs Purchase Invoices */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveRecentTab("sales")}
              className={`text-xs font-semibold pb-1 border-b-2 transition-all ${
                activeRecentTab === "sales"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Recent Sales Invoices
            </button>
            <button
              onClick={() => setActiveRecentTab("purchases")}
              className={`text-xs font-semibold pb-1 border-b-2 transition-all ${
                activeRecentTab === "purchases"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Recent Purchase Bills
            </button>
          </div>

          <Link
            href={activeRecentTab === "sales" ? "/invoices" : "/purchases"}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Sales Invoices Table */}
        {activeRecentTab === "sales" && (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-400">
                      Loading recent sales records...
                    </TableCell>
                  </TableRow>
                ) : !data?.recentInvoices?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-500">
                      No sales invoices issued yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentInvoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs font-semibold text-blue-600">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {inv.customerName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline">{inv.paymentMode}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 text-xs">
                        {formatINR(inv.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs">
                        {inv.balanceAmount > 0 ? (
                          <span className="text-amber-700">{formatINR(inv.balanceAmount)}</span>
                        ) : (
                          <span className="text-emerald-600">Paid in Full</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={inv.status === "FINALIZED" ? "success" : "default"}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Purchase Invoices Table */}
        {activeRecentTab === "purchases" && (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill / Challan #</TableHead>
                  <TableHead>Vendor / Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Bill Value</TableHead>
                  <TableHead className="text-center">Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-slate-400">
                      Loading purchase bills...
                    </TableCell>
                  </TableRow>
                ) : !data?.recentPurchases?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-slate-500">
                      No purchase bills recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentPurchases.map((bill) => (
                    <TableRow key={bill.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        {bill.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {bill.supplierName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(bill.invoiceDate).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 text-xs">
                        {formatINR(bill.grandTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            bill.paymentStatus === "PAID"
                              ? "success"
                              : bill.paymentStatus === "PARTIAL"
                              ? "warning"
                              : "default"
                          }
                        >
                          {bill.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>
    </div>
  );
}
