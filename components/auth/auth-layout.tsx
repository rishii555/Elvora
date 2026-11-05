"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ElvoraLogo } from "@/components/logo";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "@/lib/i18n/context";

interface AuthLayoutProps {
  children: React.ReactNode;
  activePage: "login" | "register" | "forgot-password" | "reset-password";
  maxWidthClass?: string;
}

export function AuthLayout({ children, activePage, maxWidthClass = "max-w-md" }: AuthLayoutProps) {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 text-slate-900">
      {/* Subtle Geometric Background Decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden hidden md:block select-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <svg
          className="absolute top-0 right-0 -mr-24 -mt-24 h-[600px] w-[600px] stroke-slate-200/70"
          fill="none"
          viewBox="0 0 600 600"
        >
          <circle cx="300" cy="300" r="280" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
          <circle cx="300" cy="300" r="220" strokeWidth="1" opacity="0.4" />
          <circle cx="300" cy="300" r="160" strokeWidth="1.2" strokeDasharray="2 4" opacity="0.7" />
          <path d="M 0 300 L 600 300 M 300 0 L 300 600" strokeWidth="0.8" opacity="0.3" />
        </svg>

        <svg
          className="absolute bottom-0 left-0 -ml-28 -mb-28 h-[500px] w-[500px] stroke-slate-200/60"
          fill="none"
          viewBox="0 0 500 500"
        >
          <circle cx="250" cy="250" r="230" strokeWidth="1" opacity="0.5" />
          <circle cx="250" cy="250" r="170" strokeWidth="1" strokeDasharray="6 6" opacity="0.6" />
          <circle cx="250" cy="250" r="110" strokeWidth="1" opacity="0.4" />
        </svg>

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-50/50 rounded-full blur-3xl opacity-70 pointer-events-none" />
      </div>

      {/* Header with Global Language Selector & Logo */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <ElvoraLogo showTagline size="md" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector variant="header" />

            {activePage === "login" && (
              <>
                <span className="hidden sm:inline text-xs sm:text-sm font-medium text-slate-600">
                  {t("auth.dontHaveAccount") || "Don't have an account?"}
                </span>
                <Link
                  href="/register"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#1D4ED8] active:bg-blue-800 transition-all"
                >
                  {t("auth.createAccount") || "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}

            {activePage === "register" && (
              <>
                <span className="hidden sm:inline text-xs sm:text-sm font-medium text-slate-600">
                  {t("auth.alreadyHaveAccount") || "Already registered?"}
                </span>
                <Link
                  href="/login"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#111827] shadow-xs hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  {t("auth.signIn") || "Sign In"}
                </Link>
              </>
            )}

            {(activePage === "forgot-password" || activePage === "reset-password") && (
              <Link
                href="/login"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#111827] shadow-xs hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" />
                {t("auth.backToLogin")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className={`w-full ${maxWidthClass}`}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-slate-200/60 bg-white/50 backdrop-blur-xs py-5">
        <div className="flex w-full flex-col items-center justify-between gap-3 px-4 text-xs text-slate-600 sm:flex-row sm:px-6 lg:px-8 font-medium">
          <div>
            © {currentYear} Elvora Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="inline-block py-1.5 hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="inline-block py-1.5 hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="inline-block py-1.5 hover:text-slate-900 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
