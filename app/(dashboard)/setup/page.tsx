"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ArrowRight,
  ArrowLeft,
  Printer,
  Boxes,
  Warehouse,
  ShieldCheck,
  FileCheck2,
  Save,
  Sparkles,
  AlertCircle,
  Store,
  Sliders,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IndustryTemplate,
  IndustryTemplateId,
  TEMPLATE_REGISTRY,
} from "@/lib/templates/definitions";

const TEMPLATE_CARDS: {
  id: IndustryTemplateId;
  name: string;
  desc: string;
  iconBg: string;
}[] = [
  {
    id: "sanitaryware",
    name: "Sanitaryware & Bath Fittings",
    desc: "Ceramic sanitaryware, CP brass faucets, showers, diverters & vanities",
    iconBg: "bg-cyan-500",
  },
  {
    id: "fmcg",
    name: "Grocery & FMCG",
    desc: "Supermarkets, packaged goods, barcode POS & batch expiry tracking",
    iconBg: "bg-emerald-500",
  },
  {
    id: "electronics",
    name: "Electronics & Mobiles",
    desc: "Smartphones, IT hardware, IMEI/serial tracking & warranty cards",
    iconBg: "bg-blue-500",
  },
  {
    id: "apparel",
    name: "Clothing & Apparel",
    desc: "Fashion garments, footwear, 2D Size × Color variant matrix & tags",
    iconBg: "bg-purple-500",
  },
  {
    id: "hardware",
    name: "Hardware & Tools",
    desc: "Power tools, fasteners, contractor credit & mixed UOM pricing (KG, MTR)",
    iconBg: "bg-amber-500",
  },
  {
    id: "wholesale",
    name: "Wholesale & B2B",
    desc: "Bulk trading, carton packs, MOQ, credit limits & tiered pricing",
    iconBg: "bg-indigo-500",
  },
  {
    id: "manufacturing",
    name: "Manufacturing & Assembly",
    desc: "Raw materials, WIP, Bill of Materials (BOM) & production lot control",
    iconBg: "bg-rose-500",
  },
];

const INDIAN_STATES = [
  { code: "09", name: "09 - Uttar Pradesh" },
  { code: "07", name: "07 - Delhi" },
  { code: "27", name: "27 - Maharashtra" },
  { code: "24", name: "24 - Gujarat" },
  { code: "29", name: "29 - Karnataka" },
  { code: "06", name: "06 - Haryana" },
  { code: "08", name: "08 - Rajasthan" },
  { code: "19", name: "19 - West Bengal" },
  { code: "33", name: "33 - Tamil Nadu" },
  { code: "36", name: "36 - Telangana" },
  { code: "03", name: "03 - Punjab" },
  { code: "10", name: "10 - Bihar" },
  { code: "23", name: "23 - Madhya Pradesh" },
];

