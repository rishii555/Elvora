"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, User, ArrowRight, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthPasswordInput } from "@/components/auth/auth-password-input";

const INDIAN_STATES = [
  { code: "09", name: "09 - Uttar Pradesh" },
  { code: "07", name: "07 - Delhi" },
  { code: "08", name: "08 - Rajasthan" },
  { code: "06", name: "06 - Haryana" },
  { code: "27", name: "27 - Maharashtra" },
  { code: "24", name: "24 - Gujarat" },
  { code: "19", name: "19 - West Bengal" },
  { code: "10", name: "10 - Bihar" },
  { code: "23", name: "23 - Madhya Pradesh" },
  { code: "29", name: "29 - Karnataka" },
  { code: "33", name: "33 - Tamil Nadu" },
  { code: "36", name: "36 - Telangana" },
  { code: "37", name: "37 - Andhra Pradesh" },
  { code: "03", name: "03 - Punjab" },
  { code: "05", name: "05 - Uttarakhand" },
  { code: "21", name: "21 - Odisha" },
];

const BUSINESS_SECTORS = [
  "Retail Store / Supermarket",
  "Wholesale & Distribution",
  "Sanitaryware, Tiles & Bath Fittings",
  "Hardware, Sanitary & Building Materials",
  "Electronics, Hardware & Gadgets",
  "Apparel, Footwear & Fashion",
  "Manufacturing & Industrial Supplies",
  "Professional Services & Consulting",
  "Healthcare, Pharmacy & Medical",
  "Automotive & Spare Parts",
  "Food, Cafe & FMCG",
  "General Trading & Contracting",
  "Other",
];

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    tradeName: "",
    legalName: "",
    businessSector: "Retail Store / Supermarket",
    gstin: "",
    stateCode: "09",
    address: "",
  });

  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to proceed");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register business workspace");
      }

      router.push(
        `/pending-approval?email=${encodeURIComponent(form.email)}&name=${encodeURIComponent(form.tradeName)}`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout activePage="register" maxWidthClass="max-w-2xl">
      <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 md:p-10 shadow-sm">
        {/* Header Branding & Auth Navigation Tabs */}
        <div className="flex flex-col items-center text-center mb-6">
          <AuthTabs activeTab="register" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Create Business Workspace
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md">
            Commercial enterprise operating system for billing, multi-location inventory & accounts
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Business & Organization Details */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200/70">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Business & Company Profile
                </h2>
                <p className="text-[11px] text-slate-500">Legal entity information and tax jurisdiction</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AuthInput
                  label="Business / Trading Name"
                  required
                  placeholder="e.g. Apex Global Solutions or Metro Mart"
                  value={form.tradeName}
                  onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Industry / Business Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.businessSector}
                  onChange={(e) => setForm({ ...form, businessSector: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10 focus:outline-none transition-all"
                >
                  {BUSINESS_SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  State / Jurisdiction <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.stateCode}
                  onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10 focus:outline-none transition-all"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <AuthInput
                  label="GSTIN / Tax ID (Optional)"
                  placeholder="e.g. 09ABCDE1234F1Z5"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>

              <div>
                <AuthInput
                  label="Business Address / City"
                  placeholder="Plot 42, Industrial Area or Main Street"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Administrator & Security */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200/70">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Administrator Account
                </h2>
                <p className="text-[11px] text-slate-500">Master credentials for workspace ownership</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <AuthInput
                  label="Administrator Full Name"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <AuthInput
                  label="Mobile Phone"
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <AuthInput
                  label="Work Email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@yourbusiness.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <AuthPasswordInput
                  label="Password"
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Terms & Privacy Consent */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="font-semibold text-blue-600 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="font-semibold text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                . I understand new business registrations are subject to admin approval.
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-sm text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registering Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace & Request Access</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Security guarantee pill */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Bank-grade 256-bit encryption · Isolated multi-tenant database</span>
          </div>
        </form>

        {/* Footer Redirect */}
        <p className="mt-8 text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
