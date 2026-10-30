import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { 
  FileText, 
  ArrowRight, 
  Send, 
  Clock, 
  HelpCircle,
  QrCode,
  RefreshCw
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, getFaqSchema, siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Online Invoicing Software | Create, Send & Track Digital Invoices | Elvora",
  description:
    "Fast cloud online invoicing software. Generate professional GST and commercial invoices, send via WhatsApp and email, collect payments with dynamic UPI QR codes, and automate recurring retainers.",
  alternates: {
    canonical: `${siteConfig.url}/online-invoicing-software`,
    languages: {
      "en-IN": `${siteConfig.url}/online-invoicing-software`,
      "en": `${siteConfig.url}/online-invoicing-software`,
      "x-default": `${siteConfig.url}/online-invoicing-software`,
    },
  },
  openGraph: {
    title: "Online Invoicing Software for Modern Businesses | Elvora",
    description:
      "Send professional invoices in seconds. Dynamic UPI QR codes, instant WhatsApp sharing, recurring billing schedules, and real-time payment tracking.",
    url: `${siteConfig.url}/online-invoicing-software`,
  },
};

const faqs = [
  {
    q: "Can I send invoices directly to my clients via WhatsApp?",
    a: "Yes. Every invoice generated in Elvora includes a one-click WhatsApp sharing trigger with a clean PDF preview and an itemized summary so clients can review and pay immediately on their smartphones.",
  },
  {
    q: "How does the dynamic UPI QR code on invoices work?",
    a: "Elvora generates a statutory Bharat QR / UPI string encoded with your store VPA and the exact payable decimal invoice amount. Customers can scan the QR code using Google Pay, PhonePe, Paytm, or BHIM without typing the amount manually, eliminating underpayment or mismatched transfers.",
  },
  {
    q: "Can I set up recurring invoices for monthly client retainers?",
    a: "Yes. For service businesses, agencies, and maintenance contractors, Elvora allows you to schedule automated recurring invoices with dynamic date placeholders and automated customer ledger postings.",
  },
  {
    q: "Does Elvora support both Indian GST invoices and export/international invoices?",
    a: "Yes. You can generate B2B/B2C Indian GST invoices with CGST/SGST/IGST breakdowns or switch to international export invoices with LUT reference declarations and multi-currency formats.",
  },
];

export default function OnlineInvoicingSoftwarePage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Online Invoicing Software", url: "/online-invoicing-software" },
  ];

  const features = [
    {
      icon: Send,
      title: "1-Click WhatsApp & Email Delivery",
      description: "Send branded PDF invoices directly to clients' mobile phones. Enjoy 90%+ open rates within 15 minutes of issuance.",
    },
    {
      icon: QrCode,
      title: "Dynamic UPI QR Payments",
      description: "Embed exact-amount UPI QR codes on both digital and printed invoices. Receive funds directly into your verified bank account.",
    },
    {
      icon: RefreshCw,
      title: "Automated Recurring Billing",
      description: "Put recurring monthly retainers, AMC maintenance contracts, and subscription fees on autopilot without manual re-entry.",
    },
    {
      icon: Clock,
      title: "Real-Time Payment Tracking",
      description: "Track whether invoices are unpaid, partially settled, or overdue. Trigger polite payment reminder statements with aging breakdown.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd data={[getBreadcrumbSchema(breadcrumbs), getFaqSchema(faqs)]} />

      <PublicHeader />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Online Invoicing Software</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:px-6 lg:pt-16 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700 mb-6">
              <FileText className="h-3.5 w-3.5" />
              <span>Modern Cloud Invoicing</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl leading-tight">
              Create, Send & Track <br />
              <span className="text-[#2563EB]">Professional Invoices Online</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
              Get paid faster with crisp digital invoices. Built for consultancies, wholesalers, agencies, and retail merchants who need speed, precision, and instant payment settlement.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 text-sm font-semibold text-white shadow-xs hover:bg-[#1D4ED8] transition-all"
              >
                Start Invoicing Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/invoice-generator"
                className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white px-6 py-3.5 text-sm font-semibold text-[#111827] hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Try Free Generator Tool
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              Engineered for Prompt Client Settlements
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Every feature designed to remove payment friction and accelerate your cash flow
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#111827]">{feat.title}</h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{feat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Invoicing Comparison */}
        <section className="bg-white py-16 border-t border-[#E2E8F0]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
                Why Modern Businesses Switch from Word/Excel to Elvora
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="rounded-xl border border-[#E2E8F0] p-5 space-y-3 bg-slate-50/50">
                <h3 className="text-sm font-bold text-[#111827]">1. Zero Math Errors</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Excel templates often have broken cell formulas leading to inaccurate tax totals. Elvora uses exact decimal computation and statutory rounding.
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] p-5 space-y-3 bg-slate-50/50">
                <h3 className="text-sm font-bold text-[#111827]">2. Automatic Inventory Deductions</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Invoicing in Word requires updating stock lists manually. Elvora automatically updates product stock counts the moment the invoice is saved.
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] p-5 space-y-3 bg-slate-50/50">
                <h3 className="text-sm font-bold text-[#111827]">3. Instant Ledger Updates</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Customer balances, aging receivables, and tax summaries update instantly in double-entry books without re-entering data into separate software.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#111827]">Frequently Asked Questions</h2>
            <p className="mt-2 text-sm text-[#64748B]">Everything you need to know about cloud invoicing with Elvora</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
                  {faq.q}
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-14 px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Start Invoicing Smarter Today</h2>
            <p className="text-sm text-blue-100 max-w-xl mx-auto">
              Create and share your first professional online invoice in under 2 minutes. Try risk-free for 14 days.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-white px-6 py-3 text-xs sm:text-sm font-bold text-blue-600 shadow-sm hover:bg-slate-100 transition"
              >
                Create Free Account
              </Link>
              <Link
                href="/gst-billing-software"
                className="rounded-lg border border-blue-400 bg-transparent px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-blue-800/50 transition"
              >
                Learn About GST Compliance
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
