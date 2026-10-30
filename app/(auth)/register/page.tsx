"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, User, ArrowRight, AlertCircle } from "lucide-react";
import { ElvoraLogo } from "@/components/logo";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Successful registration is submitted for admin review
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
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
        <div className="flex flex-col items-start gap-1">
          <ElvoraLogo size="md" showTagline />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Create Business Workspace</h1>
          <p className="text-xs text-slate-500">Universal multi-tenant billing, inventory & accounting SaaS</p>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Business Information Section */}
          <div>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Building2 className="h-4 w-4" /> Business & Organization Details
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Business / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Solutions or Metro Mart"
                  value={form.tradeName}
                  onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Industry / Business Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.businessSector}
                  onChange={(e) => setForm({ ...form, businessSector: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {BUSINESS_SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  State / Jurisdiction <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.stateCode}
                  onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  GSTIN / Tax Registration ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09ABCDE1234F1Z5"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Business Address / City</label>
                <input
                  type="text"
                  placeholder="Plot 42, Business Park or Main Street"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Owner Account Section */}
          <div className="pt-2 border-t border-slate-200">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <User className="h-4 w-4" /> Workspace Administrator Account
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Administrator Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Mobile Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@yourbusiness.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {loading ? "Creating Workspace..." : "Create Workspace & Launch Dashboard"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