export default function SmartOnboardingWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Template Selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<IndustryTemplateId>("sanitaryware");

  // Step 2: Business & Legal Details
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [stateCode, setStateCode] = useState("09");
  const [gstType, setGstType] = useState<"REGULAR" | "COMPOSITION" | "UNREGISTERED">("REGULAR");
  const [gstin, setGstin] = useState("");

  // Step 3: Business-Specific Attributes & Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeAttributes, setActiveAttributes] = useState<string[]>([]);

  // Step 4: Storage & Locations
  const [enableWarehouses, setEnableWarehouses] = useState(false);
  const [warehouseName, setWarehouseName] = useState("Main Warehouse");
  const [minStockAlert, setMinStockAlert] = useState(5);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);

  // Step 5: Pricing & Invoicing
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [printFormat, setPrinterFormat] = useState<"A4" | "THERMAL_3INCH">("A4");
  const [showHsn, setShowHsn] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showBarcode, setShowBarcode] = useState(false);
  const [bankDetails, setBankDetails] = useState("");
  const [upiId, setUpiId] = useState("");

  // Active Template Reference
  const activeTemplate: IndustryTemplate = TEMPLATE_REGISTRY[selectedTemplateId] || TEMPLATE_REGISTRY.sanitaryware;

  // Sync defaults when template changes
  const applyTemplateDefaults = (templateId: IndustryTemplateId) => {
    const tmpl = TEMPLATE_REGISTRY[templateId];
    if (!tmpl) return;

    setSelectedTemplateId(templateId);
    setSelectedCategories(tmpl.categories.map((c) => c.name));
    setActiveAttributes(tmpl.attributes.map((a) => a.key));
    setPrinterFormat(tmpl.defaultInvoiceSettings.printFormat);
    setShowHsn(tmpl.defaultInvoiceSettings.showHsn);
    setShowDiscount(tmpl.defaultInvoiceSettings.showDiscount);
    setShowBarcode(tmpl.defaultInvoiceSettings.showBarcode);
    setEnableWarehouses(false); // strictly false by default per Section 4 & 5
  };

  // Fetch existing state / draft on mount
  useEffect(() => {
    async function loadState() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/tenant/onboarding");
        if (res.ok) {
          const data = await res.json();
          if (data.tenant) {
            setTradeName(data.tenant.tradeName || "");
            setLegalName(data.tenant.legalName || data.tenant.tradeName || "");
            setPhone(data.tenant.phone || "");
            setEmail(data.tenant.email || "");
            setAddress(data.tenant.address || "");
            setStateCode(data.tenant.stateCode || "09");
            setGstin(data.tenant.gstin || "");
            if (data.tenant.gstin) setGstType("REGULAR");
            if (data.tenant.invoicePrefix) setInvoicePrefix(data.tenant.invoicePrefix);
          }

          if (data.draft) {
            const d = data.draft;
            if (d.selectedTemplateId) setSelectedTemplateId(d.selectedTemplateId);
            if (d.tradeName) setTradeName(d.tradeName);
            if (d.legalName) setLegalName(d.legalName);
            if (d.address) setAddress(d.address);
            if (d.phone) setPhone(d.phone);
            if (d.email) setEmail(d.email);
            if (d.stateCode) setStateCode(d.stateCode);
            if (d.gstType) setGstType(d.gstType);
            if (d.gstin) setGstin(d.gstin);
            if (d.selectedCategories) setSelectedCategories(d.selectedCategories);
            if (d.activeAttributes) setActiveAttributes(d.activeAttributes);
            if (d.enableWarehouses !== undefined) setEnableWarehouses(d.enableWarehouses);
            if (d.warehouseName) setWarehouseName(d.warehouseName);
            if (d.printFormat) setPrinterFormat(d.printFormat);
            if (d.invoicePrefix) setInvoicePrefix(d.invoicePrefix);
            if (d.bankDetails) setBankDetails(d.bankDetails);
            if (d.upiId) setUpiId(d.upiId);
            if (data.onboardingStep && data.onboardingStep >= 1 && data.onboardingStep <= 7) {
              setCurrentStep(data.onboardingStep);
            }
          } else if (data.config?.businessType) {
            const bId = data.config.businessType as IndustryTemplateId;
            if (TEMPLATE_REGISTRY[bId]) {
              applyTemplateDefaults(bId);
            }
          } else {
            // Apply initial sanitaryware defaults
            applyTemplateDefaults("sanitaryware");
          }
        }
      } catch {
        // Fallback gracefully to default template
        applyTemplateDefaults("sanitaryware");
      } finally {
        setIsLoading(false);
      }
    }

    loadState();
  }, []);

  // Save draft progress
  const handleSaveDraft = async () => {
    setSaveStatus("Saving draft...");
    setError(null);
    try {
      const draftPayload = {
        selectedTemplateId,
        tradeName,
        legalName,
        address,
        phone,
        email,
        stateCode,
        gstType,
        gstin,
        selectedCategories,
        activeAttributes,
        enableWarehouses,
        warehouseName,
        minStockAlert,
        allowNegativeStock,
        invoicePrefix,
        printFormat,
        showHsn,
        showDiscount,
        showBarcode,
        bankDetails,
        upiId,
      };

      const res = await fetch("/api/tenant/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_draft",
          step: currentStep,
          businessType: selectedTemplateId,
          draftData: draftPayload,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save progress");
      }

      setSaveStatus("Progress saved successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
      setSaveStatus(null);
    }
  };

  // Step 8: Finalize & Complete Setup
  const handleFinalizeSetup = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        action: "complete",
        businessType: selectedTemplateId,
        tradeName: tradeName.trim() || activeTemplate.name,
        legalName: legalName.trim() || tradeName.trim() || activeTemplate.name,
        gstin: gstType === "REGULAR" ? gstin.trim() : null,
        stateCode,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || null,
        enableWarehouses,
        warehouseName: enableWarehouses ? warehouseName.trim() : undefined,
        allowNegativeStock,
        categories: selectedCategories,
        activeAttributes,
        invoicePrefix: invoicePrefix.trim() || "INV-",
        printFormat,
        showHsn,
        showDiscount,
        showBarcode,
        bankDetails: bankDetails.trim() || undefined,
        upiId: upiId.trim() || undefined,
      };

      const res = await fetch("/api/tenant/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize business workspace");
      }

      setCurrentStep(8);

      // Redirect after brief celebration
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Initialization failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const toggleAttribute = (attrKey: string) => {
    setActiveAttributes((prev) =>
      prev.includes(attrKey) ? prev.filter((a) => a !== attrKey) : [...prev, attrKey]
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading business configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Wizard Header & Progress Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Universal SaaS Setup Wizard
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Configure Your Business Workspace
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Step {currentStep} of 8 — Sensible industry defaults with owner-controlled customization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="text-xs font-semibold text-slate-600"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" /> Save Draft
            </Button>
            {saveStatus && (
              <span className="text-xs text-emerald-600 font-medium animate-pulse">
                {saveStatus}
              </span>
            )}
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-2 border-t border-slate-100">
          {[
            { num: 1, label: "Industry" },
            { num: 2, label: "Profile" },
            { num: 3, label: "Attributes" },
            { num: 4, label: "Storage" },
            { num: 5, label: "Billing" },
            { num: 6, label: "Roles" },
            { num: 7, label: "Review" },
            { num: 8, label: "Finish" },
          ].map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => s.num < currentStep && setCurrentStep(s.num)}
                disabled={s.num > currentStep}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                  isCurrent
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : isDone
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "bg-slate-50 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span className="text-[10px] font-bold">
                  {isDone ? <Check className="h-3 w-3 inline" /> : s.num}
                </span>
                <span className="text-[10px] truncate max-w-full mt-0.5">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: Business Type Selection */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 1: Choose Your Business Industry Template</CardTitle>
            </div>
            <CardDescription>
              Select your primary trade. Elvora will dynamically tailor categories, measurement units, product attributes, and billing formats to match your operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATE_CARDS.map((tc) => {
                const isSelected = selectedTemplateId === tc.id;
                return (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => applyTemplateDefaults(tc.id)}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg ${tc.iconBg} text-white flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Boxes className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{tc.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{tc.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="text-xs font-bold text-slate-800">
                Selected: {activeTemplate.name}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">{activeTemplate.description}</p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  Default Unit: {activeTemplate.defaultUom}
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  Supported Units: {activeTemplate.supportedUoms.join(", ")}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <span className="text-xs text-slate-400">Step 1 of 8</span>
            <Button onClick={() => setCurrentStep(2)}>
              Next: Business Details <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Business & Legal Details */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 2: Business & Legal Details</CardTitle>
            </div>
            <CardDescription>
              Enter the commercial identity printed on invoices and used for tax reporting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Shop / Trade Name *"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="e.g. Apex Bath Showroom"
              />
              <Input
                label="Legal Registered Name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Apex Luxury Fittings Pvt Ltd"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Primary Contact Phone *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
              />
              <Input
                label="Official Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. billing@apexinteriors.com"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State / Territory Jurisdiction *
                </label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GST Registration Status *
                </label>
                <select
                  value={gstType}
                  onChange={(e) => setGstType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="REGULAR">Regular GST Registered (GSTR-1 & ITC Eligible)</option>
                  <option value="COMPOSITION">Composition Scheme (Flat rate)</option>
                  <option value="UNREGISTERED">Unregistered / Small Trader</option>
                </select>
              </div>
            </div>

            {gstType === "REGULAR" && (
              <Input
                label="15-Digit GSTIN Number"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="09AAACA9999F1Z1"
                helperText="First 2 digits must match selected state code"
              />
            )}

            <Input
              label="Operating Physical Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop No, Complex, Street, City, Pincode"
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setCurrentStep(3)}>
              Next: Attributes & Catalog <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Business-Specific Attributes & Categories */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 3: Industry Attributes & Product Categories</CardTitle>
            </div>
            <CardDescription>
              Configure the active fields for items in {activeTemplate.name}. You can activate or deactivate fields anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Active Product Attributes */}
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Product Specification Attributes
              </span>
              <p className="text-[11px] text-slate-500 mb-3">
                Fields shown when adding or editing items in your inventory:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeTemplate.attributes.map((attr) => {
                  const isChecked = activeAttributes.includes(attr.key);
                  return (
                    <div
                      key={attr.key}
                      onClick={() => toggleAttribute(attr.key)}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "border-blue-600 bg-blue-50/60 text-blue-900"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <div>
                        <span className="text-xs font-bold">{attr.label}</span>
                        <p className="text-[11px] text-slate-500">{attr.description || `Key: ${attr.key}`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Categories to Provision */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Default Industry Categories
              </span>
              <p className="text-[11px] text-slate-500 mb-3">
                Pre-loaded categories for {activeTemplate.name} (uncheck any you don&apos;t need):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeTemplate.categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setCurrentStep(4)}>
              Next: Storage & Warehouses <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: Inventory & Storage Configuration */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 4: Inventory & Storage Configuration</CardTitle>
            </div>
            <CardDescription>
              Elvora enables single shop counter stock by default. Multi-location warehouse transfers are strictly optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Shop Location (Always Enabled) */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Store className="h-5 w-5 text-blue-600" />
                  <div>
                    <span className="text-xs font-bold text-blue-950">
                      Primary Shop Counter Location (Default)
                    </span>
                    <p className="text-[11px] text-blue-700">
                      Operational stock point for day-to-day sales invoices and counter POS.
                    </p>
                  </div>
                </div>
                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                  Always Active
                </span>
              </div>
            </div>

            {/* Optional Multi-Warehouse Activation */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Enable Multi-Location Warehouses
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Activate if you hold bulk inventory in separate godowns and transfer stock to your shop counter.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={enableWarehouses}
                  onChange={(e) => setEnableWarehouses(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {enableWarehouses && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <Input
                    label="Primary Warehouse / Godown Name"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    placeholder="e.g. Main Godown or Central Logistics Hub"
                  />
                  <p className="text-[11px] text-slate-400">
                    You will be able to perform Shop ⇄ Warehouse stock transfers and view location-wise valuation.
                  </p>
                </div>
              )}
            </div>

            {/* Stock Policy */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Low-Stock Reorder Threshold"
                type="number"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                placeholder="5"
                helperText="Triggers low-stock alerts on dashboard"
              />

              <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">Allow Negative Stock</span>
                  <p className="text-[11px] text-slate-400">Permit billing items before inward entry</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowNegativeStock}
                  onChange={(e) => setAllowNegativeStock(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setCurrentStep(5)}>
              Next: Pricing & Invoicing <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: Pricing & Billing Preferences */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 5: Pricing & Billing Preferences</CardTitle>
            </div>
            <CardDescription>
              Configure invoice numbering series, print layouts, and digital settlement details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Invoice Prefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-2026-"
                helperText="e.g. INV-2026-0001, INV-2026-0002"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Invoice Print Layout
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setPrinterFormat("A4")}
                    className={`rounded-lg border p-2.5 text-xs font-semibold text-center transition-all ${
                      printFormat === "A4"
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    A4 Full Page (Showroom / B2B)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterFormat("THERMAL_3INCH")}
                    className={`rounded-lg border p-2.5 text-xs font-semibold text-center transition-all ${
                      printFormat === "THERMAL_3INCH"
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    80mm Thermal Slip (POS Counter)
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHsn}
                  onChange={(e) => setShowHsn(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Show HSN/SAC Codes
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDiscount}
                  onChange={(e) => setShowDiscount(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Show Item Discounts
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBarcode}
                  onChange={(e) => setShowBarcode(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Show Barcodes on Invoices
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
              <Input
                label="Bank Account Details (Printed on Invoice)"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder="Bank Name, A/C No, IFSC Code"
              />
              <Input
                label="UPI VPA ID (For Instant Payment QR)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. apexinteriors@okhdfcbank"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setCurrentStep(6)}>
              Next: Team & Roles <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: Owner & Staff Configuration */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 6: Team Roles & Access Control</CardTitle>
            </div>
            <CardDescription>
              Review your master workspace credentials and team permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950">Workspace Owner Role</span>
                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                  Full Authority
                </span>
              </div>
              <p className="text-[11px] text-blue-800">
                You are registered as the primary OWNER with unrestricted access to financial ledgers, audit logs, tax reports, discount approvals, and team invitations.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Built-in Staff Roles Available Later:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-xs font-bold text-slate-900">Manager</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Day-to-day operations, stock adjustments, purchase entry & customer accounts.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-xs font-bold text-slate-900">Biller / POS Cashier</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Fast counter billing, payment receipts, barcode scanning. Restricted pricing.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-xs font-bold text-slate-900">Accountant</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    General ledger, GST returns, supplier reconciliations, trial balances.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(5)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setCurrentStep(7)}>
              Next: Review & Confirm <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: Review & Confirmation */}
      {/* ========================================================================= */}
      {currentStep === 7 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-blue-600" />
              <CardTitle>Step 7: Review Workspace Configuration</CardTitle>
            </div>
            <CardDescription>
              Confirm your business parameters. You can change any option before initializing your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Business Identity
                </span>
                <div>
                  <span className="text-sm font-bold text-slate-900">{tradeName || "Untitled Business"}</span>
                  <p className="text-xs text-slate-500">{legalName || tradeName}</p>
                  <p className="text-xs text-slate-500">{address || "No address specified"}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    GSTIN: {gstin || "None (Unregistered / Composition)"} | State: {stateCode}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Industry & Operations
                </span>
                <div>
                  <span className="text-sm font-bold text-slate-900">{activeTemplate.name}</span>
                  <p className="text-xs text-slate-500">Default Unit: {activeTemplate.defaultUom}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Locations: Main Shop Counter {enableWarehouses ? `+ ${warehouseName}` : "(Single Location)"}
                  </p>
                  <p className="text-xs text-slate-600">
                    Print Layout: {printFormat === "A4" ? "A4 Full Sheet" : "80mm Thermal Slip"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Categories to Initialize ({selectedCategories.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCategories.map((c) => (
                  <span key={c} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(6)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleFinalizeSetup}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSubmitting ? "Initializing Workspace..." : "Apply & Initialize Workspace"}
              <Sparkles className="h-4 w-4 ml-1.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 8: Success & Celebration */}
      {/* ========================================================================= */}
      {currentStep === 8 && (
        <Card className="text-center py-10">
          <CardContent className="space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Workspace Initialized Successfully!
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your {activeTemplate.name} workspace has been configured with initial categories, units, and inventory locations. Redirecting to your dashboard...
            </p>
            <div className="pt-4">
              <Button onClick={() => router.push("/dashboard")} className="font-bold">
                Go to Dashboard Now <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
