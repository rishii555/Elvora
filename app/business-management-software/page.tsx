import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { 
  ArrowRight, 
  Boxes, 
  Receipt, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  HelpCircle,
  Sparkles
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, getFaqSchema, siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Business Management Software for Growing SMBs | Elvora",
  description:
    "Unified multi-tenant business management software. Connect point-of-sale billing, real-time inventory, customer khata, vendor payables, and double-entry accounting in one intuitive dashboard.",
  alternates: {
    canonical: `${siteConfig.url}/business-management-software`,
    languages: {
      "en-IN": `${siteConfig.url}/business-management-software`,
      "en": `${siteConfig.url}/business-management-software`,
      "x-default": `${siteConfig.url}/business-management-software`,
    },
  },
  openGraph: {
    title: "All-in-One Business Management Software | Elvora SaaS",
    description:
      "Run your entire commerce operation on a single intelligent platform: counter POS, automated GST tax billing, variant stock ledger, and real-time cashflow analytics.",
    url: `${siteConfig.url}/business-management-software`,
  },
};

const faqs = [
  {
    q: "What makes Elvora different from disconnected accounting or billing software?",
    a: "Traditional setups require separate tools for billing, another for inventory, and manual ledger entries at month-end. Elvora connects every transaction: a counter sale automatically decrements item inventory, credits sales revenue, posts tax liability, and updates customer khata in one atomic operation.",
  },
  {
    q: "Can I manage multiple retail branches or team members on one account?",
    a: "Yes. Elvora provides role-based access control (OWNER, MANAGER, BILLER, ACCOUNTANT). You can invite staff members with granular permissions, allowing counter staff to bill without exposing sensitive profit-and-loss reports.",
  },
  {
    q: "Is my business data secure and backed up automatically?",
    a: "Yes. Every store is isolated within its own cryptographically verified multi-tenant workspace with strict row-level tenant boundary guards. All transactions are backed up on enterprise-grade cloud databases with 99.9% uptime.",
  },
  {
    q: "Can I migrate my existing customer list and product catalog into Elvora?",
    a: "Yes. Elvora supports fast Excel/CSV import for customer profiles, supplier books, and multi-attribute product catalogs with existing stock quantities.",
  },
];

export default function BusinessManagementSoftwarePage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Business Management Software", url: "/business-management-software" },
  ];

  const pillars = [
    {
      icon: Receipt,
      title: "Counter POS & Invoicing",
      description: "Fast keyboard-driven checkout (F2 search, F8 print) producing 58mm/80mm thermal receipts and formal A4 GST tax invoices.",
    },
    {
      icon: Boxes,
      title: "Real-Time Stock Ledger",
      description: "Track physical goods with SKU variants, sizes, and colors. Receive automated alerts before top-selling items hit stockout levels.",
    },
    {
      icon: Users,
      title: "Parties & Udhar Khata",
      description: "Manage customer credit limits, outstanding balances, and aging receivables alongside supplier procurement ledgers.",
    },
    {
      icon: BarChart3,
      title: "Double-Entry Financials",
      description: "Instant profit-and-loss statements, cash flow monitoring, operating expense categorization, and GSTR-1 audit exports.",
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
            <span className="text-slate-800 font-semibold">Business Management Software</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:px-6 lg:pt-16 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Complete Commercial Operating System</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl leading-tight">
              One Unified Platform to Run <br />
              <span className="text-[#2563EB]">Your Entire Business Operation</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
              Eliminate software silos. Coordinate sales, counter billing, stock audits, customer credit khata, and automated accounting in one intelligent cloud dashboard.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 text-sm font-semibold text-white shadow-xs hover:bg-[#1D4ED8] transition-all"
              >
                Start 14-Day Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white px-6 py-3.5 text-sm font-semibold text-[#111827] hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Sign In to Store
              </Link>
            </div>
          </div>
        </section>

        {/* Core Pillars Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              Connected Operations, Zero Manual Data Sync
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Every department functions seamlessly with unified database records
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#111827]">{pillar.title}</h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Operational Workflow Comparison */}
        <section className="bg-white py-16 border-t border-[#E2E8F0]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
                The Disconnected Old Way vs The Elvora Advantage
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Why high-growth businesses choose unified software architecture
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-6 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  Fragmented Traditional Setup
                </span>
                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Offline billing software that does not sync with live warehouse stock.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Handwritten khata registers leading to disputed balances and lost receivables.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Manual spreadsheet tallying at month-end prone to tax calculation errors.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Lack of role permissions exposing private profit metrics to counter staff.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  The Elvora Cloud Solution
                </span>
                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Instant atomic inventory deduction upon checkout across all counters.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Digital ledger statements with dynamic UPI QR payment links sent to customers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Real-time double-entry ledgers generating one-click P&L and GSTR returns.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Granular RBAC guards (Owner, Manager, Biller, Accountant) protecting financial data.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#111827]">Frequently Asked Questions</h2>
            <p className="mt-2 text-sm text-[#64748B]">Clear answers to common questions about Elvora business management</p>
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

        {/* Bottom CTA Banner */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-14 px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to Modernize Your Business Operations?</h2>
            <p className="text-sm text-blue-100 max-w-xl mx-auto">
              Start with our 14-day free trial. No credit card required. Experience fast billing, automated stock audits, and real-time ledger accounting today.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-white px-6 py-3 text-xs sm:text-sm font-bold text-blue-600 shadow-sm hover:bg-slate-100 transition"
              >
                Start Free Trial Now
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-blue-400 bg-transparent px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-blue-800/50 transition"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
