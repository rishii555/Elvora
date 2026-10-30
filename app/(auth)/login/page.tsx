"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { ElvoraLogo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
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
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.status === "PENDING") {
          router.push(`/pending-approval?email=${encodeURIComponent(form.email)}`);
          return;
        }
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <ElvoraLogo size="lg" showTagline />
          <h1 className="mt-5 text-xl font-bold text-slate-900">Sign In to Your Counter</h1>
          <p className="mt-1 text-xs text-slate-500">Enter your credentials to access billing & records</p>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Email Address</label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="owner@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 pl-10 pr-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-[11px] font-medium text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-slate-300 pl-10 pr-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {loading ? "Signing in..." : "Sign In to Counter"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Demo Admin Credentials Box for Testing */}
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs">
          <div className="flex items-center justify-between font-medium text-blue-950">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
              Admin Test Account
            </span>
            <button
              type="button"
              onClick={() => setForm({ email: "admin@elvora.com", password: "admin123" })}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              Auto Fill
            </button>
          </div>
          <div className="mt-2.5 space-y-1 font-mono text-[11px] text-blue-800 bg-white/80 p-2 rounded border border-blue-100">
            <div><span className="text-slate-500 font-sans">Email:</span> <strong className="select-all">admin@elvora.com</strong></div>
            <div><span className="text-slate-500 font-sans">Password:</span> <strong className="select-all">admin123</strong></div>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Click <strong>Auto Fill</strong> then <strong>Sign In</strong> to immediately test all billing, reports, and inventory features.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          New business?{" "}
          <Link href="/register" className="font-semibold text-blue-600 hover:underline">
            Register your shop here
          </Link>
        </p>
      </div>
    </div>
  );
}
