"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Building2,
  Boxes,
  Truck,
  Users,
  AlertTriangle,
  Info,
  Download,
  ArrowRight,
  ShieldAlert,
  Percent,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AnalyticsTab =
  | "OVERVIEW"
  | "SALES"
  | "PURCHASES"
  | "PROFITABILITY"
  | "INVENTORY"
  | "CUSTOMERS"
  | "CASH_FLOW"
  | "KPIS"
  | "INSIGHTS"
  | "EXPORTS";

type PeriodKey = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export default function BusinessIntelligencePage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("OVERVIEW");
  const [period, setPeriod] = useState<PeriodKey>("monthly");
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // SWR Hooks for Analytics Endpoints
  const { data: overviewData } = useSWR(
    `/api/analytics/overview?period=${period}`,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const { data: salesData } = useSWR(
    activeTab === "SALES" || activeTab === "PROFITABILITY" ? `/api/analytics/sales?period=${period}` : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const { data: purchaseData } = useSWR(
    activeTab === "PURCHASES" ? `/api/analytics/purchases?period=${period}` : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const { data: inventoryData } = useSWR(
    activeTab === "INVENTORY" ? `/api/analytics/inventory?period=${period}` : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const { data: customerData } = useSWR(
    activeTab === "CUSTOMERS" ? `/api/analytics/customers` : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const { data: cashFlowData } = useSWR(
    activeTab === "CASH_FLOW" ? `/api/analytics/cash-flow?period=${period}` : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const { data: kpiData } = useSWR(
    activeTab === "KPIS" ? `/api/analytics/kpis?period=${period}` : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const { data: insightsData } = useSWR(
    `/api/analytics/insights?period=${period}`,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const kpis = overviewData?.kpis;
  const charts = overviewData?.charts;
  const insights = insightsData?.insights || [];

  const handleDownloadReport = async (reportType: string, _label?: string) => {
    setIsExporting(reportType);
    try {
      const res = await fetch(`/api/reports/export?type=${reportType}&period=${period}`);
      if (!res.ok) throw new Error("Failed to generate report export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Intelligence & Analytics Cockpit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-dimensional analytics, deterministic forecasting, margins, and decision intelligence.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
            {(
              [
                { key: "daily", label: "Today" },
                { key: "weekly", label: "7 Days" },
                { key: "monthly", label: "This Month" },
                { key: "quarterly", label: "90 Days" },
                { key: "yearly", label: "FY 2026-27" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  period === p.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadReport("SALES_SUMMARY", "Sales Summary")}
            disabled={isExporting !== null}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-600" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Critical Insights Notification Banner if any critical alert exists */}
      {insights.some((i: any) => i.severity === "CRITICAL" || i.severity === "WARNING") && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-sm">
                Smart Alert: {insights.find((i: any) => i.severity === "CRITICAL" || i.severity === "WARNING")?.title}
              </span>
              <p className="text-xs text-amber-700 mt-0.5">
                {insights.find((i: any) => i.severity === "CRITICAL" || i.severity === "WARNING")?.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("INSIGHTS")}
            className="text-xs font-bold text-amber-800 underline hover:no-underline whitespace-nowrap"
          >
            Review All Insights ({insights.length}) →
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {(
          [
            { key: "OVERVIEW", label: "Executive Cockpit", icon: BarChart3 },
            { key: "SALES", label: "Sales Intelligence", icon: TrendingUp },
            { key: "PURCHASES", label: "Procurement & Vendors", icon: Truck },
            { key: "PROFITABILITY", label: "Profitability & Margins", icon: Percent },
            { key: "INVENTORY", label: "Inventory Intelligence", icon: Boxes },
            { key: "CUSTOMERS", label: "Customer CRM", icon: Users },
            { key: "CASH_FLOW", label: "Cash Flow & Runway", icon: Wallet },
            { key: "KPIS", label: "Business KPIs (10)", icon: Layers },
            { key: "INSIGHTS", label: `Smart Insights (${insights.length})`, icon: Info },
            { key: "EXPORTS", label: "Download Reports", icon: FileSpreadsheet },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === t.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE COCKPIT */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          {/* 12 Primary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Sales</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  {formatINR(kpis?.totalSales?.value || 0)}
                </div>
                <div className="flex items-center gap-1 text-xs mt-1">
                  <span
                    className={`font-semibold flex items-center ${
                      (kpis?.totalSales?.growthPercent || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {(kpis?.totalSales?.growthPercent || 0) >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(kpis?.totalSales?.growthPercent || 0)}%
                  </span>
                  <span className="text-slate-400">vs prior period</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Purchases</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  {formatINR(kpis?.totalPurchases?.value || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">{kpis?.totalSuppliers || 0} active vendors</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Profit</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-emerald-600">
                  {formatINR(kpis?.grossProfit?.value || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Margin: {kpis?.grossProfit?.marginPercent || 0}%</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Net Profit</span>
                <div
                  className={`p-2 rounded-lg ${
                    (kpis?.netProfit?.value || 0) >= 0
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={`text-2xl font-bold ${
                    (kpis?.netProfit?.value || 0) >= 0 ? "text-slate-900" : "text-red-600"
                  }`}
                >
                  {formatINR(kpis?.netProfit?.value || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Margin: {kpis?.netProfit?.marginPercent || 0}%</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Operating Expenses</span>
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  {formatINR(kpis?.totalExpenses?.value || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Overhead & operational</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Receivables (AR)</span>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-amber-600">
                  {formatINR(kpis?.outstandingReceivables || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Pending customer collections</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Payables (AP)</span>
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-purple-600">
                  {formatINR(kpis?.outstandingPayables || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Pending vendor settlements</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Liquid Funds</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  {formatINR(kpis?.totalLiquidFunds || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cash: {formatINR(kpis?.cashBalance || 0)} | Bank: {formatINR(kpis?.bankBalance || 0)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Valuation (Cost)</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  {formatINR(kpis?.inventoryValuationCost || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Retail: {formatINR(kpis?.inventoryValuationRetail || 0)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Low Stock SKUs</span>
                <div className="p-2 rounded-lg bg-red-50 text-red-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-red-600">{kpis?.lowStockCount || 0}</div>
                <p className="text-xs text-slate-500 mt-1">{kpis?.outOfStockCount || 0} completely out of stock</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Customers</span>
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">{kpis?.totalCustomers || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Invoices: {kpis?.invoiceCount || 0}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Registered Vendors</span>
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">{kpis?.totalSuppliers || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Procurement network</p>
              </div>
            </div>
          </div>

          {/* Visual Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales by Category */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Sales by Product Category</h3>
              <div className="space-y-3">
                {charts?.categoryDistribution?.length === 0 ? (
                  <p className="text-xs text-slate-500">No sales categorized in this period.</p>
                ) : (
                  charts?.categoryDistribution?.map((cat: any) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">{cat.name}</span>
                        <span className="font-mono text-slate-500">
                          {formatINR(cat.amount)} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sales by Payment Method */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Collections by Payment Mode</h3>
              <div className="space-y-3">
                {charts?.paymentDistribution?.length === 0 ? (
                  <p className="text-xs text-slate-500">No payment records available.</p>
                ) : (
                  charts?.paymentDistribution?.map((p: any) => (
                    <div key={p.mode} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">{p.mode}</span>
                        <span className="font-mono text-slate-500">
                          {formatINR(p.amount)} ({p.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, p.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expense Distribution */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Expense Category Distribution</h3>
              <div className="space-y-3">
                {charts?.expenseDistribution?.length === 0 ? (
                  <p className="text-xs text-slate-500">No expenses recorded in this period.</p>
                ) : (
                  charts?.expenseDistribution?.map((exp: any) => (
                    <div key={exp.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">{exp.category}</span>
                        <span className="font-mono text-slate-500">
                          {formatINR(exp.amount)} ({exp.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-500 h-2 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, exp.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Top Selling & Top Customers Leaderboards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-900">Top-Selling Products</h3>
                <span className="text-xs text-slate-400">By Gross Turnover</span>
              </div>
              <div className="divide-y divide-slate-100">
                {charts?.topProducts?.map((p: any, idx: number) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 w-4">#{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku || "N/A"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{formatINR(p.revenue)}</span>
                      <p className="text-[10px] text-slate-400">{p.quantity} units sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Customers */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-900">Top Customers</h3>
                <span className="text-xs text-slate-400">By Revenue Contribution</span>
              </div>
              <div className="divide-y divide-slate-100">
                {charts?.topCustomers?.map((c: any, idx: number) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 w-4">#{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.invoicesCount} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{formatINR(c.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES INTELLIGENCE */}
      {activeTab === "SALES" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Gross Sales</span>
              <div className="text-2xl font-bold mt-1">{formatINR(salesData?.summary?.grossSales || 0)}</div>
              <p className="text-xs text-slate-400 mt-0.5">Invoices: {salesData?.summary?.invoiceCount || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Net Sales (After Returns)</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(salesData?.summary?.netSales || 0)}</div>
              <p className="text-xs text-slate-400 mt-0.5">Returns: {formatINR(salesData?.summary?.returnsAmount || 0)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Average Invoice Value (AOV)</span>
              <div className="text-2xl font-bold mt-1">{formatINR(salesData?.summary?.averageInvoiceValue || 0)}</div>
              <p className="text-xs text-slate-400 mt-0.5">Per bill average</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Total Collected</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">{formatINR(salesData?.summary?.collectedAmount || 0)}</div>
              <p className="text-xs text-slate-400 mt-0.5">Outstanding: {formatINR(salesData?.summary?.outstandingAmount || 0)}</p>
            </div>
          </div>

          {/* Top Products Table with Gross Margins */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900">
                Product Sales Velocity & Margin Analysis
              </h3>
              <span className="text-xs text-slate-400">Ranked by Total Revenue</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">SKU / Item</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-right">Units Sold</th>
                    <th className="py-2.5 px-4 text-right">Gross Revenue (₹)</th>
                    <th className="py-2.5 px-4 text-right">Estimated Cost (₹)</th>
                    <th className="py-2.5 px-4 text-right">Gross Profit (₹)</th>
                    <th className="py-2.5 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesData?.topSellingByRevenue?.map((p: any) => (
                    <tr key={p.variantId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <span className="text-slate-400 ml-1.5 font-mono">({p.sku})</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{p.category}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium">{p.quantitySold}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{formatINR(p.revenue)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatINR(p.estimatedCost)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-semibold">{formatINR(p.grossProfit)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{p.marginPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROCUREMENT & VENDORS */}
      {activeTab === "PURCHASES" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Gross Purchases</span>
              <div className="text-2xl font-bold mt-1">{formatINR(purchaseData?.summary?.totalPurchases || 0)}</div>
              <p className="text-xs text-slate-400 mt-0.5">Bills: {purchaseData?.summary?.billCount || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Net Purchases</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">{formatINR(purchaseData?.summary?.netPurchases || 0)}</div>
              <p className="text-xs text-slate-400 mt-0.5">Returns: {formatINR(purchaseData?.summary?.returnsAmount || 0)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Top 3 Vendor Concentration</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {purchaseData?.summary?.supplierConcentrationPercent || 0}%
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Share of total procurement</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Unsettled Vendor Balance</span>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {formatINR(purchaseData?.summary?.balanceAmount || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Paid: {formatINR(purchaseData?.summary?.paidAmount || 0)}</p>
            </div>
          </div>

          {/* Supplier Spend Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900">Supplier Procurement Scorecard</h3>
              <span className="text-xs text-slate-400">Sorted by Volume</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Supplier Name</th>
                    <th className="py-2.5 px-4 text-center">Invoices / Bills</th>
                    <th className="py-2.5 px-4 text-right">Total Procurement Spend (₹)</th>
                    <th className="py-2.5 px-4 text-right">Current Payable Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseData?.topSuppliers?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-4 text-center font-mono">{s.billsCount}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{formatINR(s.totalSpend)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-purple-600 font-semibold">
                        {formatINR(s.currentBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROFITABILITY & MARGINS */}
      {activeTab === "PROFITABILITY" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Profit Waterfall & Margins</h3>
                <p className="text-xs text-slate-500">Gross Turnover down to Net Realized Profit</p>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                Net Margin: {kpis?.netProfit?.marginPercent || 0}%
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 font-semibold text-sm">
                <span>1. Gross Invoiced Revenue</span>
                <span className="font-mono text-slate-900">{formatINR(kpis?.totalSales?.value || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-rose-50/50 text-rose-700 text-sm">
                <span>2. Less: Cost of Goods Sold (Estimated COGS)</span>
                <span className="font-mono">
                  - {formatINR((kpis?.totalSales?.value || 0) - (kpis?.grossProfit?.value || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-sm">
                <span>3. Gross Operating Profit (Margin: {kpis?.grossProfit?.marginPercent || 0}%)</span>
                <span className="font-mono">{formatINR(kpis?.grossProfit?.value || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-rose-50/50 text-rose-700 text-sm">
                <span>4. Less: Operating Overhead & Administrative Expenses</span>
                <span className="font-mono">- {formatINR(kpis?.totalExpenses?.value || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-bold text-base shadow-xs">
                <span>5. Net Realized Profit (Margin: {kpis?.netProfit?.marginPercent || 0}%)</span>
                <span className="font-mono">{formatINR(kpis?.netProfit?.value || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INVENTORY INTELLIGENCE */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Valuation at Cost</span>
              <div className="text-2xl font-bold mt-1">{formatINR(inventoryData?.summary?.totalCostValuation || 0)}</div>
              <p className="text-xs text-slate-400 mt-0.5">Physical Units: {inventoryData?.summary?.totalPhysicalStock || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Valuation at Retail (MRP)</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {formatINR(inventoryData?.summary?.totalRetailValuation || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Markup Margin: {inventoryData?.summary?.potentialGrossMarginPercent || 0}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Inventory Turnover</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {inventoryData?.summary?.inventoryTurnoverRatio || 0}x
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Days to Sell (DSI): {inventoryData?.summary?.daysToSellInventory || 0} days
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Critical Reorder SKUs</span>
              <div className="text-2xl font-bold text-red-600 mt-1">{inventoryData?.summary?.lowStockCount || 0}</div>
              <p className="text-xs text-slate-400 mt-0.5">{inventoryData?.summary?.outOfStockCount || 0} completely zero</p>
            </div>
          </div>

          {/* Replenishment Alerts Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Smart Stock Replenishment Suggestions</h3>
                <p className="text-xs text-slate-500">Calculated based on sales run-rate and configured safety stock threshold</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Item Name / SKU</th>
                    <th className="py-2.5 px-4 text-center">Current Stock</th>
                    <th className="py-2.5 px-4 text-center">Threshold</th>
                    <th className="py-2.5 px-4 text-center">Period Velocity</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Suggested Reorder Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryData?.replenishmentAlerts?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        All SKUs are operating within healthy safety stock thresholds.
                      </td>
                    </tr>
                  ) : (
                    inventoryData?.replenishmentAlerts?.map((item: any) => (
                      <tr key={item.variantId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          <span className="text-slate-400 ml-1.5 font-mono">({item.sku})</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-red-600">{item.currentStock}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-500">{item.minStockAlert}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{item.unitsSoldInPeriod} sold</td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={
                              item.status === "OUT_OF_STOCK"
                                ? "bg-red-50 text-red-700 border-red-300"
                                : "bg-amber-50 text-amber-700 border-amber-300"
                            }
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                          +{item.suggestedReorderQuantity} units
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CUSTOMER CRM */}
      {activeTab === "CUSTOMERS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-center">
              <span className="text-xs text-purple-700 font-medium">High Value</span>
              <div className="text-xl font-bold text-purple-900 mt-1">
                {customerData?.segmentsCount?.HIGH_VALUE || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-xs text-blue-700 font-medium">Regular</span>
              <div className="text-xl font-bold text-blue-900 mt-1">
                {customerData?.segmentsCount?.REGULAR || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-xs text-emerald-700 font-medium">New Customers</span>
              <div className="text-xl font-bold text-emerald-900 mt-1">
                {customerData?.segmentsCount?.NEW || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
              <span className="text-xs text-slate-600 font-medium">Inactive (&gt;60d)</span>
              <div className="text-xl font-bold text-slate-800 mt-1">
                {customerData?.segmentsCount?.INACTIVE || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <span className="text-xs text-rose-700 font-medium">High Outstanding</span>
              <div className="text-xl font-bold text-rose-900 mt-1">
                {customerData?.segmentsCount?.HIGH_OUTSTANDING || 0}
              </div>
            </div>
          </div>

          {/* Top Customer Profiles */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Customer Lifetime Value (LTV) Leaderboard</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4 text-center">Orders</th>
                    <th className="py-2.5 px-4 text-right">Lifetime Spend (₹)</th>
                    <th className="py-2.5 px-4 text-right">Average Order (₹)</th>
                    <th className="py-2.5 px-4 text-right">Outstanding (₹)</th>
                    <th className="py-2.5 px-4 text-center">Segment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerData?.topCustomers?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{c.name}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{c.phone}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-medium">{c.orderCount}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{formatINR(c.lifetimeRevenue)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatINR(c.averageOrderValue)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-600">
                        {formatINR(c.outstandingBalance)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {c.segment}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CASH FLOW & FORECAST */}
      {activeTab === "CASH_FLOW" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Current Liquid Funds</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatINR(cashFlowData?.currentPosition?.totalLiquidFunds || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cash: {formatINR(cashFlowData?.currentPosition?.cashOnHand || 0)} | Bank:{" "}
                {formatINR(cashFlowData?.currentPosition?.bankBalance || 0)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Period Receipts (+)</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {formatINR(cashFlowData?.periodFlows?.totalReceipts || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Collections into cash & bank</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Period Disbursements (-)</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {formatINR(cashFlowData?.periodFlows?.totalDisbursements || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Net Flow: {formatINR(cashFlowData?.periodFlows?.netCashFlow || 0)}
              </p>
            </div>
          </div>

          {/* Deterministic Cash Flow Forecasting */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Deterministic Cash Runway & Liquidity Projection
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Transparent forecast based on scheduled invoice receivables, vendor bill due dates, and active liquid balances.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "7-Day Projection", data: cashFlowData?.forecast?.day7 },
                { label: "30-Day Projection", data: cashFlowData?.forecast?.day30 },
                { label: "90-Day Projection", data: cashFlowData?.forecast?.day90 },
              ].map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase text-slate-600">{f.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Until {f.data?.targetDate}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-emerald-600">
                      <span>Projected Inflow</span>
                      <span className="font-mono font-medium">+{formatINR(f.data?.projectedInflow || 0)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Projected Outflow</span>
                      <span className="font-mono font-medium">-{formatINR(f.data?.projectedOutflow || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-slate-200 text-slate-900">
                      <span>Estimated Balance</span>
                      <span className="font-mono">{formatINR(f.data?.estimatedClosingBalance || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: BUSINESS KPIS (10) */}
      {activeTab === "KPIS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kpiData?.kpis?.map((k: any) => (
              <div
                key={k.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{k.name}</span>
                  <Badge
                    variant="outline"
                    className={
                      k.status === "POSITIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : k.status === "NEGATIVE"
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }
                  >
                    {k.status}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {k.unit === "₹" ? formatINR(k.currentValue) : `${k.currentValue}${k.unit}`}
                  </span>
                </div>

                <p className="text-xs text-slate-500">{k.description}</p>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                  Formula: {k.formula}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: SMART INSIGHTS */}
      {activeTab === "INSIGHTS" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {insights.map((item: any) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  item.severity === "CRITICAL"
                    ? "bg-red-50/70 border-red-200 text-red-900"
                    : item.severity === "WARNING"
                    ? "bg-amber-50/70 border-amber-200 text-amber-900"
                    : "bg-blue-50/70 border-blue-200 text-blue-900"
                }`}
              >
                <div className="flex items-start gap-3">
                  {item.severity === "CRITICAL" ? (
                    <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : item.severity === "WARNING" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{item.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.metric}
                      </Badge>
                    </div>
                    <p className="text-xs mt-1">{item.message}</p>
                    <p className="text-[11px] opacity-75 mt-0.5 font-mono">Why: {item.reason}</p>
                  </div>
                </div>

                <a
                  href={item.linkHref}
                  className="inline-flex items-center gap-1 text-xs font-bold underline hover:no-underline whitespace-nowrap"
                >
                  {item.linkText} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 10: DOWNLOAD REPORTS */}
      {activeTab === "EXPORTS" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Enterprise Financial & Operational Reports</h3>
              <p className="text-xs text-slate-500">
                Directly export CSV files with full tenant metadata, calculated totals, and Excel compatibility.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { type: "SALES_SUMMARY", label: "Sales Summary Register", desc: "Detailed line-by-line invoiced sales with GST" },
                { type: "PURCHASE_SUMMARY", label: "Purchase & Vendor Bills", desc: "Vendor invoices, taxes, and balance dues" },
                { type: "PROFITABILITY", label: "Profitability & P&L", desc: "Gross revenue, COGS, OpEx, and Net profit" },
                { type: "EXPENSES", label: "Expense Audit Log", desc: "Categorized business disbursements" },
                { type: "INVENTORY_VALUATION", label: "Inventory Stock Valuation", desc: "All SKUs valued at purchase cost and retail" },
                { type: "STOCK_MOVEMENT", label: "Stock Movement Audit Trail", desc: "Detailed chronological stock ledger" },
                { type: "LOW_STOCK", label: "Low Stock & Reorder Notice", desc: "Items below threshold requiring replenishment" },
                { type: "CUSTOMER_OUTSTANDING", label: "Customer Outstanding Khata", desc: "Sundry debtors balances and credit limits" },
                { type: "SUPPLIER_OUTSTANDING", label: "Supplier Outstanding Khata", desc: "Sundry creditors balances and payables" },
                { type: "CASH_FLOW", label: "Cash Flow Statement", desc: "Receipts, payments, and bank movements" },
                { type: "GENERAL_LEDGER", label: "General Ledger Summary", desc: "Complete Chart of Accounts balance report" },
                { type: "TRIAL_BALANCE", label: "Trial Balance Export", desc: "Trial balance verifying total debits equal credits" },
                { type: "BALANCE_SHEET", label: "Balance Sheet Export", desc: "Assets, liabilities, and retained equity" },
              ].map((rep) => (
                <div
                  key={rep.type}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{rep.label}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{rep.desc}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadReport(rep.type, rep.label)}
                    disabled={isExporting === rep.type}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isExporting === rep.type ? "Generating..." : "Download CSV"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
