import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
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
  Users,
  HelpCircle,
  Receipt
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { 
  getOrganizationSchema, 
  getWebsiteSchema, 
  getSoftwareApplicationSchema, 
  getFaqSchema,
  siteConfig
} from "@/lib/seo/config";

export const metadata: Metadata = {
  title: {
    absolute: "Elvora – GST Billing, Inventory & Business Management Software",
  },
  description:
    "Manage GST billing, inventory, sales, purchases, customers, expenses and business accounts with Elvora. Simplify daily operations and grow your business with one intelligent platform.",
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    title: "Elvora – GST Billing, Inventory & Business Management Software",
    description:
      "Manage GST billing, inventory, sales, purchases, customers, expenses and business accounts with Elvora. Simplify daily operations and grow your business with one intelligent platform.",
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Elvora – Business Management, GST Billing & Inventory SaaS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elvora – GST Billing, Inventory & Business Management Software",
    description:
      "Manage GST billing, inventory, sales, purchases, customers, expenses and business accounts with Elvora. Simplify daily operations and grow your business with one intelligent platform.",
    images: [`${siteConfig.url}/og-image.png`],
  },
};

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

  const coreSolutions = [
    {
      title: "GST Billing Software",
      href: "/gst-billing-software",
      desc: "Fast, compliant Indian GST tax invoicing with automatic CGST, SGST & IGST calculations and GSTR-ready exports.",
      icon: Calculator,
      tag: "Tax & Compliance",
    },
    {
      title: "Inventory & Stock Management",
      href: "/inventory-management-software",
      desc: "Real-time SKU variant tracking, low-stock reorder thresholds, batch records, and immutable stock audit ledgers.",
      icon: Boxes,
      tag: "Stock Control",
    },
    {
      title: "Counter POS Software",
      href: "/pos-software",
      desc: "High-speed keyboard-first checkout desk with F2 search, barcode scanner integration, and instant 3-inch thermal printing.",
      icon: Keyboard,
      tag: "Point of Sale",
    },
    {
      title: "Business Management Suite",
      href: "/business-management-software",
      desc: "Connect sales, purchases, customer Udhar Khata, supplier ledgers, and double-entry accounting in one platform.",
      icon: ShieldCheck,
      tag: "All-in-One ERP",
    },
    {
      title: "Online Invoicing Software",
      href: "/online-invoicing-software",
      desc: "Generate digital invoices with embedded UPI QR codes and share PDF bills directly via WhatsApp and email.",
      icon: Receipt,
      tag: "Digital Billing",
    },
    {
      title: "Free GST Invoice Generator",
      href: "/invoice-generator",
      desc: "Create and print clean, professional Indian GST tax invoices online for free with instant PDF download.",
      icon: FileSpreadsheet,
      tag: "Free Tool",
    },
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
      title: "Cryptographic Multi-Tenancy",
      description: "Shared database performance with strict tenant isolation. Customer ledgers, sales records, and financial books are cryptographically secured under independent tenant vaults.",
      highlight: "Tenant Data Security",
    },
    {
      icon: Boxes,
      title: "Real-Time Variant Inventory",
      description: "Track stock by size, color, finish, and model. Automatic deductions on sale finalization, restock alerts before stockouts, and CSV bulk catalog imports.",
      highlight: "Zero Dead Stock",
    },
    {
      icon: Users,
      title: "Customer Khata & Udhar Ledger",
      description: "Built-in party ledger for credit sales. Track outstanding balances, credit limits, payment receipts, aging receivables, and automated WhatsApp balance statements.",
      highlight: "Instant Reconciliation",
    },
    {
      icon: FileSpreadsheet,
      title: "Automated Financial Intelligence",
      description: "Instant profit-and-loss statements, cash vs bank balance tracking, operating expense ledgers, and exportable GSTR-1 & GSTR-3B tax summary workbooks.",
      highlight: "Double-Entry General Ledger",
    },
  ];

  const faqs = [
    {
      q: "What is Elvora?",
      a: "Elvora is an intelligent business management and GST billing SaaS built specifically for Indian retailers, wholesalers, and growing commercial enterprises. It unifies high-speed counter POS, inventory tracking, customer credit khata, and automated double-entry accounting on one modern cloud platform.",
    },
    {
      q: "Does Elvora support Indian GST tax regulations accurately?",
      a: "Yes. Elvora supports all official Indian GST tax slabs (0%, 5%, 12%, 18%, 28%), automatically routes intra-state sales to CGST + SGST and inter-state sales to IGST based on verified state codes, and formats legal tax invoices ready for GSTR-1 and GSTR-3B filing.",
    },
    {
      q: "Can I use thermal printers with Elvora for walk-in retail sales?",
      a: "Yes. Elvora includes built-in support for 3-inch (80mm) and 2-inch (58mm) thermal receipt printers, as well as formal full-sheet A4 GST tax invoices with bank details, terms, and authorized signature blocks.",
    },
    {
      q: "Does Elvora work on desktop computers and mobile devices?",
      a: "Yes. Elvora is accessible through any modern web browser on Windows PCs, MacBooks, tablets, and mobile smartphones with seamless responsive adaptation.",
    },
    {
      q: "Is my business data private and secure?",
      a: "Yes. Elvora uses strict tenant-isolated architecture where every query, record, and report is enforced by cryptographic tenant authorization. Your financial records, customer details, and invoice history are never accessible across other tenants.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd
        data={[
          getOrganizationSchema(),
          getWebsiteSchema(),
          getSoftwareApplicationSchema(),
          getFaqSchema(faqs),
        ]}
      />

      {/* 1. Header (Navbar) */}
      <PublicHeader activeNav="home" />

      {/* 2. Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F8FAFC] to-[#F8FAFC] px-4 pt-16 pb-12 sm:px-6 lg:pt-20 lg:pb-16">
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-[#1D4ED8] active:bg-blue-800 transition-all"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-[#111827] hover:bg-slate-50 transition-colors shadow-xs"
              >
                Sign In
              </Link>
            </div>

            {/* Real Product Interface Screenshot */}
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 sm:p-3 shadow-xl shadow-slate-200/60">
                <Image
                  src="/images/elvora-financial-dashboard-overview.webp"
                  alt="Elvora Business Management & GST Billing Live Dashboard Overview"
                  width={1000}
                  height={650}
                  priority
                  className="w-full rounded-xl object-cover"
                />
              </div>
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
                    className="rounded-lg bg-white border border-[#E2E8F0] px-3.5 py-1.5 text-xs font-medium text-[#475569] shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Core Solutions Pillar Grid (Google Sitelinks Preparation) */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              Core Business Solutions &amp; Capabilities
            </h2>
            <p className="mt-2 text-sm text-[#64748B] max-w-2xl mx-auto">
              Everything your business needs to operate faster, remain compliant, and scale profitably.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreSolutions.map((sol) => {
              const Icon = sol.icon;
              return (
                <Link
                  key={sol.href}
                  href={sol.href}
                  className="group rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {sol.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#111827] group-hover:text-blue-600 transition-colors">
                      {sol.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                      {sol.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-blue-600 gap-1 group-hover:gap-2 transition-all">
                    <span>Learn More</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. Counter POS High-Throughput Preview */}
        <section className="bg-white border-y border-[#E2E8F0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Speed &amp; Ergonomics
              </span>
              <h2 className="mt-3 text-2xl font-bold text-[#111827] sm:text-3xl">
                Engineered for Rush-Hour Counter Checkout
              </h2>
              <p className="mt-2 text-sm text-[#64748B] max-w-xl mx-auto">
                F2 keyboard lookup, barcode reader support, and instant thermal receipt printing keeps checkout lines moving without delays.
              </p>
            </div>

            <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 sm:p-3 shadow-lg">
              <Image
                src="/images/elvora-counter-pos-interface.webp"
                alt="Elvora Counter POS Interface — Fast Barcode Billing and Instant Print"
                width={1000}
                height={650}
                loading="lazy"
                className="w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </section>

        {/* 5. Feature Grid */}
        <section className="px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
                Everything You Need to Power Your Business
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Purpose-built tools replacing five disjointed software subscriptions with one unified workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-[#111827]">
                        {feat.title}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-[#2563EB]">
                        {feat.highlight}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. Frequently Asked Questions (FAQ) */}
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

      {/* 7. Professional SaaS Footer */}
      <PublicFooter />
    </div>
  );
}
