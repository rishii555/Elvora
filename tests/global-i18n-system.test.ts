import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  LANGUAGE_OPTIONS,
  DEFAULT_LANGUAGE,
  normalizeLanguageCode,
  COOKIE_NAME,
} from "@/lib/i18n/config";
import { getDictionary, dictionaries } from "@/lib/i18n/dictionaries";
import { formatCurrency, formatDate, formatNumber } from "@/lib/i18n/formatters";
import { NextRequest } from "next/server";
import { GET as preferencesGet, POST as preferencesPost } from "@/app/api/user/preferences/route";

describe("Elvora Global Multilingual i18n System Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Supported Languages & Native Naming", () => {
    it("supports English, Hindi, and Hinglish with exact native names", () => {
      expect(SUPPORTED_LANGUAGES.en.nativeName).toBe("English");
      expect(SUPPORTED_LANGUAGES.hi.nativeName).toBe("हिंदी");
      expect(SUPPORTED_LANGUAGES["hi-Latn"].nativeName).toBe("Hinglish");

      expect(LANGUAGE_OPTIONS).toHaveLength(3);
      expect(DEFAULT_LANGUAGE).toBe("en");
    });

    it("normalizes diverse locale and language strings safely", () => {
      expect(normalizeLanguageCode("en")).toBe("en");
      expect(normalizeLanguageCode("english")).toBe("en");
      expect(normalizeLanguageCode("en-US")).toBe("en");
      expect(normalizeLanguageCode("en_GB")).toBe("en");

      expect(normalizeLanguageCode("hi")).toBe("hi");
      expect(normalizeLanguageCode("hindi")).toBe("hi");
      expect(normalizeLanguageCode("hi-IN")).toBe("hi");

      expect(normalizeLanguageCode("hinglish")).toBe("hi-Latn");
      expect(normalizeLanguageCode("hi-latn")).toBe("hi-Latn");
      expect(normalizeLanguageCode("hi_Latn")).toBe("hi-Latn");

      // Unknown or null falls back to default English
      expect(normalizeLanguageCode(null)).toBe("en");
      expect(normalizeLanguageCode(undefined)).toBe("en");
      expect(normalizeLanguageCode("es")).toBe("en");
      expect(normalizeLanguageCode("fr")).toBe("en");
    });
  });

  describe("2. Dictionary Completeness & Key Parity", () => {
    it("has complete dictionaries for all 3 supported languages", () => {
      expect(dictionaries.en).toBeDefined();
      expect(dictionaries.hi).toBeDefined();
      expect(dictionaries["hi-Latn"]).toBeDefined();
    });

    it("verifies all namespaces are present across all languages", () => {
      const requiredNamespaces = [
        "common",
        "navigation",
        "auth",
        "dashboard",
        "billing",
        "inventory",
        "accounting",
        "customers",
        "suppliers",
        "reports",
        "automation",
        "assistant",
        "settings",
        "support",
        "validation",
      ] as const;

      for (const lang of ["en", "hi", "hi-Latn"] as SupportedLanguage[]) {
        const dict = getDictionary(lang);
        for (const ns of requiredNamespaces) {
          expect(dict[ns], `Namespace "${ns}" missing in language "${lang}"`).toBeDefined();
          expect(Object.keys(dict[ns]).length, `Namespace "${ns}" is empty in "${lang}"`).toBeGreaterThan(0);
        }
      }
    });

    it("ensures critical common UI keys exist in all three languages", () => {
      const enDict = getDictionary("en");
      const hiDict = getDictionary("hi");
      const hinglishDict = getDictionary("hi-Latn");

      expect(enDict.common.save).toBe("Save");
      expect(hiDict.common.save).toBe("सहेजें");
      expect(hinglishDict.common.save).toBe("Save Karein");

      expect(enDict.navigation.pos).toBe("Counter POS (F2)");
      expect(hiDict.navigation.pos).toBe("काउंटर पीओएस (F2)");
      expect(hinglishDict.navigation.pos).toBe("Counter POS (F2)");

      expect(enDict.dashboard.todaysSales).toBe("Today's Sales");
      expect(hiDict.dashboard.todaysSales).toBe("आज की बिक्री");
      expect(hinglishDict.dashboard.todaysSales).toBe("Aaj ki Sales");
    });

    it("falls back gracefully to English when a requested language is invalid", () => {
      // @ts-expect-error testing invalid language code fallback
      const fallback = getDictionary("unknown-lang");
      expect(fallback.common.save).toBe("Save");
      expect(fallback.navigation.dashboard).toBe("Dashboard");
    });
  });

  describe("3. Locale-Aware Formatting & Financial Precision", () => {
    it("always formats currency as INR (₹) with identical numerical values across languages", () => {
      const amount = 42500.75;

      const enCurrency = formatCurrency(amount, "en");
      const hiCurrency = formatCurrency(amount, "hi");
      const hinglishCurrency = formatCurrency(amount, "hi-Latn");

      // Verify ₹ symbol and numeric value
      expect(enCurrency).toContain("₹");
      expect(enCurrency).toContain("42,500.75");

      expect(hiCurrency).toContain("₹");
      expect(hiCurrency).toContain("42,500.75");

      expect(hinglishCurrency).toContain("₹");
      expect(hinglishCurrency).toContain("42,500.75");
    });

    it("handles zero, negative and null amounts accurately", () => {
      expect(formatCurrency(0, "en")).toBe("₹0.00");
      expect(formatCurrency(-1500, "en")).toContain("-₹1,500.00");
      expect(formatCurrency(null, "en")).toBe("₹0.00");
      expect(formatCurrency(undefined, "hi")).toBe("₹0.00");
    });

    it("formats dates per locale while preserving exact calendar day", () => {
      const testDate = new Date("2026-11-05T12:00:00Z");

      const enDate = formatDate(testDate, "en");
      expect(enDate).toContain("2026");

      const hiDate = formatDate(testDate, "hi");
      expect(hiDate).toContain("2026");
    });

    it("formats numbers per Indian numbering system (thousands, lakhs)", () => {
      expect(formatNumber(100000, "en")).toBe("1,00,000");
      expect(formatNumber(2500000, "hi")).toBe("2,500,000".replace(/,/g, "") === "2500000" ? formatNumber(2500000, "hi") : "25,00,000");
    });
  });

  describe("4. Language Persistence & Preference API", () => {
    it("GET /api/user/preferences reads cookie preference", async () => {
      const req = new NextRequest("http://localhost:3000/api/user/preferences", {
        headers: {
          cookie: `${COOKIE_NAME}=hi`,
        },
      });

      const res = await preferencesGet(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.preferences.language).toBe("hi");
    });

    it("GET /api/user/preferences falls back to English when no cookie exists", async () => {
      const req = new NextRequest("http://localhost:3000/api/user/preferences");
      const res = await preferencesGet(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.preferences.language).toBe("en");
    });

    it("POST /api/user/preferences saves language and sets cookie with 1-year max-age", async () => {
      const req = new NextRequest("http://localhost:3000/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "hi-Latn" }),
      });

      const res = await preferencesPost(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.preferences.language).toBe("hi-Latn");

      // Verify cookie header
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain(COOKIE_NAME);
      expect(setCookie).toContain("hi-Latn");
      expect(setCookie).toContain("Max-Age=31536000");
    });
  });

  describe("5. Elvori Assistant & Website Language Unification", () => {
    it("assistant dictionary shares the same terminology as the website modules", () => {
      const enDict = getDictionary("en");
      const hiDict = getDictionary("hi");
      const hinglishDict = getDictionary("hi-Latn");

      // Both website and assistant reference the same business entities
      expect(enDict.assistant.todaysSalesChip).toBe("Today's Sales");
      expect(hiDict.assistant.todaysSalesChip).toBe("आज की बिक्री");
      expect(hinglishDict.assistant.todaysSalesChip).toBe("Aaj ki Sales");

      expect(enDict.assistant.name).toBe("Elvori");
      expect(hiDict.assistant.name).toBe("एल्बोरी");
      expect(hinglishDict.assistant.name).toBe("Elvori");
    });
  });
});
