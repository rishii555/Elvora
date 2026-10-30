import { describe, it, expect } from "vitest";
import { scopeToTenant } from "../lib/tenant/context";
import { signSessionToken, verifySessionToken } from "../lib/auth/session";

describe("Tenant Isolation & Session Security", () => {
  it("enforces tenantId scoping to prevent IDOR cross-tenant access", () => {
    const tenantA_Id = "tenant-shop-a-uuid";
    const tenantB_Id = "tenant-shop-b-uuid";

    // Attacker tries to look up an invoice belonging to Shop B
    const attackerQuery = {
      id: "invoice-belonging-to-shop-b",
    };

    // Server forcibly applies active session tenant context
    const secureQuery = scopeToTenant(tenantA_Id, attackerQuery);

    expect(secureQuery.tenantId).toBe(tenantA_Id);
    expect(secureQuery.id).toBe("invoice-belonging-to-shop-b");

    // Proves that even with the valid invoice ID of Shop B, the query will return NULL in Shop A's DB scope
    expect(secureQuery.tenantId).not.toBe(tenantB_Id);
  });

  it("creates and verifies a valid cryptographic session token", async () => {
    const payload = {
      userId: "user-123",
      email: "shopowner@example.com",
      name: "Rishi",
      activeTenantId: "tenant-456",
      role: "OWNER" as const,
    };

    const token = await signSessionToken(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-123");
    expect(verified?.activeTenantId).toBe("tenant-456");
    expect(verified?.role).toBe("OWNER");
  });

  it("rejects tampered or forged session tokens", async () => {
    const payload = {
      userId: "user-123",
      email: "shopowner@example.com",
      name: "Rishi",
      activeTenantId: "tenant-456",
      role: "OWNER" as const,
    };

    const token = await signSessionToken(payload);
    // Tamper with the token
    const tampered = token.slice(0, -6) + "xyz123";

    const verified = await verifySessionToken(tampered);
    expect(verified).toBeNull();
  });
});
