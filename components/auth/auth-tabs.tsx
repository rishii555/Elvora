"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

interface AuthTabsProps {
  activeTab: "login" | "register";
}

export function AuthTabs({ activeTab }: AuthTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 mb-6 text-xs font-semibold select-none border border-slate-200/60">
      <Link
        href="/login"
        className={`flex items-center justify-center py-2 px-3 rounded-lg transition-all ${
          activeTab === "login"
            ? "bg-white text-slate-900 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        {t("auth.signIn")}
      </Link>
      <Link
        href="/register"
        className={`flex items-center justify-center py-2 px-3 rounded-lg transition-all ${
          activeTab === "register"
            ? "bg-white text-slate-900 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        {t("auth.createAccount")}
      </Link>
    </div>
  );
}
