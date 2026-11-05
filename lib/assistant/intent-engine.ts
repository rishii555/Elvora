import {
  AssistantLanguage,
  IntentClassificationResult,
  ParsedDateRange,
} from "./types";
import { findSupportKnowledge } from "./support-knowledge";

/**
 * Normalizes input text: lowercases, trims whitespace, standardizes Hindi/Hinglish
 * variations and removes noisy punctuation.
 */
export function normalizeQuery(query: string): string {
  if (!query) return "";
  let text = query.toLowerCase().trim();

  // Normalize common shorthand expressions before stripping punctuation
  text = text.replace(/p\s*&\s*l/g, "profit and loss");
  text = text.replace(/p\s+and\s+l/g, "profit and loss");
  text = text.replace(/&/g, " and ");

  // Strip non-alphanumeric except dashes, slashes, spaces (keeps dates and Hindi Devanagari characters intact)
  text = text.replace(/[?,.!@#$%^*()_+=~`[\]{}|\\:;"'<>]/g, " ");

  // Collapse multiple spaces
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Detects whether the query is framed in Hindi, Hinglish, or English.
 */
export function detectLanguage(normalizedText: string): AssistantLanguage {
  // Check Devanagari Unicode range (\u0900-\u097F) for Hindi script
  if (/[\u0900-\u097F]/.test(normalizedText)) {
    return "hindi";
  }

  const hinglishTokens = [
    "mera", "meri", "mere", "hamara", "humara", "apna", "aaj", "kal", "iss", "pichle",
    "mahine", "hafte", "saal", "kitna", "kitne", "kitni", "kya", "hai", "hain", "kare", "karein",
    "batao", "dikhao", "chal", "raha", "rahi", "maal", "mal", "bikri", "munafa", "fayda", "faida",
    "kharcha", "kharche", "udhar", "grahak", "vyapari", "bahi", "khata", "dukaan", "kaise", "kisko",
    "dena", "lena", "baaki", "khatam", "bana", "banaye", "rokad", "jama"
  ];

  // Specific multi-word Hinglish phrase checks
  if (
    normalizedText.includes("is month") ||
    normalizedText.includes("is mahine") ||
    normalizedText.includes("is hafte") ||
    normalizedText.includes("is saal")
  ) {
    return "hinglish";
  }

  const words = normalizedText.split(/\s+/);
  let hinglishCount = 0;
  for (const w of words) {
    if (hinglishTokens.includes(w)) {
      hinglishCount++;
    }
  }

  return hinglishCount > 0 ? "hinglish" : "en";
}

/**
 * Parses date range from query string. Respects Indian Financial Year (April 1 to March 31).
 */
export function parseDateRange(normalizedText: string): ParsedDateRange {
  const now = new Date();

  // 1. Check for custom date patterns like YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY
  const dateMatch = normalizedText.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})/g);
  if (dateMatch && dateMatch.length >= 2) {
    const parseCustomDate = (str: string): Date => {
      const parts = str.split(/[-/]/).map((p) => parseInt(p, 10));
      if (parts[0] > 1000) {
        // YYYY-MM-DD
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      // DD-MM-YYYY
      return new Date(parts[2], parts[1] - 1, parts[0]);
    };

    const d1 = parseCustomDate(dateMatch[0]);
    const d2 = parseCustomDate(dateMatch[1]);
    const start = d1 <= d2 ? d1 : d2;
    const end = d1 <= d2 ? d2 : d1;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const formatShort = (d: Date) => `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    return {
      period: "custom",
      startDate: start,
      endDate: end,
      labelEn: `${formatShort(start)} to ${formatShort(end)}`,
      labelHinglish: `${formatShort(start)} se ${formatShort(end)} tak`,
      labelHi: `${formatShort(start)} से ${formatShort(end)} तक`,
    };
  }

  // 2. Today / Aaj / आज
  if (
    normalizedText.includes("today") ||
    normalizedText.includes("aaj") ||
    normalizedText.includes("आज") ||
    normalizedText.includes("current day")
  ) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return {
      period: "today",
      startDate: start,
      endDate: end,
      labelEn: "Today",
      labelHinglish: "Aaj",
      labelHi: "आज",
    };
  }

  // 3. Yesterday / Kal / कल
  if (
    normalizedText.includes("yesterday") ||
    normalizedText.includes("kal ki") ||
    normalizedText.includes("beeta kal") ||
    normalizedText.includes("beete kal") ||
    normalizedText.includes("कल")
  ) {
    const start = new Date(now);
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return {
      period: "yesterday",
      startDate: start,
      endDate: end,
      labelEn: "Yesterday",
      labelHinglish: "Kal (Yesterday)",
      labelHi: "कल (Yesterday)",
    };
  }

  // 4. This Week / Is Hafte / इस हफ्ते / इस सप्ताह
  if (
    normalizedText.includes("this week") ||
    normalizedText.includes("is hafte") ||
    normalizedText.includes("is week") ||
    normalizedText.includes("current week") ||
    normalizedText.includes("last 7 days") ||
    normalizedText.includes("pichle 7 din") ||
    normalizedText.includes("इस हफ्ते") ||
    normalizedText.includes("इस सप्ताह") ||
    normalizedText.includes("पिछले 7 दिन")
  ) {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return {
      period: "this_week",
      startDate: start,
      endDate: end,
      labelEn: "This Week (Last 7 Days)",
      labelHinglish: "Is Hafte (Last 7 Days)",
      labelHi: "इस हफ्ते (पिछले 7 दिन)",
    };
  }

  // 5. Last Month / Pichle Mahine / पिछले महीने
  if (
    normalizedText.includes("last month") ||
    normalizedText.includes("pichle mahine") ||
    normalizedText.includes("pichhla mahina") ||
    normalizedText.includes("previous month") ||
    normalizedText.includes("पिछले महीने") ||
    normalizedText.includes("पिछले माह")
  ) {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const start = new Date(curYear, curMonth - 1, 1, 0, 0, 0, 0);
    const end = new Date(curYear, curMonth, 0, 23, 59, 59, 999);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const label = `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    return {
      period: "last_month",
      startDate: start,
      endDate: end,
      labelEn: `Last Month (${label})`,
      labelHinglish: `Pichle Mahine (${label})`,
      labelHi: `पिछले महीने (${label})`,
    };
  }

  // 6. This Quarter / Is Quarter / तिमाही
  if (
    normalizedText.includes("quarter") ||
    normalizedText.includes("quarterly") ||
    normalizedText.includes("tin mahine") ||
    normalizedText.includes("teen mahine") ||
    normalizedText.includes("तिमाही") ||
    normalizedText.includes("इस तिमाही")
  ) {
    const start = new Date(now);
    start.setDate(now.getDate() - 89);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return {
      period: "this_quarter",
      startDate: start,
      endDate: end,
      labelEn: "This Quarter (Last 90 Days)",
      labelHinglish: "Is Quarter (Pichle 90 Din)",
      labelHi: "इस तिमाही (पिछले 90 दिन)",
    };
  }

  // 7. This Financial Year / FY / Is Saal / इस साल / वित्तीय वर्ष
  if (
    normalizedText.includes("financial year") ||
    normalizedText.includes("this fy") ||
    normalizedText.includes("fy") ||
    normalizedText.includes("this year") ||
    normalizedText.includes("is saal") ||
    normalizedText.includes("current year") ||
    normalizedText.includes("yearly") ||
    normalizedText.includes("इस साल") ||
    normalizedText.includes("इस वर्ष") ||
    normalizedText.includes("वित्तीय वर्ष")
  ) {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    // Indian FY starts April 1st
    const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
    const start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return {
      period: "this_year",
      startDate: start,
      endDate: end,
      labelEn: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
      labelHinglish: `Financial Year ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
      labelHi: `वित्तीय वर्ष ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
    };
  }

  // 8. Default: This Month (1st of current month to current moment)
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  return {
    period: "this_month",
    startDate: start,
    endDate: end,
    labelEn: `This Month (${mLabel})`,
    labelHinglish: `Is Mahine (${mLabel})`,
    labelHi: `इस महीने (${mLabel})`,
  };
}

/**
 * Classifies user message into a deterministic business or support intent.
 */
export function classifyIntent(rawQuery: string): IntentClassificationResult {
  const normalized = normalizeQuery(rawQuery);
  const language = detectLanguage(normalized);
  const dateRange = parseDateRange(normalized);

  // If query is empty or trivial
  if (!normalized || normalized.length < 2) {
    return {
      intent: "AMBIGUOUS_QUERY",
      confidence: 0.1,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
      needsClarification: true,
      clarificationPrompt: {
        en: "Could you please tell me what you'd like to check? You can ask about Sales, Profit, Inventory, Customers, or Elvora features.",
        hinglish: "Aap kya check karna chahte hain? Aap Sales, Profit, Stock, Customers ya Elvora ke features ke baare me pooch sakte hain.",
        hi: "कृपया बताएं कि आप क्या देखना चाहते हैं? आप बिक्री, मुनाफा, स्टॉक, ग्राहकों के उधार या एल्बोरा फ़ीचर्स के बारे में पूछ सकते हैं।",
      },
    };
  }

  // Ambiguous single word inputs
  const ambiguousKeywords = [
    "report", "sales", "kharcha", "stock", "paisa", "ledger", "bill", "dukaan", "status",
    "बिक्री", "स्टॉक", "खर्च", "बिल", "उधार", "मुनाफा"
  ];
  if (ambiguousKeywords.includes(normalized)) {
    return {
      intent: "AMBIGUOUS_QUERY",
      confidence: 0.4,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
      needsClarification: true,
      clarificationPrompt: {
        en: `You asked about "${rawQuery}". Would you like to view Today's Sales, Monthly Profit, Low Stock, or Outstanding Receivables?`,
        hinglish: `Aapne "${rawQuery}" poocha. Kya aap Aaj ki Sales, Monthly Profit, Low Stock ya Udhar Receivables dekhna chahte hain?`,
        hi: `आपने "${rawQuery}" पूछा। क्या आप आज की बिक्री, मासिक मुनाफा, कम स्टॉक या बकाया उधार देखना चाहते हैं?`,
      },
    };
  }

  // 1. SALES COMPARISON
  if (
    normalized.includes("compare sales") ||
    normalized.includes("sales comparison") ||
    normalized.includes("growth") ||
    normalized.includes("pichle mahine se kitna") ||
    normalized.includes("sale badhi ya ghati") ||
    normalized.includes("बिक्री तुलना") ||
    normalized.includes("तुलना")
  ) {
    return {
      intent: "SALES_COMPARISON",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 2. TOP SELLING PRODUCTS
  if (
    normalized.includes("top selling") ||
    normalized.includes("top products") ||
    normalized.includes("best selling") ||
    normalized.includes("most sold") ||
    normalized.includes("sabse jyada kya bika") ||
    normalized.includes("kaunsa product sabse jyada") ||
    normalized.includes("top items") ||
    normalized.includes("सबसे ज्यादा क्या बिका") ||
    normalized.includes("सबसे अधिक बिकने वाले") ||
    normalized.includes("टॉप प्रोडक्ट्स")
  ) {
    return {
      intent: "TOP_SELLING_PRODUCTS",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 3. INVOICE COUNT / METRICS
  if (
    normalized.includes("invoice count") ||
    normalized.includes("how many invoices") ||
    normalized.includes("number of invoices") ||
    normalized.includes("kitne bill bane") ||
    normalized.includes("kitne invoices bane") ||
    normalized.includes("total bills") ||
    normalized.includes("average bill") ||
    normalized.includes("average invoice") ||
    normalized.includes("कितने बिल बने") ||
    normalized.includes("कुल बिल")
  ) {
    return {
      intent: "INVOICE_METRICS",
      confidence: 0.92,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 4. SALES SUMMARY (Evaluated before general queries)
  if (
    normalized.includes("sales") ||
    normalized.includes("sale") ||
    normalized.includes("bikri") ||
    normalized.includes("turnover") ||
    normalized.includes("revenue") ||
    normalized.includes("kitna bika") ||
    normalized.includes("aaj ki kamai") ||
    normalized.includes("collection") ||
    normalized.includes("बिक्री") ||
    normalized.includes("कुल बिक्री") ||
    normalized.includes("सेल")
  ) {
    return {
      intent: "SALES_SUMMARY",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 5. PROFIT AND LOSS
  if (
    normalized.includes("profit and loss") ||
    normalized.includes("net profit") ||
    normalized.includes("profit") ||
    normalized.includes("munafa") ||
    normalized.includes("faida") ||
    normalized.includes("fayda") ||
    normalized.includes("margin") ||
    normalized.includes("loss") ||
    normalized.includes("nuksan") ||
    normalized.includes("मुनाफा") ||
    normalized.includes("लाभ") ||
    normalized.includes("नुकसान") ||
    normalized.includes("हानि") ||
    normalized.includes("नेट प्रॉफिट")
  ) {
    return {
      intent: "PROFIT_AND_LOSS",
      confidence: 0.96,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 6. EXPENSE SUMMARY
  if (
    normalized.includes("expense") ||
    normalized.includes("expenses") ||
    normalized.includes("kharcha") ||
    normalized.includes("kharche") ||
    normalized.includes("spending") ||
    normalized.includes("overhead") ||
    normalized.includes("cost") ||
    normalized.includes("खर्च") ||
    normalized.includes("खर्चे") ||
    normalized.includes("व्यय")
  ) {
    return {
      intent: "EXPENSE_SUMMARY",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 7. INVENTORY: LOW STOCK & REORDER
  if (
    normalized.includes("low stock") ||
    normalized.includes("kam stock") ||
    normalized.includes("khatam hone wala") ||
    normalized.includes("khatam hone wali") ||
    normalized.includes("running out") ||
    normalized.includes("reorder") ||
    normalized.includes("kya khareedna hai") ||
    normalized.includes("kya mangwana hai") ||
    normalized.includes("alert") ||
    normalized.includes("कम स्टॉक") ||
    normalized.includes("खत्म होने वाला") ||
    normalized.includes("स्टॉक अलर्ट")
  ) {
    return {
      intent: "INVENTORY_LOW_STOCK",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 8. INVENTORY: OUT OF STOCK
  if (
    normalized.includes("out of stock") ||
    normalized.includes("khatam") ||
    normalized.includes("zero stock") ||
    normalized.includes("स्टॉक खत्म") ||
    normalized.includes("शून्य स्टॉक") ||
    normalized.includes("आउट ऑफ स्टॉक")
  ) {
    return {
      intent: "INVENTORY_OUT_OF_STOCK",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 9. INVENTORY: VALUATION
  if (
    normalized.includes("stock valuation") ||
    normalized.includes("inventory value") ||
    normalized.includes("maal ki keemat") ||
    normalized.includes("kitne ka maal hai") ||
    normalized.includes("stock value") ||
    normalized.includes("स्टॉक वैल्यू") ||
    normalized.includes("माल का मूल्य")
  ) {
    return {
      intent: "INVENTORY_VALUATION",
      confidence: 0.93,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 10. INVENTORY: GENERAL STOCK
  if (
    normalized.includes("stock") ||
    normalized.includes("inventory") ||
    normalized.includes("maal") ||
    normalized.includes("products in stock") ||
    normalized.includes("godown") ||
    normalized.includes("स्टॉक") ||
    normalized.includes("इन्वेंटरी") ||
    normalized.includes("गोदाम") ||
    normalized.includes("माल")
  ) {
    return {
      intent: "INVENTORY_CURRENT_STOCK",
      confidence: 0.88,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 11. TOP CUSTOMERS
  if (
    normalized.includes("top customer") ||
    normalized.includes("top customers") ||
    normalized.includes("best customer") ||
    normalized.includes("sabse bade grahak") ||
    normalized.includes("highest paying") ||
    normalized.includes("शीर्ष ग्राहक")
  ) {
    return {
      intent: "TOP_CUSTOMERS",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 12. CUSTOMER OUTSTANDING / RECEIVABLES / UDHAR
  if (
    normalized.includes("udhar") ||
    normalized.includes("outstanding") ||
    normalized.includes("receivable") ||
    normalized.includes("receivables") ||
    normalized.includes("paise lene hain") ||
    normalized.includes("customers ke paas pending") ||
    normalized.includes("customer balance") ||
    normalized.includes("due balance") ||
    normalized.includes("overdue") ||
    normalized.includes("उधार") ||
    normalized.includes("ग्राहक उधार") ||
    normalized.includes("ग्राहकों का बकाया") ||
    normalized.includes("बकाया")
  ) {
    return {
      intent: "CUSTOMER_OUTSTANDING",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 13. SUPPLIER OUTSTANDING / PAYABLES
  if (
    normalized.includes("supplier") ||
    normalized.includes("vendor") ||
    normalized.includes("payable") ||
    normalized.includes("payables") ||
    normalized.includes("supplier ko kitna dena") ||
    normalized.includes("vyapari ko payment") ||
    normalized.includes("pending payment to supplier") ||
    normalized.includes("सप्लायर") ||
    normalized.includes("सप्लायर बकाया") ||
    normalized.includes("व्यापारी को देना")
  ) {
    return {
      intent: "SUPPLIER_OUTSTANDING",
      confidence: 0.95,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 14. PURCHASE SUMMARY
  if (
    normalized.includes("purchase") ||
    normalized.includes("purchases") ||
    normalized.includes("procurement") ||
    normalized.includes("kitna maal kharida") ||
    normalized.includes("purchase invoice") ||
    normalized.includes("खरीद") ||
    normalized.includes("परचेज")
  ) {
    return {
      intent: "PURCHASE_SUMMARY",
      confidence: 0.92,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 15. CASH & BANK BALANCE
  if (
    normalized.includes("cash balance") ||
    normalized.includes("bank balance") ||
    normalized.includes("cash in hand") ||
    normalized.includes("cashbook") ||
    normalized.includes("bank me kitna") ||
    normalized.includes("galle me kitna") ||
    normalized.includes("cash flow") ||
    normalized.includes("कैश") ||
    normalized.includes("नकद") ||
    normalized.includes("रोकड़") ||
    normalized.includes("बैंक बैलेंस")
  ) {
    return {
      intent: "CASH_BANK_BALANCE",
      confidence: 0.94,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 16. TRIAL BALANCE
  if (
    normalized.includes("trial balance") ||
    normalized.includes("tb report") ||
    normalized.includes("ट्रायल बैलेंस")
  ) {
    return {
      intent: "TRIAL_BALANCE",
      confidence: 0.98,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 17. BALANCE SHEET
  if (
    normalized.includes("balance sheet") ||
    normalized.includes("assets and liabilities") ||
    normalized.includes("बैलेंस शीट")
  ) {
    return {
      intent: "BALANCE_SHEET",
      confidence: 0.98,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 18. BUSINESS OVERVIEW
  if (
    normalized.includes("overview") ||
    normalized.includes("summary") ||
    normalized.includes("dukaan ka haal") ||
    normalized.includes("business kaisa chal raha") ||
    normalized.includes("kpi") ||
    normalized.includes("executive summary") ||
    normalized.includes("overall status") ||
    normalized.includes("व्यापार स्थिति") ||
    normalized.includes("दुकान की स्थिति")
  ) {
    return {
      intent: "BUSINESS_OVERVIEW",
      confidence: 0.9,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
    };
  }

  // 19. ELVORA SUPPORT / HOW-TO
  const supportMatch = findSupportKnowledge(normalized);
  if (supportMatch) {
    return {
      intent: "ELVORA_SUPPORT",
      confidence: 0.9,
      dateRange,
      language,
      rawQuery,
      normalizedQuery: normalized,
      supportTopic: supportMatch.id,
    };
  }

  // 20. UNKNOWN / FALLBACK
  return {
    intent: "UNKNOWN_QUERY",
    confidence: 0.2,
    dateRange,
    language,
    rawQuery,
    normalizedQuery: normalized,
  };
}
