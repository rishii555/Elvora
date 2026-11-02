"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface AdminTestCardProps {
  onAutoFill: (credentials: { email: string; password: string }) => void;
}

export function AdminTestCard({ onAutoFill }: AdminTestCardProps) {
  // Only render in local development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleFill = () => {
    onAutoFill({
      email: "admin@elvora.com",
      password: "admin123",
    });
  };

  return (
    <div className="mt-6 rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-xs transition-colors">
      <div className="flex items-center justify-between font-medium text-slate-800">
        <span className="flex items-center gap-1.5 font-semibold text-blue-900">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          Admin Test Account
        </span>
        <button
          type="button"
          onClick={handleFill}
          className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
        >
          Auto Fill
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-700 bg-white/90 p-2.5 rounded-lg border border-blue-100">
        <div>
          <span className="text-slate-400 font-sans block text-[10px]">Email</span>
          <strong className="select-all text-blue-950 font-semibold">admin@elvora.com</strong>
        </div>
        <div>
          <span className="text-slate-400 font-sans block text-[10px]">Password</span>
          <strong className="select-all text-blue-950 font-semibold">admin123</strong>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-slate-500 leading-normal">
        Development shortcut: populates the credentials above to test billing, inventory, and accounting workflows.
      </p>
    </div>
  );
}
