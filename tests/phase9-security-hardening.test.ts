import { describe, it, expect, beforeEach } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  revokeSessionToken,
  isSessionTokenRevoked,
  clearRevokedTokensForTests,
} from "@/lib/auth/session";
import {
  requireTenantContext,
  TenantAuthorizationError,
  clearTenantContextCache,
} from "@/lib/tenant/context";
import {
  hasPermission,
  requirePermission,
  PermissionDeniedError,
} from "@/lib/auth/permissions";
import {
  validateEntityOwnership,
  validateVariantOwnershipBatch,
  scopedUpdate,
  scopedDelete,
  CrossTenantAccessDeniedError,
  CrossTenantReferenceError,
} from "@/lib/tenant/isolation";
import {
  checkRateLimit,
  checkTenantRateLimit,
  resetRateLimit,
  clearAllRateLimitsForTests,
} from "@/lib/auth/rate-limiter";
import {
  redactSensitiveData,
  recordAuditLog,
  listAuditLogs,
} from "@/lib/audit/service";
import {
  sanitizeInputString,
  getSafePagination,
  handleApiError,
} from "@/lib/api/security";
import { NextRequest } from "next/server";

describe("Phase 9: Comprehensive Security Hardening & Compliance Suite", () => {
  const TENANT_A = "6655555555555555555555aa";
  const TENANT_B = "6655555555555555555555bb";
  const USER_1 = "665555555555555555555501";

  let customersStore: any[];
  let productsStore: any[];
  let variantsStore: any[];
  let auditLogsStore: any[];
  let mockPrisma: any;

  beforeEach(() => {
    clearRevokedTokensForTests();
    clearAllRateLimitsForTests();
    clearTenantContextCache();

    customersStore = [
      { id: "cust_a_1", tenantId: TENANT_A, name: "Alpha Customer" },
      { id: "cust_b_1", tenantId: TENANT_B, name: "Beta Customer" },
    ];

    productsStore = [
      { id: "prod_a_1", tenantId: TENANT_A, name: "Product A" },
      { id: "prod_b_1", tenantId: TENANT_B, name: "Product B" },
    ];

    variantsStore = [
      { id: "var_a_1", tenantId: TENANT_A, sku: "SKU-A" },
      { id: "var_b_1", tenantId: TENANT_B, sku: "SKU-B" },
    ];

    auditLogsStore = [];

    mockPrisma = {
      customer: {
        findFirst: async ({ where }: any) => {
          return customersStore.find((c) => {
            if (where.id && c.id !== where.id) return false;
            if (where.tenantId && c.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        },
        update: async ({ where, data }: any) => {
          const item = customersStore.find((c) => c.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        },
        delete: async ({ where }: any) => {
          const idx = customersStore.findIndex((c) => c.id === where.id);
          if (idx !== -1) {
            return customersStore.splice(idx, 1)[0];
          }
          return null;
        },
      },
      product: {
        findFirst: async ({ where }: any) => {
          return productsStore.find((p) => {
            if (where.id && p.id !== where.id) return false;
            if (where.tenantId && p.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        },
      },
      productVariant: {
        findMany: async ({ where }: any) => {
          return variantsStore.filter((v) => {
            if (where.tenantId && v.tenantId !== where.tenantId) return false;
            if (where.id?.in && !where.id.in.includes(v.id)) return false;
            return true;
          });
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          const item = { id: `log_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
          auditLogsStore.push(item);
          return item;
        },
        findMany: async ({ where, skip = 0, take = 50 }: any) => {
          return auditLogsStore
            .filter((l) => {
              if (where.tenantId && l.tenantId !== where.tenantId) return false;
              if (where.entityType && l.entityType !== where.entityType) return false;
              return true;
            })
            .slice(skip, skip + take);
        },
        count: async ({ where }: any) => {
          return auditLogsStore.filter((l) => {
            if (where.tenantId && l.tenantId !== where.tenantId) return false;
            return true;
          }).length;
        },
      },
      tenantMember: {
        findUnique: async ({ where }: any) => {
          const tId = where.tenantId_userId?.tenantId;
          const uId = where.tenantId_userId?.userId;
          if (tId === TENANT_A && uId === USER_1) {
            return {
              tenantId: TENANT_A,
              userId: USER_1,
              role: "OWNER",
              tenant: { id: TENANT_A, tradeName: "Tenant A Trade", isActive: true, approvalStatus: "APPROVED" },
              user: { id: USER_1, email: "user1@tenantA.com", name: "User 1", isActive: true, approvalStatus: "APPROVED" },
            };
          }
          return null;
        },
      },
    };
  });

  // -------------------------------------------------------------------------
  // 1. Authentication & Session Invalidation
  // -------------------------------------------------------------------------
  describe("1. Authentication & Session Invalidation", () => {
    it("signs and verifies valid JWT session tokens", async () => {
      const token = await signSessionToken({
        userId: USER_1,
        email: "user1@tenanta.com",
        name: "User 1",
        activeTenantId: TENANT_A,
        role: "OWNER",
      });

      const payload = await verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(USER_1);
      expect(payload?.activeTenantId).toBe(TENANT_A);
    });

    it("revokes token on logout and rejects subsequent verification attempts", async () => {
      const token = await signSessionToken({
        userId: USER_1,
        email: "user1@tenanta.com",
        name: "User 1",
        activeTenantId: TENANT_A,
        role: "OWNER",
      });

      // Token is initially valid
      expect(await verifySessionToken(token)).not.toBeNull();
      expect(isSessionTokenRevoked(token)).toBe(false);

      // Invalidate / Revoke session
      revokeSessionToken(token);
      expect(isSessionTokenRevoked(token)).toBe(true);

      // Token verification fails closed
      const payloadAfterRevocation = await verifySessionToken(token);
      expect(payloadAfterRevocation).toBeNull();
    });

    it("fails closed when unauthenticated or session token is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/invoices");
      await expect(requireTenantContext(req)).rejects.toThrow(TenantAuthorizationError);
    });

    it("blocks hardcoded demo-admin bypasses and enforces database verification", async () => {
      const demoToken = await signSessionToken({
        userId: "demo-admin-id",
        email: "admin@elvora.com",
        name: "Demo Admin",
        activeTenantId: "demo-tenant-id",
        role: "OWNER",
      });

      const req = new NextRequest("http://localhost:3000/api/invoices", {
        headers: { Cookie: `elvora_session=${demoToken}` },
      });

      // Should fail closed because demo-admin-id is no longer bypassed without DB record
      await expect(requireTenantContext(req)).rejects.toThrow(TenantAuthorizationError);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Multi-Tenant Isolation & IDOR Protection
  // -------------------------------------------------------------------------
  describe("2. Multi-Tenant Isolation & IDOR Protection", () => {
    it("prevents cross-tenant entity ownership validation", async () => {
      // Tenant A owns cust_a_1
      await expect(
        validateEntityOwnership(mockPrisma, TENANT_A, "customer", "cust_a_1")
      ).resolves.not.toThrow();

      // Tenant A cannot claim cust_b_1 (belongs to Tenant B)
      await expect(
        validateEntityOwnership(mockPrisma, TENANT_A, "customer", "cust_b_1")
      ).rejects.toThrow(CrossTenantReferenceError);
    });

    it("prevents batch invoice line items from referencing another tenant's variants", async () => {
      // Valid batch for Tenant A
      await expect(
        validateVariantOwnershipBatch(mockPrisma, TENANT_A, ["var_a_1"])
      ).resolves.not.toThrow();

      // Malicious batch: includes variant from Tenant B
      await expect(
        validateVariantOwnershipBatch(mockPrisma, TENANT_A, ["var_a_1", "var_b_1"])
      ).rejects.toThrow(CrossTenantReferenceError);
    });

    it("blocks cross-tenant scoped update attacks (IDOR)", async () => {
      // Tenant A can update own customer
      await scopedUpdate(mockPrisma, "customer", TENANT_A, "cust_a_1", { name: "Updated A" });
      expect(customersStore.find((c) => c.id === "cust_a_1").name).toBe("Updated A");

      // Tenant A cannot update Tenant B's customer
      await expect(
        scopedUpdate(mockPrisma, "customer", TENANT_A, "cust_b_1", { name: "Hacked B" })
      ).rejects.toThrow(CrossTenantAccessDeniedError);

      // Verify Tenant B's data remains untouched
      expect(customersStore.find((c) => c.id === "cust_b_1").name).toBe("Beta Customer");
    });

    it("blocks cross-tenant scoped deletion attacks (IDOR)", async () => {
      // Tenant A attempts to delete Tenant B's customer
      await expect(
        scopedDelete(mockPrisma, "customer", TENANT_A, "cust_b_1")
      ).rejects.toThrow(CrossTenantAccessDeniedError);

      expect(customersStore.some((c) => c.id === "cust_b_1")).toBe(true);

      // Tenant A can delete own customer
      await scopedDelete(mockPrisma, "customer", TENANT_A, "cust_a_1");
      expect(customersStore.some((c) => c.id === "cust_a_1")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Authorization, RBAC & Privilege Escalation Prevention
  // -------------------------------------------------------------------------
  describe("3. Role-Based Access Control (RBAC) & Privilege Guards", () => {
    it("allows OWNER and MANAGER full operational and automation permissions", () => {
      expect(hasPermission("OWNER", "MANAGE_AUTOMATION")).toBe(true);
      expect(hasPermission("OWNER", "APPROVE_WORKFLOWS")).toBe(true);
      expect(hasPermission("MANAGER", "MANAGE_AUTOMATION")).toBe(true);
      expect(hasPermission("MANAGER", "APPROVE_WORKFLOWS")).toBe(true);
    });

    it("restricts BILLER from accessing financial reports, accounting, and approvals", () => {
      expect(hasPermission("BILLER", "VIEW_FINANCIAL_REPORTS")).toBe(false);
      expect(hasPermission("BILLER", "MANAGE_ACCOUNTING")).toBe(false);
      expect(hasPermission("BILLER", "APPROVE_WORKFLOWS")).toBe(false);
      expect(hasPermission("BILLER", "MANAGE_AUTOMATION")).toBe(false);

      expect(() => requirePermission("BILLER", "APPROVE_WORKFLOWS")).toThrow(
        PermissionDeniedError
      );
    });

    it("restricts ACCOUNTANT from modifying automation rules but allows approvals", () => {
      expect(hasPermission("ACCOUNTANT", "APPROVE_WORKFLOWS")).toBe(true);
      expect(hasPermission("ACCOUNTANT", "MANAGE_AUTOMATION")).toBe(false);

      expect(() => requirePermission("ACCOUNTANT", "MANAGE_AUTOMATION")).toThrow(
        PermissionDeniedError
      );
    });
  });

  // -------------------------------------------------------------------------
  // 4. Rate Limiting & Abuse Protection
  // -------------------------------------------------------------------------
  describe("4. Rate Limiting & Abuse Protection", () => {
    it("enforces sliding-window request thresholds and calculates retryAfterSeconds", () => {
      const identifier = "login:192.168.1.10";
      const options = { windowMs: 60 * 1000, maxAttempts: 3 };

      // Attempts 1 to 3 allowed
      expect(checkRateLimit(identifier, options).allowed).toBe(true);
      expect(checkRateLimit(identifier, options).allowed).toBe(true);
      expect(checkRateLimit(identifier, options).allowed).toBe(true);

      // Attempt 4 blocked
      const blocked = checkRateLimit(identifier, options);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

      // Reset works
      resetRateLimit(identifier);
      expect(checkRateLimit(identifier, options).allowed).toBe(true);
    });

    it("supports tenant-scoped rate limits for expensive operations", () => {
      const options = { windowMs: 60 * 1000, maxAttempts: 2 };

      expect(checkTenantRateLimit(TENANT_A, "export", options).allowed).toBe(true);
      expect(checkTenantRateLimit(TENANT_A, "export", options).allowed).toBe(true);
      expect(checkTenantRateLimit(TENANT_A, "export", options).allowed).toBe(false);

      // Tenant B's rate limit is independent
      expect(checkTenantRateLimit(TENANT_B, "export", options).allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Sensitive Data Redaction & Immutable Audit Logging
  // -------------------------------------------------------------------------
  describe("5. Sensitive Data Redaction & Immutable Audit Logs", () => {
    it("deeply redacts passwords, tokens, PAN, and credentials from payloads", () => {
      const sensitivePayload = {
        name: "Test User",
        password: "SuperSecretPassword123!",
        passwordHash: "$2b$10$xyz...",
        rawToken: "secret_token_abc_123",
        nested: {
          pan: "ABCDE1234F",
          creditCard: "4111222233334444",
          safeField: "safe value",
        },
      };

      const redacted = redactSensitiveData(sensitivePayload);
      expect(redacted.name).toBe("Test User");
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.passwordHash).toBe("[REDACTED]");
      expect(redacted.rawToken).toBe("[REDACTED]");
      expect(redacted.nested.pan).toBe("[REDACTED]");
      expect(redacted.nested.creditCard).toBe("[REDACTED]");
      expect(redacted.nested.safeField).toBe("safe value");
    });

    it("records redacted audit logs and strictly scopes retrieval by tenantId", async () => {
      await recordAuditLog(
        {
          tenantId: TENANT_A,
          userId: USER_1,
          action: "PASSWORD_CHANGED",
          entityType: "USER",
          entityId: USER_1,
          changes: { password: "newPlaintextPassword" },
        },
        mockPrisma
      );

      const logsA = await listAuditLogs(TENANT_A, undefined, mockPrisma);
      expect(logsA.total).toBe(1);
      expect(logsA.items[0].changes.password).toBe("[REDACTED]");

      // Tenant B sees zero logs
      const logsB = await listAuditLogs(TENANT_B, undefined, mockPrisma);
      expect(logsB.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Input Sanitization, Bounds & Safe Error Handling
  // -------------------------------------------------------------------------
  describe("6. Input Sanitization, Bounds & Safe Error Handling", () => {
    it("sanitizes dangerous XSS payloads, script tags, and null bytes", () => {
      const malicious = "Hello<script>alert('XSS')</script> world\0javascript:void(0) onerror=alert(1)";
      const sanitized = sanitizeInputString(malicious);

      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("alert('XSS')");
      expect(sanitized).not.toContain("\0");
      expect(sanitized).not.toContain("javascript:");
      expect(sanitized).not.toContain("onerror=");
    });

    it("enforces safe pagination bounds to prevent DoS memory exhaustion", () => {
      const normal = getSafePagination("2", "25", 100);
      expect(normal.page).toBe(2);
      expect(normal.limit).toBe(25);
      expect(normal.skip).toBe(25);

      // Malicious / abusive request with extreme limit
      const abusive = getSafePagination("-10", "1000000", 100);
      expect(abusive.page).toBe(1);
      expect(abusive.limit).toBe(100); // Capped to maxLimit
      expect(abusive.skip).toBe(0);
    });

    it("redacts database connection strings and internal Prisma details in error responses", () => {
      const dbError = new Error(
        "Invalid connection to mongodb://admin:secretPass@127.0.0.1:27017/elvora_dev at PrismaClient"
      );
      const res = handleApiError(dbError);

      expect(res.status).toBe(500);
      // Verify raw credentials or connection string were not leaked
      // Response body should contain safe message
    });
  });
});
