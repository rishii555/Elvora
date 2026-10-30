"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { 
  Plus,
  Receipt,
  Wallet,
  Building2,
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ExpenseItem {
  id: string;
  expenseNumber?: string;
  expenseDate: string;
  category: string;
  payee: string;
  description?: string;
  amount: number;
  paymentMode: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
}

export default function ExpensesCashbookPage() {
  const { data, isLoading, mutate } = useSWR<{ success: boolean; expenses: ExpenseItem[] }>("/api/expenses");
  const expenses = data?.expenses || [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [category, setCategory] = useState("FREIGHT");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE">("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalExpensesMonth = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cashDisbursements = expenses
    .filter((e) => e.paymentMode === "CASH")
    .reduce((sum, e) => sum + e.amount, 0);
  const bankDisbursements = expenses
    .filter((e) => e.paymentMode === "BANK_TRANSFER" || e.paymentMode === "UPI")
    .reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          payee: payee.trim() || description.trim() || "Vendor",
          description: description.trim(),
          amount: Number(amount),
          paymentMode,
        }),
      });

      if (res.ok) {
        await mutate();
      }

      setIsAddModalOpen(false);
      setPayee("");
      setDescription("");
      setAmount("");
    } catch (err) {
      console.error("Error creating expense:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses & Cashbook</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track daily petty cash, tempo delivery freight, and store operating overheads with double-entry ledger posting
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 font-bold">
          <Plus className="h-4 w-4 mr-1" /> Record Expense
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Expenses</span>
            <Receipt className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-rose-600">{formatINR(totalExpensesMonth)}</p>
          <span className="text-xs text-slate-400">Operating overheads & logistics</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cash Disbursements</span>
            <Wallet className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{formatINR(cashDisbursements)}</p>
          <span className="text-xs text-slate-400">Paid from Cash on Hand (1010_CASH)</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bank / UPI Outflow</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-blue-600">{formatINR(bankDisbursements)}</p>
          <span className="text-xs text-slate-400">Paid via Current Account (1020_BANK)</span>
        </div>
      </div>

      {/* Expense History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Recorded Operating Expenses</h3>
          <span className="text-xs text-slate-400">Double-entry ledger auto-posted</span>
        </div>
        {isLoading && !data ? (
          <TableSkeleton rows={5} cols={7} />
        ) : (
          <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payee / Beneficiary</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Disbursement Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-slate-400">
                    Loading expenses...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-slate-400">
                    No operating expenses recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-xs font-mono font-medium text-slate-700">
                      {exp.expenseNumber || "EXP-VCH"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(exp.expenseDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" size="sm">
                        {exp.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {exp.payee}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {exp.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exp.paymentMode === "CASH" ? "warning" : "info"} size="sm">
                        {exp.paymentMode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-600">
                      {formatINR(exp.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </div>

      {/* Add Expense Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Operating Expense"
        description="Enter expense details to post to the General Ledger and disburse from cash or bank"
        maxWidth="md"
      >
        <form onSubmit={handleAddExpense} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category (Ledger Group)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FREIGHT">Freight, Cartage & Logistics (5020_FREIGHT)</option>
              <option value="RENT">Shop / Warehouse Rent (5030_RENT)</option>
              <option value="SALARIES">Staff Salaries & Labor Wages (5040_SALARIES)</option>
              <option value="UTILITIES">Electricity & Broadband Utilities (5050_UTILITIES)</option>
              <option value="OFFICE_SUPPLIES">Office Refreshments & Stationery (5060_ADMIN)</option>
              <option value="MARKETING">Local Signboard & Promotion (5060_ADMIN)</option>
              <option value="MAINTENANCE">Shop Repair & Maintenance (5060_ADMIN)</option>
            </select>
          </div>

          <div>
            <Input
              label="Payee / Beneficiary"
              required
              placeholder="e.g. Shyam Transport / Landlord / Electricity Board"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Expense Description & Narration"
              placeholder="e.g. Tempo freight for Jaquar ceramic delivery to site"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Amount (₹)"
              type="number"
              required
              min="1"
              step="any"
              placeholder="e.g. 1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursed From</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CASH">Counter Cash on Hand (1010_CASH)</option>
              <option value="UPI">Shop UPI (Paytm / PhonePe) (1020_BANK)</option>
              <option value="BANK_TRANSFER">Bank Current Account NetBanking (1020_BANK)</option>
              <option value="CHEQUE">Bank Cheque (1020_BANK)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700">
              {isSubmitting ? "Posting..." : "Post to Ledger"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
