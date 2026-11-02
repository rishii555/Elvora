"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { 
  BookOpen, 
  Receipt, 
  Scale, 
  ArrowRightLeft, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Building2, 
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ActiveTab = 
  | "COA" 
  | "JOURNAL" 
  | "STATEMENTS" 
  | "LEDGER" 
  | "CASH_BANK" 
  | "RECONCILIATION";

type StatementType = "PL" | "BALANCE_SHEET" | "TRIAL_BALANCE";
type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export default function AccountingDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("COA");
  const [statementType, setStatementType] = useState<StatementType>("PL");

  // Filter states
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("ALL");
  const [accountSearch, setAccountSearch] = useState<string>("");
  const [selectedLedgerAccountCode, setSelectedLedgerAccountCode] = useState<string>("1010_CASH");
  const [journalReferenceType, setJournalReferenceType] = useState<string>("ALL");
  const [journalSearch, setJournalSearch] = useState<string>("");
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);

  // Modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isNewJournalOpen, setIsNewJournalOpen] = useState(false);
  const [isReverseJournalOpen, setIsReverseJournalOpen] = useState(false);
  const [selectedJournalToReverse, setSelectedJournalToReverse] = useState<any>(null);
  const [isContraModalOpen, setIsContraModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Account Form State
  const [newAccountCode, setNewAccountCode] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<AccountType>("ASSET");
  const [newAccountCategory, setNewAccountCategory] = useState("");

  // New Journal Entry Form State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualNarration, setManualNarration] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [journalLines, setJournalLines] = useState<
    Array<{ accountCode: string; debit: number; credit: number; description: string }>
  >([
    { accountCode: "1010_CASH", debit: 0, credit: 0, description: "" },
    { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 0, description: "" },
  ]);

  // Reversal Form State
  const [reversalReason, setReversalReason] = useState("");

  // Contra Transfer Form State
  const [contraFromAccount, setContraFromAccount] = useState("1010_CASH");
  const [contraToAccount, setContraToAccount] = useState("1020_BANK");
  const [contraAmount, setContraAmount] = useState<number>(0);
  const [contraDate, setContraDate] = useState(new Date().toISOString().split("T")[0]);
  const [contraNarration, setContraNarration] = useState("");

  // Fetch Accounts
  const { data: accountsData, mutate: mutateAccounts } = useSWR(
    `/api/accounting/accounts`,
    (url: string) => fetch(url).then((res) => res.json())
  );

  // Fetch Journal Entries
  const journalUrl = useMemo(() => {
    let url = `/api/accounting/journal-entries?limit=50`;
    if (journalReferenceType !== "ALL") url += `&referenceType=${journalReferenceType}`;
    if (journalSearch) url += `&search=${encodeURIComponent(journalSearch)}`;
    return url;
  }, [journalReferenceType, journalSearch]);

  const { data: journalData, mutate: mutateJournals } = useSWR(journalUrl, (url: string) =>
    fetch(url).then((res) => res.json())
  );

  // Fetch Selected Account Ledger
  const { data: ledgerData } = useSWR(
    selectedLedgerAccountCode ? `/api/accounting/ledger?code=${selectedLedgerAccountCode}` : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

  // Fetch Profit & Loss
  const { data: plData, mutate: mutatePL } = useSWR(`/api/accounting/profit-loss`, (url: string) =>
    fetch(url).then((res) => res.json())
  );

  // Fetch Balance Sheet
  const { data: bsData, mutate: mutateBS } = useSWR(`/api/accounting/balance-sheet`, (url: string) =>
    fetch(url).then((res) => res.json())
  );

  // Fetch Trial Balance
  const { data: tbData, mutate: mutateTB } = useSWR(`/api/accounting/trial-balance`, (url: string) =>
    fetch(url).then((res) => res.json())
  );

  // Fetch Cash & Bank
  const { data: cashBankData, mutate: mutateCashBank } = useSWR(
    `/api/accounting/cash-bank`,
    (url: string) => fetch(url).then((res) => res.json())
  );

  // Fetch Reconciliation
  const { data: reconciliationData } = useSWR(
    `/api/accounting/reconciliation`,
    (url: string) => fetch(url).then((res) => res.json())
  );

  const accounts: any[] = useMemo(() => accountsData?.accounts || [], [accountsData?.accounts]);
  const journalEntries: any[] = journalData?.items || [];

  // Filtered accounts for COA view
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesType = accountTypeFilter === "ALL" || acc.type === accountTypeFilter;
      const matchesSearch =
        !accountSearch ||
        acc.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
        acc.code.toLowerCase().includes(accountSearch.toLowerCase()) ||
        (acc.category && acc.category.toLowerCase().includes(accountSearch.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [accounts, accountTypeFilter, accountSearch]);

  // Calculations for manual journal voucher dialog
  const totalJournalDebit = journalLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalJournalCredit = journalLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const journalDiscrepancy = Math.abs(totalJournalDebit - totalJournalCredit);
  const isJournalBalanced = journalDiscrepancy <= 0.01 && totalJournalDebit > 0;

  // Handlers
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newAccountCode,
          name: newAccountName,
          type: newAccountType,
          category: newAccountCategory || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create account");
      }

      setActionSuccess(`Account '${newAccountName}' (${newAccountCode}) created!`);
      setIsAddAccountOpen(false);
      setNewAccountCode("");
      setNewAccountName("");
      setNewAccountCategory("");
      mutateAccounts();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete account '${name}'? This cannot be undone.`)) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/accounting/accounts/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete account");
      }
      setActionSuccess(`Account '${name}' deleted successfully.`);
      mutateAccounts();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJournalBalanced) {
      setActionError("Journal entry must be balanced (Total Debits must equal Total Credits)!");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/accounting/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: manualDate,
          narration: manualNarration,
          referenceId: manualReference || undefined,
          lines: journalLines.map((l) => ({
            accountCode: l.accountCode,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post journal entry");
      }

      setActionSuccess(`Journal voucher #${data.journalEntry.entryNumber} posted successfully!`);
      setIsNewJournalOpen(false);
      setManualNarration("");
      setManualReference("");
      setJournalLines([
        { accountCode: "1010_CASH", debit: 0, credit: 0, description: "" },
        { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 0, description: "" },
      ]);
      mutateJournals();
      mutateAccounts();
      mutateTB();
      mutatePL();
      mutateBS();
      mutateCashBank();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJournalToReverse) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/accounting/journal-entries/${selectedJournalToReverse.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reversalReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reverse journal entry");
      }

      setActionSuccess(`Reversal voucher #${data.journalEntry.entryNumber} posted successfully!`);
      setIsReverseJournalOpen(false);
      setSelectedJournalToReverse(null);
      setReversalReason("");
      mutateJournals();
      mutateAccounts();
      mutateTB();
      mutatePL();
      mutateBS();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContraTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contraAmount <= 0) {
      setActionError("Transfer amount must be greater than zero");
      return;
    }
    if (contraFromAccount === contraToAccount) {
      setActionError("Source and Destination accounts cannot be the same");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/accounting/cash-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountCode: contraFromAccount,
          toAccountCode: contraToAccount,
          amount: contraAmount,
          date: contraDate,
          narration: contraNarration || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record contra transfer");
      }

      setActionSuccess(`Contra transfer of ₹${contraAmount.toFixed(2)} recorded successfully!`);
      setIsContraModalOpen(false);
      setContraAmount(0);
      setContraNarration("");
      mutateCashBank();
      mutateAccounts();
      mutateJournals();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addJournalLine = () => {
    setJournalLines([...journalLines, { accountCode: "1010_CASH", debit: 0, credit: 0, description: "" }]);
  };

  const removeJournalLine = (index: number) => {
    if (journalLines.length <= 2) {
      alert("A journal entry requires at least two lines");
      return;
    }
    setJournalLines(journalLines.filter((_, i) => i !== index));
  };

  const updateJournalLine = (index: number, field: string, value: any) => {
    const updated = [...journalLines];
    updated[index] = { ...updated[index], [field]: value };
    setJournalLines(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Accounting & Financial Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete multi-tenant Chart of Accounts, General Ledger, Journals, and Financial Statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsContraModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            Contra Transfer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddAccountOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Account
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewJournalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            New Journal Voucher
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Action Failed</h4>
            <p className="text-sm mt-0.5">{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 text-sm">
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{actionSuccess}</p>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700 text-sm">
            Dismiss
          </button>
        </div>
      )}

      {/* Quick KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Assets</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(bsData?.report?.assets?.total || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cash, Bank, Debtors & Stock</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Liabilities</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(bsData?.report?.liabilities?.total || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Payables & GST Output</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Net Profit (YTD)</span>
            <div
              className={`p-2 rounded-lg ${
                (plData?.report?.netProfit || 0) >= 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {(plData?.report?.netProfit || 0) >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold ${
                (plData?.report?.netProfit || 0) >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {formatINR(plData?.report?.netProfit || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Margin: {plData?.report?.netMarginPercent || 0}%
            </p>
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
              {formatINR(cashBankData?.report?.totalLiquidFunds || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cash: {formatINR(cashBankData?.report?.totalCashOnHand || 0)} | Bank:{" "}
              {formatINR(cashBankData?.report?.totalBankBalance || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("COA")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "COA"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Chart of Accounts
        </button>

        <button
          onClick={() => setActiveTab("JOURNAL")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "JOURNAL"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Journal Entries
        </button>

        <button
          onClick={() => setActiveTab("STATEMENTS")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "STATEMENTS"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Scale className="w-4 h-4" />
          Financial Statements
        </button>

        <button
          onClick={() => setActiveTab("LEDGER")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "LEDGER"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <FileText className="w-4 h-4" />
          General Ledger (Khata)
        </button>

        <button
          onClick={() => setActiveTab("CASH_BANK")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "CASH_BANK"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Cash & Bank Management
        </button>

        <button
          onClick={() => setActiveTab("RECONCILIATION")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "RECONCILIATION"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Reconciliation & AR/AP
        </button>
      </div>

      {/* TAB 1: CHART OF ACCOUNTS */}
      {activeTab === "COA" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((type) => (
                <button
                  key={type}
                  onClick={() => setAccountTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    accountTypeFilter === type ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search accounts or code..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">Account Code</th>
                    <th className="py-3 px-4 font-medium">Account Name</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium text-right">Balance</th>
                    <th className="py-3 px-4 font-medium text-center">Nature</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No accounts match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const isDrNormal = acc.type === "ASSET" || acc.type === "EXPENSE";
                      const normalNature = isDrNormal ? "Debit" : "Credit";
                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {acc.code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{acc.name}</span>
                              {acc.isSystem ? (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                  SYSTEM
                                </span>
                              ) : (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                  CUSTOM
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                acc.type === "ASSET"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : acc.type === "LIABILITY"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : acc.type === "EQUITY"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : acc.type === "REVENUE"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }
                            >
                              {acc.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {acc.category || "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            <span
                              className={
                                acc.balance > 0
                                  ? "text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              {formatINR(Math.abs(acc.balance))}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">
                              {acc.balance >= 0 ? normalNature : isDrNormal ? "Credit" : "Debit"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-xs text-slate-500 font-mono">
                              {normalNature} (Dr)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedLedgerAccountCode(acc.code);
                                  setActiveTab("LEDGER");
                                }}
                                title="View Account Ledger"
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              {!acc.isSystem && (
                                <button
                                  onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                  title="Delete Custom Account"
                                  className="p-1 text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOURNAL ENTRIES */}
      {activeTab === "JOURNAL" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={journalReferenceType}
                onChange={(e) => setJournalReferenceType(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium"
              >
                <option value="ALL">All Voucher Types</option>
                <option value="MANUAL">Manual Journal</option>
                <option value="SALES_INVOICE">Sales Invoice</option>
                <option value="PURCHASE_INVOICE">Purchase Invoice</option>
                <option value="PAYMENT">Customer Payment</option>
                <option value="EXPENSE">Expense Voucher</option>
                <option value="CREDIT_NOTE">Credit Note (Sales Return)</option>
                <option value="DEBIT_NOTE">Debit Note (Purchase Return)</option>
                <option value="CONTRA">Contra Transfer</option>
                <option value="REVERSAL">Reversal Voucher</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search voucher # or narration..."
                value={journalSearch}
                onChange={(e) => setJournalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="space-y-3">
            {journalEntries.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
                No journal entries recorded. Post a transaction or create a manual journal voucher.
              </div>
            ) : (
              journalEntries.map((entry) => {
                const isExpanded = expandedJournalId === entry.id;
                const totalDr = entry.lines.reduce((s: number, l: any) => s + l.debit, 0);
                const isReversal = entry.referenceType === "REVERSAL";

                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all"
                  >
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedJournalId(isExpanded ? null : entry.id)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {entry.entryNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                isReversal
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : entry.referenceType === "MANUAL"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : entry.referenceType === "CONTRA"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-700"
                              }
                            >
                              {entry.referenceType || "JOURNAL"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(entry.entryDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            • {entry.narration}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs text-slate-400">Total Voucher</span>
                          <div className="font-bold text-slate-900">
                            {formatINR(totalDr)}
                          </div>
                        </div>

                        {!isReversal && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedJournalToReverse(entry);
                              setIsReverseJournalOpen(true);
                            }}
                            className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-600"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reverse
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Line breakdown */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-200 bg-white">
                        <table className="w-full text-xs">
                          <thead className="text-slate-400 font-medium border-b border-slate-100 pb-1">
                            <tr>
                              <th className="text-left pb-2">Account</th>
                              <th className="text-left pb-2">Description</th>
                              <th className="text-right pb-2">Debit (₹)</th>
                              <th className="text-right pb-2">Credit (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {entry.lines.map((l: any) => (
                              <tr key={l.id} className="py-1.5">
                                <td className="py-2">
                                  <span className="font-mono font-medium text-slate-900">
                                    {l.account?.code}
                                  </span>{" "}
                                  <span className="text-slate-500">({l.account?.name})</span>
                                </td>
                                <td className="py-2 text-slate-500">{l.description || "—"}</td>
                                <td className="py-2 text-right font-medium">
                                  {l.debit > 0 ? formatINR(l.debit) : "—"}
                                </td>
                                <td className="py-2 text-right font-medium">
                                  {l.credit > 0 ? formatINR(l.credit) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL STATEMENTS */}
      {activeTab === "STATEMENTS" && (
        <div className="space-y-6">
          <div className="flex border-b border-slate-200 gap-4">
            <button
              onClick={() => setStatementType("PL")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                statementType === "PL"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Profit & Loss Statement
            </button>
            <button
              onClick={() => setStatementType("BALANCE_SHEET")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                statementType === "BALANCE_SHEET"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Balance Sheet
            </button>
            <button
              onClick={() => setStatementType("TRIAL_BALANCE")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                statementType === "TRIAL_BALANCE"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Trial Balance
            </button>
          </div>

          {/* Statement View: Profit & Loss */}
          {statementType === "PL" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Income & Expenditure Statement (P&L)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For Indian Financial Year:{" "}
                    {new Date(plData?.report?.period?.startDate || Date.now()).toLocaleDateString("en-IN")}{" "}
                    to {new Date(plData?.report?.period?.endDate || Date.now()).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Net Profit</span>
                  <div
                    className={`text-xl font-bold ${
                      (plData?.report?.netProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatINR(plData?.report?.netProfit || 0)}
                  </div>
                </div>
              </div>

              {/* 1. Revenue */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg font-semibold text-sm">
                  <span>I. Revenue from Operations</span>
                  <span>{formatINR(plData?.report?.revenue?.totalRevenue || 0)}</span>
                </div>
                <div className="pl-4 pr-2 space-y-1 text-xs">
                  {plData?.report?.revenue?.accounts?.map((acc: any) => (
                    <div key={acc.id} className="flex justify-between py-1 text-slate-600">
                      <span>{acc.name} ({acc.code})</span>
                      <span className="font-mono">{formatINR(acc.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Cost of Goods Sold */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg font-semibold text-sm">
                  <span>II. Cost of Goods Sold (COGS)</span>
                  <span>{formatINR(plData?.report?.costOfGoodsSold?.totalCOGS || 0)}</span>
                </div>
                <div className="pl-4 pr-2 space-y-1 text-xs">
                  {plData?.report?.costOfGoodsSold?.accounts?.map((acc: any) => (
                    <div key={acc.id} className="flex justify-between py-1 text-slate-600">
                      <span>{acc.name} ({acc.code})</span>
                      <span className="font-mono">{formatINR(acc.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gross Profit Summary */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-sm">
                <span>GROSS PROFIT (I - II)</span>
                <span>
                  {formatINR(plData?.report?.grossProfit || 0)} (Margin:{" "}
                  {plData?.report?.grossMarginPercent || 0}%)
                </span>
              </div>

              {/* 3. Operating Expenses */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg font-semibold text-sm">
                  <span>III. Operating & Administrative Expenses</span>
                  <span>{formatINR(plData?.report?.operatingExpenses?.totalExpenses || 0)}</span>
                </div>
                <div className="pl-4 pr-2 space-y-1 text-xs">
                  {plData?.report?.operatingExpenses?.accounts?.map((acc: any) => (
                    <div key={acc.id} className="flex justify-between py-1 text-slate-600">
                      <span>{acc.name} ({acc.code})</span>
                      <span className="font-mono">{formatINR(acc.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Profit Summary */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-base shadow-sm">
                <span>NET PROFIT / (LOSS) FOR THE PERIOD</span>
                <span>{formatINR(plData?.report?.netProfit || 0)}</span>
              </div>
            </div>
          )}

          {/* Statement View: Balance Sheet */}
          {statementType === "BALANCE_SHEET" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Balance Sheet
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    As of: {new Date(bsData?.report?.asOfDate || Date.now()).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div>
                  {bsData?.report?.isBalanced ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                      ✓ Invariant Balanced (Assets = Liabilities + Equity)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                      Discrepancy: ₹{(bsData?.report?.difference || 0).toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Assets */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-emerald-50 text-emerald-900 p-2.5 rounded-lg font-bold text-sm">
                    <span>ASSETS</span>
                    <span>{formatINR(bsData?.report?.assets?.total || 0)}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {bsData?.report?.assets?.accounts?.map((acc: any) => (
                      <div key={acc.id} className="flex justify-between py-1.5 border-b border-slate-100">
                        <div>
                          <span className="font-medium text-slate-900">{acc.name}</span>
                          <span className="text-slate-400 ml-1">({acc.code})</span>
                        </div>
                        <span className="font-mono font-medium">{formatINR(acc.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Liabilities & Equity */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-amber-50 text-amber-900 p-2.5 rounded-lg font-bold text-sm">
                    <span>LIABILITIES</span>
                    <span>{formatINR(bsData?.report?.liabilities?.total || 0)}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {bsData?.report?.liabilities?.accounts?.map((acc: any) => (
                      <div key={acc.id} className="flex justify-between py-1.5 border-b border-slate-100">
                        <div>
                          <span className="font-medium text-slate-900">{acc.name}</span>
                          <span className="text-slate-400 ml-1">({acc.code})</span>
                        </div>
                        <span className="font-mono font-medium">{formatINR(acc.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center bg-purple-50 text-purple-900 p-2.5 rounded-lg font-bold text-sm mt-4">
                    <span>OWNER&apos;S EQUITY & RESERVES</span>
                    <span>{formatINR(bsData?.report?.equity?.total || 0)}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {bsData?.report?.equity?.accounts?.map((acc: any) => (
                      <div key={acc.id} className="flex justify-between py-1.5 border-b border-slate-100">
                        <div>
                          <span className="font-medium text-slate-900">{acc.name}</span>
                          <span className="text-slate-400 ml-1">({acc.code})</span>
                        </div>
                        <span className="font-mono font-medium">{formatINR(acc.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 font-bold text-emerald-600">
                      <span>Current Year Net Earnings (from P&L)</span>
                      <span className="font-mono">{formatINR(bsData?.report?.equity?.currentEarnings || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Check */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm">
                  <span>TOTAL ASSETS</span>
                  <span>{formatINR(bsData?.report?.assets?.total || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm">
                  <span>TOTAL LIABILITIES & EQUITY</span>
                  <span>{formatINR(bsData?.report?.totalLiabilitiesAndEquity || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Statement View: Trial Balance */}
          {statementType === "TRIAL_BALANCE" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">General Ledger Trial Balance</h3>
                  <p className="text-xs text-slate-500">
                    Double-Entry Invariant: Total Debits must equal Total Credits to 0.00
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    tbData?.isBalanced
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-red-50 text-red-700 border-red-300"
                  }
                >
                  {tbData?.isBalanced ? "✓ BALANCED" : `DISCREPANCY ₹${tbData?.difference}`}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase text-slate-400">
                    <tr>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Account Name</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">Debit Balance (₹)</th>
                      <th className="py-2.5 px-4 text-right">Credit Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tbData?.accounts?.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-4 font-mono font-medium">{acc.code}</td>
                        <td className="py-2 px-4 font-medium">{acc.name}</td>
                        <td className="py-2 px-4 text-slate-500">{acc.type}</td>
                        <td className="py-2 px-4 text-right font-mono font-medium">
                          {acc.netDebit > 0 ? formatINR(acc.netDebit) : "—"}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-medium">
                          {acc.netCredit > 0 ? formatINR(acc.netCredit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-4">
                        TOTAL TRIAL BALANCE
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600">
                        {formatINR(tbData?.totalDebits || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600">
                        {formatINR(tbData?.totalCredits || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GENERAL LEDGER (KHATA) */}
      {activeTab === "LEDGER" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Select Account:</label>
              <select
                value={selectedLedgerAccountCode}
                onChange={(e) => setSelectedLedgerAccountCode(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white font-medium"
              >
                {accounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} — {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Current Balance</span>
              <div className="text-lg font-bold text-slate-900">
                {formatINR(ledgerData?.currentBalance || 0)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Narration / Description</th>
                    <th className="py-3 px-4">Voucher Reference</th>
                    <th className="py-3 px-4 text-right">Debit (Dr)</th>
                    <th className="py-3 px-4 text-right">Credit (Cr)</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerData?.ledger?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No transactions recorded for this account.
                      </td>
                    </tr>
                  ) : (
                    ledgerData?.ledger?.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {entry.description}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono">
                          {entry.referenceType || "MANUAL"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-emerald-600">
                          {entry.debit > 0 ? formatINR(entry.debit) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-rose-600">
                          {entry.credit > 0 ? formatINR(entry.credit) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatINR(entry.balanceAfter)}
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

      {/* TAB 5: CASH & BANK MANAGEMENT */}
      {activeTab === "CASH_BANK" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cashBankData?.report?.accounts?.map((acc: any) => (
              <div
                key={acc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-lg ${
                        acc.code.includes("CASH")
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {acc.code.includes("CASH") ? <Wallet className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{acc.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">{acc.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Available Balance</span>
                    <div className="text-xl font-bold text-slate-900">
                      {formatINR(acc.closingBalance)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400">Opening</span>
                    <div className="font-medium text-slate-700">
                      {formatINR(acc.openingBalance)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Receipts (+)</span>
                    <div className="font-medium text-emerald-600">
                      {formatINR(acc.totalReceipts)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Payments (-)</span>
                    <div className="font-medium text-rose-600">
                      {formatINR(acc.totalPayments)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-slate-900">
              Recent Cash & Bank Receipts & Disbursements
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsContraModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              Transfer Between Cash & Bank
            </Button>
          </div>
        </div>
      )}

      {/* TAB 6: RECONCILIATION & AR/AP */}
      {activeTab === "RECONCILIATION" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accounts Receivable */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="font-bold text-sm text-slate-900">
                  Accounts Receivable (Sundry Debtors)
                </h4>
                <Badge
                  variant="outline"
                  className={
                    reconciliationData?.subledgerReconciliation?.accountsReceivable?.isReconciled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-red-50 text-red-700 border-red-300"
                  }
                >
                  {reconciliationData?.subledgerReconciliation?.accountsReceivable?.isReconciled
                    ? "✓ RECONCILED"
                    : "DISCREPANCY"}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">General Ledger Balance (Code 1030)</span>
                  <span className="font-mono font-bold">
                    {formatINR(
                      reconciliationData?.subledgerReconciliation?.accountsReceivable?.glAccountBalance || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Subledger Khata Total</span>
                  <span className="font-mono font-bold">
                    {formatINR(
                      reconciliationData?.subledgerReconciliation?.accountsReceivable?.customerSubledgerTotal || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Variance / Difference</span>
                  <span className="font-mono font-bold text-slate-600">
                    ₹
                    {(
                      reconciliationData?.subledgerReconciliation?.accountsReceivable?.difference || 0
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Accounts Payable */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="font-bold text-sm text-slate-900">
                  Accounts Payable (Sundry Creditors)
                </h4>
                <Badge
                  variant="outline"
                  className={
                    reconciliationData?.subledgerReconciliation?.accountsPayable?.isReconciled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-red-50 text-red-700 border-red-300"
                  }
                >
                  {reconciliationData?.subledgerReconciliation?.accountsPayable?.isReconciled
                    ? "✓ RECONCILED"
                    : "DISCREPANCY"}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">General Ledger Balance (Code 2010)</span>
                  <span className="font-mono font-bold">
                    {formatINR(
                      reconciliationData?.subledgerReconciliation?.accountsPayable?.glAccountBalance || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier Subledger Khata Total</span>
                  <span className="font-mono font-bold">
                    {formatINR(
                      reconciliationData?.subledgerReconciliation?.accountsPayable?.supplierSubledgerTotal || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Variance / Difference</span>
                  <span className="font-mono font-bold text-slate-600">
                    ₹
                    {(
                      reconciliationData?.subledgerReconciliation?.accountsPayable?.difference || 0
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD CUSTOM ACCOUNT */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Create Custom Account</h3>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Account Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5080_MARKETING"
                  value={newAccountCode}
                  onChange={(e) => setNewAccountCode(e.target.value.toUpperCase())}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advertising & Marketing"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Account Type</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                >
                  <option value="ASSET">ASSET (Normal Debit)</option>
                  <option value="LIABILITY">LIABILITY (Normal Credit)</option>
                  <option value="EQUITY">EQUITY (Normal Credit)</option>
                  <option value="REVENUE">REVENUE (Normal Credit)</option>
                  <option value="EXPENSE">EXPENSE (Normal Debit)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Category (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Operating Expenses"
                  value={newAccountCategory}
                  onChange={(e) => setNewAccountCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddAccountOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Save Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW JOURNAL VOUCHER */}
      {isNewJournalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-900">New Journal Voucher</h3>

            <form onSubmit={handleCreateJournalEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Voucher Date</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    External Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cheque #123456"
                    value={manualReference}
                    onChange={(e) => setManualReference(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Narration</label>
                <input
                  type="text"
                  required
                  placeholder="Narration explaining this double-entry voucher..."
                  value={manualNarration}
                  onChange={(e) => setManualNarration(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                />
              </div>

              {/* Journal Lines */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">
                    Accounting Lines (Debit & Credit)
                  </label>
                  <Button type="button" size="sm" variant="outline" onClick={addJournalLine}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
                  </Button>
                </div>

                <div className="space-y-2">
                  {journalLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                      <select
                        value={line.accountCode}
                        onChange={(e) => updateJournalLine(idx, "accountCode", e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs rounded border border-slate-200 bg-white font-mono"
                      >
                        {accounts.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Debit"
                        value={line.debit || ""}
                        onChange={(e) => updateJournalLine(idx, "debit", parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1.5 text-xs rounded border border-slate-200 text-right font-mono"
                      />

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Credit"
                        value={line.credit || ""}
                        onChange={(e) => updateJournalLine(idx, "credit", parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1.5 text-xs rounded border border-slate-200 text-right font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => removeJournalLine(idx)}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Discrepancy Bar */}
              <div
                className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                  isJournalBalanced
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div>
                  <span className="font-bold">Total Debits: ₹{totalJournalDebit.toFixed(2)}</span> |{" "}
                  <span className="font-bold">Total Credits: ₹{totalJournalCredit.toFixed(2)}</span>
                </div>
                <div>
                  {isJournalBalanced ? (
                    <span className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Balanced to ₹0.00
                    </span>
                  ) : (
                    <span className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Discrepancy: ₹{journalDiscrepancy.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsNewJournalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isJournalBalanced || isSubmitting}>
                  {isSubmitting ? "Posting..." : "Post Journal Voucher"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REVERSE JOURNAL VOUCHER */}
      {isReverseJournalOpen && selectedJournalToReverse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              Reverse Voucher #{selectedJournalToReverse.entryNumber}
            </h3>
            <p className="text-xs text-slate-500">
              This will automatically post a mirror-image reversal voucher swapping all debits and credits,
              restoring exact account balances.
            </p>

            <form onSubmit={handleReverseJournal} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Reversal Reason
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Invoice cancelled / incorrect allocation"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsReverseJournalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={isSubmitting}>
                  {isSubmitting ? "Reversing..." : "Confirm Reversal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONTRA TRANSFER (CASH <-> BANK) */}
      {isContraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              Contra Transfer (Cash / Bank)
            </h3>
            <p className="text-xs text-slate-500">
              Transfer funds between Cash in Hand and Bank accounts with full double-entry ledger tracking.
            </p>

            <form onSubmit={handleContraTransfer} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700">Transfer Date</label>
                <input
                  type="date"
                  required
                  value={contraDate}
                  onChange={(e) => setContraDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Source Account (Credit)</label>
                <select
                  value={contraFromAccount}
                  onChange={(e) => setContraFromAccount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white font-mono"
                >
                  {accounts
                    .filter((a) => a.code.includes("CASH") || a.code.includes("BANK"))
                    .map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.name} (Bal: {formatINR(a.balance)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Destination Account (Debit)</label>
                <select
                  value={contraToAccount}
                  onChange={(e) => setContraToAccount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white font-mono"
                >
                  {accounts
                    .filter((a) => a.code.includes("CASH") || a.code.includes("BANK"))
                    .map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.name} (Bal: {formatINR(a.balance)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Transfer Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={contraAmount || ""}
                  onChange={(e) => setContraAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Narration / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash deposit into SBI current account"
                  value={contraNarration}
                  onChange={(e) => setContraNarration(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsContraModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Recording..." : "Record Contra Voucher"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
