import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as chatPost } from "@/app/api/assistant/chat/route";
import { GET as suggestionsGet } from "@/app/api/assistant/suggestions/route";
import { GET as conversationDetailGet, DELETE as conversationDetailDelete } from "@/app/api/assistant/conversations/[id]/route";
import * as tenantContext from "@/lib/tenant/context";
import { AssistantConversationService } from "@/lib/assistant/conversation-service";
import { clearAllRateLimitsForTests } from "@/lib/auth/rate-limiter";
import * as rateLimiter from "@/lib/auth/rate-limiter";

describe("Assistant API Routes Integration & Security Suite", () => {
  const TENANT_A = "6655555555555555555555aa";
  const TENANT_B = "6655555555555555555555bb";
  const USER_A1 = "665555555555555555555501";
  const USER_B1 = "665555555555555555555503";

  beforeEach(() => {
    vi.restoreAllMocks();
    clearAllRateLimitsForTests();
  });

  describe("POST /api/assistant/chat", () => {
    it("handles unauthenticated business queries in Public Mode with login requirement", async () => {
      vi.spyOn(tenantContext, "requireTenantContext").mockRejectedValue(
        new tenantContext.TenantAuthorizationError("Unauthorized")
      );

      const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "sales today" }),
      });

      const res = await chatPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe("PUBLIC");
      expect(data.intent).toBe("PUBLIC_AUTH_REQUIRED");
      expect(data.structuredData.navigationLink.href).toBe("/login");
    });

    it("handles unauthenticated public knowledge queries in Public Mode", async () => {
      vi.spyOn(tenantContext, "requireTenantContext").mockRejectedValue(
        new tenantContext.TenantAuthorizationError("Unauthorized")
      );

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
    });

    it("enforces tenant-scoped rate limiting (returns 429 when exceeded)", async () => {
      vi.spyOn(tenantContext, "requireTenantContext").mockResolvedValue({
        tenantId: TENANT_A,
        tenantName: "Shop Alpha",
        userId: USER_A1,
        userEmail: "owner@alpha.com",
        userName: "Alpha Owner",
        role: "OWNER",
      });

      // Mock rate limiter to return not allowed
      vi.spyOn(rateLimiter, "checkTenantRateLimit").mockReturnValue({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 45,
      });

      const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "sales today" }),
      });

      const res = await chatPost(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain("Rate limit exceeded");
    });

    it("processes a business query and auto-creates a conversation", async () => {
      vi.spyOn(tenantContext, "requireTenantContext").mockResolvedValue({
        tenantId: TENANT_A,
        tenantName: "Shop Alpha",
        userId: USER_A1,
        userEmail: "owner@alpha.com",
        userName: "Alpha Owner",
        role: "OWNER",
      });

      vi.spyOn(AssistantConversationService, "createConversation").mockResolvedValue({
        id: "conv_auto_1",
        tenantId: TENANT_A,
        userId: USER_A1,
        title: "sales today",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      vi.spyOn(AssistantConversationService, "appendMessage").mockResolvedValue({
        id: "msg_1",
        conversationId: "conv_auto_1",
        tenantId: TENANT_A,
        role: "ASSISTANT",
        text: "Sales today are ₹0.00",
        createdAt: new Date().toISOString(),
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
      expect(data.conversationId).toBe("conv_auto_1");
      expect(data.intent).toBe("SALES_SUMMARY");
    });
  });

  describe("GET /api/assistant/suggestions", () => {
    it("returns categorized suggestions for authenticated user", async () => {
      vi.spyOn(tenantContext, "requireTenantContext").mockResolvedValue({
        tenantId: TENANT_A,
        tenantName: "Shop Alpha",
        userId: USER_A1,
        userEmail: "owner@alpha.com",
        userName: "Alpha Owner",
        role: "OWNER",
      });

      const req = new NextRequest("http://localhost:3000/api/assistant/suggestions");
      const res = await suggestionsGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.categories.length).toBeGreaterThan(4);
    });
  });

  describe("Conversations CRUD & Cross-Tenant Defense", () => {
    it("prevents cross-tenant reading of conversation details (IDOR Defense)", async () => {
      // User B tries to read conversation belonging to Tenant A
      vi.spyOn(tenantContext, "requireTenantContext").mockResolvedValue({
        tenantId: TENANT_B,
        tenantName: "Shop Beta",
        userId: USER_B1,
        userEmail: "owner@beta.com",
        userName: "Beta Owner",
        role: "OWNER",
      });

      vi.spyOn(AssistantConversationService, "getConversationWithMessages").mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/assistant/conversations/conv_tenant_a_1");
      const res = await conversationDetailGet(req, {
        params: Promise.resolve({ id: "conv_tenant_a_1" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it("prevents cross-tenant deletion of conversation (IDOR Defense)", async () => {
      vi.spyOn(tenantContext, "requireTenantContext").mockResolvedValue({
        tenantId: TENANT_B,
        tenantName: "Shop Beta",
        userId: USER_B1,
        userEmail: "owner@beta.com",
        userName: "Beta Owner",
        role: "OWNER",
      });

      vi.spyOn(AssistantConversationService, "deleteConversation").mockResolvedValue(false);

      const req = new NextRequest("http://localhost:3000/api/assistant/conversations/conv_tenant_a_1", {
        method: "DELETE",
      });
      const res = await conversationDetailDelete(req, {
        params: Promise.resolve({ id: "conv_tenant_a_1" }),
      });

      expect(res.status).toBe(404);
    });
  });
});
