"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  SupportedLanguage,
  LANGUAGE_OPTIONS,
  DEFAULT_LANGUAGE,
  COOKIE_NAME,
  STORAGE_KEY,
  normalizeLanguageCode,
  LanguageMeta,
} from "./config";
import { getDictionary } from "./dictionaries";
import { TranslationDictionary } from "./types";
import { formatCurrency, formatDate, formatNumber } from "./formatters";

export interface TranslationContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
  languages: LanguageMeta[];
  formatCurrency: (amount: number | null | undefined) => string;
  formatDate: (date: string | Date | number | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number | null | undefined) => string;
}

const LanguageContext = createContext<TranslationContextValue | null>(null);

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLanguage?: SupportedLanguage;
}) {
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage);

  // 1. Initial Language Resolution on Mount
  useEffect(() => {
    let resolvedLanguage: SupportedLanguage | null = null;

    // A. Check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        resolvedLanguage = normalizeLanguageCode(stored);
      } else {
        // Also check assistant's prior storage key for seamless backward-compatibility
        const legacyAssistant = localStorage.getItem("elvora_assistant_language");
        if (legacyAssistant) {
          resolvedLanguage = normalizeLanguageCode(legacyAssistant);
        }
      }
    } catch {}

    // B. Check Cookie if localStorage was empty
    if (!resolvedLanguage && typeof document !== "undefined") {
      const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
      if (match && match[1]) {
        resolvedLanguage = normalizeLanguageCode(decodeURIComponent(match[1]));
      }
    }

    // C. Check Authenticated User Preferences via /api/auth/me
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.languagePreference) {
          const userPref = normalizeLanguageCode(data.user.languagePreference);
          setLanguageState(userPref);
          persistLanguageLocally(userPref);
        }
      })
      .catch(() => {});

    // D. Apply resolved language if found
    if (resolvedLanguage) {
      setLanguageState(resolvedLanguage);
      document.documentElement.lang = resolvedLanguage === "hi-Latn" ? "hi-Latn" : resolvedLanguage;
    }
  }, []);

  // Helper to persist to cookie and localStorage
  const persistLanguageLocally = (lang: SupportedLanguage) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem("elvora_language", lang);
      // Keep assistant storage key synchronized for backwards compatibility
      localStorage.setItem("elvora_assistant_language", lang === "hi-Latn" ? "hinglish" : lang);
    } catch {}

    if (typeof document !== "undefined") {
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(lang)}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = lang === "hi-Latn" ? "hi-Latn" : lang;
    }
  };

  // 2. Set Language Handler (Immediate reactive update, zero page refresh)
  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    const normalized = normalizeLanguageCode(newLang);
    setLanguageState(normalized);
    persistLanguageLocally(normalized);

    // Save preference to server for authenticated user in background
    fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: normalized }),
    }).catch(() => {});

    // Emit global event for any non-React listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("elvora:language-changed", { detail: { language: normalized } }));
    }
  }, []);

  const currentDict = useMemo(() => getDictionary(language), [language]);
  const fallbackDict = useMemo(() => getDictionary(DEFAULT_LANGUAGE), []);

  // 3. Translation Lookup Function with Fallback & Interpolation
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Look up in current dictionary
      let val = getNestedValue(currentDict, key);

      // 2. Fallback to English dictionary if not found in current language
      if (val === undefined && language !== DEFAULT_LANGUAGE) {
        val = getNestedValue(fallbackDict, key);
      }

      // 3. Fallback to raw key if missing in all dictionaries
      if (val === undefined) {
        return key;
      }

      // 4. Parameter interpolation (e.g. {count} or {{name}})
      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          val = val!.replace(new RegExp(`\\{\\{?${paramKey}\\}?\\}`, "g"), String(paramVal));
        });
      }

      return val;
    },
    [currentDict, fallbackDict, language]
  );

  const value = useMemo<TranslationContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      dictionary: currentDict,
      languages: LANGUAGE_OPTIONS,
      formatCurrency: (amount) => formatCurrency(amount, language),
      formatDate: (date, options) => formatDate(date, language, options),
      formatNumber: (num) => formatNumber(num, language),
    }),
    [language, setLanguage, t, currentDict]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Reusable Translation Hook
 */
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for components rendered outside the provider (e.g. tests or standalone widgets)
    const defaultDict = getDictionary(DEFAULT_LANGUAGE);
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        let val = getNestedValue(defaultDict, key) || key;
        if (params) {
          Object.entries(params).forEach(([paramKey, paramVal]) => {
            val = val.replace(new RegExp(`\\{\\{?${paramKey}\\}?\\}`, "g"), String(paramVal));
          });
        }
        return val;
      },
      dictionary: defaultDict,
      languages: LANGUAGE_OPTIONS,
      formatCurrency: (amount: number | null | undefined) => formatCurrency(amount, DEFAULT_LANGUAGE),
      formatDate: (date: string | Date | number | null | undefined, options?: Intl.DateTimeFormatOptions) =>
        formatDate(date, DEFAULT_LANGUAGE, options),
      formatNumber: (num: number | null | undefined) => formatNumber(num, DEFAULT_LANGUAGE),
    };
  }
  return context;
}
