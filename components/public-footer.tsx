import React from "react";
import Link from "next/link";
import { ElvoraLogo } from "@/components/logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white py-12 text-xs text-[#64748B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <ElvoraLogo size="sm" showTagline />
            <p className="text-xs text-slate-500 leading-relaxed">
              Universal business management & GST accounting SaaS designed specifically for Indian retail shops, wholesale merchants, and distributors.
            </p>
          </div>

          {/* Col 2: Solutions */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Solutions</p>
            <ul className="space-y-1.5 text-slate-600 font-medium">
              <li><Link href="/gst-billing-software" className="hover:text-blue-600 transition">GST Billing Software</Link></li>
              <li><Link href="/inventory-management-software" className="hover:text-blue-600 transition">Inventory & Stock Ledger</Link></li>
              <li><Link href="/pos-software" className="hover:text-blue-600 transition">Counter POS & Thermal Billing</Link></li>
              <li><Link href="/business-management-software" className="hover:text-blue-600 transition">Business Management Suite</Link></li>
              <li><Link href="/online-invoicing-software" className="hover:text-blue-600 transition">Online Invoicing Software</Link></li>
              <li><Link href="/invoice-generator" className="hover:text-blue-600 transition">Free GST Invoice Generator</Link></li>
            </ul>
          </div>

          {/* Col 3: Resources & Guides */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Knowledge & Guides</p>
            <ul className="space-y-1.5 text-slate-600 font-medium">
              <li><Link href="/blog" className="hover:text-blue-600 transition">All Business Guides</Link></li>
              <li><Link href="/blog/cgst-sgst-igst-difference-explained" className="hover:text-blue-600 transition">CGST, SGST & IGST Guide</Link></li>
              <li><Link href="/blog/how-to-choose-gst-billing-software-india" className="hover:text-blue-600 transition">Choosing Billing Software</Link></li>
              <li><Link href="/blog/thermal-printer-setup-guide-for-retail" className="hover:text-blue-600 transition">Thermal Printer Setup</Link></li>
              <li><Link href="/blog/e-invoicing-applicability-rules-thresholds-india" className="hover:text-blue-600 transition">E-Invoicing Rules</Link></li>
            </ul>
          </div>

          {/* Col 4: Legal & Platform */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Company & Access</p>
            <ul className="space-y-1.5 text-slate-600 font-medium">
              <li><Link href="/about" className="hover:text-blue-600 transition">About Elvora</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition">Contact & Support</Link></li>
              <li><Link href="/login" className="hover:text-blue-600 transition">Store Sign In</Link></li>
              <li><Link href="/register" className="hover:text-blue-600 transition">Register 14-Day Free Trial</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-600 transition">Terms of Service</Link></li>
              <li><Link href="/admin/login" className="text-slate-400 hover:text-slate-600 transition">Platform Administration</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
          <p>© {new Date().getFullYear()} Elvora Technologies Pvt Ltd. All rights reserved.</p>
          <p className="text-[11px]">Crafted for high-speed Indian commerce with precision decimal compliance.</p>
        </div>
      </div>
    </footer>
  );
}
