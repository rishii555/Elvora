"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthPasswordInput } from "@/components/auth/auth-password-input";
import { AdminTestCard } from "@/components/auth/admin-test-card";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.status === "PENDING") {
          router.push(`/pending-approval?email=${encodeURIComponent(form.email)}`);
          return;
        }
        throw new Error(data.error || "Invalid email or password");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout activePage="login" maxWidthClass="max-w-md">
      <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header Branding & Auth Navigation Tabs */}
        <div className="flex flex-col items-center text-center mb-6">
          <AuthTabs activeTab="login" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Sign in to manage your billing, inventory, and accounts
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            placeholder="owner@example.com"
            icon={<Mail className="h-4 w-4" />}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <AuthPasswordInput
            label="Password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            rightElement={
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            }
          />

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
              />
              Remember me
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-sm text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Admin Test Account Card (Local Development Only) */}
        <AdminTestCard
          onAutoFill={({ email, password }) => {
            setForm((prev) => ({ ...prev, email, password }));
          }}
        />

        {/* Footer Redirect */}
        <p className="mt-6 text-center text-xs text-slate-500">
          New business?{" "}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Register your shop here
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
