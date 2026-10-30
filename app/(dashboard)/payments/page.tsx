"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { 
  Plus,
  Receipt,
  Users
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CustomerDueUI {
  id: string;
  name: string;
  companyName?: string | null;
  phone: string;
  outstandingBalance: number;
}

interface ReceiptUI {
  id: string;
  receiptNo: string;
  date: string;
  customerName: string;
  amount: number;
  mode: string;
  reference?: string;
}

export default function PaymentsPage() {
  const { data, isLoading, mutate } = useSWR<{ customers: any[] }>("/api/customers");

  const customersWithDue: CustomerDueUI[] = useMemo(() => {
    if (!data?.customers || !Array.isArray(data.customers)) return [];
    return data.customers.filter((c: any) => (c.outstandingBalance || 0) > 0);
  }, [data]);

  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDueUI | null>(null);
  const [amountToReceive, setAmountToReceive] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE">("UPI");
  const [referenceNote, setReferenceNote] = useState("Received on counter");
  const [recentReceipts, setRecentReceipts] = useState<ReceiptUI[]>([]);

  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = Number(amountToReceive) || 0;
    if (amount <= 0) return;

    // Record local receipt
    const newReceipt: ReceiptUI = {
      id: `rcpt-${Date.now()}`,
      receiptNo: `RCP-${String(recentReceipts.length + 1).padStart(4, "0")}`,
      date: new Date().toLocaleDateString("en-IN"),
      customerName: selectedCustomer.name,
      amount,
      mode: paymentMode,
      reference: referenceNote,
    };

    setRecentReceipts([newReceipt, ...recentReceipts]);

    mutate();
    setIsCollectModalOpen(false);
    setAmountToReceive("");
  };

  const totalDue = customersWithDue.reduce((acc, c) => acc + c.outstandingBalance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments & Collections</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Record customer counter receipts, bank settlements, and reconcile udhar khata balances
          </p>
        </div>
        <Button
          onClick={() => {
            if (customersWithDue.length > 0) {
              setSelectedCustomer(customersWithDue[0]);
              setIsCollectModalOpen(true);
            }
          }}
          disabled={customersWithDue.length === 0}
          className="bg-blue-600 hover:bg-blue-700 font-bold"
        >
          <Plus className="h-4 w-4 mr-1" /> Receive Payment
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending Customer Dues
          </span>
          <p className="mt-2 text-2xl font-extrabold text-rose-600">{formatINR(totalDue)}</p>
          <span className="text-xs text-slate-400">
            Across {customersWithDue.length} credit client account(s)
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Collections Today
          </span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">
            {formatINR(recentReceipts.reduce((sum, r) => sum + r.amount, 0))}
          </p>
          <span className="text-xs text-slate-400">
            {recentReceipts.length} collection transaction(s) recorded
          </span>
        </div>
      </div>

      {/* Clients with pending dues */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Parties with Outstanding Dues</h3>
        {isLoading && !data ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (
          <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer / Firm Name</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead className="text-right">Outstanding Due</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-xs text-slate-400">
                    Checking customer balances...
                  </TableCell>
                </TableRow>
              ) : customersWithDue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-8 w-8 text-slate-300 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">No Outstanding Customer Dues</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        All customer accounts are clear, or no credit invoices have been billed yet.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customersWithDue.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.companyName || "Direct Client"}</p>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{c.phone}</TableCell>
                    <TableCell className="text-right font-bold text-rose-600">
                      {formatINR(c.outstandingBalance)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setAmountToReceive(String(c.outstandingBalance));
                          setIsCollectModalOpen(true);
                        }}
                      >
                        Receive Dues
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </div>

      {/* Recent Receipts Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Recent Collection Receipts</h3>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Reference / Note</TableHead>
                <TableHead className="text-right">Amount Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    <Receipt className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                    No receipts recorded in this session.
                  </TableCell>
                </TableRow>
              ) : (
                recentReceipts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-semibold text-blue-600">
                      {r.receiptNo}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{r.date}</TableCell>
                    <TableCell className="font-medium text-slate-800 text-xs">
                      {r.customerName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info" size="sm">
                        {r.mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{r.reference}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 text-xs">
                      {formatINR(r.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {/* Collect Payment Modal */}
      {selectedCustomer && (
        <Dialog
          isOpen={isCollectModalOpen}
          onClose={() => setIsCollectModalOpen(false)}
          title={`Receive Payment: ${selectedCustomer.name}`}
          description={`Outstanding balance: ${formatINR(selectedCustomer.outstandingBalance)}`}
          maxWidth="md"
        >
          <form onSubmit={handleCollectPayment} className="space-y-4 text-xs sm:text-sm">
            <Input
              label="Amount to Receive (₹)"
              type="number"
              required
              max={selectedCustomer.outstandingBalance}
              value={amountToReceive}
              onChange={(e) => setAmountToReceive(e.target.value)}
              placeholder="e.g. 5000"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                <option value="CASH">Cash at Counter</option>
                <option value="BANK_TRANSFER">Bank IMPS / NEFT Transfer</option>
                <option value="CHEQUE">Bank Cheque</option>
              </select>
            </div>

            <Input
              label="Reference / Transaction Note"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="e.g. UPI Ref #901248"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsCollectModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                Confirm Receipt
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
