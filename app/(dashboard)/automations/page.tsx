"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bell,
  RefreshCw,
  Plus,
  Play,
  RotateCcw,
  Check,
  X,
  FileText,
  Layers,
  ShieldCheck,
  UserCheck,
  ChevronRight,
} from "lucide-react";

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "rules" | "approvals" | "recurring" | "followups" | "notifications" | "reports" | "history"
  >("overview");

  const [isLoading, setIsLoading] = useState(false);
  const [isCycleRunning, setIsCycleRunning] = useState(false);
  const [cycleResult, setCycleResult] = useState<any>(null);

  // Data states
  const [rules, setRules] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);

  // Dialog / Create states
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // New rule form
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    triggerType: "EVENT",
    eventType: "INVOICE_CREATED",
    actionType: "SEND_NOTIFICATION",
    actionTitle: "New Invoice Notification",
    actionMessage: "Invoice #{invoiceNumber} created for ₹{totalAmount}",
    category: "INVOICES",
    priority: "NORMAL",
  });

  // New recurring form
  const [newRecurring, setNewRecurring] = useState({
    transactionType: "INVOICE",
    title: "",
    frequency: "MONTHLY",
    customerName: "",
    customerPhone: "",
    amount: 1000,
    startDate: new Date().toISOString().split("T")[0],
  });

  // New follow-up form
  const [newFollowup, setNewFollowup] = useState({
    title: "",
    targetType: "CUSTOMER",
    dueDate: new Date().toISOString().split("T")[0],
    notes: "",
    priority: "NORMAL",
  });

  // New scheduled report form
  const [newReport, setNewReport] = useState({
    reportType: "SALES_SUMMARY",
    frequency: "DAILY",
    recipients: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        rulesRes,
        approvalsRes,
        recurringRes,
        followupsRes,
        notificationsRes,
        reportsRes,
        executionsRes,
      ] = await Promise.all([
        fetch("/api/automations/rules").then((r) => r.json()),
        fetch("/api/approvals").then((r) => r.json()),
        fetch("/api/recurring-transactions").then((r) => r.json()),
        fetch("/api/follow-ups").then((r) => r.json()),
        fetch("/api/notifications").then((r) => r.json()),
        fetch("/api/automations/scheduled-reports").then((r) => r.json()),
        fetch("/api/automations/executions?limit=30").then((r) => r.json()),
      ]);

      if (rulesRes.success) setRules(rulesRes.rules || []);
      if (approvalsRes.success) setApprovals(approvalsRes.items || []);
      if (recurringRes.success) setRecurring(recurringRes.items || []);
      if (followupsRes.success) setFollowups(followupsRes.items || []);
      if (notificationsRes.success) {
        setNotifications(notificationsRes.items || []);
        setUnreadCount(notificationsRes.unreadCount || 0);
      }
      if (reportsRes.success) setScheduledReports(reportsRes.schedules || []);
      if (executionsRes.success) setExecutions(executionsRes.items || []);
    } catch (err) {
      console.error("Error loading automation data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run Cycle
  const handleRunCycle = async () => {
    setIsCycleRunning(true);
    setCycleResult(null);
    try {
      const res = await fetch("/api/automations/run", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCycleResult(data.summary);
        loadData();
      }
    } catch (err) {
      console.error("Error running scheduler cycle:", err);
    } finally {
      setIsCycleRunning(false);
    }
  };

  // Rule actions
  const handleToggleRule = async (ruleId: string, current: boolean) => {
    try {
      await fetch(`/api/automations/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !current }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/automations/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRule.name,
          description: newRule.description,
          triggerType: newRule.triggerType,
          eventType: newRule.eventType,
          actionType: newRule.actionType,
          actionConfig: {
            title: newRule.actionTitle,
            message: newRule.actionMessage,
            category: newRule.category,
            priority: newRule.priority,
          },
        }),
      });
      setShowRuleModal(false);
      setNewRule({
        name: "",
        description: "",
        triggerType: "EVENT",
        eventType: "INVOICE_CREATED",
        actionType: "SEND_NOTIFICATION",
        actionTitle: "New Invoice Notification",
        actionMessage: "Invoice #{invoiceNumber} created for ₹{totalAmount}",
        category: "INVOICES",
        priority: "NORMAL",
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Approval decision
  const handleApprovalDecision = async (approvalId: string, decision: "APPROVED" | "REJECTED") => {
    const reason = decision === "REJECTED" ? prompt("Please enter a rejection reason:") : undefined;
    if (decision === "REJECTED" && !reason) return;

    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Approval failed");
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "Approval request failed");
    }
  };

  // Notification actions
  const handleMarkNotificationRead = async (id?: string, all = false) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { id }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Follow-up actions
  const handleCompleteFollowup = async (taskId: string) => {
    try {
      await fetch(`/api/follow-ups/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: true }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle recurring
  const handleToggleRecurring = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/recurring-transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Quick stats
  const activeRulesCount = rules.filter((r) => r.isEnabled).length;
  const pendingApprovalsCount = approvals.filter((a) => a.status === "PENDING").length;
  const activeRecurringCount = recurring.filter((r) => r.isActive).length;
  const pendingFollowupsCount = followups.filter((f) => f.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      {/* Top Banner & Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 p-1.5 text-blue-700">
              <Zap className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Business Automation & Workflow Engine
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Automate recurring transactions, stock thresholds, reminders, approvals, and report delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleRunCycle}
            disabled={isCycleRunning}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <Play className={`h-4 w-4 ${isCycleRunning ? "animate-spin" : ""}`} />
            {isCycleRunning ? "Executing Tasks..." : "Run Scheduler Cycle"}
          </button>
        </div>
      </div>

      {/* Cycle Output Alert Banner if executed */}
      {cycleResult && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Scheduler Cycle Completed in {cycleResult.durationMs}ms
            </div>
            <button
              onClick={() => setCycleResult(null)}
              className="text-xs text-emerald-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
            <div>Events Processed: <strong>{cycleResult.eventsProcessed}</strong></div>
            <div>Rules Triggered: <strong>{cycleResult.rulesExecuted}</strong></div>
            <div>Reminders Sent: <strong>{cycleResult.remindersSent}</strong></div>
            <div>Recurring Generated: <strong>{cycleResult.recurringGenerated}</strong></div>
            <div>Stock Alerts: <strong>{cycleResult.stockAlertsSent}</strong></div>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Active Rules</div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{activeRulesCount}</div>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              of {rules.length} total
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Pending Approvals</div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-amber-600">{pendingApprovalsCount}</div>
            <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Needs review
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Active Recurring</div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-purple-700">{activeRecurringCount}</div>
            <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
              Auto-bills
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Due Follow-ups</div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-indigo-700">{pendingFollowupsCount}</div>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              Tasks
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Unread Alerts</div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-rose-600">{unreadCount}</div>
            <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
              In-app
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto text-sm font-medium">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "rules", label: "Automation Rules", icon: Zap, count: rules.length },
            { id: "approvals", label: "Approvals", icon: ShieldCheck, count: pendingApprovalsCount },
            { id: "recurring", label: "Recurring Transactions", icon: RotateCcw, count: recurring.length },
            { id: "followups", label: "Follow-Up Tasks", icon: UserCheck, count: pendingFollowupsCount },
            { id: "notifications", label: "Notification Feed", icon: Bell, count: unreadCount },
            { id: "reports", label: "Scheduled Reports", icon: FileText, count: scheduledReports.length },
            { id: "history", label: "Execution Log", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      isActive ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Automations Execution Stream */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Recent Workflow Activity</h3>
              <button
                onClick={() => setActiveTab("history")}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                View all logs &rarr;
              </button>
            </div>

            {executions.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No automation executions recorded yet. Click &quot;Run Scheduler Cycle&quot; to test your workflows.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {executions.slice(0, 7).map((exec) => (
                  <div key={exec.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full p-1.5 ${
                          exec.status === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-600"
                            : exec.status === "FAILED"
                            ? "bg-rose-100 text-rose-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {exec.status === "SUCCESS" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : exec.status === "FAILED" ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {exec.rule?.name || exec.eventType || exec.triggerType}
                        </div>
                        <div className="text-xs text-slate-500">
                          {exec.entityType || "SYSTEM"} &bull; {new Date(exec.executedAt).toLocaleTimeString()} ({exec.durationMs}ms)
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        exec.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700"
                          : exec.status === "FAILED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {exec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Approvals & Quick Actions */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Approvals Requiring Action</h3>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {pendingApprovalsCount} Pending
                </span>
              </div>
              {approvals.filter((a) => a.status === "PENDING").length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  All approval requests are up to date.
                </div>
              ) : (
                <div className="space-y-3">
                  {approvals
                    .filter((a) => a.status === "PENDING")
                    .slice(0, 3)
                    .map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                          <span>{item.workflowType.replace(/_/g, " ")}</span>
                          <span className="font-bold text-slate-800">₹{(item.amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {item.entityNumber || item.entityId}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleApprovalDecision(item.id, "APPROVED")}
                            className="flex flex-1 items-center justify-center gap-1 rounded bg-emerald-600 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleApprovalDecision(item.id, "REJECTED")}
                            className="flex flex-1 items-center justify-center gap-1 rounded border border-rose-200 bg-rose-50 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Quick Setup Shortcuts */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-slate-900">Automation Shortcuts</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActiveTab("rules");
                    setShowRuleModal(true);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    New Automation Rule
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab("recurring");
                    setShowRecurringModal(true);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-purple-600" />
                    New Recurring Invoice
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab("reports");
                    setShowReportModal(true);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Schedule Automated Report
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RULES */}
      {activeTab === "rules" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Custom Automation Rules</h3>
              <p className="text-xs text-slate-500">
                Define deterministic event triggers, conditions, and actions.
              </p>
            </div>
            <button
              onClick={() => setShowRuleModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Create Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rule Name</th>
                  <th className="px-4 py-3">Trigger Event</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Total Executions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No automation rules configured yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{rule.name}</div>
                        {rule.description && (
                          <div className="text-xs text-slate-500">{rule.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                          {rule.eventType || rule.triggerType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-blue-700">
                          {rule.actionType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {rule._count?.executions || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            rule.isEnabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {rule.isEnabled ? "ACTIVE" : "PAUSED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleRule(rule.id, rule.isEnabled)}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          {rule.isEnabled ? "Pause" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: APPROVALS */}
      {activeTab === "approvals" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Workflow Approval Inbox</h3>
            <p className="text-xs text-slate-500">
              Segregation of duties enforced: Requesters cannot approve their own submissions.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {approvals.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No approval records found.
              </div>
            ) : (
              approvals.map((item) => (
                <div key={item.id} className="flex flex-col justify-between gap-4 py-4 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        {item.workflowType.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-1 text-base font-bold text-slate-900">
                      {item.entityNumber || item.entityId} &bull; ₹{(item.amount || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Requester: <strong>{item.requesterName || "User"}</strong>
                      {item.approverName && <> &bull; Approver: <strong>{item.approverName}</strong></>}
                      {item.rejectionReason && (
                        <div className="mt-1 text-rose-600">Reason: {item.rejectionReason}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "PENDING" ? (
                      <>
                        <button
                          onClick={() => handleApprovalDecision(item.id, "APPROVED")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleApprovalDecision(item.id, "REJECTED")}
                          className="flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    ) : (
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                          item.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: RECURRING TRANSACTIONS */}
      {activeTab === "recurring" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recurring Sales &amp; Expenses</h3>
              <p className="text-xs text-slate-500">
                Automated monthly subscriptions and regular operating expenses.
              </p>
            </div>
            <button
              onClick={() => setShowRecurringModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" /> New Recurring Setup
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title / Details</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Next Run Date</th>
                  <th className="px-4 py-3">Total Generated</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recurring.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No recurring transactions setup yet.
                    </td>
                  </tr>
                ) : (
                  recurring.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500">
                          {item.customerId ? `Customer ID: ${item.customerId}` : "Direct Payee"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            item.transactionType === "INVOICE"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {item.frequency}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(item.nextRunDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {item.totalGenerated}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {item.isActive ? "ACTIVE" : "PAUSED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleRecurring(item.id, item.isActive)}
                          className="text-xs font-medium text-purple-600 hover:underline"
                        >
                          {item.isActive ? "Pause" : "Resume"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FOLLOW-UPS */}
      {activeTab === "followups" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Customer &amp; Supplier Follow-Ups</h3>
              <p className="text-xs text-slate-500">
                Track overdue invoice collections, commitments, and supplier payment deadlines.
              </p>
            </div>
            <button
              onClick={() => setShowFollowupModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {followups.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No follow-up tasks currently assigned.
              </div>
            ) : (
              followups.map((task) => (
                <div key={task.id} className="flex flex-col justify-between gap-4 py-3 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {task.targetType}
                      </span>
                      <span className="text-xs text-slate-400">
                        Due: <strong>{new Date(task.dueDate).toLocaleDateString()}</strong>
                      </span>
                    </div>
                    <div className="mt-1 font-medium text-slate-900">{task.title}</div>
                    {task.notes && <div className="text-xs text-slate-500">{task.notes}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status !== "COMPLETED" ? (
                      <button
                        onClick={() => handleCompleteFollowup(task.id)}
                        className="flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Check className="h-3 w-3 text-emerald-600" /> Mark Complete
                      </button>
                    ) : (
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        COMPLETED
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Notification Center</h3>
              <p className="text-xs text-slate-500">
                In-app alerts for inventory, payments, approvals, and reminders.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => handleMarkNotificationRead(undefined, true)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No notifications to display.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start justify-between p-3 transition-colors ${
                    !notif.isRead ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <span
                      className={`mt-0.5 rounded-full p-1.5 ${
                        notif.priority === "URGENT"
                          ? "bg-rose-100 text-rose-600"
                          : notif.priority === "HIGH"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {notif.title}
                      </div>
                      <div className="text-xs text-slate-600">{notif.message}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {new Date(notif.createdAt).toLocaleString()} &bull; {notif.category}
                      </div>
                    </div>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkNotificationRead(notif.id)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: SCHEDULED REPORTS */}
      {activeTab === "reports" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Scheduled Automated Reports</h3>
              <p className="text-xs text-slate-500">
                Periodically generate and log business reports.
              </p>
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Schedule Report
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Report Name</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Next Scheduled Run</th>
                  <th className="px-4 py-3">Last Run</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduledReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No automated reports scheduled.
                    </td>
                  </tr>
                ) : (
                  scheduledReports.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.reportType.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.frequency}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                          {item.format}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(item.nextRunDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {item.lastRunDate ? new Date(item.lastRunDate).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            item.isEnabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {item.isEnabled ? "ACTIVE" : "PAUSED"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: EXECUTION LOG */}
      {activeTab === "history" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Deterministic Execution History</h3>
            <p className="text-xs text-slate-500">
              Audit trail of every rule evaluation and background task execution.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Rule / Trigger</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No execution logs found.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(exec.executedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {exec.rule?.name || exec.eventType || exec.triggerType}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {exec.entityType || "N/A"}: {exec.entityId || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">
                        {exec.durationMs}ms
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            exec.status === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-700"
                              : exec.status === "FAILED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {exec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {exec.errorMessage || exec.executionLog || "Executed without error"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE RULE */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Create Automation Rule</h3>
            <form onSubmit={handleCreateRule} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Rule Name</label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  placeholder="e.g. High Value Invoice Alert"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Event Trigger</label>
                <select
                  value={newRule.eventType}
                  onChange={(e) => setNewRule({ ...newRule, eventType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                >
                  <option value="INVOICE_CREATED">Invoice Created</option>
                  <option value="INVOICE_OVERDUE">Invoice Overdue</option>
                  <option value="PAYMENT_RECEIVED">Payment Received</option>
                  <option value="STOCK_LOW">Stock Below Threshold</option>
                  <option value="STOCK_OUT">Stock Out of Stock</option>
                  <option value="PURCHASE_CREATED">Purchase Created</option>
                  <option value="EXPENSE_CREATED">Expense Created</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Action Type</label>
                <select
                  value={newRule.actionType}
                  onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                >
                  <option value="SEND_NOTIFICATION">Send Notification</option>
                  <option value="CREATE_REMINDER">Create Follow-Up Reminder</option>
                  <option value="REQUEST_APPROVAL">Request Approval</option>
                  <option value="CREATE_PURCHASE_DRAFT">Create Smart Reorder Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Action Title</label>
                <input
                  type="text"
                  required
                  value={newRule.actionTitle}
                  onChange={(e) => setNewRule({ ...newRule, actionTitle: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Message Template</label>
                <input
                  type="text"
                  required
                  value={newRule.actionMessage}
                  onChange={(e) => setNewRule({ ...newRule, actionMessage: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE RECURRING */}
      {showRecurringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">New Recurring Transaction</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch("/api/recurring-transactions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    transactionType: newRecurring.transactionType,
                    title: newRecurring.title,
                    frequency: newRecurring.frequency,
                    startDate: newRecurring.startDate,
                    templateData: {
                      customerName: newRecurring.customerName,
                      customerPhone: newRecurring.customerPhone,
                      items: [],
                      totalAmount: newRecurring.amount,
                    },
                  }),
                });
                setShowRecurringModal(false);
                loadData();
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600">Transaction Type</label>
                <select
                  value={newRecurring.transactionType}
                  onChange={(e) => setNewRecurring({ ...newRecurring, transactionType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                >
                  <option value="INVOICE">Sales Invoice</option>
                  <option value="EXPENSE">Operating Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Title</label>
                <input
                  type="text"
                  required
                  value={newRecurring.title}
                  onChange={(e) => setNewRecurring({ ...newRecurring, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  placeholder="e.g. Monthly Maintenance Retainer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Frequency</label>
                <select
                  value={newRecurring.frequency}
                  onChange={(e) => setNewRecurring({ ...newRecurring, frequency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Customer / Payee</label>
                <input
                  type="text"
                  required
                  value={newRecurring.customerName}
                  onChange={(e) => setNewRecurring({ ...newRecurring, customerName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  placeholder="Party Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Start Date</label>
                <input
                  type="date"
                  required
                  value={newRecurring.startDate}
                  onChange={(e) => setNewRecurring({ ...newRecurring, startDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700"
                >
                  Create Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE FOLLOW-UP */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Add Follow-Up Task</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch("/api/follow-ups", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(newFollowup),
                });
                setShowFollowupModal(false);
                loadData();
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600">Task Title</label>
                <input
                  type="text"
                  required
                  value={newFollowup.title}
                  onChange={(e) => setNewFollowup({ ...newFollowup, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  placeholder="e.g. Call customer regarding invoice payment"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Target Type</label>
                <select
                  value={newFollowup.targetType}
                  onChange={(e) => setNewFollowup({ ...newFollowup, targetType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                >
                  <option value="CUSTOMER">Customer Follow-up</option>
                  <option value="SUPPLIER">Supplier Payable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Due Date</label>
                <input
                  type="date"
                  required
                  value={newFollowup.dueDate}
                  onChange={(e) => setNewFollowup({ ...newFollowup, dueDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Notes</label>
                <textarea
                  value={newFollowup.notes}
                  onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFollowupModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SCHEDULED REPORT */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Schedule Automated Report</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch("/api/automations/scheduled-reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reportType: newReport.reportType,
                    frequency: newReport.frequency,
                    recipients: newReport.recipients
                      ? newReport.recipients.split(",").map((s) => s.trim())
                      : [],
                  }),
                });
                setShowReportModal(false);
                loadData();
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600">Report Type</label>
                <select
                  value={newReport.reportType}
                  onChange={(e) => setNewReport({ ...newReport, reportType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                >
                  <option value="SALES_SUMMARY">Daily / Periodic Sales Summary</option>
                  <option value="PURCHASE_SUMMARY">Purchase & Procurement Summary</option>
                  <option value="PROFITABILITY">Profit & Loss Summary</option>
                  <option value="EXPENSES">Operating Expenses</option>
                  <option value="INVENTORY_VALUATION">Inventory Stock Valuation</option>
                  <option value="LOW_STOCK">Critical Low Stock Report</option>
                  <option value="CUSTOMER_OUTSTANDING">Customer Outstanding Aging</option>
                  <option value="SUPPLIER_OUTSTANDING">Supplier Payables Aging</option>
                  <option value="CASH_FLOW">Cash Flow Statement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Frequency</label>
                <select
                  value={newReport.frequency}
                  onChange={(e) => setNewReport({ ...newReport, frequency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
