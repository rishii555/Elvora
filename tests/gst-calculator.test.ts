import { describe, it, expect } from "vitest";
import { calculateInvoiceItem, calculateInvoiceSummary } from "../lib/finance/decimal";

describe("GST Financial Decimal Engine", () => {
  it("calculates 18% intra-state GST with exact 50/50 CGST and SGST split", () => {
    // 1 Executive Office Desk at ₹5,000 with 10% discount
    const item = calculateInvoiceItem({
      quantity: 1,
      unitPrice: "5000.00",
      discountPercent: 10,
      gstRate: 18,
      isInterState: false,
    });

    expect(item.grossAmount).toBe("5000.00");
    expect(item.discountAmount).toBe("500.00");
    expect(item.taxableAmount).toBe("4500.00");
    // 18% of 4500 = 810 -> 405 CGST, 405 SGST
    expect(item.cgstAmount).toBe("405.00");
    expect(item.sgstAmount).toBe("405.00");
    expect(item.igstAmount).toBe("0.00");
    expect(item.totalAmount).toBe("5310.00");
  });

  it("calculates 18% inter-state GST with 100% IGST", () => {
    // 2 Premium Hardware Toolsets at ₹1,200 each
    const item = calculateInvoiceItem({
      quantity: 2,
      unitPrice: "1200.00",
      discountPercent: 0,
      gstRate: 18,
      isInterState: true,
    });

    expect(item.grossAmount).toBe("2400.00");
    expect(item.taxableAmount).toBe("2400.00");
    // 18% of 2400 = 432 IGST
    expect(item.cgstAmount).toBe("0.00");
    expect(item.sgstAmount).toBe("0.00");
    expect(item.igstAmount).toBe("432.00");
    expect(item.totalAmount).toBe("2832.00");
  });

  it("handles 28% GST for specialized commercial goods accurately", () => {
    const item = calculateInvoiceItem({
      quantity: 1,
      unitPrice: "10000.00",
      gstRate: 28,
      isInterState: false,
    });

    expect(item.taxableAmount).toBe("10000.00");
    // 28% of 10000 = 2800 -> 1400 CGST, 1400 SGST
    expect(item.cgstAmount).toBe("1400.00");
    expect(item.sgstAmount).toBe("1400.00");
    expect(item.totalAmount).toBe("12800.00");
  });

  it("accurately calculates round-off to nearest whole rupee", () => {
    // An item resulting in paise: ₹33.33 taxable + 18% tax (₹5.9994)
    const item = calculateInvoiceItem({
      quantity: 1,
      unitPrice: "33.33",
      gstRate: 18,
      isInterState: true,
    });

    const summary = calculateInvoiceSummary({
      items: [item],
    });

    expect(summary.taxableAmount).toBe("33.33");
    // Total raw is 33.33 + 6.00 = 39.33 -> rounded to 39.00 with -0.33 round-off
    expect(summary.grandTotal).toBe("39.00");
    expect(summary.roundOff).toBe("-0.33");
  });
});
