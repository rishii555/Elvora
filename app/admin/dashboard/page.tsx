"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  ShieldCheck, 
  RefreshCw, 
  LogOut,
  Clock,
  Ban,
  CheckCircle2,
  XCircle,
  Search,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PlatformAdminDashboardPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Modal / Rejection state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  const fetchRegistrations = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = `/api/admin/registrations?status=${filterStatus}&search=${encodeURIComponent(searchTerm)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRegistrations(data.registrations || []);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load platform registrations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleAction = async (tenantId: string, action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE", reason?: string) => {
    setActionInProgress(tenantId);
    try {
      const res = await fetch(`/api/admin/registrations/${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchRegistrations();
      } else {
        alert(data.error || "Action failed to execute.");
      }
    } catch (err) {
      console.error(`Failed to execute ${action}:`, err);
    } finally {
      setActionInProgress(null);
      setRejectModalOpen(false);
      setSelectedTenant(null);
      setRejectionReasonInput("");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    document.cookie = "elvora_platform_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    window.location.replace("/admin/login");
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
                Registration Approvals & Workspaces
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">Master Super Admin</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Security & Financial Privacy Boundary Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-900/60 bg-blue-950/40 p-4 text-xs text-blue-300">
          <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-white">Registration Review & Account Security Governance:</strong>
            <p className="mt-0.5 text-blue-300/80">
              Only verified platform administrators can approve, reject, or suspend tenant workspaces. Private customer transactions, profit figures, and confidential store bank details are isolated and protected from platform staff.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Pending Review</span>
              <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-amber-400">{stats.pending}</p>
            <span className="text-xs text-slate-500">Awaiting administrator approval</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Approved & Active</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-emerald-400">{stats.approved}</p>
            <span className="text-xs text-slate-500">Authorized SaaS users</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Rejected</span>
              <XCircle className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-rose-400">{stats.rejected}</p>
            <span className="text-xs text-slate-500">Did not meet criteria</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Suspended Workspaces</span>
              <Ban className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-400">{stats.suspended}</p>
            <span className="text-xs text-slate-500">Access holds / locks</span>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `All (${stats.total})` },
              { id: "PENDING", label: `Pending (${stats.pending})` },
              { id: "APPROVED", label: `Approved (${stats.approved})` },
              { id: "REJECTED", label: `Rejected (${stats.rejected})` },
              { id: "SUSPENDED", label: `Suspended (${stats.suspended})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  filterStatus === tab.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search shop, phone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchRegistrations()}
                className="rounded-lg border border-slate-700 bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
              />
            </div>
            <Button size="sm" onClick={fetchRegistrations} className="bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Registrations Management Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-white text-sm">Tenant Registration & Approval Roster</h2>
            <span className="text-xs text-slate-400">Total Records: {registrations.length}</span>
          </div>

          <TableContainer>
            <Table>
              <TableHeader className="bg-slate-800/50">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Business & Owner</TableHead>
                  <TableHead className="text-slate-400">Location & Tax Info</TableHead>
                  <TableHead className="text-slate-400">Registration Date</TableHead>
                  <TableHead className="text-slate-400">Approval Status</TableHead>
                  <TableHead className="text-slate-400">Review Audit</TableHead>
                  <TableHead className="text-right text-slate-400">Administrative Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      Loading registrations...
                    </TableCell>
                  </TableRow>
                ) : registrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      No registrations found under status &apos;{filterStatus}&apos;.
                    </TableCell>
                  </TableRow>
                ) : (
                  registrations.map((reg) => (
                    <TableRow key={reg.id} className="border-slate-800 hover:bg-slate-800/30 transition">
                      {/* Business & Owner */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-bold text-white text-xs">{reg.tradeName}</p>
                          <p className="text-[11px] text-slate-400">Owner: {reg.owner.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {reg.email || reg.owner.email}</span>
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {reg.phone}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Location & Tax Info */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-slate-300">
                          <p className="font-mono text-[11px] text-slate-400">{reg.gstin}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> State: {reg.stateCode} {reg.address ? `• ${reg.address}` : ""}
                          </p>
                        </div>
                      </TableCell>

                      {/* Registration Date */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-slate-400">
                          <p className="text-[11px] font-mono">
                            {new Date(reg.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(reg.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </TableCell>

                      {/* Approval Status Badge */}
                      <TableCell>
                        <Badge
                          variant={
                            reg.approvalStatus === "APPROVED"
                              ? "success"
                              : reg.approvalStatus === "PENDING"
                              ? "warning"
                              : reg.approvalStatus === "REJECTED"
                              ? "danger"
                              : "default"
                          }
                          size="sm"
                        >
                          {reg.approvalStatus || "PENDING"}
                        </Badge>
                      </TableCell>

                      {/* Review Audit */}
                      <TableCell>
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          {reg.reviewedBy ? (
                            <>
                              <p className="text-slate-300 font-medium">By: {reg.reviewedBy}</p>
                              {reg.reviewedAt && (
                                <p className="text-[10px] text-slate-500">
                                  {new Date(reg.reviewedAt).toLocaleDateString("en-IN")}
                                </p>
                              )}
                              {reg.rejectionReason && (
                                <p className="text-[10px] text-rose-400 italic max-w-[150px] truncate" title={reg.rejectionReason}>
                                  Reason: {reg.rejectionReason}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Administrative Actions */}
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {reg.approvalStatus === "PENDING" && (
                            <>
                              <button
                                disabled={actionInProgress === reg.id}
                                onClick={() => handleAction(reg.id, "APPROVE")}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50 cursor-pointer shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                disabled={actionInProgress === reg.id}
                                onClick={() => {
                                  setSelectedTenant(reg);
                                  setRejectModalOpen(true);
                                }}
                                className="rounded-lg bg-rose-600/80 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-600 transition disabled:opacity-50 cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {reg.approvalStatus === "APPROVED" && (
                            <button
                              disabled={actionInProgress === reg.id}
                              onClick={() => {
                                if (confirm(`Suspend workspace for '${reg.tradeName}'? This will immediately revoke dashboard access.`)) {
                                  handleAction(reg.id, "SUSPEND");
                                }
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 transition disabled:opacity-50 cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}

                          {(reg.approvalStatus === "REJECTED" || reg.approvalStatus === "SUSPENDED") && (
                            <button
                              disabled={actionInProgress === reg.id}
                              onClick={() => handleAction(reg.id, "REACTIVATE")}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              Reactivate & Approve
                            </button>
                          )}
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

      {/* Reject Confirmation & Reason Modal */}
      {rejectModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reject Registration</h3>
                <p className="text-xs text-slate-400">
                  Rejecting <span className="font-semibold text-slate-200">{selectedTenant.tradeName}</span> ({selectedTenant.owner.email})
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-300 font-semibold">Optional Rejection Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. Incomplete GST credentials, duplicate store application, or outside business scope..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                The reason will be stored in audit logs and displayed on the applicant&apos;s pending status page.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedTenant(null);
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction(selectedTenant.id, "REJECT", rejectionReasonInput)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
