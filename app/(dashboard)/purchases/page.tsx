"use client";

import React, { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  FileText,
  Truck,
  Building2,
  RotateCcw,
  Ban,
  CheckCircle,
  Clock,
  Trash2,
  History,
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
  INDIAN_GST_STATE_CODES,
  getStateNameByCode,
} from "@/lib/finance/decimal";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface PurchaseInvoiceUI {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  supplierId: string;
  supplierName: string;
  supplierCompany?: string | null;
  supplierGstin?: string | null;
  isInterState: boolean;
  subtotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxTotal: number;
  freightAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  status: "RECEIVED" | "CANCELLED";
  cancelReason?: string | null;
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    sku: string | null;
    quantity: number;
    unitCost: number;
    gstRate: number;
    taxAmount: number;
    totalAmount: number;
  }>;
}

export interface SupplierUI {
  id: string;
  name: string;
  companyName?: string | null;
  gstin?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  stateCode: string;
  balance: number;
}

export default function UniversalPurchasesPage() {
  const [activeTab, setActiveTab] = useState<"BILLS" | "SUPPLIERS">("BILLS");
  const { data: pData, isLoading: isLoadingPurchases, mutate: mutatePurchases } = useSWR<{ invoices: any[] }>("/api/purchases");
  const { data: sData, isLoading: isLoadingSuppliers, mutate: mutateSuppliers } = useSWR<{ suppliers: SupplierUI[] }>("/api/suppliers");

  const purchases: PurchaseInvoiceUI[] = useMemo(() => {
    if (!pData?.invoices) return [];
    return pData.invoices.map((inv: any) => ({
      ...inv,
      supplierName: inv.supplier?.name || "Vendor",
      supplierCompany: inv.supplier?.companyName,
      supplierGstin: inv.supplier?.gstin,
    }));
  }, [pData]);

  const suppliers: SupplierUI[] = useMemo(() => {
    return sData?.suppliers || [];
  }, [sData]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState<string>("ALL");

  // Modals state
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Selected entities for modals
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseInvoiceUI | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierUI | null>(null);

  // Statement state
  const [statementData, setStatementData] = useState<any>(null);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

  // Cancellation state
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  // Debit Note state
  const [debitNoteReason, setDebitNoteReason] = useState("");
  const [returnQty, setReturnQty] = useState(1);

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"BANK_TRANSFER" | "UPI" | "CASH" | "CHEQUE">("BANK_TRANSFER");
  const [paymentRef, setPaymentRef] = useState("");

  // New Supplier form state
  const [newSupName, setNewSupName] = useState("");
  const [newSupCompany, setNewSupCompany] = useState("");
  const [newSupGstin, setNewSupGstin] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupAddress, setNewSupAddress] = useState("");
  const [newSupState, setNewSupState] = useState("09");
  const [newSupBalance, setNewSupBalance] = useState("");

  // New Purchase Bill form state
  const [billSupplierId, setBillSupplierId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [billDueDate, setBillDueDate] = useState("");
  const [billFreight, setBillFreight] = useState("0");
  const [billPaidAmount, setBillPaidAmount] = useState("0");
  const [billPaymentMode, setBillPaymentMode] = useState<"BANK_TRANSFER" | "UPI" | "CASH" | "CHEQUE">("BANK_TRANSFER");
  const [billItems, setBillItems] = useState<
    Array<{
      variantId: string;
      name: string;
      sku: string;
      quantity: number;
      unitCost: number;
      discountPercent: number;
      gstRate: number;
    }>
  >([
    {
      variantId: "",
      name: "",
      sku: "",
      quantity: 1,
      unitCost: 0,
      discountPercent: 0,
      gstRate: 18,
    },
  ]);

  useEffect(() => {
    if (suppliers.length > 0 && !billSupplierId) {
      setBillSupplierId(suppliers[0].id);
    }
  }, [suppliers, billSupplierId]);

  const fetchData = async () => {
    await Promise.all([mutatePurchases(), mutateSuppliers()]);
  };

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesSearch =
        p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplierGstin && p.supplierGstin.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPay = filterPayment === "ALL" || p.paymentStatus === filterPayment;
      return matchesSearch && matchesPay;
    });
  }, [purchases, searchTerm, filterPayment]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      return (
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.companyName && s.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.phone.includes(searchTerm) ||
        (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [suppliers, searchTerm]);

  // Summary Metrics
  const totalSpend = purchases.filter((p) => p.status !== "CANCELLED").reduce((sum, p) => sum + p.grandTotal, 0);
  const totalPaid = purchases.filter((p) => p.status !== "CANCELLED").reduce((sum, p) => sum + p.paidAmount, 0);
  const totalPayables = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance), 0);

  // Live calculation for create purchase modal
  const liveBillSummary = useMemo(() => {
    const selectedSup = suppliers.find((s) => s.id === billSupplierId);
    const isInter = selectedSup ? selectedSup.stateCode !== "09" : false;

    const calcItems = billItems.map((it) =>
      calculateInvoiceItem({
        quantity: it.quantity,
        unitPrice: it.unitCost,
        discountPercent: it.discountPercent,
        gstRate: it.gstRate,
        isInterState: isInter,
      })
    );

    const summary = calculateInvoiceSummary({ items: calcItems });
    const freight = parseFloat(billFreight) || 0;
    const grand = Math.round(Number(summary.grandTotal) + freight);

    return {
      subtotal: summary.subtotal,
      taxable: summary.taxableAmount,
      cgst: summary.cgstTotal,
      sgst: summary.sgstTotal,
      igst: summary.igstTotal,
      freight,
      grandTotal: grand,
    };
  }, [billItems, billSupplierId, suppliers, billFreight]);

  // Handle Create Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newSupName,
        companyName: newSupCompany || undefined,
        gstin: newSupGstin ? newSupGstin.toUpperCase() : undefined,
        phone: newSupPhone,
        email: newSupEmail || undefined,
        address: newSupAddress || undefined,
        stateCode: newSupState,
        openingBalance: parseFloat(newSupBalance) || 0,
      };

      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
      }

      setIsNewSupplierOpen(false);
      setNewSupName("");
      setNewSupCompany("");
      setNewSupGstin("");
      setNewSupPhone("");
      setNewSupEmail("");
      setNewSupAddress("");
      setNewSupBalance("");
    } catch {
      setIsNewSupplierOpen(false);
    }
  };

  // Handle Create Purchase Bill
  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        supplierId: billSupplierId || suppliers[0]?.id,
        invoiceNumber: billNumber,
        invoiceDate: billDate,
        dueDate: billDueDate || undefined,
        freightAmount: parseFloat(billFreight) || 0,
        paidAmount: parseFloat(billPaidAmount) || 0,
        paymentMode: billPaymentMode,
        items: billItems.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitCost: it.unitCost,
          discountPercent: it.discountPercent,
          gstRate: it.gstRate,
        })),
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
      }

      setIsNewBillOpen(false);
      setBillNumber("");
      setBillPaidAmount("0");
    } catch {
      setIsNewBillOpen(false);
    }
  };

  // Open Supplier Statement
  const handleOpenStatement = async (supplier: SupplierUI) => {
    setSelectedSupplier(supplier);
    setIsStatementModalOpen(true);
    setIsLoadingStatement(true);

    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/statement`);
      if (res.ok) {
        const data = await res.json();
        setStatementData(data);
      } else {
        setStatementData({
          supplier,
          currentBalance: supplier.balance,
          ledger: [],
        });
      }
    } catch {
      setStatementData(null);
    } finally {
      setIsLoadingStatement(false);
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async () => {
    if (!selectedSupplier && !selectedPurchase) return;
    const supId = selectedPurchase ? selectedPurchase.supplierId : selectedSupplier?.id;

    try {
      const res = await fetch("/api/purchases/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supId,
          purchaseInvoiceId: selectedPurchase?.id,
          amount: parseFloat(paymentAmount) || 0,
          paymentMode,
          referenceNumber: paymentRef || undefined,
        }),
      });

      if (res.ok) {
        await fetchData();
        setIsPaymentModalOpen(false);
        setPaymentAmount("");
        setPaymentRef("");
      }
    } catch {
      setIsPaymentModalOpen(false);
    }
  };

  // Handle Cancel Purchase Bill
  const handleCancelPurchase = async () => {
    if (!selectedPurchase) return;
    if (!cancelReason.trim()) {
      setCancelError("A cancellation reason is required.");
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${selectedPurchase.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (res.ok) {
        await fetchData();
        setIsCancelModalOpen(false);
        setSelectedPurchase(null);
        setCancelReason("");
      } else {
        const err = await res.json();
        setCancelError(err.error || "Failed to cancel bill");
      }
    } catch (err: any) {
      setCancelError(err.message || "Network error");
    }
  };

  // Handle Issue Debit Note
  const handleIssueDebitNote = async () => {
    if (!selectedPurchase || !selectedPurchase.items.length) return;

    try {
      const firstItem = selectedPurchase.items[0];
      const res = await fetch(`/api/purchases/${selectedPurchase.id}/debit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: debitNoteReason || "Goods return to vendor",
          items: [
            {
              variantId: firstItem.variantId,
              quantity: Math.min(firstItem.quantity, returnQty),
              unitCost: firstItem.unitCost,
            },
          ],
        }),
      });

      if (res.ok) {
        await fetchData();
        setIsReturnModalOpen(false);
        setSelectedPurchase(null);
        setDebitNoteReason("");
      }
    } catch {
      setIsReturnModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand & Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              <Truck className="h-3.5 w-3.5 text-blue-600" />
              Elvora Procurement
            </span>
            <span className="text-xs text-slate-400 font-mono">Vendors & Purchases</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Purchases & Supplier Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Vendor bills, stock receipting, debit notes, ledger statements, and payment settlements
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewSupplierOpen(true)}
            className="border-slate-200 text-slate-700 text-xs font-semibold"
          >
            <Building2 className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Add Supplier
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewBillOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 font-semibold text-xs shadow-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Enter Purchase Bill
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Purchases</span>
            <span className="rounded-full bg-blue-50 p-1.5 text-blue-600">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatINR(totalSpend)}</p>
          <span className="text-xs text-slate-400">Total procurement across vendors</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paid to Suppliers</span>
            <span className="rounded-full bg-emerald-50 p-1.5 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatINR(totalPaid)}</p>
          <span className="text-xs text-slate-400">Settled vendor payments</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Payables</span>
            <span className="rounded-full bg-rose-50 p-1.5 text-rose-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">{formatINR(totalPayables)}</p>
          <span className="text-xs text-slate-400">Outstanding balance owed to suppliers</span>
        </div>
      </div>

      {/* View Switcher Tabs & Filters */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("BILLS")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "BILLS"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Purchase Bills ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab("SUPPLIERS")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "SUPPLIERS"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === "BILLS"
                  ? "Search by bill #, supplier name, or GSTIN..."
                  : "Search suppliers by name, phone, or GSTIN..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {activeTab === "BILLS" && (
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Table: Purchase Bills */}
      {activeTab === "BILLS" ? (
        isLoadingPurchases && !pData ? (
          <TableSkeleton rows={5} cols={8} />
        ) : (
          <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill # & Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Tax Type</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-center">Payment Status</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <Truck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">No purchase invoices recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Record a purchase bill to receipt stock and track supplier dues</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((pur) => (
                  <TableRow key={pur.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Bill # & Date */}
                    <TableCell>
                      <div className="font-mono font-bold text-blue-600 text-xs">{pur.invoiceNumber}</div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(pur.invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>

                    {/* Supplier */}
                    <TableCell>
                      <div className="font-semibold text-slate-900">{pur.supplierName}</div>
                      <div className="text-[11px] text-slate-400">
                        {pur.supplierGstin ? `GSTIN: ${pur.supplierGstin}` : "Unregistered Vendor"}
                      </div>
                    </TableCell>

                    {/* Tax Type */}
                    <TableCell>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {pur.isInterState ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}
                      </span>
                      {pur.freightAmount > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Freight: {formatINR(pur.freightAmount)}
                        </div>
                      )}
                    </TableCell>

                    {/* Grand Total */}
                    <TableCell className="text-right font-mono font-bold text-slate-900 text-sm">
                      {formatINR(pur.grandTotal)}
                    </TableCell>

                    {/* Balance Due */}
                    <TableCell className="text-right font-mono text-xs">
                      <span className={pur.balanceAmount > 0 ? "font-bold text-rose-600" : "text-slate-400"}>
                        {formatINR(pur.balanceAmount)}
                      </span>
                    </TableCell>

                    {/* Payment Status */}
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          pur.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : pur.paymentStatus === "PARTIALLY_PAID"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {pur.paymentStatus}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          pur.status === "RECEIVED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-rose-100 text-rose-700 border border-rose-300"
                        }`}
                      >
                        {pur.status}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {pur.status === "RECEIVED" && pur.balanceAmount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPurchase(pur);
                              setPaymentAmount(String(pur.balanceAmount));
                              setIsPaymentModalOpen(true);
                            }}
                            className="h-7 text-xs text-blue-600 font-semibold hover:bg-blue-50"
                          >
                            Pay
                          </Button>
                        )}

                        {pur.status === "RECEIVED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPurchase(pur);
                              setDebitNoteReason("");
                              setReturnQty(1);
                              setIsReturnModalOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600"
                            title="Return to Vendor / Debit Note"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {pur.status === "RECEIVED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPurchase(pur);
                              setCancelReason("");
                              setCancelError("");
                              setIsCancelModalOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:border-rose-300"
                            title="Controlled Bill Cancellation (Reverses Stock)"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )
      ) : (
        /* Main Table: Suppliers Directory */
        isLoadingSuppliers && !sData ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name & Company</TableHead>
                <TableHead>Contact & Phone</TableHead>
                <TableHead>GSTIN & State</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                    <Building2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">No suppliers registered yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first supplier to begin entering purchase orders</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((sup) => (
                  <TableRow key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-slate-900">{sup.name}</div>
                      {sup.companyName && (
                        <div className="text-[11px] text-slate-500">{sup.companyName}</div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-xs text-slate-800">{sup.phone}</div>
                      {sup.email && <div className="text-[11px] text-slate-400">{sup.email}</div>}
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-xs font-semibold text-blue-600">
                        {sup.gstin || "Unregistered"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        State: {getStateNameByCode(sup.stateCode)} ({sup.stateCode})
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div
                        className={`font-mono font-bold text-sm ${
                          sup.balance > 0 ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {formatINR(sup.balance)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {sup.balance > 0 ? "Payable" : "Settled"}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStatement(sup)}
                          className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                        >
                          <History className="mr-1 h-3 w-3" /> Ledger Statement
                        </Button>

                        {sup.balance > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSupplier(sup);
                              setSelectedPurchase(null);
                              setPaymentAmount(String(sup.balance));
                              setIsPaymentModalOpen(true);
                            }}
                            className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold"
                          >
                            Pay Dues
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )
      )}

      {/* Supplier Ledger / Statement Modal */}
      <Dialog
        isOpen={isStatementModalOpen}
        onClose={() => {
          setIsStatementModalOpen(false);
          setSelectedSupplier(null);
          setStatementData(null);
        }}
        title={`Supplier Statement: ${selectedSupplier?.name || "Ledger"}`}
      >
        <div className="space-y-4 pt-2">
          {selectedSupplier && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-900">{selectedSupplier.name}</h4>
                  <p className="text-xs text-slate-500">
                    GSTIN: {selectedSupplier.gstin || "Unregistered"} • Ph: {selectedSupplier.phone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Current Outstanding:</span>
                  <p className="font-mono font-bold text-base text-rose-600">
                    {formatINR(selectedSupplier.balance)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoadingStatement ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading ledger statement...</div>
          ) : !statementData || !statementData.ledger?.length ? (
            <div className="py-8 text-center text-xs text-slate-400">No transactions recorded yet.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {statementData.ledger.map((entry: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-100 bg-white p-2.5 text-xs shadow-2xs space-y-1"
                >
                  <div className="flex justify-between items-center font-semibold">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        entry.credit > 0 ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {entry.type}
                    </span>
                    <span className="font-mono text-slate-400">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-slate-700 font-medium">{entry.description}</div>
                  <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-50 font-mono">
                    <span>
                      {entry.credit > 0 ? `Bill: ${formatINR(entry.credit)}` : `Paid: ${formatINR(entry.debit)}`}
                    </span>
                    <span>Balance: <strong>{formatINR(entry.balanceAfter)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsStatementModalOpen(false);
                setSelectedSupplier(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Record Supplier Payment Modal */}
      <Dialog
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPurchase(null);
          setSelectedSupplier(null);
        }}
        title="Record Supplier Payment"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-500">
            Recording payment to <strong>{selectedPurchase?.supplierName || selectedSupplier?.name}</strong>
            {selectedPurchase && ` against Bill #${selectedPurchase.invoiceNumber}`}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (INR) *</label>
            <Input
              type="number"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e: any) => setPaymentMode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
              <option value="UPI">UPI / QR</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">UTR / Cheque / Reference #</label>
            <Input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g. UTR9876543210"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedPurchase(null);
                setSelectedSupplier(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleRecordPayment} className="bg-blue-600 hover:bg-blue-700 font-semibold">
              Save Payment & Update Ledger
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Return to Vendor / Debit Note Modal */}
      <Dialog
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setSelectedPurchase(null);
        }}
        title="Issue Purchase Return & Debit Note"
      >
        {selectedPurchase && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              Return stock to <strong>{selectedPurchase.supplierName}</strong> against Bill #{selectedPurchase.invoiceNumber}.
              A sequential Debit Note (DBN-) will be issued and inventory decremented.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Reason *</label>
              <Input
                required
                value={debitNoteReason}
                onChange={(e) => setDebitNoteReason(e.target.value)}
                placeholder="e.g. Ceramic glaze chipped, manufacturing defect"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Return</label>
              <Input
                type="number"
                min={1}
                value={returnQty}
                onChange={(e) => setReturnQty(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsReturnModalOpen(false);
                  setSelectedPurchase(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleIssueDebitNote} className="bg-amber-600 hover:bg-amber-700 font-semibold">
                Confirm Return & Issue Debit Note
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Cancel Purchase Bill Modal */}
      <Dialog
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedPurchase(null);
        }}
        title="Controlled Purchase Cancellation"
      >
        {selectedPurchase && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800">
              <strong>Warning:</strong> Cancelling Bill <strong>#{selectedPurchase.invoiceNumber}</strong> reverses all received stock back out of inventory and removes the balance from the supplier&apos;s statement without deleting audit history.
            </div>

            {cancelError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700 font-medium">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cancellation Reason *</label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Duplicate entry made by mistake, order rejected by QC"
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setSelectedPurchase(null);
                }}
              >
                Go Back
              </Button>
              <Button size="sm" onClick={handleCancelPurchase} className="bg-rose-600 hover:bg-rose-700 font-semibold">
                Confirm Cancellation & Reverse Stock
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* New Supplier Modal */}
      <Dialog
        isOpen={isNewSupplierOpen}
        onClose={() => setIsNewSupplierOpen(false)}
        title="Register New Supplier"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Trade Name *</label>
              <Input
                required
                value={newSupName}
                onChange={(e) => setNewSupName(e.target.value)}
                placeholder="e.g. Jaquar Bath Fittings"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name</label>
              <Input
                value={newSupCompany}
                onChange={(e) => setNewSupCompany(e.target.value)}
                placeholder="e.g. Jaquar & Company Pvt Ltd"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier GSTIN</label>
              <Input
                value={newSupGstin}
                onChange={(e) => setNewSupGstin(e.target.value.toUpperCase())}
                placeholder="15-digit GSTIN"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State / GST State Code *</label>
              <select
                value={newSupState}
                onChange={(e) => setNewSupState(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                {Object.entries(INDIAN_GST_STATE_CODES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <Input
                required
                value={newSupPhone}
                onChange={(e) => setNewSupPhone(e.target.value)}
                placeholder="Vendor contact number"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <Input
                type="email"
                value={newSupEmail}
                onChange={(e) => setNewSupEmail(e.target.value)}
                placeholder="orders@vendor.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Plant Location</label>
              <Input
                value={newSupAddress}
                onChange={(e) => setNewSupAddress(e.target.value)}
                placeholder="Factory address, Industrial Area, City"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (INR)</label>
              <Input
                type="number"
                value={newSupBalance}
                onChange={(e) => setNewSupBalance(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsNewSupplierOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 font-semibold">
              Register Supplier
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Enter Purchase Bill Modal */}
      <Dialog
        isOpen={isNewBillOpen}
        onClose={() => setIsNewBillOpen(false)}
        title="Enter Purchase Bill & Receipt Stock"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier *</label>
              <select
                required
                value={billSupplierId}
                onChange={(e) => setBillSupplierId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({getStateNameByCode(s.stateCode)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Invoice # *</label>
              <Input
                required
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. JAQ-INV-9921"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Date *</label>
              <Input
                type="date"
                required
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Items to Receipt</span>
              <span className="text-[11px] text-slate-400">Updates stock and cost prices</span>
            </div>

            {billItems.map((bi, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 rounded-xl bg-slate-50 p-2.5 items-center text-xs mb-2">
                <div className="col-span-4">
                  <span className="font-semibold text-slate-800 block truncate">{bi.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">{bi.sku}</span>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={1}
                    value={bi.quantity}
                    onChange={(e) => {
                      const q = parseInt(e.target.value, 10) || 1;
                      setBillItems(billItems.map((item, i) => (i === idx ? { ...item, quantity: q } : item)));
                    }}
                    className="h-8 text-center"
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={bi.unitCost}
                    onChange={(e) => {
                      const c = parseFloat(e.target.value) || 0;
                      setBillItems(billItems.map((item, i) => (i === idx ? { ...item, unitCost: c } : item)));
                    }}
                    className="h-8"
                    placeholder="Cost"
                  />
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-slate-900">
                  {formatINR(bi.quantity * bi.unitCost)}
                </div>
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (billItems.length > 1) {
                        setBillItems(billItems.filter((_, i) => i !== idx));
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Freight & Payment */}
          <div className="grid gap-3 sm:grid-cols-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Charges (INR)</label>
              <Input
                type="number"
                value={billFreight}
                onChange={(e) => setBillFreight(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Paid on Receipt (INR)</label>
              <Input
                type="number"
                value={billPaidAmount}
                onChange={(e) => setBillPaidAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={billPaymentMode}
                onChange={(e: any) => setBillPaymentMode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="UPI">UPI / QR</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="rounded-xl bg-slate-100 p-3 text-xs space-y-1 font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span>{formatINR(Number(liveBillSummary.taxable))}</span>
            </div>
            {Number(liveBillSummary.cgst) > 0 ? (
              <>
                <div className="flex justify-between text-slate-500">
                  <span>CGST Total:</span>
                  <span>{formatINR(Number(liveBillSummary.cgst))}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>SGST Total:</span>
                  <span>{formatINR(Number(liveBillSummary.sgst))}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-500">
                <span>IGST Total:</span>
                <span>{formatINR(Number(liveBillSummary.igst))}</span>
              </div>
            )}
            {liveBillSummary.freight > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Freight:</span>
                <span>{formatINR(liveBillSummary.freight)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>{formatINR(liveBillSummary.grandTotal)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsNewBillOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 font-semibold text-xs">
              Save Bill & Receipt Inventory
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
