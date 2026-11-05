/**
 * Elvora Internationalization (i18n) Configuration
 * Centralized settings for supported languages, native names, and fallback resolution.
 */

export type SupportedLanguage = "en" | "hi" | "hi-Latn";

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;        // English name
  nativeName: string;  // Native display name
  bcp47: string;
  dir: "ltr";
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageMeta> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    bcp47: "en-IN",
    dir: "ltr",
  },
  hi: {
    code: "hi",
    name: "Hindi",
    nativeName: "हिंदी",
    bcp47: "hi-IN",
    dir: "ltr",
  },
  "hi-Latn": {
    code: "hi-Latn",
    name: "Hinglish",
    nativeName: "Hinglish",
    bcp47: "hi-Latn",
    dir: "ltr",
  },
};

export const LANGUAGE_OPTIONS: LanguageMeta[] = [
  SUPPORTED_LANGUAGES.en,
  SUPPORTED_LANGUAGES.hi,
  SUPPORTED_LANGUAGES["hi-Latn"],
];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const COOKIE_NAME = "elvora_locale";
export const STORAGE_KEY = "elvora_locale";

/**
 * Normalizes any string representation of language code (e.g. "hinglish", "en-US", "hi_IN")
 * to one of the strict SupportedLanguage values.
 */
export function normalizeLanguageCode(raw?: string | null): SupportedLanguage {
  if (!raw) return DEFAULT_LANGUAGE;
  const lower = raw.trim().toLowerCase();

  if (lower === "hi" || lower.startsWith("hi-in") || lower === "hindi") {
    return "hi";
  }
  if (
    lower === "hi-latn" ||
    lower === "hinglish" ||
    lower === "hi_latn" ||
    lower === "latin"
  ) {
    return "hi-Latn";
  }
  if (lower === "en" || lower.startsWith("en-") || lower.startsWith("en_") || lower === "english") {
    return "en";
  }

  return DEFAULT_LANGUAGE;
}
