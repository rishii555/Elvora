"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { SupportedLanguage } from "@/lib/i18n/config";

interface LanguageSelectorProps {
  variant?: "default" | "compact" | "header" | "assistant";
  className?: string;
}

export function LanguageSelector({ variant = "default", className = "" }: LanguageSelectorProps) {
  const { language, setLanguage, languages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentMeta = languages.find((l) => l.code === language) || languages[0];

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  // 1. Assistant Variant (Compact pill for Elvori header)
  if (variant === "assistant") {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/25 transition-colors border border-white/20"
          aria-label="Change Language"
          aria-expanded={isOpen}
        >
          <Globe className="h-3 w-3 opacity-90" />
          <span>{currentMeta.nativeName}</span>
          <ChevronDown className={`h-3 w-3 opacity-80 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-100">
            {languages.map((item) => {
              const isSelected = item.code === language;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium text-left transition-colors ${
                    isSelected ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.nativeName}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 2. Header Variant (For Public Header & Dashboard Navbar)
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
        aria-label="Select Language"
        aria-expanded={isOpen}
      >
        <Globe className="h-3.5 w-3.5 text-blue-600" />
        <span className="hidden sm:inline">{currentMeta.nativeName}</span>
        <span className="sm:hidden">{currentMeta.code.toUpperCase()}</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-40 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Choose Language
          </div>
          {languages.map((item) => {
            const isSelected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors ${
                  isSelected ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="leading-tight">{item.nativeName}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{item.name}</div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
