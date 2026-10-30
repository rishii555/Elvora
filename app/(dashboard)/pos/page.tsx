"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import useSWR from "swr";
import { 
  Receipt, 
  Search, 
  Printer, 
  Check, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Eye,
  Package,
  Plus
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { calculateInvoiceItem, calculateInvoiceSummary, InvoiceItemCalculationResult } from "@/lib/finance/decimal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CatalogGridSkeleton } from "@/components/ui/skeleton";

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  uom: string;
  hsnCode: string;
  sellingPrice: number;
  gstRate: number;
  currentStock: number;
}

interface CartLineItem {
  id: string;
  variantId: string;
  name: string;
  sku: string;
  hsnCode: string;
  uom: string;
  unitPrice: number;
  quantity: number;
  discountPercent: number;
  gstRate: number;
}

export default function UniversalPOSBillingPage() {
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerState, setCustomerState] = useState("09"); // 09 = UP
  const [invoiceType, setInvoiceType] = useState<"B2C_RETAIL_BILL" | "B2B_TAX_INVOICE">("B2C_RETAIL_BILL");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CREDIT" | "BANK_TRANSFER">("CASH");

  // Real items from tenant inventory using SWR cache
  const { data: catalogData, isLoading: isLoadingCatalog } = useSWR("/api/inventory?limit=50");
  const catalogItems: InventoryItem[] = catalogData?.items || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<string>("INV-2026-0001");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState<"A4" | "THERMAL">("A4");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (F2 to focus search, F8 to preview/checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "F8") {
        e.preventDefault();
        if (cartItems.length > 0) {
          setIsPreviewOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems.length]);

  const isInterState = customerState !== "09";

  // Calculate live financial numbers using strict Decimal engine
  const calculatedItems: InvoiceItemCalculationResult[] = cartItems.map((item) =>
    calculateInvoiceItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      gstRate: item.gstRate,
      isInterState,
    })
  );

  const summary = calculateInvoiceSummary({
    items: calculatedItems,
  });

  const addItemToCart = (item: InventoryItem) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.variantId === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.variantId === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          variantId: item.id,
          name: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
          sku: item.sku,
          hsnCode: item.hsnCode || "6910",
          uom: item.uom || "PCS",
          unitPrice: item.sellingPrice,
          quantity: 1,
          discountPercent: 0,
          gstRate: item.gstRate || 18,
        },
      ];
    });
    setSearchQuery("");
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartLineItem => item !== null)
    );
  };

  const removeItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredProducts = searchQuery.trim()
    ? catalogItems.filter(
        (p) =>
          p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.barcode && p.barcode.includes(searchQuery)) ||
          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName || "Walk-in Customer",
          customerPhone: customerPhone || undefined,
          customerGstin: customerGstin || undefined,
          customerStateCode: customerState,
          paymentMode,
          paidAmount: paymentMode === "CREDIT" ? 0 : summary.grandTotal,
          status: "FINALIZED",
          items: cartItems.map((ci) => ({
            variantId: ci.variantId,
            quantity: ci.quantity,
            unitPrice: ci.unitPrice,
            discountPercent: ci.discountPercent,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedInvoiceNumber(data.invoice?.invoiceNumber || "INV-NEW");
        setIsPreviewOpen(false);
        setIsSuccessModalOpen(true);
      } else {
        setCheckoutError(data.error || "Failed to generate invoice");
      }
    } catch {
      setCheckoutError("Network error while recording invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewSale = () => {
    setIsSuccessModalOpen(false);
    setCartItems([]);
    setCustomerName("Walk-in Customer");
    setCustomerPhone("");
    setCustomerGstin("");
    setCheckoutError("");
  };

  return (
    <div className="flex flex-col gap-6 lg:h-[calc(100vh-6.5rem)] lg:flex-row">
      {/* Left Column: Product Search + Live Catalog */}
      <div className="flex flex-col gap-4 lg:w-7/12">
        {/* Top Search Bar with F2 Shortcut Indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search items, barcode, or SKU... (Press F2)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-24 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="absolute right-3 top-2.5">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-500">
                F2
              </kbd>
            </div>
          </div>

          {/* Search Results Dropdown */}
          {searchQuery.trim() && (
            <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-md">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No matching items in your shop catalog.
                </div>
              ) : (
                filteredProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addItemToCart(prod)}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-blue-50/60 transition-colors"
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800">{prod.productName}</p>
                      <p className="text-xs text-slate-400">
                        {prod.category} • SKU: {prod.sku} • Stock: {prod.currentStock} {prod.uom}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">{formatINR(prod.sellingPrice)}</span>
                      <p className="text-[10px] text-slate-400">+{prod.gstRate}% Tax</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Quick Items Catalog */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Shop Catalog (One-Click Add)
            </h3>
            <span className="text-xs text-slate-400">{catalogItems.length} active items</span>
          </div>

          {isLoadingCatalog && catalogItems.length === 0 ? (
            <CatalogGridSkeleton count={6} />
          ) : catalogItems.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
              <Package className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No Products in Your Catalog</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                You haven&apos;t added any products to your shop yet. Add your inventory items to start billing at the POS counter.
              </p>
              <Link href="/inventory">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Products to Stock
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {catalogItems.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => addItemToCart(prod)}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/90 p-3 text-left hover:border-blue-500 hover:bg-blue-50/40 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                      {prod.category || "General"}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800 line-clamp-2">
                      {prod.productName}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900">{formatINR(prod.sellingPrice)}</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {prod.currentStock} {prod.uom}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Customer Details, Live Cart & Checkout */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs lg:w-5/12">
        {/* Customer Header Toggle */}
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInvoiceType("B2C_RETAIL_BILL")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  invoiceType === "B2C_RETAIL_BILL"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Retail Bill (B2C)
              </button>
              <button
                onClick={() => setInvoiceType("B2B_TAX_INVOICE")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  invoiceType === "B2B_TAX_INVOICE"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tax Invoice (B2B)
              </button>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {createdInvoiceNumber}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Contact Mobile"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {invoiceType === "B2B_TAX_INVOICE" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Client GSTIN (15-digit)"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
              <select
                value={customerState}
                onChange={(e) => setCustomerState(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="09">09 - Uttar Pradesh (Intra)</option>
                <option value="07">07 - Delhi (Inter-state)</option>
                <option value="06">06 - Haryana (Inter-state)</option>
                <option value="08">08 - Rajasthan (Inter-state)</option>
                <option value="19">19 - West Bengal (Inter-state)</option>
                <option value="27">27 - Maharashtra (Inter-state)</option>
              </select>
            </div>
          )}
        </div>

        {/* Live Cart Items List */}
        <div className="flex-1 overflow-y-auto py-3">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <Receipt className="h-10 w-10 text-slate-300 stroke-[1.5]" />
              <p className="mt-2 text-xs font-medium">POS Cart is Empty</p>
              <p className="text-[10px] text-slate-400">Click items in catalog or search (F2) to add</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item, index) => {
                const calc = calculatedItems[index];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-xs"
                  >
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-slate-800 line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatINR(item.unitPrice)} • HSN: {item.hsnCode} • {item.gstRate}% Tax
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right ml-3 min-w-[70px]">
                      <p className="font-bold text-slate-900">{formatINR(calc?.totalAmount || 0)}</p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calculation Summary Box */}
        <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal (Taxable Value):</span>
            <span className="font-medium">{formatINR(summary.taxableAmount)}</span>
          </div>

          {isInterState ? (
            <div className="flex justify-between text-slate-500">
              <span>IGST (Inter-State Tax):</span>
              <span className="font-medium">{formatINR(summary.igstTotal)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-slate-500">
                <span>CGST (Central Tax):</span>
                <span className="font-medium">{formatINR(summary.cgstTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>SGST (State Tax):</span>
                <span className="font-medium">{formatINR(summary.sgstTotal)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between text-slate-500">
            <span>Round-off:</span>
            <span className="font-medium">{summary.roundOff}</span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
            <span>Grand Total:</span>
            <span className="text-xl text-blue-700">{formatINR(summary.grandTotal)}</span>
          </div>
        </div>

        {checkoutError && (
          <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-600 border border-rose-200">
            {checkoutError}
          </div>
        )}

        {/* Payment Mode Selector */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setPaymentMode("CASH")}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 font-semibold transition-all ${
              paymentMode === "CASH"
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Banknote className="h-4 w-4" />
            Cash
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("UPI")}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 font-semibold transition-all ${
              paymentMode === "UPI"
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            UPI
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("CREDIT")}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 font-semibold transition-all ${
              paymentMode === "CREDIT"
                ? "border-amber-600 bg-amber-50 text-amber-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Credit
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("BANK_TRANSFER")}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 font-semibold transition-all ${
              paymentMode === "BANK_TRANSFER"
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Bank
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            className="w-1/3"
            disabled={cartItems.length === 0}
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handleCheckout}
          >
            {isSubmitting ? "Saving..." : "Save & Print Bill (F8)"}
          </Button>
        </div>
      </div>

      {/* Invoice Print Preview Modal (Universal A4 Tax Invoice vs 3-inch Thermal) */}
      <Dialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Invoice Print Preview"
        description="Verify document layout before printing or exporting"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrintFormat("A4")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  printFormat === "A4" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                A4 Tax Invoice
              </button>
              <button
                onClick={() => setPrintFormat("THERMAL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  printFormat === "THERMAL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                3-Inch (80mm) Thermal
              </button>
            </div>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Document
            </Button>
          </div>

          {/* A4 Format Layout */}
          {printFormat === "A4" ? (
            <div className="rounded-xl border border-slate-300 bg-white p-6 text-slate-900 shadow-xs font-sans text-xs">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-blue-900 uppercase">STORE COUNTER INVOICE</h2>
                  <p className="text-[11px] text-slate-600">Elvora Cloud Retail Billing</p>
                </div>
                <div className="text-right">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-bold uppercase text-[10px]">
                    {invoiceType === "B2B_TAX_INVOICE" ? "TAX INVOICE" : "RETAIL INVOICE"}
                  </span>
                  <p className="text-sm font-bold mt-1 text-slate-900">{createdInvoiceNumber}</p>
                  <p className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="my-3 rounded-lg bg-slate-50 p-2.5 border border-slate-200 flex justify-between">
                <div>
                  <p className="font-bold text-slate-700">Billed To (Client / Customer):</p>
                  <p className="font-semibold text-slate-900">{customerName}</p>
                  {customerPhone && <p className="text-slate-500">Phone: {customerPhone}</p>}
                </div>
                {customerGstin && (
                  <div className="text-right">
                    <p className="font-bold text-slate-700">Client GSTIN / Tax ID:</p>
                    <p className="font-mono font-semibold">{customerGstin}</p>
                    <p className="text-slate-500">Jurisdiction: {customerState}</p>
                  </div>
                )}
              </div>

              {/* Item Table */}
              <table className="w-full border-collapse border border-slate-300 text-left my-3 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                    <th className="p-2 border border-slate-300">#</th>
                    <th className="p-2 border border-slate-300">Item Description</th>
                    <th className="p-2 border border-slate-300">HSN</th>
                    <th className="p-2 border border-slate-300 text-right">Qty</th>
                    <th className="p-2 border border-slate-300 text-right">Rate</th>
                    <th className="p-2 border border-slate-300 text-right">Taxable</th>
                    <th className="p-2 border border-slate-300 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item, idx) => {
                    const calc = calculatedItems[idx];
                    return (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-200 text-slate-400">{idx + 1}</td>
                        <td className="p-2 border border-slate-200 font-medium">{item.name}</td>
                        <td className="p-2 border border-slate-200 font-mono text-[10px]">{item.hsnCode}</td>
                        <td className="p-2 border border-slate-200 text-right">
                          {item.quantity} {item.uom}
                        </td>
                        <td className="p-2 border border-slate-200 text-right">{formatINR(item.unitPrice)}</td>
                        <td className="p-2 border border-slate-200 text-right">{formatINR(calc?.taxableAmount)}</td>
                        <td className="p-2 border border-slate-200 text-right font-bold">
                          {formatINR(calc?.totalAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-1 text-right text-xs">
                  <div className="flex justify-between">
                    <span>Taxable Amount:</span>
                    <span className="font-semibold">{formatINR(summary.taxableAmount)}</span>
                  </div>
                  {isInterState ? (
                    <div className="flex justify-between">
                      <span>IGST:</span>
                      <span className="font-semibold">{formatINR(summary.igstTotal)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>CGST:</span>
                        <span className="font-semibold">{formatINR(summary.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST:</span>
                        <span className="font-semibold">{formatINR(summary.sgstTotal)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span className="font-semibold">{summary.roundOff}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-extrabold text-blue-900">
                    <span>Invoice Total:</span>
                    <span>{formatINR(summary.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Thermal Layout */
            <div className="mx-auto w-[300px] rounded-lg border border-slate-300 bg-white p-4 font-mono text-[11px] shadow-sm">
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <h3 className="font-bold text-sm">ELVORA POS</h3>
                <p className="text-[10px] text-slate-500">Retail Bill</p>
                <p>Bill: {createdInvoiceNumber}</p>
                <p>Date: {new Date().toLocaleString("en-IN")}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[10px]">
                <p>Customer: {customerName}</p>
                {customerPhone && <p>Ph: {customerPhone}</p>}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5">
                {cartItems.map((item) => (
                  <div key={item.id}>
                    <p className="font-bold">{item.name}</p>
                    <div className="flex justify-between text-[10px]">
                      <span>{item.quantity} x {item.unitPrice}</span>
                      <span>{formatINR(item.quantity * item.unitPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Taxable:</span>
                  <span>{formatINR(summary.taxableAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatINR(summary.totalTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>{formatINR(summary.grandTotal)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] space-y-1">
                <p>Payment: {paymentMode}</p>
                <p className="font-bold">Thank You for Your Business!</p>
                <p className="text-[9px] text-slate-400">Powered by Elvora</p>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Checkout Success Confirmation Modal */}
      <Dialog
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Invoice Recorded Successfully!"
        description="Transaction saved and accounting ledgers updated"
        maxWidth="md"
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
            <Check className="h-7 w-7" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">Invoice #{createdInvoiceNumber} Generated</h4>
          <p className="text-xs text-slate-500 mt-1">
            Settlement Amount: <strong className="text-slate-800">{formatINR(summary.grandTotal)}</strong> ({paymentMode})
          </p>

          <div className="mt-6 flex w-full flex-col gap-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
              onClick={() => {
                window.print();
                handleNewSale();
              }}
            >
              <Printer className="h-4 w-4 mr-1" /> Print Document
            </Button>
            <Button variant="outline" className="w-full" onClick={handleNewSale}>
              Next Transaction (New Bill)
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
