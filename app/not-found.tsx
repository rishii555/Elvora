import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, Search, BookOpen, Calculator } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#475569]">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-extrabold text-2xl border border-blue-100">
            404
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Page Not Found</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              The page or resource you requested could not be located. It may have been moved, renamed, or requires store authentication.
            </p>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-xs font-semibold">
            <Link
              href="/"
              className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition"
            >
              <Home className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/gst-billing-software"
              className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition"
            >
              <Calculator className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>GST Billing</span>
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition"
            >
              <Search className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Pricing Plans</span>
            </Link>
            <Link
              href="/blog"
              className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition"
            >
              <BookOpen className="h-4 w-4 text-purple-600 shrink-0" />
              <span>Business Guides</span>
            </Link>
          </div>

          <div className="pt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              Looking for your store dashboard? Sign In here <ArrowLeft className="h-3 w-3 rotate-180" />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
