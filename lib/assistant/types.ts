/**
 * Elvora Unified Business Assistant & Support Chatbot
 * Type definitions for intent classification, tool execution, and response modeling.
 */

export type AssistantLanguage = "hinglish" | "english" | "hindi" | "en" | "hi";

export type AssistantIntent =
  | "SALES_SUMMARY"
  | "SALES_COMPARISON"
  | "TOP_SELLING_PRODUCTS"
  | "INVOICE_METRICS"
  | "PROFIT_AND_LOSS"
  | "EXPENSE_SUMMARY"
  | "INVENTORY_CURRENT_STOCK"
  | "INVENTORY_LOW_STOCK"
  | "INVENTORY_OUT_OF_STOCK"
  | "INVENTORY_VALUATION"
  | "INVENTORY_REORDER"
  | "CUSTOMER_OUTSTANDING"
  | "TOP_CUSTOMERS"
  | "SUPPLIER_OUTSTANDING"
  | "PURCHASE_SUMMARY"
  | "CASH_BANK_BALANCE"
  | "TRIAL_BALANCE"
  | "BALANCE_SHEET"
  | "BUSINESS_OVERVIEW"
  | "ELVORA_SUPPORT"
  | "PUBLIC_AUTH_REQUIRED"
  | "PUBLIC_INTRO"
  | "PUBLIC_SUPPORT"
  | "AMBIGUOUS_QUERY"
  | "UNKNOWN_QUERY";

export type DatePeriod =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export interface ParsedDateRange {
  period: DatePeriod;
  startDate: Date;
  endDate: Date;
  labelEn: string;
  labelHinglish: string;
  labelHi: string;
}

export interface IntentClassificationResult {
  intent: AssistantIntent;
  confidence: number;
  dateRange: ParsedDateRange;
  language: AssistantLanguage;
  rawQuery: string;
  normalizedQuery: string;
  supportTopic?: string;
  needsClarification?: boolean;
  clarificationPrompt?: {
    en: string;
    hinglish: string;
    hi?: string;
  };
}

export interface AssistantStructuredItem {
  id?: string;
  title: string;
  subtitle?: string;
  value?: string;
  status?: "warning" | "danger" | "success" | "info";
  badge?: string;
  meta?: Record<string, any>;
}

export interface AssistantKpi {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

export interface AssistantStructuredData {
  intent: AssistantIntent;
  periodLabel: string;
  sourceModule: string;
  navigationLink?: {
    href: string;
    label: string;
  };
  kpis?: AssistantKpi[];
  items?: AssistantStructuredItem[];
  suggestedFollowUps?: string[];
}

export interface BusinessToolExecutionResult {
  success: boolean;
  intent: AssistantIntent;
  textEn: string;
  textHinglish: string;
  textHi?: string;
  structuredData?: AssistantStructuredData;
  error?: string;
}

export interface SupportArticle {
  id: string;
  keywords: string[];
  titleEn: string;
  titleHinglish: string;
  titleHi?: string;
  summaryEn: string;
  summaryHinglish: string;
  summaryHi?: string;
  stepsEn: string[];
  stepsHinglish: string[];
  stepsHi?: string[];
  moduleName: string;
  navigationPath: string;
  requiredPermission?: string;
}
