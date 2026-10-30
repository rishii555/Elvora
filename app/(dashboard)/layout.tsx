"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  Boxes, 
  Truck, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  CreditCard,
  BookOpen,
  History
} from "lucide-react";
import { ElvoraLogo } from "@/components/logo";
import { GlobalSearch } from "@/components/global-search";
import { SWRConfig } from "swr";
import { defaultSWRConfig } from "@/lib/swr-config";

interface UserProfile {
  user: { id: string; name: string; email: string };
  tenant: { id: string; name: string; role: string };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data && isMounted) {
          setProfile(data);
        }
      })
      .catch((err) => {
        console.warn("Session profile fetch notice:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const navGroups = [
    {
      group: "Core Billing",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Counter POS (F2)", href: "/pos", icon: Receipt, badge: "FAST" },
        { label: "Invoice History", href: "/invoices", icon: History },
      ],
    },
    {
      group: "Catalog & Stock",
      items: [
        { label: "Products & Stock", href: "/inventory", icon: Boxes },
        { label: "Suppliers & Purchases", href: "/purchases", icon: Truck },
      ],
    },
    {
      group: "Parties & Khata",
      items: [
        { label: "Customers & Udhar", href: "/customers", icon: Users },
        { label: "Payments & Collections", href: "/payments", icon: CreditCard },
        { label: "Expenses & Cashbook", href: "/expenses", icon: BookOpen },
      ],
    },
    {
      group: "Business Intelligence",
      items: [
        { label: "Reports & GST (3B/1)", href: "/reports", icon: FileText },
        { label: "Shop Settings", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar for Desktop */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:flex">
        {/* Shop Branding Header */}
        <div className="border-b border-[#E2E8F0] p-4">
          <div className="mb-3">
            <ElvoraLogo size="sm" showTagline />
          </div>
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-2.5">
            <h2 className="truncate text-xs font-bold text-[#111827]">
              {profile ? profile.tenant.name : "My Shop"}
            </h2>
            <div className="mt-1 flex items-center justify-between">
              <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-semibold text-[#2563EB] border border-blue-200/60">
                {profile?.tenant.role || "OWNER"}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Live Store
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links Grouped */}
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.group}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </p>
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            active ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer & Logout */}
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-xs font-semibold text-slate-800">{profile?.user.name}</p>
            <p className="truncate text-[11px] text-slate-500">{profile?.user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden md:block">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/pos"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>New Bill (F2)</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {profile?.user.name?.charAt(0) || "U"}
              </div>
              <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
                {profile?.user.name}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white p-3 md:hidden max-h-[85vh] overflow-y-auto">
            <div className="mb-3">
              <GlobalSearch />
            </div>
            <nav className="space-y-4">
              {navGroups.map((group) => (
                <div key={group.group}>
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.group}
                  </p>
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4 text-slate-400" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Child Pages wrapped with global SWR client caching */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <SWRConfig value={defaultSWRConfig}>
            {children}
          </SWRConfig>
        </main>
      </div>
    </div>
  );
}
