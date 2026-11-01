import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { 
  Keyboard, 
  Printer, 
  Zap, 
  ArrowRight, 
  CreditCard, 
  Split, 
  ShieldCheck, 
  QrCode, 
  HelpCircle 
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, getFaqSchema, siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Fast Keyboard-First Counter POS Software",
  description:
    "High-speed retail POS billing designed for busy checkout desks. Barcode scanning, F2 shortcuts, instant cash/UPI calculations, and 3-inch thermal printing.",
  alternates: {
    canonical: `${siteConfig.url}/pos-software`,
  },
  openGraph: {
    title: "Fast Keyboard-First Counter POS Software | Elvora",
    description:
      "High-speed retail POS billing designed for busy checkout desks. Barcode scanning, F2 shortcuts, instant cash/UPI calculations, and 3-inch thermal printing.",
    url: `${siteConfig.url}/pos-software`,
  },
};

const faqs = [
  {
    q: "Can I bill items without touching the mouse?",
    a: "Yes. Elvora's POS is designed keyboard-first. Press F2 to search, use arrow keys and Enter to select, type quantity, and press F8 to save and print.",
  },
  {
    q: "Does Elvora support split payments (e.g. half Cash and half UPI)?",
    a: "Yes. Customers can pay partially in Cash and partially via UPI, Card, or Store Credit, and both legs are cleanly journaled in your accounting ledger.",
  },
  {
    q: "Can multiple billing counters operate simultaneously in the same store?",
    a: "Yes. You can have multiple staff members logged in on separate laptops or POS terminals billing simultaneously without data conflicts.",
  },
  {
    q: "What barcode scanners work with Elvora POS?",
    a: "Any standard USB or Bluetooth HID barcode scanner works out of the box. Simply point and scan into the search bar.",
  },
];

export default function PosSoftwarePage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "POS Software", url: "/pos-software" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd data={[getBreadcrumbSchema(breadcrumbs), getFaqSchema(faqs)]} />

      <PublicHeader activeNav="pos" />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">POS Software</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="px-4 pt-12 pb-16 sm:px-6 lg:pt-16 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
              Ultra-Fast Counter Checkout Engine
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-5xl lg:text-6xl leading-[1.15]">
              High-Speed Retail Counter POS <br className="hidden sm:inline" />
              <span className="text-[#2563EB]">Built for Extreme Rush Hours.</span>
            </h1>

            <p className="mx-auto max-w-2xl text-base sm:text-lg text-[#475569] leading-relaxed">
              No mouse required. Scan barcodes, calculate GST automatically, accept UPI or cash, and hand over a printed thermal receipt in under 3 seconds.
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
                Test Invoice Preview
              </Link>
            </div>

            {/* POS Interface Preview Screenshot */}
            <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 sm:p-3 shadow-xl shadow-slate-200/50">
              <Image
                src="/images/elvora-counter-pos-interface.webp"
                alt="Elvora Retail Counter POS Interface with Barcode Scanning and Thermal Printing"
                width={1000}
                height={650}
                priority
                className="w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              Counter Speed Without Operational Friction
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Every millisecond saved at checkout directly increases your store&apos;s daily revenue
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] border border-blue-100">
                  <Keyboard className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Keyboard-First Ergonomics</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  F2 opens the quick search box. Arrow keys navigate items. Enter adds to cart. F8 triggers immediate thermal receipt printing.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600">
                F2 to Search • F8 to Print
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <QrCode className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Dynamic UPI QR Codes</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Generates instant dynamic UPI QR codes on the customer screen or printed receipt with the exact bill amount pre-filled.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600">
                GPay, PhonePe, Paytm ready
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <Printer className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Universal Printer Support</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Plug in any 2-inch (58mm) or 3-inch (80mm) thermal printer. Elvora outputs clean receipts with zero awkward margins or blurred text.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-purple-600">
                ESC/POS & standard Windows drivers
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <Split className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Split Payment Modes</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Accept cash for part of the bill and UPI or Card for the rest. Both accounts reconcile automatically in your daily cash register.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-amber-600">
                Cash, UPI, Card & Store Credit
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Instant Customer Khata Lookup</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Type customer phone or name to see previous dues, available credit balance, and record partial settlements right at the billing counter.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-teal-600">
                Real-time party ledger balance
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">Role-Based Cashier Security</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Restrict cashiers from viewing supplier purchase prices, editing finalized bills, or canceling invoices without manager authorization.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600">
                Staff RBAC & Audit Trail
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-white border-t border-[#E2E8F0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
                POS Software FAQs
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Common questions about setup, hardware compatibility, and billing speed
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
              Supercharge Your Store Counters Today
            </h2>
            <p className="text-sm text-slate-600">
              Zero expensive POS hardware required. Works on any laptop, tablet, or desktop browser.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-all"
              >
                Get Started Today
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
