"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthPasswordInput } from "@/components/auth/auth-password-input";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Missing or invalid password reset token");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col items-center text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set New Password</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Choose a secure, strong password for your Elvora workspace
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-snug">{error}</p>
        </div>
      )}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-emerald-900">Password Updated Successfully</h3>
          <p className="mt-2 text-xs text-emerald-700 leading-relaxed">
            Your password has been securely reset. You can now sign in with your new credentials.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Sign In to Counter
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthPasswordInput
            label="New Password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <AuthPasswordInput
            label="Confirm New Password"
            required
            autoComplete="new-password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <span>Set New Password</span>
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
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout activePage="reset-password" maxWidthClass="max-w-md">
      <Suspense fallback={<div className="text-xs text-slate-400 p-8 text-center">Loading reset form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
