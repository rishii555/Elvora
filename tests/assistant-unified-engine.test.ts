import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyIntent,
  normalizeQuery,
  detectLanguage,
  parseDateRange,
} from "@/lib/assistant/intent-engine";
import { findSupportKnowledge } from "@/lib/assistant/support-knowledge";
import { BusinessToolsRegistry, formatINR } from "@/lib/assistant/business-tools";
import { AssistantConversationService } from "@/lib/assistant/conversation-service";
import { checkTenantRateLimit, clearAllRateLimitsForTests } from "@/lib/auth/rate-limiter";
import { sanitizeInputString } from "@/lib/api/security";
import { prisma } from "@/lib/db/prisma";

describe("Elvora Unified Business Assistant & Support Engine Suite", () => {
  const TENANT_A = "6655555555555555555555aa";
  const TENANT_B = "6655555555555555555555bb";
  const USER_A1 = "665555555555555555555501";
  const USER_B1 = "665555555555555555555503";

  beforeEach(() => {
    vi.restoreAllMocks();
    clearAllRateLimitsForTests();
  });

  // =========================================================================
  // 1. Text Normalization & Language Detection
  // =========================================================================
  describe("1. Query Normalization & Language Detection", () => {
    it("normalizes whitespace, punctuation, and case consistently", () => {
      const raw = "   Mera Is   Month Ka SALE Kitna Hua???   ";
      const normalized = normalizeQuery(raw);
      expect(normalized).toBe("mera is month ka sale kitna hua");
    });

    it("detects Hinglish phrasing accurately", () => {
      expect(detectLanguage("mera is month ka sale kitna hua")).toBe("hinglish");
      expect(detectLanguage("mere kitne paise customers ke paas pending hain")).toBe("hinglish");
      expect(detectLanguage("stock khatam hone wala hai kya")).toBe("hinglish");
      expect(detectLanguage("aaj kitna munafa hua")).toBe("hinglish");
    });

    it("detects English phrasing accurately", () => {
      expect(detectLanguage("what is my total sales today")).toBe("en");
      expect(detectLanguage("show me out of stock products")).toBe("en");
      expect(detectLanguage("compare sales with previous month")).toBe("en");
      expect(detectLanguage("how much money do we owe suppliers")).toBe("en");
    });
  });

  // =========================================================================
  // 2. Intent Classification (English & Hinglish)
  // =========================================================================
  describe("2. Intent Classification Engine", () => {
    it("classifies Sales queries in English and Hinglish", () => {
      // Prompt example: "Mera is month ka sale kitna hua?" -> SALES_SUMMARY
      const r1 = classifyIntent("Mera is month ka sale kitna hua?");
      expect(r1.intent).toBe("SALES_SUMMARY");
      expect(r1.dateRange.period).toBe("this_month");
      expect(r1.language).toBe("hinglish");

      const r2 = classifyIntent("What are our total sales today?");
      expect(r2.intent).toBe("SALES_SUMMARY");
      expect(r2.dateRange.period).toBe("today");
      expect(r2.language).toBe("en");

      const r3 = classifyIntent("aaj kitni bikri hui?");
      expect(r3.intent).toBe("SALES_SUMMARY");
      expect(r3.dateRange.period).toBe("today");
    });

    it("classifies Customer Outstanding & Udhar queries", () => {
      // Prompt example: "Mere kitne paise customers ke paas pending hain?" -> CUSTOMER_OUTSTANDING
      const r1 = classifyIntent("Mere kitne paise customers ke paas pending hain?");
      expect(r1.intent).toBe("CUSTOMER_OUTSTANDING");

      const r2 = classifyIntent("customer udhar kitna baaki hai?");
      expect(r2.intent).toBe("CUSTOMER_OUTSTANDING");

      const r3 = classifyIntent("show me total overdue customer receivables");
      expect(r3.intent).toBe("CUSTOMER_OUTSTANDING");
    });

    it("classifies Low Stock & Reorder queries", () => {
      // Prompt example: "Stock khatam hone wala hai kya?" -> INVENTORY_LOW_STOCK
      const r1 = classifyIntent("Stock khatam hone wala hai kya?");
      expect(r1.intent).toBe("INVENTORY_LOW_STOCK");

      const r2 = classifyIntent("which products have low stock?");
      expect(r2.intent).toBe("INVENTORY_LOW_STOCK");

      const r3 = classifyIntent("kaunse items reorder karne hain?");
      expect(r3.intent).toBe("INVENTORY_LOW_STOCK");
    });

    it("classifies Out of Stock queries specifically", () => {
      const r1 = classifyIntent("which products are out of stock?");
      expect(r1.intent).toBe("INVENTORY_OUT_OF_STOCK");

      const r2 = classifyIntent("kaunse product khatam ho gaye?");
      expect(r2.intent).toBe("INVENTORY_OUT_OF_STOCK");
    });

    it("classifies Profit and Loss queries", () => {
      const r1 = classifyIntent("is month ka munafa kitna hai?");
      expect(r1.intent).toBe("PROFIT_AND_LOSS");

      const r2 = classifyIntent("what is our net profit this month?");
      expect(r2.intent).toBe("PROFIT_AND_LOSS");

      const r3 = classifyIntent("show p&l statement");
      expect(r3.intent).toBe("PROFIT_AND_LOSS");
    });

    it("classifies Expense queries", () => {
      const r1 = classifyIntent("total expenses kitne hue?");
      expect(r1.intent).toBe("EXPENSE_SUMMARY");

      const r2 = classifyIntent("dukaan me kitna kharcha hua?");
      expect(r2.intent).toBe("EXPENSE_SUMMARY");
    });

    it("classifies Sales Comparison queries", () => {
      const r1 = classifyIntent("compare sales with last month");
      expect(r1.intent).toBe("SALES_COMPARISON");

      const r2 = classifyIntent("pichle mahine se kitna jyada sale hua?");
      expect(r2.intent).toBe("SALES_COMPARISON");
    });

    it("classifies Top Selling Products queries", () => {
      const r1 = classifyIntent("sabse jyada kya bika?");
      expect(r1.intent).toBe("TOP_SELLING_PRODUCTS");

      const r2 = classifyIntent("show top selling products");
      expect(r2.intent).toBe("TOP_SELLING_PRODUCTS");
    });

    it("classifies Accounting (Cash, Bank, Trial Balance, Balance Sheet) queries", () => {
      expect(classifyIntent("cash and bank balance").intent).toBe("CASH_BANK_BALANCE");
      expect(classifyIntent("galle me kitna paisa hai?").intent).toBe("CASH_BANK_BALANCE");
      expect(classifyIntent("trial balance dikhao").intent).toBe("TRIAL_BALANCE");
      expect(classifyIntent("show balance sheet").intent).toBe("BALANCE_SHEET");
    });

    it("detects Ambiguous single-word inputs and triggers clarification", () => {
      const r1 = classifyIntent("report");
      expect(r1.intent).toBe("AMBIGUOUS_QUERY");
      expect(r1.needsClarification).toBe(true);
      expect(r1.clarificationPrompt?.en).toContain("Would you like to view");

      const r2 = classifyIntent("sales");
      expect(r2.intent).toBe("AMBIGUOUS_QUERY");
      expect(r2.needsClarification).toBe(true);

      const r3 = classifyIntent("?");
      expect(r3.intent).toBe("AMBIGUOUS_QUERY");
      expect(r3.needsClarification).toBe(true);
    });

    it("falls back cleanly to UNKNOWN_QUERY for out-of-domain requests without hallucinations", () => {
      const res = classifyIntent("who won the football world cup?");
      expect(res.intent).toBe("UNKNOWN_QUERY");
      expect(res.confidence).toBeLessThan(0.5);
    });
  });

  // =========================================================================
  // 3. Date Range Parsing & Indian Financial Year
  // =========================================================================
  describe("3. Date Range Resolution", () => {
    it("resolves Today correctly", () => {
      const d = parseDateRange("sales today");
      expect(d.period).toBe("today");
      expect(d.startDate.getDate()).toBe(new Date().getDate());
      expect(d.labelEn).toBe("Today");
    });

    it("resolves Yesterday correctly", () => {
      const d = parseDateRange("kal ki sale kitni thi");
      expect(d.period).toBe("yesterday");
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(d.startDate.getDate()).toBe(yesterday.getDate());
    });

    it("resolves This Week (Last 7 Days)", () => {
      const d = parseDateRange("is hafte kitna sale hua");
      expect(d.period).toBe("this_week");
      expect(d.labelHinglish).toContain("Is Hafte");
    });

    it("resolves Last Month boundaries", () => {
      const d = parseDateRange("pichle mahine ki report");
      expect(d.period).toBe("last_month");
      expect(d.startDate.getDate()).toBe(1);
    });

    it("resolves Indian Financial Year starting April 1st", () => {
      const d = parseDateRange("this financial year summary");
      expect(d.period).toBe("this_year");
      expect(d.startDate.getMonth()).toBe(3); // April is index 3 (0-indexed)
      expect(d.startDate.getDate()).toBe(1);
      expect(d.labelEn).toContain("FY ");
    });

    it("parses custom date intervals (YYYY-MM-DD)", () => {
      const d = parseDateRange("sales from 2026-04-01 to 2026-04-30");
      expect(d.period).toBe("custom");
      expect(d.startDate.getFullYear()).toBe(2026);
      expect(d.startDate.getMonth()).toBe(3); // April
      expect(d.startDate.getDate()).toBe(1);
      expect(d.endDate.getDate()).toBe(30);
    });
  });

  // =========================================================================
  // 4. Elvora Support Knowledge Base
  // =========================================================================
  describe("4. Elvora Customer Support Knowledge Base", () => {
    it("matches POS Counter billing queries and returns navigation route", () => {
      const article = findSupportKnowledge("counter pos me bill kaise banaye");
      expect(article).not.toBeNull();
      expect(article?.id).toBe("POS_BILLING");
      expect(article?.navigationPath).toBe("/pos");
      expect(article?.stepsEn.length).toBeGreaterThan(3);
    });

    it("matches GST Invoicing questions with exact steps", () => {
      const article = findSupportKnowledge("how to create a b2b gst tax invoice");
      expect(article).not.toBeNull();
      expect(article?.id).toBe("GST_INVOICES");
      expect(article?.navigationPath).toBe("/invoices");
    });

    it("matches Low Stock & Inventory threshold guides", () => {
      const article = findSupportKnowledge("product add kaise kare aur stock threshold kaise set kare");
      expect(article).not.toBeNull();
      expect(article?.id).toBe("INVENTORY_MANAGEMENT");
      expect(article?.navigationPath).toBe("/inventory");
    });

    it("matches Registration and Admin Approval process guides", () => {
      const article = findSupportKnowledge("account approval pending kyu hai");
      expect(article).not.toBeNull();
      expect(article?.id).toBe("REGISTRATION_APPROVAL");
      expect(article?.navigationPath).toBe("/pending-approval");
    });

    it("matches Shop Settings & Staff RBAC guides", () => {
      const article = findSupportKnowledge("staff ko biller role kaise dein");
      expect(article).not.toBeNull();
      expect(article?.id).toBe("SETTINGS_ROLES");
      expect(article?.navigationPath).toBe("/settings");
    });
  });

  // =========================================================================
  // 5. Business Tools Execution & RBAC Permission Enforcement
  // =========================================================================
  describe("5. Business Tools Execution & RBAC Enforcement", () => {
    const dummyRange = parseDateRange("this month");

    it("blocks BILLER role from accessing Profit and Loss (Fails Closed)", async () => {
      // BILLER does NOT have VIEW_FINANCIAL_REPORTS
      const res = await BusinessToolsRegistry.execute(
        "PROFIT_AND_LOSS",
        TENANT_A,
        "BILLER",
        dummyRange
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe("PERMISSION_DENIED");
      expect(res.textEn).toContain("Access Restricted");
      expect(res.textHinglish).toContain("Suraksha Rukaawat");
    });

    it("blocks BILLER role from accessing Double-Entry Trial Balance", async () => {
      // BILLER does NOT have MANAGE_ACCOUNTING
      const res = await BusinessToolsRegistry.execute(
        "TRIAL_BALANCE",
        TENANT_A,
        "BILLER",
        dummyRange
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe("PERMISSION_DENIED");
    });

    it("blocks BILLER role from accessing Supplier Purchase Costs", async () => {
      // BILLER does NOT have VIEW_PURCHASE_COSTS
      const res = await BusinessToolsRegistry.execute(
        "SUPPLIER_OUTSTANDING",
        TENANT_A,
        "BILLER",
        dummyRange
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe("PERMISSION_DENIED");
    });

    it("allows BILLER role to view Counter Inventory & Low Stock alerts", async () => {
      // BILLER has MANAGE_INVENTORY
      const res = await BusinessToolsRegistry.execute(
        "INVENTORY_LOW_STOCK",
        TENANT_A,
        "BILLER",
        dummyRange
      );

      expect(res.success).toBe(true);
      expect(res.intent).toBe("INVENTORY_LOW_STOCK");
      expect(res.structuredData?.sourceModule).toContain("Inventory");
    });

    it("allows OWNER and MANAGER full access to Sales, Profit, and Accounting", async () => {
      const salesRes = await BusinessToolsRegistry.execute(
        "SALES_SUMMARY",
        TENANT_A,
        "OWNER",
        dummyRange
      );
      expect(salesRes.success).toBe(true);
      expect(salesRes.structuredData?.kpis).toBeDefined();

      const profitRes = await BusinessToolsRegistry.execute(
        "PROFIT_AND_LOSS",
        TENANT_A,
        "OWNER",
        dummyRange
      );
      expect(profitRes.success).toBe(true);
      expect(profitRes.structuredData?.kpis).toBeDefined();
    });

    it("formats Indian Rupee currency correctly with comma grouping", () => {
      expect(formatINR(125000)).toContain("1,25,000");
      expect(formatINR(0)).toContain("0.00");
      expect(formatINR(null)).toContain("0.00");
    });
  });

  // =========================================================================
  // 6. Conversation Persistence & Multi-Tenant Isolation
  // =========================================================================
  describe("6. Conversation Management & Strict Tenant Isolation", () => {
    it("creates, lists, and isolates conversations by tenant and user", async () => {
      // Mock Prisma assistantConversation
      const mockDbStore: any[] = [];

      vi.spyOn(prisma.assistantConversation as any, "create").mockImplementation(async (args: any) => {
        const item = {
          id: `conv_${Date.now()}_${Math.random()}`,
          tenantId: args.data.tenantId,
          userId: args.data.userId,
          title: args.data.title,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockDbStore.push(item);
        return item as any;
      });

      vi.spyOn(prisma.assistantConversation as any, "findMany").mockImplementation(async (args: any) => {
        return mockDbStore
          .filter((c) => c.tenantId === args.where.tenantId && c.userId === args.where.userId)
          .map((c) => ({
            ...c,
            messages: [],
            _count: { messages: 0 },
          })) as any;
      });

      // Tenant A creates conversation
      const c1 = await AssistantConversationService.createConversation(
        TENANT_A,
        USER_A1,
        "Tenant A Conversation"
      );
      expect(c1.tenantId).toBe(TENANT_A);
      expect(c1.userId).toBe(USER_A1);

      // Tenant B creates conversation
      const c2 = await AssistantConversationService.createConversation(
        TENANT_B,
        USER_B1,
        "Tenant B Conversation"
      );
      expect(c2.tenantId).toBe(TENANT_B);

      // Tenant A lists conversations -> MUST NOT see Tenant B's conversation
      const listA = await AssistantConversationService.listConversations(TENANT_A, USER_A1);
      expect(listA.length).toBe(1);
      expect(listA[0].id).toBe(c1.id);
      expect(listA.find((c) => c.id === c2.id)).toBeUndefined();

      // Attacker from Tenant B attempts to read Tenant A's conversation
      vi.spyOn(prisma.assistantConversation as any, "findFirst").mockImplementation(async (args: any) => {
        const match = mockDbStore.find(
          (c) => c.id === args.where.id && c.tenantId === args.where.tenantId && c.userId === args.where.userId
        );
        if (!match) return null as any;
        return { ...match, messages: [] } as any;
      });

      const adversarialRead = await AssistantConversationService.getConversationWithMessages(
        TENANT_B, // Attacker tenant
        USER_B1,  // Attacker user
        c1.id     // Victim conversation ID
      );

      // Must be null (IDOR protected)
      expect(adversarialRead).toBeNull();
    });

    it("prevents cross-tenant deletion of conversations", async () => {
      const mockStore = [
        { id: "conv_target_1", tenantId: TENANT_A, userId: USER_A1, title: "Legitimate" },
      ];

      vi.spyOn(prisma.assistantConversation as any, "findFirst").mockImplementation(async (args: any) => {
        const match = mockStore.find(
          (c) => c.id === args.where.id && c.tenantId === args.where.tenantId && c.userId === args.where.userId
        );
        return (match || null) as any;
      });

      const deleteSpy = vi.spyOn(prisma.assistantConversation as any, "delete").mockImplementation(async () => ({} as any));

      // Attacker from Tenant B tries to delete Tenant A's conversation
      const deleted = await AssistantConversationService.deleteConversation(
        TENANT_B,
        USER_B1,
        "conv_target_1"
      );

      expect(deleted).toBe(false);
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it("sanitizes user input to prevent stored XSS attacks", () => {
      const dirty = `<script>alert("hacked")</script>Hello & welcome!`;
      const clean = sanitizeInputString(dirty);
      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("</script>");
      expect(clean).toContain("Hello");
    });
  });

  // =========================================================================
  // 7. Security: Rate Limiting & Safe Fallbacks
  // =========================================================================
  describe("7. Chatbot Rate Limiting & Denial of Service Protection", () => {
    it("enforces tenant-scoped rate limits on assistant queries", () => {
      const opts = { windowMs: 60 * 1000, maxAttempts: 5 };

      // 5 calls allowed
      for (let i = 0; i < 5; i++) {
        const check = checkTenantRateLimit(TENANT_A, "assistant_chat", opts);
        expect(check.allowed).toBe(true);
      }

      // 6th call rejected
      const rejected = checkTenantRateLimit(TENANT_A, "assistant_chat", opts);
      expect(rejected.allowed).toBe(false);
      expect(rejected.remaining).toBe(0);
      expect(rejected.retryAfterSeconds).toBeGreaterThan(0);

      // Different tenant is unaffected (Strict Tenant Rate Isolation)
      const tenantBCheck = checkTenantRateLimit(TENANT_B, "assistant_chat", opts);
      expect(tenantBCheck.allowed).toBe(true);
    });
  });
});
