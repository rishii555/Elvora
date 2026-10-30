import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ElvoraLogo } from "@/components/logo";

interface PublicHeaderProps {
  activeNav?: "home" | "gst" | "inventory" | "pos" | "business" | "invoicing" | "invoice-gen" | "pricing" | "blog" | "about" | "contact";
}

export function PublicHeader({ activeNav }: PublicHeaderProps) {
  const navLinks = [
    { label: "GST Billing", href: "/gst-billing-software", id: "gst" },
    { label: "Inventory", href: "/inventory-management-software", id: "inventory" },
    { label: "Counter POS", href: "/pos-software", id: "pos" },
    { label: "Business Suite", href: "/business-management-software", id: "business" },
    { label: "Invoicing", href: "/online-invoicing-software", id: "invoicing" },
    { label: "Guides", href: "/blog", id: "blog" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Full Left: Brand Logo + Tagline */}
        <div className="flex items-center">
          <ElvoraLogo showTagline size="md" />
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-blue-600 ${
                activeNav === link.id ? "text-blue-600 font-bold" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Full Right: Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#111827] hover:bg-slate-100 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#1D4ED8] active:bg-blue-800 transition-all"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
