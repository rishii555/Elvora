import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/auth/passwords";
import { signSessionToken, verifySessionToken } from "../lib/auth/session";
import { requireTenantContext, TenantAuthorizationError } from "../lib/tenant/context";
import { hasPermission, requirePermission, PermissionDeniedError } from "../lib/auth/permissions";
import { checkRateLimit } from "../lib/auth/rate-limiter";
import { createVerificationToken, verifyAndConsumeToken } from "../lib/auth/tokens";
import { NextRequest } from "next/server";

describe("Secure Authentication & RBAC Security Suite", () => {
  describe("Password Hashing & Credentials Verification", () => {
    it("hashes passwords securely with bcrypt and rejects invalid credentials", async () => {
      const plaintext = "SuperSecretPassword123!";
      const hash = await hashPassword(plaintext);

      expect(hash).not.toBe(plaintext);
      expect(hash.startsWith("$2")).toBe(true); // bcrypt signature

      // Valid password must match
      const valid = await verifyPassword(plaintext, hash);
      expect(valid).toBe(true);

      // Wrong password must be rejected
      const invalid = await verifyPassword("WrongPassword456", hash);
      expect(invalid).toBe(false);
    });
  });

  describe("Session Verification & Unauthorized Access Prevention", () => {
    it("blocks unauthorized access when no session cookie is supplied", async () => {
      const mockReq = new NextRequest("http://localhost:3000/api/dashboard/metrics");
      await expect(requireTenantContext(mockReq)).rejects.toThrow(TenantAuthorizationError);
    });

    it("blocks access when a forged or tampered session token is supplied", async () => {
      const mockReq = new NextRequest("http://localhost:3000/api/dashboard/metrics", {
        headers: {
          cookie: "elvora_session=forged.invalid.jwt.token",
        },
      });
      await expect(requireTenantContext(mockReq)).rejects.toThrow(TenantAuthorizationError);
    });

    it("verifies and extracts active tenant from an authentic signed session token", async () => {
      const token = await signSessionToken({
        userId: "demo-admin-id",
        email: "admin@elvora.com",
        name: "Elvora Admin (Test)",
        activeTenantId: "demo-tenant-id",
        role: "OWNER",
      });

      const mockReq = new NextRequest("http://localhost:3000/api/dashboard/metrics", {
        headers: {
          cookie: `elvora_session=${token}`,
        },
      });

      const context = await requireTenantContext(mockReq);
      expect(context.userId).toBe("demo-admin-id");
      expect(context.tenantId).toBe("demo-tenant-id");
      expect(context.role).toBe("OWNER");
    });
  });

  describe("Role-Based Access Control & Privilege Escalation Prevention", () => {
    it("verifies that OWNER possesses full administration permissions", () => {
      expect(hasPermission("OWNER", "MANAGE_STAFF")).toBe(true);
      expect(hasPermission("OWNER", "EDIT_SHOP_PROFILE")).toBe(true);
      expect(hasPermission("OWNER", "DELETE_INVOICE")).toBe(true);
      expect(hasPermission("OWNER", "VIEW_FINANCIAL_REPORTS")).toBe(true);
      expect(hasPermission("OWNER", "CREATE_INVOICE")).toBe(true);
    });

    it("blocks privilege escalation: BILLER cannot perform administrative actions", () => {
      expect(hasPermission("BILLER", "MANAGE_STAFF")).toBe(false);
      expect(hasPermission("BILLER", "EDIT_SHOP_PROFILE")).toBe(false);
      expect(hasPermission("BILLER", "DELETE_INVOICE")).toBe(false);
      expect(hasPermission("BILLER", "VIEW_FINANCIAL_REPORTS")).toBe(false);

      // BILLER can create invoice and receive payments
      expect(hasPermission("BILLER", "CREATE_INVOICE")).toBe(true);
      expect(hasPermission("BILLER", "RECORD_PAYMENT")).toBe(true);

      // requirePermission throws PermissionDeniedError
      expect(() => requirePermission("BILLER", "EDIT_SHOP_PROFILE")).toThrow(PermissionDeniedError);
      expect(() => requirePermission("BILLER", "MANAGE_STAFF")).toThrow(PermissionDeniedError);
    });

    it("enforces tenant-specific role assignment during tenant switching", async () => {
      // User is OWNER in Shop Alpha
      const alphaToken = await signSessionToken({
        userId: "user-999",
        email: "staff@example.com",
        name: "Staff Member",
        activeTenantId: "tenant-alpha",
        role: "OWNER",
      });

      const verifiedAlpha = await verifySessionToken(alphaToken);
      expect(verifiedAlpha?.activeTenantId).toBe("tenant-alpha");
      expect(verifiedAlpha?.role).toBe("OWNER");

      // When switching to Shop Beta where user is only a BILLER, a new session is signed with BILLER role
      const betaToken = await signSessionToken({
        userId: "user-999",
        email: "staff@example.com",
        name: "Staff Member",
        activeTenantId: "tenant-beta",
        role: "BILLER",
      });

      const verifiedBeta = await verifySessionToken(betaToken);
      expect(verifiedBeta?.activeTenantId).toBe("tenant-beta");
      expect(verifiedBeta?.role).toBe("BILLER");
      expect(hasPermission(verifiedBeta!.role, "MANAGE_STAFF")).toBe(false);
    });
  });

  describe("Rate Limiting Protection", () => {
    it("throttles excessive requests after reaching the threshold", () => {
      const testKey = `test-ip-${Date.now()}`;
      const options = { windowMs: 10000, maxAttempts: 3 };

      // Attempt 1, 2, 3 should be allowed
      expect(checkRateLimit(testKey, options).allowed).toBe(true);
      expect(checkRateLimit(testKey, options).allowed).toBe(true);
      expect(checkRateLimit(testKey, options).allowed).toBe(true);

      // Attempt 4 must be blocked
      const blocked = checkRateLimit(testKey, options);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe("Password Reset Token Architecture", () => {
    it("generates, hashes, verifies, and single-consumes password reset tokens", () => {
      const testEmail = "reset-tester@example.com";
      const { rawToken } = createVerificationToken(testEmail, "PASSWORD_RESET", 60000);

      expect(typeof rawToken).toBe("string");
      expect(rawToken.length).toBe(64); // 32 hex bytes = 64 chars

      // First verification must succeed
      const firstCheck = verifyAndConsumeToken(rawToken, "PASSWORD_RESET");
      expect(firstCheck.valid).toBe(true);
      expect(firstCheck.email).toBe(testEmail);

      // Second verification of the same token must fail (preventing replay attacks)
      const secondCheck = verifyAndConsumeToken(rawToken, "PASSWORD_RESET");
      expect(secondCheck.valid).toBe(false);
      expect(secondCheck.error).toContain("already consumed");
    });

    it("rejects expired verification tokens", () => {
      const testEmail = "expired-tester@example.com";
      // Token created with negative TTL (already expired)
      const { rawToken } = createVerificationToken(testEmail, "PASSWORD_RESET", -1000);

      const check = verifyAndConsumeToken(rawToken, "PASSWORD_RESET");
      expect(check.valid).toBe(false);
      expect(check.error).toContain("expired");
    });
  });
});
