"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  RefreshCw, 
  LogOut,
  Clock,
  Ban
} from "lucide-react";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PlatformAdminDashboardPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalTenants: 0,
    activePaidSubscriptions: 0,
    trialingSubscriptions: 0,
    suspendedTenants: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const fetchTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = `/api/admin/tenants?status=${filterStatus}&search=${encodeURIComponent(searchTerm)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTenants(data.tenants || []);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load platform tenants:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleExtendTrial = async (tenantId: string) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendTrialDays: 14 }),
      });
      if (res.ok) {
        alert("Trial extended by 14 days successfully.");
        fetchTenants();
      }
    } catch (err) {
      console.error("Failed to extend trial:", err);
    }
  };

  const handleToggleActive = async (tenantId: string, currentActive: boolean) => {
    if (!confirm(`Are you sure you want to ${currentActive ? "suspend" : "reactivate"} this tenant?`)) return;
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        fetchTenants();
      }
    } catch (err) {
      console.error("Failed to toggle tenant status:", err);
    }
  };

  const handleUpgradePlan = async (tenantId: string, planCode: string) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode, subscriptionStatus: "ACTIVE" }),
      });
      if (res.ok) {
        alert(`Plan updated to ${planCode} (Active) successfully.`);
        fetchTenants();
      }
    } catch (err) {
      console.error("Failed to upgrade plan:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-lg">
              E
            </div>
            <div>
              <span className="font-bold text-white text-base">Elvora Platform Console</span>
              <span className="ml-2 text-xs text-blue-400 font-mono bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                Operations & Subscriptions
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">Master Super Admin</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <LogOut className="h-4 w-4" /> Exit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Security & Privacy Boundary Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-900/60 bg-blue-950/40 p-4 text-xs text-blue-300">
          <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-white">Strict Financial Privacy Boundary Active:</strong>
            <p className="mt-0.5 text-blue-300/80">
              Platform administration is restricted to business account status, plan tiers, and subscription management. By design, private customer invoices, line item profits, and confidential bank balances are strictly hidden from platform administrators to protect business confidentiality.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Total Workspaces</span>
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-white">{stats.totalTenants}</p>
            <span className="text-xs text-slate-500">Registered businesses</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Paid Subscriptions</span>
              <CreditCard className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-emerald-400">{stats.activePaidSubscriptions}</p>
            <span className="text-xs text-slate-500">Starter, Growth, Enterprise</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Active Free Trials</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-amber-400">{stats.trialingSubscriptions}</p>
            <span className="text-xs text-slate-500">14-day evaluation period</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Suspended Workspaces</span>
              <Ban className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-rose-400">{stats.suspendedTenants}</p>
            <span className="text-xs text-slate-500">Terms / abuse holds</span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search business name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTenants()}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <Button size="sm" onClick={fetchTenants} className="bg-blue-600 hover:bg-blue-700 text-white">
              Search
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Subscription Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="TRIALING">Trialing</option>
              <option value="ACTIVE">Active (Paid)</option>
              <option value="EXPIRED">Expired</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELED">Canceled</option>
            </select>
            <Button variant="outline" size="sm" onClick={fetchTenants} className="border-slate-700 text-slate-300">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Tenant Workspaces Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Tenant Workspaces & Subscription Health</h3>
            <span className="text-xs text-slate-400">{tenants.length} accounts listed</span>
          </div>

          <TableContainer>
            <Table>
              <TableHeader className="bg-slate-800/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Business / Workspace</TableHead>
                  <TableHead className="text-slate-400">Owner Contact</TableHead>
                  <TableHead className="text-slate-400">Jurisdiction / GSTIN</TableHead>
                  <TableHead className="text-slate-400">Current Plan</TableHead>
                  <TableHead className="text-slate-400">Subscription Status</TableHead>
                  <TableHead className="text-slate-400">Account Health</TableHead>
                  <TableHead className="text-right text-slate-400">Platform Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Loading business workspaces...
                    </TableCell>
                  </TableRow>
                ) : tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No tenant workspaces found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((t) => (
                    <TableRow key={t.id} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell>
                        <div className="font-bold text-white text-xs">{t.legalName}</div>
                        <div className="text-[11px] text-slate-400">{t.tradeName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-slate-200">{t.owner?.name}</div>
                        <div className="text-[11px] text-slate-500">{t.owner?.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs text-slate-300">{t.gstin}</div>
                        <div className="text-[11px] text-slate-500">State: {t.stateCode}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info" size="sm">
                          {t.subscription?.plan?.name || "Trial"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            t.subscription?.status === "ACTIVE"
                              ? "success"
                              : t.subscription?.status === "TRIALING"
                              ? "warning"
                              : "danger"
                          }
                          size="sm"
                        >
                          {t.subscription?.status || "TRIALING"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.isActive ? "success" : "danger"} size="sm">
                          {t.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleExtendTrial(t.id)}
                            title="Extend Trial by 14 days"
                            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition"
                          >
                            +14d Trial
                          </button>
                          <button
                            onClick={() => handleUpgradePlan(t.id, "GROWTH")}
                            title="Upgrade to Growth Plan"
                            className="rounded-lg bg-blue-900/80 hover:bg-blue-800 px-2.5 py-1 text-[11px] font-semibold text-blue-200 transition"
                          >
                            Set Growth
                          </button>
                          <button
                            onClick={() => handleToggleActive(t.id, t.isActive)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                              t.isActive
                                ? "bg-rose-950/80 text-rose-300 hover:bg-rose-900"
                                : "bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900"
                            }`}
                          >
                            {t.isActive ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </main>
    </div>
  );
}
