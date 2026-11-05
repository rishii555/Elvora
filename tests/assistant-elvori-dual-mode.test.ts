import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as chatPost } from "@/app/api/assistant/chat/route";
import { GET as suggestionsGet } from "@/app/api/assistant/suggestions/route";
import * as tenantContext from "@/lib/tenant/context";
import { clearAllRateLimitsForTests } from "@/lib/auth/rate-limiter";
import { BusinessToolsRegistry } from "@/lib/assistant/business-tools";
import { AssistantConversationService } from "@/lib/assistant/conversation-service";

describe("Elvori Dual-Mode Architecture & Security Suite", () => {
  const TENANT_ID = "6655555555555555555555cc";
  const USER_ID = "665555555555555555555509";

  beforeEach(() => {
    vi.restoreAllMocks();
    clearAllRateLimitsForTests();
  });

  describe("Mode A: Public Mode (Unauthenticated Visitors)", () => {
    beforeEach(() => {
      // Simulate unauthenticated visitor
      vi.spyOn(tenantContext, "requireTenantContext").mockRejectedValue(
        new tenantContext.TenantAuthorizationError("No active session")
      );
    });

    it("suggestions API returns PUBLIC mode with onboarding categories", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/suggestions");
      const res = await suggestionsGet(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe("PUBLIC");
      expect(data.categories).toBeDefined();
      expect(data.categories.length).toBeGreaterThanOrEqual(4);

      // Verify public categories match specification
      const titles = data.categories.map((c: any) => c.category);
      expect(titles).toContain("About Elvora");
      expect(titles).toContain("Features & Modules");
      expect(titles).toContain("Getting Started");
      expect(titles).toContain("FAQs & Support");
    });

    it("answers 'What is Elvora?' with public knowledge without accessing business tools", async () => {
      const toolSpy = vi.spyOn(BusinessToolsRegistry, "execute");

      const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "What is Elvora?" }),
      });

      const res = await chatPost(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe("PUBLIC");
      expect(data.intent).toBe("PUBLIC_SUPPORT");
      expect(data.text).toContain("Elvora");
      expect(data.structuredData.navigationLink.href).toBe("/register");

      // Verify zero business tool execution
      expect(toolSpy).not.toHaveBeenCalled();
    });

    it("answers Hindi queries in Public Mode ('एल्बोरा क्या है?')", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "एल्बोरा क्या है?", language: "hi" }),
      });

      const res = await chatPost(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe("PUBLIC");
      expect(data.text).toContain("एल्बोरा");
    });

    it("strictly blocks private business queries from unauthenticated visitors", async () => {
      const toolSpy = vi.spyOn(BusinessToolsRegistry, "execute");

      // Test queries that seek private business numbers
      const privateQueries = [
        "What is my sales today?",
        "Mera profit kitna hua?",
        "Show me low stock items",
        "Customer udhar kitna baki hai",
      ];

      for (const query of privateQueries) {
        const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: query }),
        });

        const res = await chatPost(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.mode).toBe("PUBLIC");
        expect(data.intent).toBe("PUBLIC_AUTH_REQUIRED");
        expect(data.structuredData.navigationLink.href).toBe("/login");

        // Verify zero execution of business tools
        expect(toolSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe("Mode B: Authenticated Mode (Dashboard Users)", () => {
    beforeEach(() => {
      vi.spyOn(tenantContext, "requireTenantContext").mockResolvedValue({
        tenantId: TENANT_ID,
        tenantName: "Pooja General Store",
        userId: USER_ID,
        userEmail: "pooja@store.com",
        userName: "Pooja Gupta",
        role: "OWNER",
      });

      vi.spyOn(AssistantConversationService, "createConversation").mockResolvedValue({
        id: "conv_test_auth_1",
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: "Test Conv",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      vi.spyOn(AssistantConversationService, "appendMessage").mockResolvedValue({
        id: "msg_test_1",
        conversationId: "conv_test_auth_1",
        tenantId: TENANT_ID,
        role: "ASSISTANT",
        text: "Sales today are ₹42,000",
        createdAt: new Date().toISOString(),
      });
    });

    it("suggestions API returns AUTHENTICATED mode with categorized suggestions", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/suggestions");
      const res = await suggestionsGet(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe("AUTHENTICATED");
      expect(data.categories).toBeDefined();

      const categoryNames = data.categories.map((m: any) => m.category);
      expect(categoryNames).toContain("Sales & Invoicing");
      expect(categoryNames).toContain("Inventory & Stock");
      expect(categoryNames).toContain("Customers & Udhar");
    });

    it("answers business sales query with live shop context", async () => {
      vi.spyOn(BusinessToolsRegistry, "execute").mockResolvedValue({
        success: true,
        intent: "SALES_SUMMARY",
        textEn: "Today's sales are ₹42,000 across 14 invoices.",
        textHinglish: "Aaj ki sales summary: Total ₹42,000",
        textHi: "आज की कुल बिक्री ₹42,000 रही।",
        structuredData: {
          intent: "SALES_SUMMARY",
          periodLabel: "Today",
          sourceModule: "Invoices & Analytics",
          navigationLink: { href: "/invoices", label: "View All Invoices" },
          kpis: [
            { label: "Total Sales", value: "₹42,000.00" },
            { label: "Total Invoices", value: "14" },
          ],
        },
      });

      const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "sales today" }),
      });

      const res = await chatPost(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe("AUTHENTICATED");
      expect(data.intent).toBe("SALES_SUMMARY");
      expect(data.shopName).toBe("Pooja General Store");
      expect(data.structuredData).toBeDefined();
      expect(data.structuredData.intent).toBe("SALES_SUMMARY");
      expect(data.structuredData.kpis[0].value).toBe("₹42,000.00");
    });
  });
});
