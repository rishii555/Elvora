import { SupportedLanguage, DEFAULT_LANGUAGE } from "../config";
import { TranslationDictionary } from "../types";
import { en } from "./en";
import { hi } from "./hi";
import { hiLatn } from "./hi-Latn";

export const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  hi,
  "hi-Latn": hiLatn,
};

/**
 * Returns the dictionary for the requested language, safely falling back to English
 */
export function getDictionary(lang: SupportedLanguage = DEFAULT_LANGUAGE): TranslationDictionary {
  return dictionaries[lang] || dictionaries[DEFAULT_LANGUAGE];
}
