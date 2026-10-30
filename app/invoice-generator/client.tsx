"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Printer, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/utils/format";

interface InvoiceItem {
  id: string;
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
}

export function InvoiceGeneratorClient() {
  const [sellerName, setSellerName] = useState("Universal Traders");
  const [sellerGstin, setSellerGstin] = useState("09AAACU9842F1Z6");
  const [sellerAddress, setSellerAddress] = useState("102 Sector 62, Noida, Uttar Pradesh (09)");

  const [customerName, setCustomerName] = useState("Walk-in Retail Customer");
  const [isInterstate, setIsInterstate] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-0001");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "Heavy Duty Power Drill 750W", hsn: "8467", qty: 2, rate: 2500, gstRate: 18 },
    { id: "2", description: "Executive Cotton Shirt", hsn: "6205", qty: 3, rate: 1200, gstRate: 5 },
  ]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: "",
        hsn: "",
        qty: 1,
        rate: 0,
        gstRate: 18,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Tax calculations
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  items.forEach((item) => {
    const itemTaxable = item.qty * item.rate;
    subtotal += itemTaxable;
    const taxAmount = (itemTaxable * item.gstRate) / 100;
    if (isInterstate) {
      igstTotal += taxAmount;
    } else {
      cgstTotal += taxAmount / 2;
      sgstTotal += taxAmount / 2;
    }
  });

  const rawGrandTotal = subtotal + cgstTotal + sgstTotal + igstTotal;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Invoice Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Tax Invoice
            </span>
            <input
              type="text"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              className="mt-2 block text-xl sm:text-2xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
              placeholder="Your Business / Shop Name"
            />
            <div className="mt-1 space-y-1 text-xs text-slate-600">
              <input
                type="text"
                value={sellerGstin}
                onChange={(e) => setSellerGstin(e.target.value)}
                className="block border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full font-mono"
                placeholder="GSTIN (e.g. 09AAACU9842F1Z6)"
              />
              <input
                type="text"
                value={sellerAddress}
                onChange={(e) => setSellerAddress(e.target.value)}
                className="block border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
                placeholder="Shop Address & State Code"
              />
            </div>
          </div>

          <div className="text-left sm:text-right space-y-2">
            <div>
              <span className="text-xs text-slate-400">Invoice No:</span>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="block text-sm font-bold text-slate-900 sm:text-right border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
              />
            </div>
            <div>
              <span className="text-xs text-slate-400">Invoice Date:</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="block text-xs font-medium text-slate-700 sm:text-right border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
              />
            </div>
            <div className="pt-2 print:hidden">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInterstate}
                  onChange={(e) => setIsInterstate(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                Inter-State Sale (IGST)
              </label>
            </div>
          </div>
        </div>

        {/* Billed To */}
        <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billed To (Customer):</span>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 block text-sm font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
            placeholder="Customer Name or Company Name"
          />
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2 px-2">Item Description</th>
                <th className="py-2 px-2 w-20">HSN</th>
                <th className="py-2 px-2 w-16 text-right">Qty</th>
                <th className="py-2 px-2 w-24 text-right">Rate (₹)</th>
                <th className="py-2 px-2 w-20 text-center">GST %</th>
                <th className="py-2 px-2 w-28 text-right">Total (₹)</th>
                <th className="py-2 px-2 w-10 print:hidden text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {items.map((item) => {
                const itemTotal = item.qty * item.rate;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="Product title / service description"
                        className="w-full border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.hsn}
                        onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                        placeholder="HSN"
                        className="w-full font-mono border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, "qty", Number(e.target.value) || 0)}
                        className="w-full text-right border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, "rate", Number(e.target.value) || 0)}
                        className="w-full text-right border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <select
                        value={item.gstRate}
                        onChange={(e) => updateItem(item.id, "gstRate", Number(e.target.value))}
                        className="rounded border border-slate-200 text-xs py-0.5 px-1 bg-white"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">
                      {formatINR(itemTotal)}
                    </td>
                    <td className="py-2 px-2 text-center print:hidden">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="print:hidden">
          <button
            onClick={addItem}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Item Line
          </button>
        </div>

        {/* Calculation Summary */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-semibold text-slate-900">{formatINR(subtotal)}</span>
            </div>

            {isInterstate ? (
              <div className="flex justify-between text-slate-600">
                <span>IGST (Integrated Tax):</span>
                <span className="font-semibold text-slate-900">{formatINR(igstTotal)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (Central Tax):</span>
                  <span className="font-semibold text-slate-900">{formatINR(cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (State Tax):</span>
                  <span className="font-semibold text-slate-900">{formatINR(sgstTotal)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Round-off:</span>
              <span className="font-semibold text-emerald-600">
                {roundOff >= 0 ? `+${formatINR(roundOff)}` : formatINR(roundOff)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-lg text-blue-600">{formatINR(roundedGrandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200 print:hidden">
        <div>
          <p className="text-xs font-bold text-blue-900">Want to save customer history and track stock automatically?</p>
          <p className="text-xs text-blue-700">Elvora automates your inventory, payments, and general ledger on every bill.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-50 transition"
          >
            <Printer className="h-4 w-4 text-slate-600" /> Print / Save PDF
          </button>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Register Free Account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
