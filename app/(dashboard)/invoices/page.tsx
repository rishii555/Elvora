"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Search,
  Printer,
  Eye,
  Plus,
  FileText,
  RotateCcw,
  Ban,
  CheckCircle,
  Clock,
  Sparkles,
  Trash2,
  X,
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
import { TableSkeleton } from "@/components/ui/skeleton";

export interface InvoiceUI {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerGstin: string | null;
  customerState: string;
  placeOfSupply: string | null;
  invoiceDate: string;
  dueDate: string | null;
  invoiceType: string;
  isInterState: boolean;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: string;
  status: "DRAFT" | "FINALIZED" | "CANCELLED";
  cancelReason?: string | null;
  printCount?: number;
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string | null;
    hsnCode: string | null;
    uom: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxableAmount: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
  }>;
}

export default function InvoiceHistoryPage() {
  const { data: invData, isLoading, mutate } = useSWR("/api/invoices");
  const invoices: InvoiceUI[] = useMemo(() => invData?.invoices || [], [invData]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceUI | null>(null);

  // Modals state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Cancellation state
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Credit Note state
  const [creditNoteReason, setCreditNoteReason] = useState("");
  const [returnQty, setReturnQty] = useState<number>(1);
  const [isSubmittingCreditNote, setIsSubmittingCreditNote] = useState(false);

  // Create Invoice Form State
  const [newInvCustomerName, setNewInvCustomerName] = useState("");
  const [newInvCustomerPhone, setNewInvCustomerPhone] = useState("");
  const [newInvCustomerGstin, setNewInvCustomerGstin] = useState("");
  const [newInvCustomerState, setNewInvCustomerState] = useState("09");
  const [newInvBillingAddress, setNewInvBillingAddress] = useState("");
  const [newInvPaymentMode, setNewInvPaymentMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER" | "CREDIT">("CASH");
  const [newInvPaidAmount, setNewInvPaidAmount] = useState("");
  const [newInvStatus, setNewInvStatus] = useState<"FINALIZED" | "DRAFT">("FINALIZED");

  // Line item builder in modal
  const [lineItems, setLineItems] = useState<
    Array<{
      variantId: string;
      name: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      gstRate: number;
      isTaxInclusive: boolean;
    }>
  >([
    {
      variantId: "v-jaq-01",
      name: "Single Lever Basin Mixer",
      sku: "JAQ-MIX-CRM-01",
      quantity: 1,
      unitPrice: 2850,
      discountPercent: 0,
      gstRate: 18,
      isTaxInclusive: false,
    },
  ]);

  // Fetch real invoices from API
  const fetchInvoices = async () => {
    await mutate();
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesQuery =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.customerPhone && inv.customerPhone.includes(searchTerm)) ||
        (inv.customerGstin && inv.customerGstin.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMode = filterMode === "ALL" || inv.paymentMode === filterMode;
      const matchesStatus = filterStatus === "ALL" || inv.status === filterStatus;

      return matchesQuery && matchesMode && matchesStatus;
    });
  }, [invoices, searchTerm, filterMode, filterStatus]);

  // Summary Metrics
  const totalBilled = invoices.filter((i) => i.status !== "CANCELLED").reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalReceived = invoices.filter((i) => i.status !== "CANCELLED").reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalOutstanding = invoices.filter((i) => i.status !== "CANCELLED").reduce((sum, inv) => sum + inv.balanceAmount, 0);

  // Live calculation for create invoice modal
  const liveSummary = useMemo(() => {
    const isInter = newInvCustomerState !== "09";
    const calculatedItems = lineItems.map((item) =>
      calculateInvoiceItem({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        gstRate: item.gstRate,
        isInterState: isInter,
        isTaxInclusive: item.isTaxInclusive,
      })
    );
    return calculateInvoiceSummary({ items: calculatedItems });
  }, [lineItems, newInvCustomerState]);

  // Handle Cancel Invoice
  const handleCancelInvoice = async () => {
    if (!selectedInvoice) return;
    if (!cancelReason.trim()) {
      setCancelError("A valid cancellation reason is required.");
      return;
    }

    setIsSubmittingCancel(true);
    setCancelError("");

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (res.ok) {
        await fetchInvoices();
        setIsCancelModalOpen(false);
        setSelectedInvoice(null);
        setCancelReason("");
      } else {
        const err = await res.json();
        setCancelError(err.error || "Failed to cancel invoice");
      }
    } catch (err: any) {
      setCancelError(err.message || "Network error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Handle Create Credit Note
  const handleCreateCreditNote = async () => {
    if (!selectedInvoice || !selectedInvoice.items.length) return;
    setIsSubmittingCreditNote(true);

    try {
      const firstItem = selectedInvoice.items[0];
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/credit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: creditNoteReason || "Goods return / customer refund",
          items: [
            {
              variantId: firstItem.variantId,
              quantity: Math.min(firstItem.quantity, returnQty),
              unitPrice: firstItem.unitPrice,
            },
          ],
        }),
      });

      if (res.ok) {
        await fetchInvoices();
        setIsCreditNoteModalOpen(false);
        setSelectedInvoice(null);
        setCreditNoteReason("");
      }
    } catch {
      //
    } finally {
      setIsSubmittingCreditNote(false);
    }
  };

  // Handle Create Invoice Submission
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        customerName: newInvCustomerName || "Walk-in Buyer",
        customerPhone: newInvCustomerPhone || undefined,
        customerGstin: newInvCustomerGstin ? newInvCustomerGstin.toUpperCase() : undefined,
        customerStateCode: newInvCustomerState,
        billingAddress: newInvBillingAddress || undefined,
        paymentMode: newInvPaymentMode,
        paidAmount: Number(newInvPaidAmount) || Number(liveSummary.grandTotal),
        status: newInvStatus,
        items: lineItems.map((li) => ({
          variantId: li.variantId,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          discountPercent: li.discountPercent,
          isTaxInclusive: li.isTaxInclusive,
        })),
      };

      await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await mutate();
      setIsCreateModalOpen(false);
    } catch {
      setIsCreateModalOpen(false);
    }
  };

  // Open native browser print / save PDF
  const handleOpenPrintView = (invoiceId: string, format: "a4" | "thermal") => {
    window.open(`/api/invoices/${invoiceId}/print?format=${format}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Brand & Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Elvora Billing
            </span>
            <span className="text-xs text-slate-400 font-mono">GST & Retail Invoices</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Sales Invoices & Billing Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Sequential numbering, verified place of supply, A4/Thermal layouts, controlled cancellations, and credit notes
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/pos">
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 text-xs font-medium">
              Quick Counter POS (F2)
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 font-semibold text-xs shadow-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Sales Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Billed</span>
            <span className="rounded-full bg-blue-50 p-1.5 text-blue-600">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatINR(totalBilled)}</p>
          <span className="text-xs text-slate-400">{invoices.length} total records across financial year</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cash / UPI Received</span>
            <span className="rounded-full bg-emerald-50 p-1.5 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatINR(totalReceived)}</p>
          <span className="text-xs text-slate-400">Settled revenue</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding Receivables</span>
            <span className="rounded-full bg-rose-50 p-1.5 text-rose-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">{formatINR(totalOutstanding)}</p>
          <span className="text-xs text-slate-400">Credit / Udhar balance pending</span>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">GST Statutory Compliance:</strong> CGST/SGST or IGST is split automatically based on place of supply. Line items maintain permanent historical pricing snapshots.
          <span className="block text-[11px] text-blue-700/80 mt-0.5">
            E-invoicing (IRN), e-way bills, and GSTR portal synchronization require authorized NIC/GSP sandbox gateway credentials.
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name, phone, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="FINALIZED">Finalized</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CREDIT">Credit (Udhar)</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice # & Date</TableHead>
              <TableHead>Customer Details</TableHead>
              <TableHead>Place of Supply</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">Grand Total</TableHead>
              <TableHead className="text-center">Payment</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <TableSkeleton rows={4} cols={8} />
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="font-medium text-slate-700">No invoices found matching your criteria</p>
                  <p className="text-xs text-slate-400 mt-1">Generate a new sales bill to get started</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Invoice # & Date */}
                  <TableCell>
                    <div className="font-mono font-bold text-blue-600 text-xs">{inv.invoiceNumber}</div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {inv.printCount !== undefined && inv.printCount > 0 && (
                      <span className="ml-1 text-[10px] text-slate-400">
                        (Printed {inv.printCount}x)
                      </span>
                    )}
                  </TableCell>

                  {/* Customer */}
                  <TableCell>
                    <div className="font-semibold text-slate-900">{inv.customerName}</div>
                    <div className="text-[11px] text-slate-400">
                      {inv.customerPhone && `Ph: ${inv.customerPhone}`}
                      {inv.customerGstin && ` • GSTIN: ${inv.customerGstin}`}
                    </div>
                  </TableCell>

                  {/* Place of Supply */}
                  <TableCell>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {inv.placeOfSupply || `${inv.customerState}-${getStateNameByCode(inv.customerState)}`}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {inv.isInterState ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}
                    </div>
                  </TableCell>

                  {/* Taxable */}
                  <TableCell className="text-right text-xs text-slate-600 font-mono">
                    {formatINR(inv.taxableAmount)}
                  </TableCell>

                  {/* Grand Total */}
                  <TableCell className="text-right">
                    <div className="font-bold text-slate-900 font-mono text-sm">
                      {formatINR(inv.grandTotal)}
                    </div>
                    {inv.balanceAmount > 0 && (
                      <div className="text-[10px] text-rose-600 font-semibold">
                        Due: {formatINR(inv.balanceAmount)}
                      </div>
                    )}
                  </TableCell>

                  {/* Payment */}
                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                      {inv.paymentMode}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        inv.status === "FINALIZED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : inv.status === "DRAFT"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* View / Print modal */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsPreviewModalOpen(true);
                        }}
                        className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                        title="View & Print Invoice"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      {/* Cancel button */}
                      {inv.status === "FINALIZED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setCancelReason("");
                            setCancelError("");
                            setIsCancelModalOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:border-rose-300"
                          title="Controlled Cancellation (Restores Stock)"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Credit Note / Return */}
                      {inv.status === "FINALIZED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setCreditNoteReason("");
                            setReturnQty(1);
                            setIsCreditNoteModalOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600"
                          title="Sales Return & Credit Note"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
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

      {/* Invoice View / Print Modal */}
      <Dialog
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setSelectedInvoice(null);
        }}
        title={`Invoice: ${selectedInvoice?.invoiceNumber || "Details"}`}
      >
        {selectedInvoice && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-slate-500">Customer:</span>
                <p className="font-bold text-slate-900">{selectedInvoice.customerName}</p>
                {selectedInvoice.customerGstin && (
                  <p className="font-mono text-xs text-blue-600">GSTIN: {selectedInvoice.customerGstin}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500">Grand Total:</span>
                <p className="font-mono font-bold text-lg text-slate-900">
                  {formatINR(selectedInvoice.grandTotal)}
                </p>
                <span className="text-[11px] text-slate-400">
                  {selectedInvoice.isInterState ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}
                </span>
              </div>
            </div>

            {/* Line Items List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {selectedInvoice.items.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>{item.productName}</span>
                    <span className="font-mono font-bold">{formatINR(item.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px] mt-1">
                    <span>
                      {item.quantity} {item.uom} x {formatINR(item.unitPrice)} (GST {item.gstRate}%)
                    </span>
                    <span>Taxable: {formatINR(item.taxableAmount)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Print Layout Options */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-900">Print Formats</p>
                <p className="text-[11px] text-blue-700">Choose standard A4 tax invoice or 80mm thermal receipt</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOpenPrintView(selectedInvoice.id, "a4")}
                  className="bg-blue-600 hover:bg-blue-700 font-semibold text-xs"
                >
                  <Printer className="mr-1 h-3.5 w-3.5" /> A4 Invoice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPrintView(selectedInvoice.id, "thermal")}
                  className="border-slate-300 font-semibold text-xs"
                >
                  80mm Thermal
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setSelectedInvoice(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Controlled Cancellation Modal */}
      <Dialog
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedInvoice(null);
        }}
        title="Controlled Invoice Cancellation"
      >
        {selectedInvoice && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800">
              <strong>Warning:</strong> Cancelling invoice <strong>#{selectedInvoice.invoiceNumber}</strong> is an immutable audit event.
              All deducted items will be automatically returned to inventory stock.
            </div>

            {cancelError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700 font-medium">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer cancelled order before dispatch, duplicate punch error"
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setSelectedInvoice(null);
                }}
              >
                Go Back
              </Button>
              <Button
                size="sm"
                onClick={handleCancelInvoice}
                disabled={isSubmittingCancel}
                className="bg-rose-600 hover:bg-rose-700 font-semibold"
              >
                {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation & Restore Stock"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Credit Note / Sales Return Modal */}
      <Dialog
        isOpen={isCreditNoteModalOpen}
        onClose={() => {
          setIsCreditNoteModalOpen(false);
          setSelectedInvoice(null);
        }}
        title="Issue Credit Note / Sales Return"
      >
        {selectedInvoice && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              Issue a sequential Credit Note (CRN-) for invoice <strong>#{selectedInvoice.invoiceNumber}</strong>. Items will be replenished into stock.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Reason</label>
              <Input
                value={creditNoteReason}
                onChange={(e) => setCreditNoteReason(e.target.value)}
                placeholder="e.g. Defective finish, customer exchange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Quantity</label>
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
                  setIsCreditNoteModalOpen(false);
                  setSelectedInvoice(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateCreditNote}
                disabled={isSubmittingCreditNote}
                className="bg-amber-600 hover:bg-amber-700 font-semibold"
              >
                {isSubmittingCreditNote ? "Issuing..." : "Issue Credit Note & Restock"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Create Sales Invoice Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Sales Invoice / Retail Bill"
      >
        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 pt-2">
          {/* Customer Details */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Trade Name *</label>
              <Input
                required
                value={newInvCustomerName}
                onChange={(e) => setNewInvCustomerName(e.target.value)}
                placeholder="e.g. Radha Construction or Walk-in"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Phone</label>
              <Input
                value={newInvCustomerPhone}
                onChange={(e) => setNewInvCustomerPhone(e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer GSTIN (B2B)</label>
              <Input
                value={newInvCustomerGstin}
                onChange={(e) => setNewInvCustomerGstin(e.target.value.toUpperCase())}
                placeholder="15-digit GSTIN (optional for retail)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Place of Supply (POS) *</label>
              <select
                value={newInvCustomerState}
                onChange={(e) => setNewInvCustomerState(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                {Object.entries(INDIAN_GST_STATE_CODES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name} {code === "09" ? "(Intra-State UP)" : "(Inter-State IGST)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing / Delivery Address</label>
              <Input
                value={newInvBillingAddress}
                onChange={(e) => setNewInvBillingAddress(e.target.value)}
                placeholder="Street address, City, PIN"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Line Items & Taxes</span>
              <span className="text-[11px] text-slate-400">
                {newInvCustomerState === "09" ? "Intra-State (CGST + SGST)" : "Inter-State (IGST 18%)"}
              </span>
            </div>

            {lineItems.map((li, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 rounded-xl bg-slate-50 p-2.5 items-center text-xs mb-2">
                <div className="col-span-4">
                  <span className="font-semibold text-slate-800 block truncate">{li.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">{li.sku}</span>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={1}
                    value={li.quantity}
                    onChange={(e) => {
                      const q = parseInt(e.target.value, 10) || 1;
                      setLineItems(lineItems.map((item, i) => (i === idx ? { ...item, quantity: q } : item)));
                    }}
                    className="h-8 text-center"
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={li.unitPrice}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      setLineItems(lineItems.map((item, i) => (i === idx ? { ...item, unitPrice: p } : item)));
                    }}
                    className="h-8"
                    placeholder="Rate"
                  />
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-slate-900">
                  {formatINR(li.quantity * li.unitPrice)}
                </div>
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (lineItems.length > 1) {
                        setLineItems(lineItems.filter((_, i) => i !== idx));
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

          {/* Payment & Settlement */}
          <div className="grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={newInvPaymentMode}
                onChange={(e: any) => setNewInvPaymentMode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CREDIT">Credit (Udhar)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Paid Amount (INR)</label>
              <Input
                type="number"
                value={newInvPaidAmount}
                onChange={(e) => setNewInvPaidAmount(e.target.value)}
                placeholder={`Full: ${liveSummary.grandTotal}`}
              />
            </div>
          </div>

          {/* Totals Summary */}
          <div className="rounded-xl bg-slate-100 p-3 text-xs space-y-1 font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span>{formatINR(Number(liveSummary.taxableAmount))}</span>
            </div>
            {newInvCustomerState === "09" ? (
              <>
                <div className="flex justify-between text-slate-500">
                  <span>CGST Total:</span>
                  <span>{formatINR(Number(liveSummary.cgstTotal))}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>SGST Total:</span>
                  <span>{formatINR(Number(liveSummary.sgstTotal))}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-500">
                <span>IGST Total:</span>
                <span>{formatINR(Number(liveSummary.igstTotal))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>{formatINR(Number(liveSummary.grandTotal))}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                setNewInvStatus("DRAFT");
                handleCreateInvoiceSubmit(e as any);
              }}
              className="text-xs font-semibold"
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={() => setNewInvStatus("FINALIZED")}
              className="bg-blue-600 hover:bg-blue-700 font-semibold text-xs"
            >
              Finalize & Deduct Stock
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
