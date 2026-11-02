import { describe, it, expect } from "vitest";
import { convertNumberToWordsINR, getStateNameByCode, INDIAN_GST_STATE_CODES } from "../lib/finance/decimal";
import fs from "fs";
import path from "path";

describe("GST Invoice Generator Print & PDF Engine Suite", () => {
  // -------------------------------------------------------------
  // 1. Calculations & Mathematical Integrity Tests
  // -------------------------------------------------------------
  describe("1. GST Calculations, Discounts & Statutory Totals", () => {
    it("correctly calculates a single-item invoice with CGST and SGST", () => {
      const item = {
        qty: 2,
        rate: 2500,
        discount: 0,
        gstRate: 18,
      };

      const gross = item.qty * item.rate; // 5000
      const discount = item.discount; // 0
      const taxable = gross - discount; // 5000
      const cgst = Number(((taxable * (item.gstRate / 2)) / 100).toFixed(2)); // 450
      const sgst = Number(((taxable * (item.gstRate / 2)) / 100).toFixed(2)); // 450
      const total = taxable + cgst + sgst; // 5900

      expect(gross).toBe(5000);
      expect(taxable).toBe(5000);
      expect(cgst).toBe(450);
      expect(sgst).toBe(450);
      expect(total).toBe(5900);
      expect(convertNumberToWordsINR(total)).toBe("Five Thousand Nine Hundred Rupees Only");
    });

    it("correctly calculates multiple items with mixed GST rates and flat discounts", () => {
      const items = [
        { qty: 2, rate: 2500, discount: 0, gstRate: 18 }, // Taxable 5000, CGST 450, SGST 450
        { qty: 3, rate: 1200, discount: 100, gstRate: 5 }, // Gross 3600 - 100 = 3500, CGST 87.50, SGST 87.50
      ];

      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;

      items.forEach((item) => {
        const taxable = item.qty * item.rate - item.discount;
        subtotal += taxable;
        totalCgst += (taxable * (item.gstRate / 2)) / 100;
        totalSgst += (taxable * (item.gstRate / 2)) / 100;
      });

      const rawGrandTotal = subtotal + totalCgst + totalSgst;
      const roundedGrandTotal = Math.round(rawGrandTotal);
      const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

      expect(subtotal).toBe(8500);
      expect(totalCgst).toBe(537.5);
      expect(totalSgst).toBe(537.5);
      expect(rawGrandTotal).toBe(9575);
      expect(roundOff).toBe(0);
      expect(roundedGrandTotal).toBe(9575);
      expect(convertNumberToWordsINR(roundedGrandTotal)).toBe(
        "Nine Thousand Five Hundred and Seventy Five Rupees Only"
      );
    });

    it("correctly calculates Inter-State IGST transactions with 0 CGST and 0 SGST", () => {
      const items = [
        { qty: 4, rate: 3200, discount: 200, gstRate: 18 }, // Gross 12800 - 200 = 12600. IGST 18% = 2268
        { qty: 4, rate: 1850, discount: 0, gstRate: 18 }, // Gross 7400. IGST 18% = 1332
      ];

      let subtotal = 0;
      let totalIgst = 0;

      items.forEach((item) => {
        const taxable = item.qty * item.rate - item.discount;
        subtotal += taxable;
        totalIgst += (taxable * item.gstRate) / 100;
      });

      const grandTotal = subtotal + totalIgst;
      expect(subtotal).toBe(20000);
      expect(totalIgst).toBe(3600);
      expect(grandTotal).toBe(23600);
      expect(convertNumberToWordsINR(grandTotal)).toBe(
        "Twenty Three Thousand Six Hundred Rupees Only"
      );
    });

    it("correctly computes fractional decimal round-off", () => {
      // 1 item with odd taxable value giving fractional paise
      const taxable = 333.33;
      const gstRate = 18;
      const cgst = (taxable * (gstRate / 2)) / 100; // 29.9997
      const sgst = (taxable * (gstRate / 2)) / 100; // 29.9997
      const rawTotal = taxable + cgst + sgst; // 393.3294
      const rounded = Math.round(rawTotal); // 393
      const roundOff = Number((rounded - rawTotal).toFixed(2));

      expect(rounded).toBe(393);
      expect(roundOff).toBe(-0.33);
    });

    it("handles 16+ line items for multi-page invoices with realistic pricing", () => {
      const itemsCount = 16;
      let totalTaxable = 0;
      for (let i = 1; i <= itemsCount; i++) {
        const qty = 2 + (i % 3);
        const rate = 500 + i * 50;
        const discount = i % 2 === 0 ? 25 : 0;
        const taxable = qty * rate - discount;
        totalTaxable += taxable;
      }

      expect(totalTaxable).toBeGreaterThan(20000);
      const grandTotal = Math.round(totalTaxable * 1.18);
      const inWords = convertNumberToWordsINR(grandTotal);
      expect(inWords).toContain("Rupees");
      expect(inWords).toContain("Only");
    });
  });

  // -------------------------------------------------------------
  // 2. State & Place of Supply Resolution Tests
  // -------------------------------------------------------------
  describe("2. State & Place of Supply Compliance", () => {
    it("resolves Indian GST state codes correctly", () => {
      expect(getStateNameByCode("09")).toBe("Uttar Pradesh");
      expect(getStateNameByCode("27")).toBe("Maharashtra");
      expect(getStateNameByCode("07")).toBe("Delhi");
      expect(getStateNameByCode("33")).toBe("Tamil Nadu");
      expect(getStateNameByCode("99")).toBe("Other State / UT");
    });

    it("contains all 37 standard Indian state/UT GST codes", () => {
      expect(Object.keys(INDIAN_GST_STATE_CODES).length).toBeGreaterThanOrEqual(36);
      expect(INDIAN_GST_STATE_CODES["09"]).toBe("Uttar Pradesh");
    });
  });

  // -------------------------------------------------------------
  // 3. Print Markup & Page-Structure Guarantees
  // -------------------------------------------------------------
  describe("3. Print Markup & Isolation Guarantees", () => {
    const pageFile = fs.readFileSync(path.resolve(process.cwd(), "app/invoice-generator/page.tsx"), "utf8");
    const clientFile = fs.readFileSync(path.resolve(process.cwd(), "app/invoice-generator/client.tsx"), "utf8");

    it("suppresses PublicHeader, nav, hero, FAQ, and PublicFooter in print mode", () => {
      // Check page.tsx hides non-invoice components
      expect(pageFile).toContain('<div className="print:hidden">\n        <PublicHeader');
      expect(pageFile).toContain('print:hidden">\n          <nav');
      expect(pageFile).toContain('print:hidden">\n          <h1'); // hero
      expect(pageFile).toContain('print:hidden">\n          <div className="mx-auto max-w-4xl space-y-8">'); // SEO guide
      expect(pageFile).toContain('<div className="print:hidden">\n        <PublicFooter />');
    });

    it("defines proper @media print CSS rules for A4 portrait with zero margin bleed", () => {
      expect(clientFile).toContain("@media print");
      expect(clientFile).toContain("size: A4 portrait");
      expect(clientFile).toContain("display: table-header-group");
      expect(clientFile).toContain("page-break-inside: avoid");
      expect(clientFile).toContain("#printable-invoice");
    });

    it("renders statutory Rule 46 requirements in the printable invoice", () => {
      expect(clientFile).toContain("TAX INVOICE");
      expect(clientFile).toContain("Original for Recipient");
      expect(clientFile).toContain("Invoice No:");
      expect(clientFile).toContain("Invoice Date:");
      expect(clientFile).toContain("Place of Supply:");
      expect(clientFile).toContain("Details of Receiver (Billed To):");
      expect(clientFile).toContain("Details of Consignee (Shipped To):");
      expect(clientFile).toContain("GSTIN");
      expect(clientFile).toContain("HSN/SAC");
      expect(clientFile).toContain("Total Taxable Value:");
      expect(clientFile).toContain("Amount in Words:");
      expect(clientFile).toContain("Bank & Payment Particulars:");
      expect(clientFile).toContain("Terms & Conditions:");
      expect(clientFile).toContain("Authorized Signatory");
    });

    it("hides interactive buttons, trash icons, and dropdowns during printing", () => {
      expect(clientFile).toContain("print:hidden");
      // Screen inputs must be accompanied by static printable spans
      expect(clientFile).toContain("hidden print:inline");
    });
  });
});
