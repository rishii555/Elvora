import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { 
  Building2, 
  ShieldCheck, 
  Globe, 
  CheckCircle2, 
  Lock, 
  Zap 
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, siteConfig, getOrganizationSchema } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "About Elvora – Modern Software for Indian Businesses",
  description:
    "Learn about Elvora's mission: delivering high-speed, mathematically precise billing, inventory, and ledger software tailored for Indian retailers and traders.",
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
  openGraph: {
    title: "About Elvora – Modern Software for Indian Businesses | Elvora",
    description:
      "Learn about Elvora's mission: delivering high-speed, mathematically precise billing, inventory, and ledger software tailored for Indian retailers and traders.",
    url: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "About Us", url: "/about" },
  ];

  const values = [
    {
      icon: Zap,
      title: "Keyboard-First Speed",
      description: "We believe cash desks should never stall. Every counter feature is built with sub-second keyboard shortcuts to keep checkout lines flowing.",
    },
    {
      icon: ShieldCheck,
      title: "Mathematical Precision",
      description: "Zero tax approximations. We compute GST splits and line-item rounding with exact decimal logic compliant with Indian tax law.",
    },
    {
      icon: Lock,
      title: "Strict Data Isolation",
      description: "Every business operates within an isolated cryptographic multi-tenant vault. We protect business confidential records with absolute diligence.",
    },
    {
      icon: Globe,
      title: "Built for India, Ready for the World",
      description: "Engineered specifically for the real-world complexities of Indian retail, wholesale, and taxation, with an architecture ready for global trade.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd data={[getBreadcrumbSchema(breadcrumbs), getOrganizationSchema()]} />

      <PublicHeader />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">About Us</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:px-6 lg:pt-16 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 mb-6">
              <Building2 className="h-3.5 w-3.5" />
              <span>About Elvora</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl leading-tight">
              Simpler Business. <br />
              <span className="text-[#2563EB]">Smarter Growth.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
              We started Elvora to solve a fundamental problem in small business commerce: businesses were forced to juggle disconnected offline billing tools, paper registers, and clunky legacy software.
            </p>
          </div>
        </section>

        {/* Our Mission & Story */}
        <section className="bg-white py-16 border-t border-[#E2E8F0]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl font-bold text-[#111827]">
                  The Mission: Modernize Everyday Commerce
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Independent retail stores, wholesalers, and growing distributors form the backbone of the economy. Yet, most still struggle with software designed two decades ago — desktop programs with complex installations, no cloud backup, and zero mobile accessibility.
                </p>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Elvora replaces fragmented tools with a unified, browser-accessible cloud suite. Whether a cashier is billing on a counter PC or a business owner is reviewing sales on a smartphone, everything operates from a single real-time database.
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-slate-50 p-6 space-y-4">
                <h3 className="text-sm font-bold text-[#111827]">Our Modern Engineering Stack</h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Next.js 15 & React Server Components for sub-second page loads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Prisma ORM with MongoDB Atlas for scalable multi-tenant architecture</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Strict TypeScript and Zod schema validations on every API payload</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Automated Vitest continuous testing across all business logic modules</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Core Principles */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              Our Core Principles
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              The standard we hold ourselves to across every feature we build
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((val) => {
              const Icon = val.icon;
              return (
                <div
                  key={val.title}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#111827]">{val.title}</h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{val.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-slate-900 text-white py-14 px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Build a Smarter Business with Elvora</h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">
              Join forward-thinking businesses streamlining counter billing, stock audits, and tax compliance.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-blue-500 transition"
              >
                Get Started Today
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-xs sm:text-sm font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                Contact Our Team
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
