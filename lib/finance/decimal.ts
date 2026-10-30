import Decimal from "decimal.js";

// Configure Decimal.js for financial accuracy (30 decimal digits precision, round half up)
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export interface InvoiceItemCalculationInput {
  quantity: number;
  unitPrice: number | string;
  discountPercent?: number | string;
  discountAmount?: number | string;
  gstRate: number | string; // e.g. 18 for 18%
  isInterState: boolean;
  isTaxInclusive?: boolean;
}

export interface InvoiceItemCalculationResult {
  quantity: number;
  unitPrice: string; // "1000.00"
  grossAmount: string; // qty * unitPrice
  discountPercent: string;
  discountAmount: string;
  taxableAmount: string;
  gstRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTaxAmount: string;
  totalAmount: string;
  isTaxInclusive: boolean;
}

export interface InvoiceSummaryCalculationInput {
  items: InvoiceItemCalculationResult[];
  additionalDiscount?: number | string;
}

export interface InvoiceSummaryCalculationResult {
  subtotal: string;
  totalDiscount: string;
  taxableAmount: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  totalTax: string;
  rawGrandTotal: string;
  roundOff: string;
  grandTotal: string;
}

/**
 * Calculates line-item totals with high-precision decimal arithmetic,
 * supporting both tax-exclusive and tax-inclusive pricing, discounts, and inter-state tax splits.
 */
export function calculateInvoiceItem(input: InvoiceItemCalculationInput): InvoiceItemCalculationResult {
  const qty = new Decimal(input.quantity);
  const unitPrice = new Decimal(input.unitPrice);
  const grossAmount = qty.times(unitPrice);
  const isTaxInclusive = Boolean(input.isTaxInclusive);

  // Discount calculation
  let discountAmount = new Decimal(0);
  let discountPercent = new Decimal(0);

  if (input.discountAmount !== undefined && input.discountAmount !== null && Number(input.discountAmount) > 0) {
    discountAmount = new Decimal(input.discountAmount);
    discountPercent = grossAmount.gt(0)
      ? discountAmount.times(100).dividedBy(grossAmount).toDecimalPlaces(2)
      : new Decimal(0);
  } else if (input.discountPercent) {
    discountPercent = new Decimal(input.discountPercent);
    discountAmount = grossAmount.times(discountPercent).dividedBy(100);
  }

  const netAfterDiscount = grossAmount.minus(discountAmount);
  const gstRate = new Decimal(input.gstRate);
  const rateFactor = gstRate.dividedBy(100);

  let taxableAmount: Decimal;
  let taxAmount: Decimal;
  let totalAmount: Decimal;

  if (isTaxInclusive) {
    // Reverse tax calculation: Taxable = Net / (1 + Rate)
    const divisor = new Decimal(1).plus(rateFactor);
    taxableAmount = netAfterDiscount.dividedBy(divisor);
    taxAmount = netAfterDiscount.minus(taxableAmount);
    totalAmount = netAfterDiscount;
  } else {
    // Standard forward tax calculation
    taxableAmount = netAfterDiscount;
    taxAmount = taxableAmount.times(rateFactor);
    totalAmount = taxableAmount.plus(taxAmount);
  }

  let cgstAmount = new Decimal(0);
  let sgstAmount = new Decimal(0);
  let igstAmount = new Decimal(0);

  if (input.isInterState) {
    igstAmount = taxAmount;
  } else {
    // 50% CGST, 50% SGST
    cgstAmount = taxAmount.dividedBy(2);
    sgstAmount = taxAmount.dividedBy(2);
  }

  return {
    quantity: input.quantity,
    unitPrice: unitPrice.toFixed(2),
    grossAmount: grossAmount.toFixed(2),
    discountPercent: discountPercent.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    taxableAmount: taxableAmount.toFixed(2),
    gstRate: gstRate.toFixed(2),
    cgstAmount: cgstAmount.toFixed(2),
    sgstAmount: sgstAmount.toFixed(2),
    igstAmount: igstAmount.toFixed(2),
    totalTaxAmount: taxAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    isTaxInclusive,
  };
}

