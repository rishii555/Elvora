import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { 
  Receipt, 
  Boxes, 
  ShieldCheck, 
  Keyboard, 
  Calculator, 
  FileSpreadsheet, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { ElvoraLogo } from "@/components/logo";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    const session = await verifySessionToken(sessionCookie);
    if (session && session.userId && session.activeTenantId) {
      redirect("/dashboard");
    }
  }
  const industries = [
    "Retail Stores",
    "Wholesalers & Distributors",
    "Electronics & Appliances",
    "Apparel & Footwear",
    "Hardware & Tools",
    "Manufacturing Units",
    "Professional Services & Agencies",
    "FMCG & Groceries",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <ElvoraLogo showTagline size="md" />
            <span className="hidden lg:inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              Universal Business SaaS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white px-4 pt-16 pb-20 sm:px-6 lg:pt-24 lg:pb-28">
          <div className="mx-auto max-w-5xl text-center">
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/70 px-4 py-1.5 text-xs font-semibold text-blue-900 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Simpler Business. Smarter Growth.
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
              The Universal Operating System <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                for Modern Growing Businesses.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
              All-in-one billing, inventory management, tax compliance, cashflow ledgers, and vendor tracking. Engineered for retail stores, wholesalers, manufacturers, and service enterprises worldwide.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.01]"
              >
                Register Your Business Workspace
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign In to Counter
              </Link>
            </div>

            {/* Industry Badges Reel */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-2 pt-6 border-t border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
                Supported Sectors:
              </span>
              {industries.map((ind) => (
                <span
                  key={ind}
                  className="rounded-full bg-slate-100/80 border border-slate-200/60 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Enterprise-Grade Capabilities, Zero Complexity
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Everything your enterprise needs to streamline sales, stock, and financial accounts
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Keyboard className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">High-Speed POS & Invoicing</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Counter billing designed for extreme throughput. Keyboard-first product search, instant item addition, auto-tax calculations, and split payment modes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Calculator className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">Exact Decimal Tax & Rounding</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Zero floating-point rounding errors. High-precision decimal calculation for GST slabs (0%, 5%, 12%, 18%, 28%), automatic CGST/SGST vs IGST splits, and commercial round-off.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">Multi-Tenant Vault Isolation</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every business owns a strictly isolated workspace. Database row-level security and automated unit tests guarantee that no tenant can ever inspect another tenant&apos;s data.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">Products, Services & Stock Ledger</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Track both physical goods with low-stock reorder thresholds and non-inventory professional services. Atomic inventory movements prevent negative or corrupted stock levels.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">A4 Tax Invoices & Thermal Receipts</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Instant output support for formal A4 tax invoices with business branding, bank account details, dynamic UPI payment QR codes, and 3-inch (80mm) thermal counter receipts.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">Customer Ledgers, Cashflow & P&amp;L</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Comprehensive customer receivables (Khata), vendor payables, double-entry cashbooks, real-time operating expense tracking, and GSTR compliance reporting.
              </p>
            </div>
          </div>
        </section>

        {/* Commercial SaaS Pricing Section */}
        <section className="border-t border-slate-200 bg-slate-50/60 px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-7xl text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Transparent Commercial Pricing
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Scalable Plans for Every Stage of Business Growth
            </h2>
            <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-600">
              Start with a 14-day full access free trial. No credit card required to register. Server-enforced limits ensure seamless growth.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
              {/* Plan 1: Free Trial */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    Free Trial
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">₹0</span>
                    <span className="text-xs text-slate-500"> / 14 days</span>
                  </div>
                  <p className="text-xs text-slate-600">Explore all features risk-free with sample or live data.</p>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                    <li>✓ 50 Invoices / month</li>
                    <li>✓ 100 Products</li>
                    <li>✓ 2 Staff Members</li>
                    <li>✓ A4 & Thermal Billing</li>
                    <li>✓ Standard Reports</li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-6 block w-full rounded-xl border border-slate-300 py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Plan 2: Starter */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                    Starter
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">₹499</span>
                    <span className="text-xs text-slate-500"> / month</span>
                  </div>
                  <p className="text-xs text-slate-600">For retail shops and standalone trading counters.</p>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                    <li>✓ 300 Invoices / month</li>
                    <li>✓ 500 Product Varieties</li>
                    <li>✓ 3 Staff Members</li>
                    <li>✓ Thermal & A4 Formats</li>
                    <li>✓ Customer Khata Dues</li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-6 block w-full rounded-xl bg-slate-900 py-2.5 text-center text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Choose Starter
                </Link>
              </div>

              {/* Plan 3: Growth */}
              <div className="rounded-3xl border-2 border-blue-600 bg-white p-6 shadow-lg shadow-blue-500/10 flex flex-col justify-between relative">
                <span className="absolute -top-3 right-6 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                  Most Popular
                </span>
                <div className="space-y-4">
                  <div className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    Growth Pro
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">₹1,499</span>
                    <span className="text-xs text-slate-500"> / month</span>
                  </div>
                  <p className="text-xs text-slate-600">For wholesalers, multi-counter stores, retail outlets, and modern enterprises.</p>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                    <li>✓ <strong>Unlimited Invoices</strong></li>
                    <li>✓ 5,000 Products</li>
                    <li>✓ 10 Staff Members (RBAC)</li>
                    <li>✓ GSTR-1 & 3B Tax Analytics</li>
                    <li>✓ Multi-Location & Auditing</li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-6 block w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm"
                >
                  Get Growth Pro
                </Link>
              </div>

              {/* Plan 4: Enterprise */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-block rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200">
                    Enterprise
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">₹3,999</span>
                    <span className="text-xs text-slate-500"> / month</span>
                  </div>
                  <p className="text-xs text-slate-600">For large distribution chains, depots, and factories.</p>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                    <li>✓ Unlimited Invoices & Items</li>
                    <li>✓ 50 Staff Members</li>
                    <li>✓ Custom GST Series & Formats</li>
                    <li>✓ Dedicated Account Manager</li>
                    <li>✓ 99.9% Uptime Guarantee</li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-6 block w-full rounded-xl border border-slate-300 py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-4">
          <ElvoraLogo size="sm" showTagline />
          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-medium">
            <Link href="/privacy" className="hover:text-slate-900 transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 transition">
              Terms of Service
            </Link>
            <Link href="/login" className="hover:text-slate-900 transition">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-slate-900 transition">
              Register Business
            </Link>
            <Link href="/admin/login" className="text-slate-400 hover:text-slate-600 transition">
              Platform Admin
            </Link>
          </div>
          <p className="text-slate-400 mt-2">
            © {new Date().getFullYear()} Elvora Multi-Tenant SaaS. Simpler Business. Smarter Growth. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
