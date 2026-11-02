"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Printer, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { convertNumberToWordsINR, getStateNameByCode, INDIAN_GST_STATE_CODES } from "@/lib/finance/decimal";

export interface InvoiceItem {
  id: string;
  description: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number;
  gstRate: number;
}

export function InvoiceGeneratorClient() {
  // Seller Details
  const [sellerName, setSellerName] = useState("Universal Enterprises");
  const [sellerGstin, setSellerGstin] = useState("09AAACU9842F1Z6");
  const [sellerAddress, setSellerAddress] = useState("102 Industrial Area, Sector 62, Noida, Uttar Pradesh - 201301");
  const [sellerStateCode, setSellerStateCode] = useState("09");
  const [sellerPhone, setSellerPhone] = useState("+91 98765 43210");
  const [sellerEmail, setSellerEmail] = useState("billing@universal-ent.com");

  // Buyer Details
  const [customerName, setCustomerName] = useState("Apex Retail Stores Pvt Ltd");
  const [customerGstin, setCustomerGstin] = useState("09AAACA1234F1Z2");
  const [customerAddress, setCustomerAddress] = useState("Shop 12, Commercial Complex, Sector 18, Noida, Uttar Pradesh - 201301");
  const [shippingAddress, setShippingAddress] = useState("Same as billing address");
  const [customerStateCode, setCustomerStateCode] = useState("09");

  // Invoice Meta
  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-0001");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [placeOfSupply, setPlaceOfSupply] = useState("09 - Uttar Pradesh");
  const [isInterstate, setIsInterstate] = useState(false);
  const [reverseCharge, setReverseCharge] = useState(false);

  // Bank & Terms
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("309812345678");
  const [ifscCode, setIfscCode] = useState("SBIN0001234");
  const [upiId, setUpiId] = useState("universal@upi");
  const [terms, setTerms] = useState(
    "1. Goods once sold will not be taken back without original invoice.\n2. Interest @18% p.a. will be charged on overdue payments beyond 15 days."
  );

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "item-1",
      description: "Heavy Duty Power Drill 750W (Industrial Grade)",
      hsn: "8467",
      qty: 2,
      unit: "PCS",
      rate: 2500,
      discount: 0,
      gstRate: 18,
    },
    {
      id: "item-2",
      description: "Executive Formal Cotton Shirt (Assorted Sizes)",
      hsn: "6205",
      qty: 3,
      unit: "PCS",
      rate: 1200,
      discount: 100,
      gstRate: 5,
    },
  ]);

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("preview");

  // Presets for quick testing
  const loadPreset = (presetType: "standard" | "interstate" | "single" | "multipage") => {
    if (presetType === "standard") {
      setIsInterstate(false);
      setCustomerStateCode("09");
      setPlaceOfSupply("09 - Uttar Pradesh");
      setCustomerName("Apex Retail Stores Pvt Ltd");
      setCustomerGstin("09AAACA1234F1Z2");
      setItems([
        {
          id: "item-1",
          description: "Heavy Duty Power Drill 750W (Industrial Grade)",
          hsn: "8467",
          qty: 2,
          unit: "PCS",
          rate: 2500,
          discount: 0,
          gstRate: 18,
        },
        {
          id: "item-2",
          description: "Executive Formal Cotton Shirt (Assorted Sizes)",
          hsn: "6205",
          qty: 3,
          unit: "PCS",
          rate: 1200,
          discount: 100,
          gstRate: 5,
        },
      ]);
    } else if (presetType === "interstate") {
      setIsInterstate(true);
      setCustomerStateCode("27");
      setPlaceOfSupply("27 - Maharashtra");
      setCustomerName("Western Logistics & Trade Corp");
      setCustomerGstin("27AAACW9876E1Z4");
      setItems([
        {
          id: "item-1",
          description: "Premium Ceramic Countertop Washbasin (Snow White)",
          hsn: "6910",
          qty: 4,
          unit: "PCS",
          rate: 3200,
          discount: 200,
          gstRate: 18,
        },
        {
          id: "item-2",
          description: "Brass Single-Lever Basin Mixer (Chrome Finish)",
          hsn: "8481",
          qty: 4,
          unit: "PCS",
          rate: 1850,
          discount: 0,
          gstRate: 18,
        },
      ]);
    } else if (presetType === "single") {
      setIsInterstate(false);
      setCustomerStateCode("09");
      setPlaceOfSupply("09 - Uttar Pradesh");
      setCustomerName("Walk-in Retail Customer");
      setCustomerGstin("");
      setItems([
        {
          id: "item-1",
          description: "Concealed Dual-Flush Water Cistern 6L/3L",
          hsn: "8481",
          qty: 1,
          unit: "SET",
          rate: 2500,
          discount: 0,
          gstRate: 18,
        },
      ]);
    } else if (presetType === "multipage") {
      setIsInterstate(false);
      setCustomerStateCode("09");
      setPlaceOfSupply("09 - Uttar Pradesh");
      setCustomerName("Metro Commercial Projects Ltd");
      setCustomerGstin("09AAACM5432B1Z7");
      const multiItems: InvoiceItem[] = [];
      const catalog = [
        { desc: "Wall-Hung Ceramic Toilet Suite with Soft-Close Seat", hsn: "6910", rate: 5800, gst: 18 },
        { desc: "Brass Chrome Diverter Valve 4-Way", hsn: "8481", rate: 2400, gst: 18 },
        { desc: "Stainless Steel Floor Drain 150mm with Trap", hsn: "7324", rate: 650, gst: 18 },
        { desc: "CPVC Hot & Cold Water Pipe 25mm (3-meter length)", hsn: "3917", rate: 320, gst: 18 },
        { desc: "Brass Angle Valve Heavy Duty 1/2-inch", hsn: "8481", rate: 420, gst: 18 },
        { desc: "Overhead Rain Shower 200mm with Arm", hsn: "8481", rate: 1650, gst: 18 },
        { desc: "Hand Shower with Flexible Hose 1.5m", hsn: "8481", rate: 850, gst: 18 },
        { desc: "LED Backlit Bathroom Mirror 600x800mm", hsn: "7009", rate: 3400, gst: 18 },
        { desc: "Towel Rail Stainless Steel 600mm", hsn: "8302", rate: 750, gst: 18 },
        { desc: "Corner Glass Shelf 2-Tier with Chrome Clamps", hsn: "7009", rate: 890, gst: 18 },
        { desc: "Health Faucet with Wall Hook & EPDM Hose", hsn: "8481", rate: 550, gst: 18 },
        { desc: "Bottle Trap Heavy Brass 32mm", hsn: "8481", rate: 980, gst: 18 },
        { desc: "POP Waste Coupling Ceramic Top Half-Thread", hsn: "7412", rate: 340, gst: 18 },
        { desc: "PTFE Thread Seal Tape 12mm (Box of 10)", hsn: "3920", rate: 120, gst: 18 },
        { desc: "Silicone Waterproof Sealant Clear 300ml", hsn: "3214", rate: 260, gst: 18 },
        { desc: "Basin Fixing Bolt Pair with Nylon Sleeves", hsn: "7318", rate: 180, gst: 18 },
      ];
      catalog.forEach((cat, idx) => {
        multiItems.push({
          id: `item-multi-${idx + 1}`,
          description: cat.desc,
          hsn: cat.hsn,
          qty: 2 + (idx % 3),
          unit: "PCS",
          rate: cat.rate,
          discount: idx % 2 === 0 ? 50 : 0,
          gstRate: cat.gst,
        });
      });
      setItems(multiItems);
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "",
        hsn: "8481",
        qty: 1,
        unit: "PCS",
        rate: 1000,
        discount: 0,
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

  // -------------------------------------------------------------
  // Calculations
  // -------------------------------------------------------------
  interface CalculatedItem extends InvoiceItem {
    grossAmount: number;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalAmount: number;
  }

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const calculatedItems: CalculatedItem[] = items.map((item) => {
    const grossAmount = item.qty * item.rate;
    const discount = Math.min(item.discount || 0, grossAmount);
    const taxableValue = Math.max(0, grossAmount - discount);
    totalTaxable += taxableValue;

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isInterstate) {
      igstRate = item.gstRate;
      igstAmount = Number(((taxableValue * igstRate) / 100).toFixed(2));
      totalIgst += igstAmount;
    } else {
      cgstRate = item.gstRate / 2;
      cgstAmount = Number(((taxableValue * cgstRate) / 100).toFixed(2));
      sgstRate = item.gstRate / 2;
      sgstAmount = Number(((taxableValue * sgstRate) / 100).toFixed(2));
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
    }

    const totalAmount = Number((taxableValue + cgstAmount + sgstAmount + igstAmount).toFixed(2));

    return {
      ...item,
      grossAmount,
      taxableValue,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalAmount,
    };
  });

  const rawGrandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));
  const amountInWords = convertNumberToWordsINR(roundedGrandTotal);

  const sellerStateName = getStateNameByCode(sellerStateCode);
  const customerStateName = getStateNameByCode(customerStateCode);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-specific style block strictly targeting @media print */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 10mm 10mm 10mm;
            }
            html, body {
              width: 100% !important;
              height: auto !important;
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-size: 11px !important;
            }
            .print\\:hidden,
            header,
            footer,
            nav,
            aside {
              display: none !important;
            }
            #printable-invoice {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
            }
            #printable-invoice table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
            }
            #printable-invoice thead {
              display: table-header-group !important;
            }
            #printable-invoice tfoot {
              display: table-footer-group !important;
            }
            #printable-invoice tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `,
      }} />

      {/* Screen Interactive Controls & Action Bar (Hidden in Print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              GST Invoice Designer & Print Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize invoice particulars, preview live A4 layout, and print or export as PDF.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Quick Testing Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider mr-1">
            Test Scenarios:
          </span>
          <button
            type="button"
            onClick={() => loadPreset("standard")}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            CGST + SGST (Local)
          </button>
          <button
            type="button"
            onClick={() => loadPreset("interstate")}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            IGST (Inter-State)
          </button>
          <button
            type="button"
            onClick={() => loadPreset("single")}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            1-Item Retail
          </button>
          <button
            type="button"
            onClick={() => loadPreset("multipage")}
            className="rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            Multi-Page (16 Items)
          </button>

          <div className="ml-auto flex items-center gap-1 border-l border-slate-200 pl-3">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "edit" ? "preview" : "edit")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              {activeTab === "edit" ? "Show Full Document View" : "Toggle Form Editor"}
            </button>
          </div>
        </div>

        {/* Expandable Form Editor Fields */}
        {activeTab === "edit" && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Seller Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-700">
                1. Seller / Supplier Details
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Trade / Business Name</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Seller GSTIN</label>
                    <input
                      type="text"
                      value={sellerGstin}
                      onChange={(e) => setSellerGstin(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono bg-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">State Code</label>
                    <select
                      value={sellerStateCode}
                      onChange={(e) => setSellerStateCode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white"
                    >
                      {Object.entries(INDIAN_GST_STATE_CODES).map(([code, name]) => (
                        <option key={code} value={code}>
                          {code} - {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Seller Address</label>
                  <input
                    type="text"
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Phone</label>
                    <input
                      type="text"
                      value={sellerPhone}
                      onChange={(e) => setSellerPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Email</label>
                    <input
                      type="email"
                      value={sellerEmail}
                      onChange={(e) => setSellerEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-700">
                2. Buyer / Customer Details
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Customer / Company Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Buyer GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 09AAACA1234F1Z2"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono bg-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Place of Supply (State)</label>
                    <select
                      value={customerStateCode}
                      onChange={(e) => {
                        setCustomerStateCode(e.target.value);
                        setPlaceOfSupply(`${e.target.value} - ${INDIAN_GST_STATE_CODES[e.target.value] || ""}`);
                        setIsInterstate(e.target.value !== sellerStateCode);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white"
                    >
                      {Object.entries(INDIAN_GST_STATE_CODES).map(([code, name]) => (
                        <option key={code} value={code}>
                          {code} - {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Billing Address</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Shipping Address</label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Metadata */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 md:col-span-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-700">
                3. Invoice Metadata & Tax Setting
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div className="flex flex-col justify-center gap-1.5 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInterstate}
                      onChange={(e) => setIsInterstate(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Interstate Sale (IGST)
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reverseCharge}
                      onChange={(e) => setReverseCharge(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Reverse Charge (RCM)
                  </label>
                </div>
              </div>
            </div>

            {/* Bank Particulars & Terms Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 md:col-span-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-700">
                4. Bank Payment Particulars & Terms
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">IFSC Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono uppercase bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono bg-white"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-slate-600">Terms & Conditions</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white leading-normal"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          OFFICIAL A4 PRINTABLE INVOICE COMPONENT
          - Formatted specifically for A4 portrait
          - Renders without input widgets during print
          - High-contrast, statutory compliance with Rule 46 CGST Rules
         ------------------------------------------------------------- */}
      <div
        id="printable-invoice"
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:w-full text-slate-900"
      >
        {/* Document Top Bar */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                {sellerName}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-700 leading-relaxed max-w-md">
              <p>{sellerAddress}</p>
              <p className="mt-0.5">
                State: <strong>{sellerStateName} ({sellerStateCode})</strong>
                {sellerPhone && ` • Phone: ${sellerPhone}`}
                {sellerEmail && ` • Email: ${sellerEmail}`}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-950">
                GSTIN: <span className="font-mono text-sm tracking-wide">{sellerGstin || "UNREGISTERED"}</span>
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
            <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-extrabold text-xs uppercase tracking-widest print:bg-slate-900 print:text-white">
              TAX INVOICE
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
              Original for Recipient
            </span>
            <div className="mt-2 text-xs space-y-0.5">
              <div>Invoice No: <strong className="font-mono text-xs text-slate-950">{invoiceNumber}</strong></div>
              <div>Invoice Date: <strong>{invoiceDate}</strong></div>
              {dueDate && <div>Due Date: <strong>{dueDate}</strong></div>}
              <div>Place of Supply: <strong>{placeOfSupply}</strong></div>
              <div>Reverse Charge: <strong>{reverseCharge ? "Yes" : "No"}</strong></div>
            </div>
          </div>
        </div>

        {/* Bill To & Ship To Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 border border-slate-300 rounded-lg text-xs overflow-hidden">
          <div className="p-3 bg-slate-50/60 print:bg-transparent border-b sm:border-b-0 sm:border-r border-slate-300 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Details of Receiver (Billed To):
            </span>
            <div className="font-bold text-sm text-slate-950">{customerName}</div>
            <div className="text-slate-700 leading-normal">{customerAddress}</div>
            <div className="text-slate-700">
              State: <strong>{customerStateName} ({customerStateCode})</strong>
            </div>
            <div className="text-slate-900 font-semibold pt-0.5">
              GSTIN / UIN:{" "}
              {customerGstin ? (
                <span className="font-mono font-bold tracking-wide">{customerGstin}</span>
              ) : (
                <span className="text-slate-500 font-normal italic">Unregistered Consumer (B2C)</span>
              )}
            </div>
          </div>

          <div className="p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Details of Consignee (Shipped To):
            </span>
            <div className="font-bold text-sm text-slate-950">{customerName}</div>
            <div className="text-slate-700 leading-normal">
              {shippingAddress || customerAddress}
            </div>
            <div className="text-slate-700">
              State: <strong>{customerStateName} ({customerStateCode})</strong>
            </div>
            <div className="text-[11px] text-slate-500 pt-0.5">
              Supply Type: <strong>{isInterstate ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}</strong>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-5">
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 print:bg-slate-100">
                <th className="py-2 px-2 border-r border-slate-300 w-8 text-center">#</th>
                <th className="py-2 px-2 border-r border-slate-300">Description of Goods / Services</th>
                <th className="py-2 px-2 border-r border-slate-300 w-16 text-center font-mono">HSN/SAC</th>
                <th className="py-2 px-2 border-r border-slate-300 w-14 text-center">Qty</th>
                <th className="py-2 px-2 border-r border-slate-300 w-12 text-center">Unit</th>
                <th className="py-2 px-2 border-r border-slate-300 w-20 text-right">Rate (₹)</th>
                <th className="py-2 px-2 border-r border-slate-300 w-16 text-right">Disc (₹)</th>
                <th className="py-2 px-2 border-r border-slate-300 w-22 text-right">Taxable (₹)</th>
                {isInterstate ? (
                  <>
                    <th className="py-2 px-2 border-r border-slate-300 w-12 text-center">IGST %</th>
                    <th className="py-2 px-2 border-r border-slate-300 w-20 text-right">IGST (₹)</th>
                  </>
                ) : (
                  <>
                    <th className="py-2 px-2 border-r border-slate-300 w-12 text-center">CGST %</th>
                    <th className="py-2 px-2 border-r border-slate-300 w-18 text-right">CGST (₹)</th>
                    <th className="py-2 px-2 border-r border-slate-300 w-12 text-center">SGST %</th>
                    <th className="py-2 px-2 border-r border-slate-300 w-18 text-right">SGST (₹)</th>
                  </>
                )}
                <th className="py-2 px-2 w-24 text-right">Total (₹)</th>
                <th className="py-2 px-2 w-10 text-center print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {calculatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                  <td className="py-2 px-2 border-r border-slate-300 text-center font-semibold text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300">
                    {/* Screen editable input vs print static text */}
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Product / service name"
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:hidden font-medium"
                    />
                    <span className="hidden print:inline font-medium text-slate-900 leading-snug">
                      {item.description || "Item " + (idx + 1)}
                    </span>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-center font-mono">
                    <input
                      type="text"
                      value={item.hsn}
                      onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                      className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none font-mono print:hidden"
                    />
                    <span className="hidden print:inline font-mono">{item.hsn || "-"}</span>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", Number(e.target.value) || 0)}
                      className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:hidden font-semibold"
                    />
                    <span className="hidden print:inline font-semibold">{item.qty}</span>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-center">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, "unit", e.target.value.toUpperCase())}
                      className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none uppercase print:hidden text-[11px]"
                    />
                    <span className="hidden print:inline uppercase text-[11px]">{item.unit || "PCS"}</span>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, "rate", Number(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:hidden font-mono"
                    />
                    <span className="hidden print:inline font-mono">{formatINR(item.rate)}</span>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) => updateItem(item.id, "discount", Number(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:hidden font-mono text-slate-500"
                    />
                    <span className="hidden print:inline font-mono text-slate-600">
                      {item.discount > 0 ? formatINR(item.discount) : "-"}
                    </span>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-right font-mono font-semibold">
                    {formatINR(item.taxableValue)}
                  </td>
                  {isInterstate ? (
                    <>
                      <td className="py-2 px-2 border-r border-slate-300 text-center">
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateItem(item.id, "gstRate", Number(e.target.value))}
                          className="bg-transparent text-xs py-0.5 print:hidden cursor-pointer"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                        <span className="hidden print:inline">{item.gstRate}%</span>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-right font-mono">
                        {formatINR(item.igstAmount)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-2 border-r border-slate-300 text-center">
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateItem(item.id, "gstRate", Number(e.target.value))}
                          className="bg-transparent text-xs py-0.5 print:hidden cursor-pointer"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                        <span className="hidden print:inline">{item.cgstRate}%</span>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-right font-mono">
                        {formatINR(item.cgstAmount)}
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-center">
                        <span className="hidden print:inline">{item.sgstRate}%</span>
                        <span className="print:hidden text-slate-500">{item.sgstRate}%</span>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-right font-mono">
                        {formatINR(item.sgstAmount)}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-950">
                    {formatINR(item.totalAmount)}
                  </td>
                  <td className="py-2 px-2 text-center print:hidden">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      title="Remove Row"
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-20 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Subtotal Row */}
              <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 print:bg-slate-50">
                <td colSpan={7} className="py-2 px-3 text-right border-r border-slate-300 uppercase tracking-wider text-[11px]">
                  Total Taxable Amount:
                </td>
                <td className="py-2 px-2 text-right border-r border-slate-300 font-mono font-bold">
                  {formatINR(totalTaxable)}
                </td>
                {isInterstate ? (
                  <>
                    <td className="border-r border-slate-300"></td>
                    <td className="py-2 px-2 text-right border-r border-slate-300 font-mono font-bold">
                      {formatINR(totalIgst)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border-r border-slate-300"></td>
                    <td className="py-2 px-2 text-right border-r border-slate-300 font-mono font-bold">
                      {formatINR(totalCgst)}
                    </td>
                    <td className="border-r border-slate-300"></td>
                    <td className="py-2 px-2 text-right border-r border-slate-300 font-mono font-bold">
                      {formatINR(totalSgst)}
                    </td>
                  </>
                )}
                <td className="py-2 px-2 text-right font-mono font-black text-slate-950">
                  {formatINR(rawGrandTotal)}
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add Row Button (Hidden in Print) */}
        <div className="pt-3 print:hidden">
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50 hover:text-blue-700 transition"
          >
            <Plus className="h-4 w-4" /> Add Line Item
          </button>
        </div>

        {/* Invoice Summary & Tax Calculation Breakdown */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-300 pt-4">
          {/* Left Column: Bank Details & Amount in Words */}
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 print:bg-transparent print:border-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Amount in Words:
              </span>
              <div className="mt-0.5 text-xs font-bold text-slate-900 leading-snug">
                {amountInWords}
              </div>
            </div>

            {/* Bank Details */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 print:bg-transparent print:border-slate-300 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Bank & Payment Particulars:
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-slate-800">
                <div>Bank Name: <strong>{bankName}</strong></div>
                <div>Account No: <strong className="font-mono">{accountNumber}</strong></div>
                <div>IFSC Code: <strong className="font-mono uppercase">{ifscCode}</strong></div>
                <div>UPI ID: <strong className="font-mono">{upiId}</strong></div>
              </div>
            </div>

            {/* Terms and conditions */}
            <div className="text-[10px] text-slate-600 leading-normal border-l-2 border-slate-300 pl-2">
              <span className="font-bold uppercase tracking-wider text-slate-500">Terms & Conditions:</span>
              <p className="whitespace-pre-line mt-0.5">{terms}</p>
            </div>
          </div>

          {/* Right Column: Calculation Summary & Signatory */}
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-300 overflow-hidden text-xs">
              <div className="divide-y divide-slate-200">
                <div className="flex justify-between py-1.5 px-3 bg-slate-50/50">
                  <span className="text-slate-600">Total Taxable Value:</span>
                  <span className="font-mono font-semibold text-slate-900">{formatINR(totalTaxable)}</span>
                </div>

                {isInterstate ? (
                  <div className="flex justify-between py-1.5 px-3">
                    <span className="text-slate-600">Integrated GST (IGST):</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(totalIgst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1.5 px-3">
                      <span className="text-slate-600">Central GST (CGST):</span>
                      <span className="font-mono font-semibold text-slate-900">{formatINR(totalCgst)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3">
                      <span className="text-slate-600">State GST (SGST):</span>
                      <span className="font-mono font-semibold text-slate-900">{formatINR(totalSgst)}</span>
                    </div>
                  </>
                )}

                {roundOff !== 0 && (
                  <div className="flex justify-between py-1.5 px-3 text-slate-600">
                    <span>Round Off:</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {roundOff >= 0 ? `+${formatINR(roundOff)}` : formatINR(roundOff)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2.5 px-3 bg-slate-900 text-white font-extrabold print:bg-slate-900 print:text-white">
                  <span className="text-xs uppercase tracking-wider">Invoice Grand Total:</span>
                  <span className="font-mono text-base font-black tracking-tight">{formatINR(roundedGrandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Authorized Signature Block */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <div className="text-right w-48 space-y-12">
                <div className="text-xs font-bold text-slate-900">
                  For {sellerName}
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 uppercase tracking-wider">
                  Authorized Signatory
                </div>
              </div>
            </div>

            {/* Bank Particulars & Terms Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 md:col-span-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-700">
                4. Bank Payment Particulars & Terms
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">IFSC Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono uppercase bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono bg-white"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-slate-600">Terms & Conditions</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white leading-normal"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Callout (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 shadow-xs print:hidden">
        <div>
          <h4 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            Automate Stock Dues & Ledger Accounts with Elvora
          </h4>
          <p className="text-xs text-blue-700 mt-0.5">
            Create permanent customer ledgers, instant thermal receipts, and real-time inventory tracking for Indian counters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-50 transition"
          >
            <Printer className="h-4 w-4 text-slate-600" /> Print / Save PDF
          </button>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Register Free Shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
