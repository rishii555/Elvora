import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, getFaqSchema, siteConfig } from "@/lib/seo/config";
import { InvoiceGeneratorClient } from "./client";

export const metadata: Metadata = {
  title: "Online GST Invoice Generator & PDF Maker",
  description:
    "Generate professional, GST-compliant tax invoices online for free. Download PDF invoices, add custom business logos, and print clean A4 bills instantly.",
  alternates: {
    canonical: `${siteConfig.url}/invoice-generator`,
  },
  openGraph: {
    title: "Online GST Invoice Generator & PDF Maker | Elvora",
    description:
      "Generate professional, GST-compliant tax invoices online for free. Download PDF invoices, add custom business logos, and print clean A4 bills instantly.",
    url: `${siteConfig.url}/invoice-generator`,
  },
};

const faqs = [
  {
    q: "Is this GST invoice generator completely free?",
    a: "Yes. You can generate, customize, and print single invoices without registering an account. To save invoices permanently in cloud ledgers, automate inventory, and track customer dues, you can register for an Elvora business account.",
  },
  {
    q: "Does this invoice format comply with Indian GST Council rules?",
    a: "Yes. It includes all mandatory fields required under Rule 46 of the CGST Rules, including sequential invoice numbering, seller GSTIN, buyer GSTIN, place of supply, HSN codes, and itemized CGST/SGST/IGST breakdowns.",
  },
  {
    q: "Can I save this invoice as a PDF?",
    a: "Yes. When you click 'Print / Save PDF', your browser's print dialog will open where you can select 'Save as PDF' to save a clean electronic document.",
  },
];

export default function InvoiceGeneratorPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Free Invoice Generator", url: "/invoice-generator" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd data={[getBreadcrumbSchema(breadcrumbs), getFaqSchema(faqs)]} />

      <PublicHeader activeNav="invoice-gen" />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Free GST Invoice Generator</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="px-4 pt-8 pb-8 sm:px-6 text-center space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl">
            Free Online Indian GST Invoice Generator
          </h1>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-[#475569]">
            Create, calculate, and print professional GST tax invoices. Fast, accurate, and compliant with Indian tax regulations.
          </p>
        </section>

        {/* Interactive Client Tool */}
        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <InvoiceGeneratorClient />
        </section>

        {/* SEO Explanatory Guide Section */}
        <section className="bg-white border-t border-[#E2E8F0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Mandatory Elements of a Valid Indian GST Tax Invoice
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Under Section 31 of the CGST Act, 2017 read with Rule 46 of the CGST Rules, every registered taxable person supplying taxable goods or services must issue a tax invoice containing these essential particulars:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Seller & Buyer Particulars</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Legal Name, Trade Name, Registered Address, and 15-digit GSTIN of both the supplier and recipient (for B2B transactions).
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Sequential Numbering & Dates</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    A consecutive serial number unique for a financial year (containing only alphabets, numerals, or special characters), and the date of issue.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Place of Supply</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Name of the State along with its unique 2-digit State Code (e.g., 09 for Uttar Pradesh, 27 for Maharashtra).
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Tax Slabs & Breakdown</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Separate line-item identification of Taxable Value, CGST rate and amount, SGST rate and amount, or IGST rate and amount.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div className="pt-8 border-t border-slate-100 space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