/**
 * Aggregates all items in an invoice, calculates round-off to nearest rupee, and produces final totals.
 */
export function calculateInvoiceSummary(input: InvoiceSummaryCalculationInput): InvoiceSummaryCalculationResult {
  let subtotal = new Decimal(0);
  let totalDiscount = new Decimal(input.additionalDiscount || 0);
  let taxableAmount = new Decimal(0);
  let cgstTotal = new Decimal(0);
  let sgstTotal = new Decimal(0);
  let igstTotal = new Decimal(0);

  for (const item of input.items) {
    subtotal = subtotal.plus(item.grossAmount);
    totalDiscount = totalDiscount.plus(item.discountAmount);
    taxableAmount = taxableAmount.plus(item.taxableAmount);
    cgstTotal = cgstTotal.plus(item.cgstAmount);
    sgstTotal = sgstTotal.plus(item.sgstAmount);
    igstTotal = igstTotal.plus(item.igstAmount);
  }

  const totalTax = cgstTotal.plus(sgstTotal).plus(igstTotal);
  const rawGrandTotal = taxableAmount.plus(totalTax);

  // Round off to nearest whole rupee (standard Indian accounting convention)
  const roundedGrandTotal = rawGrandTotal.round();
  const roundOff = roundedGrandTotal.minus(rawGrandTotal);

  return {
    subtotal: subtotal.toFixed(2),
    totalDiscount: totalDiscount.toFixed(2),
    taxableAmount: taxableAmount.toFixed(2),
    cgstTotal: cgstTotal.toFixed(2),
    sgstTotal: sgstTotal.toFixed(2),
    igstTotal: igstTotal.toFixed(2),
    totalTax: totalTax.toFixed(2),
    rawGrandTotal: rawGrandTotal.toFixed(2),
    roundOff: roundOff.toFixed(2),
    grandTotal: roundedGrandTotal.toFixed(2),
  };
}

/**
 * Returns Indian Financial Year string (e.g. "2026-27") based on April 1 - March 31 cycle.
 */
export function getIndianFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  if (month >= 4) {
    const nextYearTwoDigits = String((year + 1) % 100).padStart(2, "0");
    return `${year}-${nextYearTwoDigits}`;
  } else {
    const curYearTwoDigits = String(year % 100).padStart(2, "0");
    return `${year - 1}-${curYearTwoDigits}`;
  }
}

/**
 * Standard Indian State Code mapping (2-digit GST prefix).
 */
export const INDIAN_GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

export function getStateNameByCode(code: string): string {
  const normalized = code.padStart(2, "0");
  return INDIAN_GST_STATE_CODES[normalized] || "Other State / UT";
}

/**
 * Converts numeric INR amount to standard Indian English words (Rupees and Paise).
 */
export function convertNumberToWordsINR(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(num: number): string {
    if (num === 0) return "";
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    const unitPart = num % 10 !== 0 ? " " + units[num % 10] : "";
    return tens[Math.floor(num / 10)] + unitPart;
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let res = "";
    if (hundred > 0) {
      res += units[hundred] + " Hundred";
      if (rest > 0) res += " and ";
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  let words = "";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remainder = rupees % 1000;

  if (crore > 0) words += convertThreeDigits(crore) + " Crore ";
  if (lakh > 0) words += convertTwoDigits(lakh) + " Lakh ";
  if (thousand > 0) words += convertTwoDigits(thousand) + " Thousand ";
  if (remainder > 0) words += convertThreeDigits(remainder) + " ";

  words = words.trim() + " Rupees";

  if (paise > 0) {
    words += " and " + convertTwoDigits(paise) + " Paise";
  }

  return words + " Only";
}
