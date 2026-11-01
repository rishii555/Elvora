import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Calendar } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, siteConfig } from "@/lib/seo/config";
import { BLOG_POSTS } from "@/lib/seo/blog-posts";

export const metadata: Metadata = {
  title: "Business Guides, GST Rules & Retail Insights",
  description:
    "Practical guides on Indian GST compliance, thermal POS setup, inventory control, and ledger accounting for store owners and accountants.",
  alternates: {
    canonical: `${siteConfig.url}/blog`,
  },
  openGraph: {
    title: "Business Guides, GST Rules & Retail Insights | Elvora",
    description:
      "Practical guides on Indian GST compliance, thermal POS setup, inventory control, and ledger accounting for store owners and accountants.",
    url: `${siteConfig.url}/blog`,
  },
};

export default function BlogIndexPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Blog & Guides", url: "/blog" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd data={getBreadcrumbSchema(breadcrumbs)} />

      <PublicHeader activeNav="blog" />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Business Guides & Knowledge</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="px-4 pt-12 pb-12 sm:px-6 lg:pt-16 lg:pb-16 text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            Elvora Knowledge Center
          </span>
          <h1 className="text-3xl font-extrabold text-[#111827] sm:text-5xl">
            Guides for Modern Indian Growing Businesses
          </h1>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-[#475569]">
            Practical compliance strategies, inventory management tactics, and hardware guides written for store owners, wholesalers, and finance professionals.
          </p>
        </section>

        {/* Articles Grid */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.slug}
                className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-100">
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 leading-snug hover:text-blue-600 transition">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(post.publishedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    Read Guide <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
