"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Users,
} from "lucide-react";
import { AssistantStructuredData } from "@/lib/assistant/types";

interface RichCardProps {
  data: AssistantStructuredData;
  language?: "hinglish" | "en" | "hi";
  onActionClick?: () => void;
}

export function ElvoriRichCard({ data, language = "hinglish", onActionClick }: RichCardProps) {
  const intent = data.intent;

  // 1. PUBLIC: Auth Required / Login Gate Card
  if (intent === "PUBLIC_AUTH_REQUIRED") {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/70 p-3.5 shadow-xs">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-900">
              {language === "hi"
                ? "लॉगिन आवश्यक है"
                : language === "hinglish"
                ? "Login Zaroori Hai"
                : "Authentication Required"}
            </h4>
            <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
              {language === "hi"
                ? "दुकान की बिक्री, मुनाफा और स्टॉक केवल अधिकृत उपयोगकर्ताओं के लिए सुरक्षित हैं।"
                : language === "hinglish"
                ? "Dukaan ka live business data aur financial records secure hain."
                : "Live sales, profit, and inventory figures are strictly private to authorized shop owners."}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-100">
          <Link
            href="/login"
            onClick={onActionClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <span>{language === "hi" ? "लॉगिन करें" : language === "hinglish" ? "Login Karein" : "Sign In to Your Shop"}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/register"
            onClick={onActionClick}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>{language === "hi" ? "नया खाता बनाएं" : language === "hinglish" ? "Free Account Banayein" : "Register Free Account"}</span>
          </Link>
        </div>
      </div>
    );
  }

  // 2. PUBLIC: Product Info / Free Account CTA Card
  if (intent === "PUBLIC_INTRO" || intent === "PUBLIC_SUPPORT") {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 p-3.5 shadow-xs">
        <div className="flex items-center gap-2 mb-2 text-blue-700">
          <Sparkles className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {language === "hi" ? "एल्बोरा निःशुल्क खाता" : "Elvora Free Account"}
          </span>
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{language === "hi" ? "पूर्ण जीएसटी बिलिंग और काउंटर पीओएस (F2)" : "Complete GST Invoicing & Fast POS (F2)"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{language === "hi" ? "रीयल-टाइम इन्वेंटरी और कम-स्टॉक अलर्ट्स" : "Real-time Multi-Warehouse Inventory"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{language === "hi" ? "ग्राहक उधार खाता और दोहरी प्रविष्टि अकाउंटिंग" : "Customer Udhar Khata & Accounting"}</span>
          </div>
        </div>

        {data.navigationLink && (
          <Link
            href={data.navigationLink.href}
            onClick={onActionClick}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <span>{data.navigationLink.label}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    );
  }

  // 3. AUTHENTICATED: Sales Summary Card (Visual inspiration from reference image)
  if (intent === "SALES_SUMMARY" || intent === "INVOICE_METRICS") {
    const totalSalesKpi = data.kpis?.[0];
    const totalInvoicesKpi = data.kpis?.[1];
    const aovKpi = data.kpis?.[2];
    const pendingUdharKpi = data.kpis?.[3];

    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
        {/* Card Header Banner */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900">
              {language === "hi" ? "बिक्री विवरण" : language === "hinglish" ? "Sales Summary" : "Sales Overview"}
            </h4>
          </div>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
            {data.periodLabel}
          </span>
        </div>

        {/* Primary Large Revenue Callout */}
        {totalSalesKpi && (
          <div className="my-3 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60 p-3 border border-blue-100/60">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              {language === "hi" ? "कुल बिक्री" : totalSalesKpi.label}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {totalSalesKpi.value}
              </span>
              {totalSalesKpi.change && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                  <TrendingUp className="h-2.5 w-2.5" />
                  <span>{totalSalesKpi.change}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sub-metrics 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 text-left">
          {totalInvoicesKpi && (
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                {language === "hi" ? "कुल बिल" : "Total Bills"}
              </span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                {totalInvoicesKpi.value}
              </span>
            </div>
          )}
          {aovKpi && (
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                {language === "hi" ? "औसत बिल" : "Average Bill"}
              </span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                {aovKpi.value}
              </span>
            </div>
          )}
          {pendingUdharKpi && (
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 col-span-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">
                  {language === "hi" ? "बकाया उधार" : "Pending Udhar"}
                </span>
                <span className="text-xs font-bold text-amber-700 mt-0.5 block">
                  {pendingUdharKpi.value}
                </span>
              </div>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
          )}
        </div>

        {/* Action Link */}
        {data.navigationLink && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <Link
              href={data.navigationLink.href}
              onClick={onActionClick}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200/60"
            >
              <span>{data.navigationLink.label}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // 4. AUTHENTICATED: Low Stock Table Card (Visual inspiration from reference image)
  if (intent === "INVENTORY_LOW_STOCK" || intent === "INVENTORY_OUT_OF_STOCK" || intent === "INVENTORY_REORDER") {
    const isOutOfStock = intent === "INVENTORY_OUT_OF_STOCK";

    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Boxes className="h-4 w-4 text-amber-600" />
            <h4 className="text-xs font-bold text-slate-900">
              {isOutOfStock
                ? (language === "hi" ? "आउट ऑफ स्टॉक उत्पाद" : "Out of Stock Items")
                : (language === "hi" ? "कम स्टॉक चेतावनी" : "Low Stock Alerts")}
            </h4>
          </div>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
            {data.items?.length || 0} Items
          </span>
        </div>

        {/* Items Table */}
        {data.items && data.items.length > 0 ? (
          <div className="my-2.5 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-2.5 py-1.5">Product</th>
                  <th className="px-2 py-1.5 text-center">Stock</th>
                  <th className="px-2.5 py-1.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.slice(0, 5).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-2.5 py-2 font-medium text-slate-800 truncate max-w-[130px]">
                      {item.title}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                        {item.value}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-right">
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                        {item.badge || "REORDER"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Reorder Suggestion Banner */}
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50/80 p-2 text-[10px] text-amber-800 border border-amber-200/60">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            {language === "hi"
              ? "सुझाव: स्टॉक समाप्त होने से पहले सप्लायर से नया ऑर्डर कर लें।"
              : "Suggestion: Reorder these items soon to prevent sales disruption."}
          </span>
        </div>

        {/* Action Link */}
        {data.navigationLink && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <Link
              href={data.navigationLink.href}
              onClick={onActionClick}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200/60"
            >
              <span>{data.navigationLink.label}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // 5. Default Fallback Structured Card (Generic KPIs or Navigation)
  return (
    <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
      {data.kpis && data.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {data.kpis.map((kpi, i) => (
            <div key={i} className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-left">
              <span className="text-[10px] text-slate-500 font-medium block truncate">{kpi.label}</span>
              <span className="text-xs font-bold text-slate-900 block mt-0.5">{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      {data.navigationLink && (
        <Link
          href={data.navigationLink.href}
          onClick={onActionClick}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/80 px-2.5 py-1.5 rounded-lg border border-blue-200/60 transition-colors"
        >
          <span>{data.navigationLink.label}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
