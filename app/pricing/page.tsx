import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, getFaqSchema, getSoftwareApplicationSchema, siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Commercial Pricing & Subscription Plans | Elvora",
  description:
    "Transparent pricing for Indian businesses. Start with a 14-day full-access free trial. Plans start at ₹499/month for retail counters and ₹1,499/month for high-volume wholesalers.",
  alternates: {
    canonical: `${siteConfig.url}/pricing`,
  },
  openGraph: {
    title: "Elvora SaaS Pricing Plans | Simpler Business. Smarter Growth.",
    description:
      "Honest, scalable pricing for Indian retail, wholesale, and distribution businesses. 14-day free trial without credit card.",
    url: `${siteConfig.url}/pricing`,
  },
};

const faqs = [
  {
    q: "How does the registration and approval process work?",
    a: "Registration is completely free. Simply enter your business name, GSTIN (if applicable), and contact details. The Elvora administration team reviews your submission and activates your business workspace without requiring a credit card or payment gateway checkout.",
  },
  {
    q: "Do I need to pay or enter payment details to register?",
    a: "No. Elvora operates on a verified admin-approval model. You never need to enter credit cards, debit cards, or payment details to register.",
  },
  {
    q: "Can I manage multiple staff members and counters?",
    a: "Yes. Once your account is approved, you can invite team members with role-based access control (Manager, Biller, Accountant) from Shop Settings.",
  },
  {
    q: "How long does administrator approval typically take?",
    a: "Registrations are reviewed by our platform administrators within a few hours during business working hours (Monday to Saturday, 9:00 AM – 7:00 PM IST). You can check your live approval status anytime on the pending approval page.",
  },
];

export default function PricingPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Pricing", url: "/pricing" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd
        data={[
          getBreadcrumbSchema(breadcrumbs),
          getSoftwareApplicationSchema(),
          getFaqSchema(faqs),
        ]}
      />

      <PublicHeader activeNav="pricing" />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Pricing Plans</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="px-4 pt-12 pb-16 sm:px-6 lg:pt-16 lg:pb-20 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
            Transparent Commercial Pricing
          </span>
          <h1 className="text-3xl font-extrabold text-[#111827] sm:text-5xl">
            Scalable Plans for Every Stage of Business Growth
          </h1>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-[#475569]">
            Start with a 14-day full access free trial. No credit card required to register. Server-enforced limits ensure seamless growth.
          </p>
        </section>

        {/* Pricing Cards Grid */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {/* Plan 1: Free Trial */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
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
                className="mt-6 block w-full rounded-lg border border-[#E2E8F0] py-2.5 text-center text-xs font-bold text-[#111827] hover:bg-slate-50 transition shadow-2xs"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Plan 2: Starter */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
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
                className="mt-6 block w-full rounded-lg bg-[#0F172A] py-2.5 text-center text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
              >
                Choose Starter
              </Link>
            </div>

            {/* Plan 3: Growth Pro (Most Popular) */}
            <div className="rounded-xl border-2 border-[#2563EB] bg-white p-6 shadow-lg shadow-blue-500/10 flex flex-col justify-between relative">
              <span className="absolute -top-3 right-5 rounded-md bg-[#2563EB] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
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
                className="mt-6 block w-full rounded-lg bg-[#2563EB] py-2.5 text-center text-xs font-bold text-white hover:bg-[#1D4ED8] transition shadow-xs"
              >
                Get Growth Pro
              </Link>
            </div>

            {/* Plan 4: Enterprise */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
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
                className="mt-6 block w-full rounded-lg border border-[#E2E8F0] py-2.5 text-center text-xs font-bold text-[#111827] hover:bg-slate-50 transition shadow-2xs"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="bg-white border-t border-[#E2E8F0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Feature Comparison</h2>
              <p className="mt-2 text-sm text-slate-500">Every plan includes cloud backups, SSL encryption, and multi-device access.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Feature</th>
                    <th className="py-3 px-4 text-center">Free Trial</th>
                    <th className="py-3 px-4 text-center">Starter</th>
                    <th className="py-3 px-4 text-center text-blue-600 font-bold">Growth Pro</th>
                    <th className="py-3 px-4 text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-3 px-4 text-slate-900 font-semibold">Monthly Sales Invoices</td>
                    <td className="py-3 px-4 text-center">50</td>
                    <td className="py-3 px-4 text-center">300</td>
                    <td className="py-3 px-4 text-center text-blue-600 font-bold">Unlimited</td>
                    <td className="py-3 px-4 text-center">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-900 font-semibold">Product Catalog Limit</td>
                    <td className="py-3 px-4 text-center">100</td>
                    <td className="py-3 px-4 text-center">500</td>
                    <td className="py-3 px-4 text-center text-blue-600 font-bold">5,000</td>
                    <td className="py-3 px-4 text-center">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-900 font-semibold">Staff Members (RBAC)</td>
                    <td className="py-3 px-4 text-center">2</td>
                    <td className="py-3 px-4 text-center">3</td>
                    <td className="py-3 px-4 text-center text-blue-600 font-bold">10</td>
                    <td className="py-3 px-4 text-center">50</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-900 font-semibold">Counter POS Billing (F2 / F8)</td>
                    <td className="py-3 px-4 text-center">✓</td>
                    <td className="py-3 px-4 text-center">✓</td>
                    <td className="py-3 px-4 text-center text-blue-600">✓</td>
                    <td className="py-3 px-4 text-center">✓</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-900 font-semibold">Thermal & A4 GST Invoices</td>
                    <td className="py-3 px-4 text-center">✓</td>
                    <td className="py-3 px-4 text-center">✓</td>
                    <td className="py-3 px-4 text-center text-blue-600">✓</td>
                    <td className="py-3 px-4 text-center">✓</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-900 font-semibold">GSTR-1 & 3B Reconciliation Sheets</td>
                    <td className="py-3 px-4 text-center">—</td>
                    <td className="py-3 px-4 text-center">—</td>
                    <td className="py-3 px-4 text-center text-blue-600 font-bold">✓</td>
                    <td className="py-3 px-4 text-center">✓</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-900 font-semibold">Double-Entry Trial Balance</td>
                    <td className="py-3 px-4 text-center">—</td>
                    <td className="py-3 px-4 text-center">✓</td>
                    <td className="py-3 px-4 text-center text-blue-600">✓</td>
                    <td className="py-3 px-4 text-center">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FAQs */}
            <div className="pt-12 border-t border-slate-100 space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
                    {faq.q}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">{faq.a}</p>
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
