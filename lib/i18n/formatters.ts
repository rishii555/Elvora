/**
 * Locale-Aware Formatting Utilities
 * Provides consistent formatting for currency (INR), dates, and numbers.
 */

import { SupportedLanguage } from "./config";

/**
 * Standard Indian Rupee Currency Formatter
 * Always formats as INR (₹) with comma grouping per the Indian numbering system.
 * Financial values remain numerically identical across all languages.
 */
export function formatCurrency(
  amount: number | null | undefined,
  _lang: SupportedLanguage = "en"
): string {
  const num = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const isNegative = num < 0;
  const absAmount = Math.abs(num);

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Locale-Aware Date Formatter
 */
export function formatDate(
  dateInput: string | Date | number | null | undefined,
  lang: SupportedLanguage = "en",
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  };

  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
}

/**
 * Locale-Aware Number Formatter
 */
export function formatNumber(
  numInput: number | null | undefined,
  _lang: SupportedLanguage = "en"
): string {
  if (typeof numInput !== "number" || isNaN(numInput)) return "0";
  return new Intl.NumberFormat("en-IN").format(numInput);
}
