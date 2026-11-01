import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service, subscription limits, commercial billing agreements, and service level guidelines for Elvora SaaS users.",
  alternates: {
    canonical: `${siteConfig.url}/terms`,
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <PublicHeader />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl bg-white p-8 sm:p-12 rounded-xl border border-slate-200 shadow-sm space-y-8">
          {/* Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
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
              This Terms of Service agreement is a commercial template outlining subscription terms, plan limit enforcement, billing mock interfaces, and statutory compliance boundaries for Elvora. It must undergo formal corporate legal review prior to accepting real monetary subscriptions.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-400">Effective Date: October 29, 2026 | Version 1.0 (Commercial Pre-Launch)</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed divide-y divide-slate-100">
          <section className="pt-4 space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By registering an account, provisioning a business workspace, or subscribing to Elvora (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of Service. If you are registering on behalf of a business entity, you represent and warrant that you hold the legal authority to bind said entity.
            </p>
          </section>

          <section className="pt-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Subscriptions & Server-Side Plan Limits</h2>
            <p>
              Elvora offers tiered commercial subscriptions. Each plan tier carries clearly documented server-side resource quotas:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Plan Quotas:</strong> Monthly invoice generation thresholds, maximum active product varieties, and authorized staff seats are enforced on the server. Attempting to bypass frontend controls will be rejected by the API.</li>
              <li><strong>Subscription Expiration:</strong> When your subscription period concludes, your account transitions to read-only status. <strong>Your historical data will not be deleted or locked out</strong>. You may view and export existing documents, but issuing new billings beyond plan limits requires plan renewal or activation.</li>
              <li><strong>Development Mock Billings:</strong> During platform testing, subscription transactions are executed via a development mock provider. No actual charges occur and simulated checkouts are not representations of commercial payment receipts.</li>
            </ul>
          </section>

          <section className="pt-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. GST Compliance & Invoicing Disclaimer</h2>
            <p>
              Elvora generates standardized Tax Invoices, Credit Notes, Debit Notes, and GSTR summary computations based upon inputs provided by the user. You remain solely responsible for verifying the accuracy of your HSN codes, applied tax rates (CGST/SGST/IGST), customer GSTINs, and filing statutory returns with the respective tax authorities.
            </p>
          </section>

          <section className="pt-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Platform Administration & Security Boundaries</h2>
            <p>
              Platform administrative personnel are strictly separated from normal tenant membership roles. Administrative tools are restricted to maintaining service availability, monitoring subscription status, and rendering customer support upon request. Administrators do not have default access to inspect private commercial transactions or financial margins.
            </p>
          </section>

          <section className="pt-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Termination and Governing Law</h2>
            <p>
              We reserve the right to suspend or terminate workspaces that violate applicable laws, engage in fraudulent tax evasion, or misuse system resources. These terms shall be governed by the laws of India.
            </p>
          </section>
        </div>
      </div>
    </main>

    <PublicFooter />
  </div>
);
}
