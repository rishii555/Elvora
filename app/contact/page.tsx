import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { 
  Mail, 
  MapPin, 
  Clock, 
  MessageSquare, 
  HelpCircle,
  ShieldCheck
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { ContactForm } from "@/components/contact-form";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, siteConfig, getOrganizationSchema } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Contact Elvora – Product Inquiries & Support",
  description:
    "Connect with the Elvora team for product onboarding, demonstrations, technical support, and account assistance.",
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
  openGraph: {
    title: "Contact Elvora – Product Inquiries & Support | Elvora",
    description:
      "Connect with the Elvora team for product onboarding, demonstrations, technical support, and account assistance.",
    url: `${siteConfig.url}/contact`,
  },
};

const faqs = [
  {
    q: "How fast does Elvora technical support respond?",
    a: "Our standard technical support team responds to email and ticket inquiries within 4 business hours. Growth Pro and Enterprise tier customers receive prioritized WhatsApp and phone assistance.",
  },
  {
    q: "Can your team assist with migrating our inventory from our existing software?",
    a: "Yes. Our onboarding specialists assist enterprise and wholesale customers with cleaning, formatting, and importing existing product catalogs, opening stock balances, and customer master lists via Excel/CSV.",
  },
  {
    q: "Can I request a personalized product demonstration for my team?",
    a: "Yes. Simply submit the contact form specifying your business vertical (Retail, Wholesale, Manufacturing, Services), and our product consultants will schedule a focused walkthrough.",
  },
];

export default function ContactPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Contact", url: "/contact" },
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
            <span className="text-slate-800 font-semibold">Contact</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-10 pb-12 sm:px-6 lg:pt-16 lg:pb-16 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 mb-6">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>We&apos;re Here to Help</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl leading-tight">
              Get in Touch with the <br />
              <span className="text-[#2563EB]">Elvora Product & Sales Team</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 leading-relaxed">
              Have questions about multi-tenant deployment, hardware printer compatibility, or subscription plans? Our engineers and consultants are ready to assist.
            </p>
          </div>
        </section>

        {/* Contact Grid */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Direct Info Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-[#111827]">Direct Contact Channels</h2>

                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#111827]">Support & Inquiries</p>
                      <a href={`mailto:${siteConfig.contact.email}`} className="text-blue-600 hover:underline">
                        {siteConfig.contact.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#111827]">Business Support Hours</p>
                      <p className="text-slate-600">Monday – Saturday: 9:00 AM – 7:00 PM IST</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#111827]">Operating Jurisdiction</p>
                      <p className="text-slate-600 leading-relaxed">India • Online-First Enterprise Cloud Service</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 space-y-2">
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Enterprise Data Privacy Guarantee
                </h3>
                <p className="text-xs text-blue-800/80 leading-relaxed">
                  We never share your inquiry details, business name, or contact information with third-party telemarketers.
                </p>
              </div>
            </div>

            {/* Right Column: Inquiry Form */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg font-bold text-[#111827] mb-2">Send an Inquiry or Schedule a Demo</h2>
                <p className="text-xs text-slate-500 mb-6">
                  Fill in your details and our team will get back to you within 4 business hours.
                </p>

                <ContactForm />
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 border-t border-[#E2E8F0]">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#111827]">Frequently Asked Questions</h2>
            <p className="mt-2 text-sm text-[#64748B]">Quick answers before reaching out</p>
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
      </main>

      <PublicFooter />
    </div>
  );
}
