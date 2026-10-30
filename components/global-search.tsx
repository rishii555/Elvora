"use client";

import React, { useState, useEffect } from "react";
import { Search, Boxes, Users, Receipt, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "./ui/dialog";
import { MOCK_PRODUCTS, MOCK_CUSTOMERS, MOCK_INVOICES } from "@/lib/mock/universal-data";
import { formatINR } from "@/lib/utils/format";

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const trimmed = query.trim().toLowerCase();

  const matchingProducts = trimmed
    ? MOCK_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.code.toLowerCase().includes(trimmed) ||
          p.category.toLowerCase().includes(trimmed) ||
          p.hsnOrSac.includes(trimmed)
      ).slice(0, 4)
    : [];

  const matchingCustomers = trimmed
    ? MOCK_CUSTOMERS.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmed) ||
          c.phone.includes(trimmed) ||
          (c.gstin && c.gstin.toLowerCase().includes(trimmed))
      ).slice(0, 3)
    : [];

  const matchingInvoices = trimmed
    ? MOCK_INVOICES.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(trimmed) ||
          inv.customerName.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100 transition-colors sm:w-64"
      >
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <span className="flex-1 text-left">Search items, bills, khata...</span>
        <kbd className="hidden sm:inline-flex rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
          Ctrl K
        </kbd>
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Quick Search & Navigation"
        description="Search products, customer accounts, and counter bills"
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search by product name, brand, HSN, customer phone, or bill #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {!trimmed ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Type to search products, customers, or invoices across your shop...
            </div>
          ) : matchingProducts.length === 0 &&
            matchingCustomers.length === 0 &&
            matchingInvoices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No results found matching &quot;{query}&quot;.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Products Section */}
              {matchingProducts.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <Boxes className="h-3.5 w-3.5" /> Products ({matchingProducts.length})
                  </h4>
                  <div className="space-y-1">
                    {matchingProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect("/inventory")}
                        className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-500">
                            {p.category} • SKU: {p.code} • {p.tracksStock ? `Stock: ${p.stock} ${p.uom}` : "Service"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{formatINR(p.sellingPrice)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers Section */}
              {matchingCustomers.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <Users className="h-3.5 w-3.5" /> Customers & Udhar ({matchingCustomers.length})
                  </h4>
                  <div className="space-y-1">
                    {matchingCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect("/customers")}
                        className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.phone} • {c.city}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-amber-700">
                            Due: {formatINR(c.outstandingBalance)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices Section */}
              {matchingInvoices.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <Receipt className="h-3.5 w-3.5" /> Invoices ({matchingInvoices.length})
                  </h4>
                  <div className="space-y-1">
                    {matchingInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => handleSelect(`/invoices`)}
                        className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{inv.invoiceNumber}</p>
                          <p className="text-xs text-slate-500">{inv.customerName} • {inv.date}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{formatINR(inv.grandTotal)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Press ESC to close</span>
            <button
              onClick={() => handleSelect("/pos")}
              className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Open Counter POS <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
