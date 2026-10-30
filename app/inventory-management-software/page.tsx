import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { 
  Boxes, 
  Layers, 
  AlertTriangle, 
  ArrowRight, 
  Barcode, 
  ShieldCheck, 
  PackageCheck, 
  History, 
  HelpCircle 
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, getFaqSchema, siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Inventory Management Software for Indian Retail & Wholesale | Elvora",
  description:
    "Real-time multi-location inventory tracking software. Manage SKU variants (size, finish, color), barcode scanning, automated low-stock alerts, CSV bulk imports, and audit ledgers.",
  alternates: {
    canonical: `${siteConfig.url}/inventory-management-software`,
  },
  openGraph: {
    title: "Inventory Management Software for Modern Businesses | Elvora",
    description:
      "Prevent stockouts and dead stock. Real-time SKU variant tracking, godown transfers, and atomic stock deductions for Indian retail and wholesale.",
    url: `${siteConfig.url}/inventory-management-software`,
  },
};

const faqs = [
  {
    q: "Can I manage product variants like different sizes and colors under one parent product?",
    a: "Yes. Elvora natively supports product variants. You can have a single product (e.g. Formal Shirt) with distinct variants for Size (M, L, XL), Color, or Finish, each with its own barcode, SKU, and stock count.",
  },
  {
    q: "How does Elvora prevent negative inventory?",
    a: "Elvora enforces a strict database-level negative stock prevention policy. When billing an item, the system verifies available physical stock before committing the sale, preventing phantom inventory.",
  },
  {
    q: "Can I bulk import our existing inventory from an Excel spreadsheet?",
    a: "Yes. Elvora includes a high-speed CSV Import tool with automated schema validation. It checks HSN codes, GST rates, cost prices, selling prices, and opening balances before importing.",
  },
  {
    q: "Does Elvora support weighted average cost valuation for balance sheets?",
    a: "Yes. Every stock receipt from purchase bills updates the weighted average purchase cost of the variant, allowing real-time valuation of your stock on hand.",
  },
];

export default function InventorySoftwarePage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Inventory Management Software", url: "/inventory-management-software" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd data={[getBreadcrumbSchema(breadcrumbs), getFaqSchema(faqs)]} />

      <PublicHeader activeNav="inventory" />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Inventory Management Software</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="px-4 pt-12 pb-16 sm:px-6 lg:pt-16 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <Boxes className="h-3.5 w-3.5 text-emerald-600" />
              Real-Time Multi-Location Inventory Engine
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-5xl lg:text-6xl leading-[1.15]">
              Total Stock Visibility Across Store, <br className="hidden sm:inline" />
              <span className="text-[#2563EB]">Godowns, and Distribution Hubs.</span>
            </h1>

            <p className="mx-auto max-w-2xl text-base sm:text-lg text-[#475569] leading-relaxed">
              Stop guessing your stock levels. Track variants, automate reorders, eliminate shrinkage, and know your true inventory valuation at any moment.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-all"
              >
                Start 14-Day Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-[#111827] hover:bg-slate-50 transition-colors shadow-xs"
              >
                View Plans & Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              Engineered for Modern Indian Retailers and Wholesalers
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Full variant support, atomic deductions, and audit ledgers that keep your stock 100% accurate
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] border border-blue-100">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Multi-Variant Management</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Organize complex inventories with SKUs for sizes, finishes, colors, and packaging units under unified parent products.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600">
                Size, finish, color, and packaging
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Low-Stock Alerts & Thresholds</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Define safety stock thresholds per item. The system triggers warnings before top sellers run out so you can issue purchase orders in advance.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-amber-600">
                Eliminates out-of-stock revenue loss
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Barcode className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Barcode Scanning & SKU Generation</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Scan pre-printed manufacturer EAN/UPC barcodes or generate sequential internal store SKUs with one click.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600">
                Plug-and-play barcode scanners
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <History className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Stock Movement Audit Ledger</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Every addition, sale, purchase receipt, adjustment, and return records an immutable audit ledger entry with timestamp and user attribution.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-purple-600">
                Complete traceability & zero shrinkage
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Strict Negative Stock Guard</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Ensures cashiers cannot bill inventory that does not exist in store, protecting balance sheets from phantom stock corruption.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-teal-600">
                Configurable per business policy
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Real-Time Stock Valuation</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Calculates total monetary value of on-hand stock based on weighted average purchase costs, ready for tax filing and lender audits.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600">
                Weighted average cost formula
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-white border-t border-[#E2E8F0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
                Inventory Software FAQs
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Answers to common inventory and warehouse management questions
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 transition-colors hover:border-slate-300"
                >
                  <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[#2563EB] shrink-0" />
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

        {/* CTA */}
        <section className="bg-gradient-to-b from-white to-slate-50 border-t border-[#E2E8F0] px-4 py-16 text-center">
          <div className="mx-auto max-w-3xl space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Gain Total Control Over Your Stock Today
            </h2>
            <p className="text-sm text-slate-600">
              Start tracking products, variants, and stock balances with zero hardware setup.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-all"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
