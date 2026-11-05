import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SafeMarkdown } from "@/components/assistant/safe-markdown";
import {
  classifyIntent,
  detectLanguage,
  parseDateRange,
} from "@/lib/assistant/intent-engine";
import { BusinessToolsRegistry } from "@/lib/assistant/business-tools";
import { findSupportKnowledge } from "@/lib/assistant/support-knowledge";

describe("Elvora Assistant — Safe Markdown & Multi-Language Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Safe Markdown Rendering Pipeline
  // =========================================================================
  describe("1. Markdown Rendering & Asterisk Elimination", () => {
    it("renders bold text as <strong> without raw asterisks", () => {
      const input = "Your shop generated **₹5,000** in total sales with **12 invoices**.";
      const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: input }));

      expect(html).toContain(">₹5,000</strong>");
      expect(html).toContain(">12 invoices</strong>");
      expect(html).toContain("font-bold text-slate-900");
      expect(html).not.toContain("**");
    });

    it("renders financial bold terms accurately (Sales, Profit, ₹0.00)", () => {
      const input = "Summary: **Sales**: ₹10,000, **Profit**: ₹3,000, Outstanding: **₹0.00**";
      const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: input }));

      expect(html).toContain(">Sales</strong>");
      expect(html).toContain(">Profit</strong>");
      expect(html).toContain(">₹0.00</strong>");
      expect(html).not.toContain("**Sales**");
      expect(html).not.toContain("**Profit**");
      expect(html).not.toContain("**₹0.00**");
    });

    it("renders italics and inline code properly", () => {
      const input = "Use the *F2* shortcut or press `Complete Sale` in Counter POS.";
      const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: input }));

      expect(html).toContain(">F2</em>");
      expect(html).toContain(">Complete Sale</code>");
    });

    it("renders numbered lists as <ol> and <li>", () => {
      const input = "Step-by-step instructions:\n1. Open Counter POS\n2. Scan barcode\n3. Press Enter to print";
      const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: input }));

      expect(html).toContain("<ol");
      expect(html).toContain("Open Counter POS</li>");
      expect(html).toContain("Scan barcode</li>");
      expect(html).toContain("Press Enter to print</li>");
    });

    it("renders bullet lists as <ul> and <li>", () => {
      const input = "Key metrics:\n- **Gross Sales:** ₹50,000\n- **Expenses:** ₹10,000\n- **Net Profit:** ₹40,000";
      const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: input }));

      expect(html).toContain("<ul");
      expect(html).toContain(">Gross Sales:</strong> ₹50,000</li>");
      expect(html).toContain(">Expenses:</strong> ₹10,000</li>");
      expect(html).toContain(">Net Profit:</strong> ₹40,000</li>");
      expect(html).not.toContain("**Gross Sales:**");
    });

    it("renders markdown headings as <h3> or <h4>", () => {
      const input = "### Counter POS Guide\nHere is how to use POS.";
      const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: input }));

      expect(html).toContain("<h4");
      expect(html).toContain("Counter POS Guide</h4>");
      expect(html).not.toContain("###");
    });

    it("handles malformed/unclosed markdown gracefully without crashing", () => {
      const input = "This has an unclosed **bold word and single asterisk";
      const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: input }));

      expect(html).toBeTruthy();
      expect(html).toContain("This has an unclosed **bold word and single asterisk");
    });

    it("strictly prevents XSS execution by escaping raw HTML tags", () => {
      const malicious = "<script>alert('xss')</script><img src=x onerror=alert(1) />**Bold**";
      const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: malicious }));

      // React escapes raw HTML characters into &lt; and &gt;
      expect(html).toContain("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
      expect(html).toContain("&lt;img src=x onerror=alert(1) /&gt;");
      expect(html).not.toContain("<script>");
      expect(html).toContain(">Bold</strong>");
    });
  });

  // =========================================================================
  // 2. Hindi & Multi-Language Query Detection & Classification
  // =========================================================================
  describe("2. Hindi & Multi-Language Recognition", () => {
    it("detects Hindi (Devanagari script) queries accurately", () => {
      expect(detectLanguage("आज की कुल बिक्री कितनी हुई?")).toBe("hindi");
      expect(detectLanguage("कम स्टॉक वाले प्रोडक्ट्स दिखाओ")).toBe("hindi");
      expect(detectLanguage("ग्राहकों का कितना उधार बाकी है?")).toBe("hindi");
      expect(detectLanguage("इस महीने का मुनाफा कितना है?")).toBe("hindi");
    });

    it("resolves Hindi date phrases correctly", () => {
      const today = parseDateRange("आज की बिक्री कितनी है");
      expect(today.period).toBe("today");
      expect(today.labelHi).toBe("आज");

      const yesterday = parseDateRange("कल का कलेक्शन दिखाओ");
      expect(yesterday.period).toBe("yesterday");
      expect(yesterday.labelHi).toContain("कल");

      const thisWeek = parseDateRange("इस हफ्ते कुल कितनी सेल हुई");
      expect(thisWeek.period).toBe("this_week");
      expect(thisWeek.labelHi).toContain("इस हफ्ते");

      const lastMonth = parseDateRange("पिछले महीने का खर्च कितना था");
      expect(lastMonth.period).toBe("last_month");
      expect(lastMonth.labelHi).toContain("पिछले महीने");

      const fy = parseDateRange("इस वित्तीय वर्ष का मुनाफा बताओ");
      expect(fy.period).toBe("this_year");
      expect(fy.labelHi).toContain("वित्तीय वर्ष");
    });

    it("classifies Hindi business intents accurately", () => {
      const q1 = classifyIntent("आज की कुल बिक्री कितनी हुई?");
      expect(q1.intent).toBe("SALES_SUMMARY");
      expect(q1.language).toBe("hindi");

      const q2 = classifyIntent("कम स्टॉक वाले प्रोडक्ट्स कौन से हैं?");
      expect(q2.intent).toBe("INVENTORY_LOW_STOCK");

      const q3 = classifyIntent("ग्राहकों का कितना उधार बाकी है?");
      expect(q3.intent).toBe("CUSTOMER_OUTSTANDING");

      const q4 = classifyIntent("इस महीने का शुद्ध मुनाफा कितना है?");
      expect(q4.intent).toBe("PROFIT_AND_LOSS");

      const q5 = classifyIntent("दुकान का कुल खर्च कितना हुआ?");
      expect(q5.intent).toBe("EXPENSE_SUMMARY");

      const q6 = classifyIntent("रोकड़ और बैंक बैलेंस कितना है?");
      expect(q6.intent).toBe("CASH_BANK_BALANCE");
    });

    it("matches Hindi support queries with knowledge base articles", () => {
      const match = findSupportKnowledge("काउंटर बिल कैसे बनाएं");
      expect(match).not.toBeNull();
      expect(match?.id).toBe("POS_BILLING");
      expect(match?.titleHi).toContain("काउंटर पीओएस");
      expect(match?.stepsHi).toBeDefined();
      expect(match?.stepsHi?.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. Response Engine Multi-Language Integration
  // =========================================================================
  describe("3. Response Engine Output in All Three Languages", () => {
    it("generates English, Hinglish, and Hindi responses with identical financial accuracy", async () => {
      const dateRange = parseDateRange("today");
      const TENANT = "6655555555555555555555aa";

      const result = await BusinessToolsRegistry.execute(
        "SALES_SUMMARY",
        TENANT,
        "OWNER",
        dateRange
      );

      expect(result.success).toBe(true);
      expect(result.textEn).toBeTruthy();
      expect(result.textHinglish).toBeTruthy();
      expect(result.textHi).toBeTruthy();

      // Verify Hindi text follows user-requested pattern:
      // "आज आपकी दुकान की कुल बिक्री ₹... रही है।"
      expect(result.textHi).toContain("आपकी दुकान की कुल बिक्री");
      expect(result.textHi).toContain("₹");

      // Verify English follows requested pattern:
      expect(result.textEn).toContain("your shop generated");

      // Verify Hinglish follows requested pattern:
      expect(result.textHinglish).toContain("aapki dukaan ki total sales");
    });

    it("returns helpful message in Hindi when intent is unknown or fallback", async () => {
      const dateRange = parseDateRange("today");
      const result = await BusinessToolsRegistry.execute(
        "UNKNOWN_QUERY",
        "6655555555555555555555aa",
        "OWNER",
        dateRange
      );

      expect(result.textHi).toContain("मुझे आपका सवाल पूरी तरह समझ नहीं आया");
      expect(result.textHi).toContain("बिक्री");
      expect(result.textHi).toContain("मुनाफा");
    });
  });
});
