import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { 
  Calculator, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  Receipt, 
  Zap, 
  Printer, 
  HelpCircle 
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, getFaqSchema, siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "GST Billing Software for Indian Retail & Wholesale",
  description:
    "Fast, compliant GST invoicing software. Auto-calculate CGST, SGST & IGST slabs, print thermal receipts, generate tax invoices, and export GSTR-ready reports.",
  alternates: {
    canonical: `${siteConfig.url}/gst-billing-software`,
  },
  openGraph: {
    title: "GST Billing Software for Indian Retail & Wholesale | Elvora",
    description:
      "Fast, compliant GST invoicing software. Auto-calculate CGST, SGST & IGST slabs, print thermal receipts, generate tax invoices, and export GSTR-ready reports.",
    url: `${siteConfig.url}/gst-billing-software`,
  },
};

const faqs = [
  {
    q: "How does Elvora determine whether to charge CGST/SGST or IGST?",
    a: "Elvora automatically checks your store's 2-digit state code against the customer's state or GSTIN. If they are in the same state, it splits tax equally into CGST and SGST. For out-of-state sales, it applies IGST automatically.",
  },
  {
    q: "Can I print on both 3-inch thermal printers and standard A4 laser printers?",
    a: "Yes. Every invoice can be printed as a compact 80mm or 58mm thermal slip for counter walk-ins or exported as a full A4 GST Tax Invoice with legal declarations, bank details, and signature blocks.",
  },
  {
    q: "Does Elvora support reverse charge and composite tax schemes?",
    a: "Yes. You can flag invoices for Reverse Charge Mechanism (RCM) or configure composition dealer bill of supply format in Shop Settings.",
  },
  {
    q: "Can I export my sales data for GSTR-1 and GSTR-3B filing?",
    a: "Yes. Elvora produces Excel and CSV summary files grouped by B2B, B2C Large, B2C Small, and HSN summary matching the official GST portal format.",
  },
];

export default function GstBillingPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "GST Billing Software", url: "/gst-billing-software" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd data={[getBreadcrumbSchema(breadcrumbs), getFaqSchema(faqs)]} />

      <PublicHeader activeNav="gst" />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">GST Billing Software</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="px-4 pt-12 pb-16 sm:px-6 lg:pt-16 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <Calculator className="h-3.5 w-3.5 text-blue-600" />
              100% Precision Indian GST Engine
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-5xl lg:text-6xl leading-[1.15]">
              GST Billing Software Engineered for <br className="hidden sm:inline" />
              <span className="text-[#2563EB]">Speed, Accuracy, and Peace of Mind.</span>
            </h1>

            <p className="mx-auto max-w-2xl text-base sm:text-lg text-[#475569] leading-relaxed">
              Eliminate tax calculation errors, avoid GST department mismatch notices, and issue compliant tax invoices in under 5 seconds.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-all"
              >
                Get Started Today
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/invoice-generator"
                className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-[#111827] hover:bg-slate-50 transition-colors shadow-xs"
              >
                Try Free Invoice Generator
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              Why Indian Merchants Trust Elvora for GST Compliance
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Built ground-up with high-precision decimal math, not unreliable floating-point calculators
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] border border-blue-100">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Automatic Intra vs Inter-State Tax Routing</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Enter the buyer&apos;s GSTIN or select their state. Elvora automatically checks your store&apos;s home state and applies CGST + SGST (50/50 split) or IGST (full rate).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600">
                Zero manual tax choice errors
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Legal Decimal Round-Offs</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Calculates line-item taxes to exact decimal fractions and automatically records the legal commercial round-off in your general ledger.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600">
                Exact balance to 0.00
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <Printer className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Thermal & A4 Formats</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Print instant 2-inch and 3-inch thermal receipts for walk-in cash customers, or professional multi-item A4 tax invoices for corporate clients.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-purple-600">
                Compatible with all printers
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">HSN & SAC Code Validation</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Pre-configured HSN validation ensures you report mandatory 4, 6, or 8 digits matching government GST portal filing requirements.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-amber-600">
                Prevents Section 125 penalties
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">GSTR-1 & GSTR-3B Sync</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Export reconciled tax summaries categorized into B2B, B2C Large, B2C Small, and Credit Notes for seamless return filing by your CA.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-teal-600">
                Zero DRC-01B mismatch notices
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Double-Entry General Ledger</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Every bill automatically credits Output Tax Liability and Sales Revenue while debiting Cash or Accounts Receivable in real time.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600">
                Automatic Balance Sheet sync
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-white border-t border-[#E2E8F0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
                GST Billing FAQs
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Everything you need to know about Indian Goods & Services Tax billing with Elvora
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
              Ready to Upgrade to Fast, Error-Free GST Billing?
            </h2>
            <p className="text-sm text-slate-600">
              Join hundreds of growing retail and wholesale businesses across India. Get started with Elvora today.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-all"
              >
                Register Your Store
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
