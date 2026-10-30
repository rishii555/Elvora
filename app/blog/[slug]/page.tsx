import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Calendar, CheckCircle2, User, ArrowRight, HelpCircle } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getBreadcrumbSchema, getFaqSchema, siteConfig } from "@/lib/seo/config";
import { BLOG_POSTS } from "@/lib/seo/blog-posts";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return {
      title: "Article Not Found",
    };
  }

  const postUrl = `${siteConfig.url}/blog/${post.slug}`;

  return {
    title: `${post.title} | Elvora Guides`,
    description: post.metaDescription,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      type: "article",
      locale: "en_IN",
      url: postUrl,
      title: post.title,
      description: post.metaDescription,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.logo,
          width: 800,
          height: 600,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      creator: "@elvorahq",
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${post.slug}` },
  ];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    inLanguage: "en-IN",
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}${siteConfig.logo}`,
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/blog/${post.slug}`,
    },
  };

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <JsonLd
        data={[
          articleSchema,
          getBreadcrumbSchema(breadcrumbs),
          getFaqSchema(post.faqs),
        ]}
      />

      <PublicHeader activeNav="blog" />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-blue-600 transition">Guides</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold truncate max-w-xs">{post.title}</span>
          </nav>
        </div>

        {/* Article Header */}
        <article className="mx-auto max-w-4xl px-4 pt-8 pb-16 sm:px-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="rounded bg-blue-50 text-blue-700 px-2.5 py-1 border border-blue-100">
                {post.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {post.readTime}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Updated {new Date(post.updatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl leading-tight">
              {post.title}
            </h1>

            {/* Author Byline */}
            <div className="flex items-center gap-3 pt-2 pb-6 border-b border-slate-200">
              <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                <User className="h-4 w-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900">{post.author.name}</p>
                <p className="text-slate-500">{post.author.role}</p>
              </div>
            </div>
          </div>

          {/* Key Takeaways Card */}
          <div className="my-8 rounded-xl border border-blue-200 bg-blue-50/60 p-6 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
              Executive Summary & Key Takeaways
            </h2>
            <p className="text-xs sm:text-sm text-blue-950 leading-relaxed font-medium">
              {post.summary}
            </p>
            <ul className="space-y-2 pt-2 border-t border-blue-200/80 text-xs sm:text-sm text-blue-900">
              {post.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Article Main Content */}
          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            {post.sections.map((sec, idx) => (
              <section key={idx} className="space-y-3">
                <h2 className="text-xl font-bold text-slate-900 pt-2">
                  {sec.heading}
                </h2>
                {sec.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="leading-relaxed whitespace-pre-line">
                    {p}
                  </p>
                ))}
                {sec.bullets && (
                  <ul className="space-y-2 pl-5 list-disc text-slate-700 pt-1">
                    {sec.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="leading-relaxed">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Article Specific FAQs */}
          {post.faqs.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200 space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {post.faqs.map((faq) => (
                  <div key={faq.q} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
                      {faq.q}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* In-Article Promotion CTA */}
          <div className="mt-12 p-6 sm:p-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white space-y-3">
            <h3 className="text-lg font-bold">Streamline Your Indian Store with Elvora</h3>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Experience keyboard-first counter billing, precision decimal GST compliance, and real-time stock audit in a unified multi-tenant SaaS.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition"
              >
                Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Related Articles */}
          <div className="mt-16 pt-8 border-t border-slate-200 space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Related Business Guides</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedPosts.map((rel) => (
                <div key={rel.slug} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {rel.category}
                    </span>
                    <h3 className="mt-2 text-xs font-bold text-slate-900 hover:text-blue-600 transition">
                      <Link href={`/blog/${rel.slug}`}>{rel.title}</Link>
                    </h3>
                  </div>
                  <Link
                    href={`/blog/${rel.slug}`}
                    className="mt-3 text-[11px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    Read <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
