import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Privacy Policy | Elvora Multi-Tenant SaaS",
  description:
    "Learn how Elvora collects, processes, and protects business and personal data within our multi-tenant SaaS architecture in compliance with Indian IT and data laws.",
  alternates: {
    canonical: `${siteConfig.url}/privacy`,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <PublicHeader />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl bg-white p-8 sm:p-12 rounded-xl border border-slate-200 shadow-sm space-y-8">
          {/* Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>

        {/* Legal Review Required Notice */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <p className="font-bold">Placeholder Document — Requires Formal Legal Review Before Commercial Operations</p>
            <p className="mt-1 text-amber-800">
              This document is a technical and compliance placeholder describing data processing practices within the Elvora SaaS platform. It must be formally reviewed and tailored by qualified legal counsel in accordance with applicable data protection laws (such as the Digital Personal Data Protection Act, DPDP 2023, and GDPR) prior to full-scale commercial subscription launch.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-400">Effective Date: October 29, 2026 | Version 1.0 (Commercial Pre-Launch)</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed divide-y divide-slate-100">
          <section className="pt-4 space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
            <p>
              When you register and use Elvora (the &ldquo;Service&rdquo;), we collect business and contact information to establish your multi-tenant workspace:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Credentials:</strong> Full name, verified email address, phone number, and bcrypt-hashed authentication passwords.</li>
              <li><strong>Business & Tax Identifiers:</strong> Legal business name, trade name, GSTIN (Goods and Services Tax Identification Number), state jurisdiction code, billing and operational addresses.</li>
              <li><strong>Commercial Ledger Records:</strong> Customer profiles, vendor accounts, inventory item specifications, purchase bills, and sales invoices entered by authorized tenant members.</li>
              <li><strong>Usage & Subscription Data:</strong> Monthly transaction volume counters, subscribed plan tier, and audit timestamps.</li>
            </ul>
          </section>

          <section className="pt-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. How We Use and Protect Your Data</h2>
            <p>
              Your business and transactional data is utilized exclusively to provide SaaS billing, inventory management, double-entry ledger bookkeeping, and statutory GST return summaries.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Strict Tenant Isolation:</strong> Every database query is scoped by your unique tenant identifier. Your financial ledgers, customer pricing, and sales volumes are cryptographically and logically isolated from all other businesses.</li>
              <li><strong>No Platform Administrator Peeking:</strong> Platform administrative staff have access only to account status, subscription tiers, and system support tickets. They are denied default access to your private financial transaction lines and margin figures.</li>
              <li><strong>No Data Monetization:</strong> We do not sell, rent, or monetize your customer lists or billing data to third-party advertisers.</li>
            </ul>
          </section>

          <section className="pt-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Data Retention and Subscription Expiry</h2>
            <p>
              In the event your commercial subscription or trial expires, <strong>your historical business records remain fully preserved and protected</strong>. You retain full read-only access to view and export historical invoices, customer balances, and tax reports. New billings or product creation can be resumed upon subscription renewal.
            </p>
          </section>

          <section className="pt-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Contact & Grievance Officer</h2>
            <p>
              For privacy queries, data export requests, or support inquiries, contact our platform security team at:
              <br />
              <strong>Email:</strong> privacy@elvora.com | support@elvora.com
            </p>
          </section>
        </div>
      </div>
    </main>

    <PublicFooter />
  </div>
);
}
