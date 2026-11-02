"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthInput } from "@/components/auth/auth-input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout activePage="forgot-password" maxWidthClass="max-w-md">
      <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset Your Password</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Enter your account email to receive a secure password reset link
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {submitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-emerald-900">Reset Instructions Dispatched</h3>
            <p className="mt-2 text-xs text-emerald-700 leading-relaxed">
              If an active account exists for <strong>{email}</strong>, a password reset link has been dispatched. Please check your inbox and spam folder.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthInput
              label="Account Email Address"
              type="email"
              required
              autoComplete="email"
              placeholder="owner@example.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-sm text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending instructions...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            <div className="pt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Remember your password? Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
