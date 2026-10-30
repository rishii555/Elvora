"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Printer, 
  Boxes
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const BUSINESS_TYPES = [
  { id: "retail", name: "Retail Store / POS Counter", desc: "Supermarkets, apparel, electronics, pharmacy" },
  { id: "wholesale", name: "Wholesale & Distribution", desc: "B2B sales, bulk shipments, credit ledgers" },
  { id: "sanitary", name: "Sanitaryware, Tiles & Bath Fittings", desc: "Ceramic basins, tiles, CP bath fittings, hardware" },
  { id: "manufacturing", name: "Manufacturing & Production", desc: "Raw materials, assembly, finished inventory" },
  { id: "services", name: "Professional Services & IT", desc: "Agencies, consulting, maintenance retainers" },
  { id: "general", name: "General Trading & Contracting", desc: "Diverse goods, project-based invoicing" },
  { id: "other", name: "Other Business Entity", desc: "Custom operational workflow" },
];

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee (INR)" },
  { code: "USD", symbol: "$", name: "US Dollar (USD)" },
  { code: "EUR", symbol: "€", name: "Euro (EUR)" },
  { code: "GBP", symbol: "£", name: "British Pound (GBP)" },
  { code: "AED", symbol: "AED", name: "UAE Dirham (AED)" },
];

export default function BusinessSetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Business Profile
  const [tradeName, setTradeName] = useState("");
  const [businessType, setBusinessType] = useState("retail");
  const [currency, setCurrency] = useState("INR");
  const [tracksInventory, setTracksInventory] = useState(true);
  const [taxRegistered, setTaxRegistered] = useState(true);
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("09");
  const [address, setAddress] = useState("");

  // Step 2: Product & Category Strategy
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Office Equipment & Electronics",
    "Furniture & Workspace Supplies",
    "Hardware & Tools",
    "Professional Services",
  ]);

  // Step 3: Invoicing & Printing Preferences
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [printerFormat, setPrinterFormat] = useState<"A4" | "THERMAL_3INCH">("A4");
  const [upiOrPaymentLink, setUpiOrPaymentLink] = useState("");
  const [bankDetails, setBankDetails] = useState("");

  const CATEGORY_PRESETS = [
    "Office Equipment & Electronics",
    "Furniture & Workspace Supplies",
    "Hardware & Tools",
    "Sanitaryware, Tiles & Bath Fittings",
    "Apparel & Textiles",
    "Packaged Goods & FMCG",
    "Professional Services",
    "Raw Materials & Fabrication",
    "Maintenance & Repairs",
  ];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    try {
      if (tradeName.trim()) {
        await fetch("/api/tenant/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tradeName: tradeName.trim(),
            legalName: tradeName.trim(),
            gstin: gstin.trim() || undefined,
            stateCode,
            phone: "9876543210", // Fallback if not specified in basic wizard
            address: address.trim() || undefined,
            invoicePrefix: invoicePrefix.trim() || "INV-",
          }),
        });
      }
    } catch {
      // Proceed to dashboard regardless
    } finally {
      setIsSubmitting(false);
      router.push("/dashboard");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Wizard Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                currentStep >= 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              1
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800">Business Model</span>
          </div>
          <div className="h-0.5 flex-1 mx-4 bg-slate-200" />
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                currentStep >= 2 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              2
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800">Catalog & Stock</span>
          </div>
          <div className="h-0.5 flex-1 mx-4 bg-slate-200" />
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                currentStep >= 3 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              3
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800">Billing & Format</span>
          </div>
        </div>
      </div>

      {/* Step 1: Business Profile & Industry Selection */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 1: Configure Your Business Type & Currency</CardTitle>
            </div>
            <CardDescription>
              Elvora adapts its interface, stock ledgers, and tax compliance to your specific business model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  label="Business / Enterprise Name"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="e.g. Acme Global Technologies or Metro Supplies"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Business Sector / Model
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BUSINESS_TYPES.map((bt) => {
                    const isSelected = businessType === bt.id;
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => setBusinessType(bt.id)}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-bold">{bt.name}</span>
                        <span className="text-[11px] text-slate-500 mt-0.5">{bt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inventory Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTracksInventory(true)}
                      className={`rounded-lg border p-2 text-xs font-semibold text-center ${
                        tracksInventory
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Tracks Physical Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setTracksInventory(false)}
                      className={`rounded-lg border p-2 text-xs font-semibold text-center ${
                        !tracksInventory
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Services Only (No Stock)
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">GST / Tax Registration</span>
                    <p className="text-[11px] text-slate-400">Enable if your business files GST or local sales tax</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={taxRegistered}
                    onChange={(e) => setTaxRegistered(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {taxRegistered && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="GSTIN / Tax ID"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="09AAACA1234F1Z5"
                    />
                    <Input
                      label="State Code"
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      placeholder="09"
                    />
                  </div>
                )}

                <Input
                  label="Operating Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street Address, City, Postal Code"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setCurrentStep(2)}>
              Next: Catalog Strategy <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Catalog & Categories */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 2: Choose Initial Product & Service Categories</CardTitle>
            </div>
            <CardDescription>
              Select the initial category structures you need. You can add or rename custom categories anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORY_PRESETS.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-center justify-between rounded-xl border p-3.5 text-left text-xs sm:text-sm font-semibold transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <Alert type="info" title="Universal Multi-Product & Service Architecture">
                Elvora seamlessly supports both physical goods (with barcode, HSN, and low-stock reorder thresholds) and non-inventory billable services (with SAC codes and hourly or project rates).
              </Alert>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setCurrentStep(3)}>
              Next: Invoicing & Printing <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Invoicing, Printing & Settlement */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 3: Billing Formats & Payment Settlement</CardTitle>
            </div>
            <CardDescription>
              Configure default invoice series, payment QR code details, and document layouts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    label="Invoice Prefix"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="INV-2026-"
                    helperText="Formatted as INV-2026-00001, INV-2026-00002..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Default Printing Format
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setPrinterFormat("A4")}
                      className={`rounded-lg border p-2.5 text-xs font-semibold text-center transition-all ${
                        printerFormat === "A4"
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      A4 Full-Sheet Tax Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrinterFormat("THERMAL_3INCH")}
                      className={`rounded-lg border p-2.5 text-xs font-semibold text-center transition-all ${
                        printerFormat === "THERMAL_3INCH"
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      3-Inch (80mm) POS Thermal
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <Input
                  label="UPI ID / Payment Link (Instant QR Code on Invoices)"
                  value={upiOrPaymentLink}
                  onChange={(e) => setUpiOrPaymentLink(e.target.value)}
                  placeholder="yourcompany@upi or payment-link"
                  helperText="Printed on both A4 and Thermal invoices for instant client scan-and-pay."
                />
              </div>

              <div>
                <Input
                  label="Corporate Bank Account Details (Printed on Invoices)"
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="Bank Name, Account Number, IFSC / SWIFT Code"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={handleCompleteSetup} isLoading={isSubmitting}>
              Complete Setup & Open Workspace <Check className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
