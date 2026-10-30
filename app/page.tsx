import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { 
  Boxes, 
  ShieldCheck, 
  Keyboard, 
  Calculator, 
  FileSpreadsheet, 
  ArrowRight,
  CheckCircle2,
  Users,
  HelpCircle
} from "lucide-react";
import { ElvoraLogo } from "@/components/logo";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    const session = await verifySessionToken(sessionCookie);
    if (session && session.userId && session.activeTenantId) {
      redirect("/dashboard");
    }
  }

  const industries = [
    "Retail Stores & Supermarkets",
    "Wholesalers & Distributors",
    "Electronics, Hardware & Gadgets",
    "Apparel, Footwear & Fashion",
    "Manufacturing & Industrial Supplies",
    "Professional Services & Consulting",
    "Food, Cafe & FMCG",
    "General Trading & Contracting",
  ];

  const features = [
    {
      icon: Keyboard,
      title: "High-Speed Counter POS",
      description: "Keyboard-first counter billing designed for extreme checkout throughput. Instant product lookup, barcode scanning, auto-tax computation, and split payment modes.",
      highlight: "F2 POS & F8 Instant Print",
    },
    {
      icon: Calculator,
      title: "Precision GST Compliance",
      description: "Zero floating-point rounding errors. Exact decimal calculations for Indian GST slabs (0%, 5%, 12%, 18%, 28%), automatic CGST/SGST vs IGST split, and legal round-off.",
      highlight: "GSTR-1 & 3B Ready",
    },
    {
      icon: ShieldCheck,
      title: "Multi-Tenant Data Vault",
      description: "Every business operates within an isolated cryptographic workspace. Automated unit tests and server-side verification ensure absolute confidentiality of business records.",
      highlight: "100% Data Isolation",
    },
    {
      icon: Boxes,
      title: "Live Stock & Variant Ledger",
      description: "Manage physical goods with SKU variants, sizes, and colors alongside non-inventory services. Atomic stock movements prevent negative or corrupted inventory.",
      highlight: "Real-time Audit Trail",
    },
    {
      icon: Users,
      title: "Parties & Udhar Khata",
      description: "Track customer receivables and supplier payables with dual-entry precision. Monitor outstanding balances, aging ledgers, and send instant payment receipts.",
      highlight: "Customer & Supplier Ledgers",
    },
    {
      icon: FileSpreadsheet,
      title: "Cashflow, P&L & Ledgers",
      description: "Automated double-entry general ledger journal entries. Monitor operating expenses, cash-in-hand, bank balances, and real-time profit and loss statements.",
      highlight: "Real-Time Balance Sheet",
    },
  ];

  const faqs = [
    {
      q: "How does the 14-day free trial work?",
      a: "You get unrestricted access to all features for 14 days without entering a credit card. You can configure your store, add products, issue live GST invoices, and test counter billing immediately.",
    },
    {
      q: "Is my business data private and isolated from other stores?",
      a: "Yes. Elvora is architected with strict multi-tenant isolation. Every query, calculation, and report is scoped strictly to your authenticated workspace. No other tenant can ever access or view your records.",
    },
    {
      q: "Does Elvora support both GST-registered and unregistered businesses?",
      a: "Yes. Registered businesses generate official B2B Tax Invoices with GSTIN validation and automatic tax breakdowns. Unregistered businesses automatically issue standard B2C Retail Bills of Supply.",
    },
    {
      q: "Can I use standard thermal receipt and barcode printers?",
      a: "Yes. Elvora natively outputs clean formats for standard 80mm (3-inch) and 58mm thermal receipt printers, USB/Bluetooth barcode scanners, and formal A4 tax invoices with dynamic UPI QR codes.",
    },
    {
      q: "Can multiple staff members bill at the same time?",
      a: "Yes. You can invite team members with role-based access control (OWNER, MANAGER, BILLER, ACCOUNTANT) so multiple counters can bill simultaneously without data conflict.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      {/* 1. Header (Navbar) */}
      <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: Brand + Tagline */}
          <div className="flex items-center">
            <ElvoraLogo showTagline size="md" />
          </div>

          {/* Right: Auth Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#111827] hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#1D4ED8] active:bg-blue-800 transition-all"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F8FAFC] to-[#F8FAFC] px-4 pt-16 pb-16 sm:px-6 lg:pt-20 lg:pb-24">
          <div className="mx-auto max-w-4xl text-center">
            {/* Main Headline */}
            <h1 className="text-4xl font-extrabold tracking-tight text-[#111827] sm:text-5xl lg:text-6xl leading-[1.15]">
              The Universal Operating System <br className="hidden sm:inline" />
              <span className="text-[#2563EB]">for Modern Growing Businesses.</span>
            </h1>

            {/* Supporting Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#475569] leading-relaxed">
              Manage billing, inventory, sales, purchases, customers, expenses, and business finances — all from one intelligent platform.
            </p>

            {/* Call to Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-[#1D4ED8] active:bg-blue-800 transition-all"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-[#111827] hover:bg-slate-50 transition-colors shadow-xs"
              >
                Sign In
              </Link>
            </div>

            {/* Supported Sectors */}
            <div className="mt-12 pt-8 border-t border-[#E2E8F0]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">
                Built for every commercial trade and industry
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {industries.map((ind) => (
                  <span
                    key={ind}
                    className="rounded-full bg-white border border-[#E2E8F0] px-3 py-1 text-xs font-medium text-[#475569] shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. High-Fidelity Product UI Preview */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-5 shadow-lg shadow-slate-200/50">
            {/* Window Topbar */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 px-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-bold text-[#111827]">Elvora Workspace — Counter POS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Counter
                </span>
                <span className="text-xs text-[#64748B] hidden sm:inline">INV-2026-0001</span>
              </div>
            </div>

            {/* Interactive Billing Preview Grid */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Catalog Items */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                    Quick-Add Catalog
                  </span>
                  <span className="text-xs text-[#64748B]">Press F2 to Search</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/70 p-3 hover:border-blue-300 transition-colors">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Hardware & Tools</span>
                    <h4 className="mt-1 text-xs font-bold text-[#111827]">Heavy Duty Power Drill 750W</h4>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#111827]">₹2,850.00</span>
                      <span className="text-[11px] text-emerald-600 font-semibold">18 PCS</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/70 p-3 hover:border-blue-300 transition-colors">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Apparel</span>
                    <h4 className="mt-1 text-xs font-bold text-[#111827]">Executive Formal Shirt - L</h4>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#111827]">₹1,299.00</span>
                      <span className="text-[11px] text-emerald-600 font-semibold">42 PCS</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/70 p-3 hover:border-blue-300 transition-colors">
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Electronics</span>
                    <h4 className="mt-1 text-xs font-bold text-[#111827]">Wireless Optical Mouse (Silent)</h4>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#111827]">₹899.00</span>
                      <span className="text-[11px] text-emerald-600 font-semibold">35 BOX</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/70 p-3 hover:border-blue-300 transition-colors">
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Services</span>
                    <h4 className="mt-1 text-xs font-bold text-[#111827]">Annual IT Maintenance Retainer</h4>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#111827]">₹15,000.00</span>
                      <span className="text-[11px] text-slate-500 font-semibold">Service</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Bill Summary */}
              <div className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-white p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-bold text-[#111827]">Tax Invoice Summary</span>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">B2B GST</span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-[#475569]">
                      <span>Taxable Value:</span>
                      <span className="font-semibold text-[#111827]">₹20,499.00</span>
                    </div>
                    <div className="flex justify-between text-[#475569]">
                      <span>CGST (Central Tax 9%):</span>
                      <span className="font-semibold text-[#111827]">₹1,719.98</span>
                    </div>
                    <div className="flex justify-between text-[#475569]">
                      <span>SGST (State Tax 9%):</span>
                      <span className="font-semibold text-[#111827]">₹1,719.98</span>
                    </div>
                    <div className="flex justify-between text-[#475569]">
                      <span>Commercial Round-off:</span>
                      <span className="font-semibold text-emerald-600">+₹0.04</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                    <span className="text-sm font-extrabold text-[#111827]">Grand Total:</span>
                    <span className="text-xl font-extrabold text-[#2563EB]">₹23,939.00</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex gap-2">
                  <div className="flex-1 rounded-lg bg-slate-100 py-2 text-center text-xs font-bold text-[#111827]">
                    Cash / UPI
                  </div>
                  <div className="flex-1 rounded-lg bg-[#2563EB] py-2 text-center text-xs font-bold text-white shadow-xs">
                    Save & Print (F8)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Feature Pillars Section */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 border-t border-[#E2E8F0]">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              Enterprise-Grade Capabilities, Zero Complexity
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Every tool modern businesses need to streamline transactions, stock audit, and accounts
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-[#111827]">{feat.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-[#2563EB] flex items-center gap-1">
                      {feat.highlight}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. 3-Step Simple Onboarding Workflow */}
        <section className="bg-white border-y border-[#E2E8F0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
                Streamline Your Store in 3 Steps
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Fast setup without technical overhead or complex server configurations
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 text-center md:text-left">
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB] text-white font-bold text-sm">
                  1
                </span>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Set Up Store Workspace</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Register your business name, trade type, GST details, state code, and optional receipt header branding in under 60 seconds.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F172A] text-white font-bold text-sm">
                  2
                </span>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Add Products & Batches</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Import products with HSN codes, GST rates, cost prices, SKUs, and barcodes, or create items on the fly during counter billing.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D9488] text-white font-bold text-sm">
                  3
                </span>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Bill, Collect & Scale</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Issue compliant A4 and thermal invoices, manage customer Khata dues, audit stock variances, and download GSTR-ready reports.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Commercial SaaS Pricing Section */}
        <section className="bg-[#F8FAFC] px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-7xl text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Transparent Commercial Pricing
            </span>
            <h2 className="text-3xl font-extrabold text-[#111827] sm:text-4xl">
              Scalable Plans for Every Stage of Business Growth
            </h2>
            <p className="mx-auto max-w-2xl text-xs sm:text-sm text-[#475569]">
              Start with a 14-day full access free trial. No credit card required to register. Server-enforced limits ensure seamless growth.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
              {/* Plan 1: Free Trial */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#475569]">
                    Free Trial
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-[#111827]">₹0</span>
                    <span className="text-xs text-[#64748B]"> / 14 days</span>
                  </div>
                  <p className="text-xs text-[#475569]">Explore all features risk-free with sample or live store data.</p>
                  <ul className="space-y-2 text-xs text-[#475569] pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 50 Invoices / month</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 100 Products</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 2 Staff Members</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> A4 & Thermal Billing</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Standard Reports</li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-6 block w-full rounded-xl border border-[#E2E8F0] py-2.5 text-center text-xs font-bold text-[#111827] hover:bg-slate-50 transition shadow-2xs"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Plan 2: Starter */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#2563EB] border border-blue-200">
                    Starter
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-[#111827]">₹499</span>
                    <span className="text-xs text-[#64748B]"> / month</span>
                  </div>
                  <p className="text-xs text-[#475569]">For retail shops and standalone trading counters.</p>
                  <ul className="space-y-2 text-xs text-[#475569] pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 300 Invoices / month</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 500 Product Varieties</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 3 Staff Members</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Thermal & A4 Formats</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Customer Khata Dues</li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-6 block w-full rounded-xl bg-[#0F172A] py-2.5 text-center text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
                >
                  Choose Starter
                </Link>
              </div>

              {/* Plan 3: Growth Pro (Most Popular) */}
              <div className="rounded-2xl border-2 border-[#2563EB] bg-white p-6 shadow-lg shadow-blue-500/10 flex flex-col justify-between relative">
                <span className="absolute -top-3 right-5 rounded-full bg-[#2563EB] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                  Most Popular
                </span>
                <div className="space-y-4">
                  <div className="inline-block rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                    Growth Pro
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-[#111827]">₹1,499</span>
                    <span className="text-xs text-[#64748B]"> / month</span>
                  </div>
                  <p className="text-xs text-[#475569]">For wholesalers, multi-counter stores, and distributors.</p>
                  <ul className="space-y-2 text-xs text-[#475569] pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> <strong>Unlimited Invoices</strong></li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> 5,000 Products</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> 10 Staff Members (RBAC)</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> GSTR-1 & 3B Tax Reports</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Multi-Location & Auditing</li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-6 block w-full rounded-xl bg-[#2563EB] py-2.5 text-center text-xs font-bold text-white hover:bg-[#1D4ED8] transition shadow-xs"
                >
                  Get Growth Pro
                </Link>
              </div>

              {/* Plan 4: Enterprise */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#475569]">
                    Enterprise
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-[#111827]">₹3,999</span>
                    <span className="text-xs text-[#64748B]"> / month</span>
                  </div>
                  <p className="text-xs text-[#475569]">For large distribution chains, depots, and factories.</p>
                  <ul className="space-y-2 text-xs text-[#475569] pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Unlimited Invoices & Items</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 50 Staff Members</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Custom GST Series</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Priority Support</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 99.9% Uptime Guarantee</li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-6 block w-full rounded-xl border border-[#E2E8F0] py-2.5 text-center text-xs font-bold text-[#111827] hover:bg-slate-50 transition shadow-2xs"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Frequently Asked Questions (FAQ) */}
        <section className="bg-white border-t border-[#E2E8F0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Everything you need to know about Elvora billing and management
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 transition-colors hover:border-slate-300"
                >
                  <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[#2563EB] flex-shrink-0" />
                    {faq.q}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed pl-6">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 8. Professional SaaS Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-12 text-center text-xs text-[#64748B]">
        <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-4">
          <ElvoraLogo size="sm" showTagline />
          <div className="flex flex-wrap items-center justify-center gap-6 text-[#475569] font-medium pt-2">
            <Link href="/privacy" className="hover:text-[#111827] transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#111827] transition">
              Terms of Service
            </Link>
            <Link href="/login" className="hover:text-[#111827] transition">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-[#111827] transition">
              Register Business
            </Link>
            <Link href="/admin/login" className="text-slate-400 hover:text-slate-600 transition">
              Platform Admin
            </Link>
          </div>
          <p className="text-slate-400 mt-2">
            © {new Date().getFullYear()} Elvora Multi-Tenant SaaS. Simpler Business. Smarter Growth. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
