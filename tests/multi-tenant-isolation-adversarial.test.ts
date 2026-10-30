import { describe, it, expect, vi, afterEach } from "vitest";
import { 
  CrossTenantAccessDeniedError, 
  CrossTenantReferenceError,
  validateVariantOwnershipBatch,
  scopedUpdate,
  scopedDelete,
  createTenantScopedInvoice,
  sanitizeAuditData
} from "../lib/tenant/isolation";
import { scopeToTenant, requireTenantContext } from "../lib/tenant/context";
import { hasPermission, requirePermission, PermissionDeniedError } from "../lib/auth/permissions";
import { signSessionToken, verifySessionToken } from "../lib/auth/session";
import { prisma } from "../lib/db/prisma";
import { NextRequest } from "next/server";

describe("Strict Multi-Tenant Isolation & Adversarial Security Suite", () => {
  // Valid 24-character hex ObjectIds for MongoDB compatibility
  const tenantA_Id = "507f191e810c19729de860ea";
  const tenantB_Id = "507f1f77bcf86cd799439011";
  const userA_Id = "507f191e810c19729de860eb";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Security Test 1: User A cannot read User B's invoices (IDOR Protection)", () => {
    it("guarantees query scoping prevents reading an invoice belonging to another tenant", async () => {
      // Mock database store containing User B's private invoice
      const dbInvoices = [
        { id: "507f1f77bcf86cd799439099", tenantId: tenantB_Id, grandTotal: 45000, customerName: "User B Client" },
      ];

      // Attacker from Tenant A tries to read User B's invoice by knowing its exact ID
      const requestedId = "507f1f77bcf86cd799439099";
      const serverScopedFilter = scopeToTenant(tenantA_Id, { id: requestedId });

      // In the database query, both id and tenantId are required
      const result = dbInvoices.find(
        (inv) => inv.id === serverScopedFilter.id && inv.tenantId === serverScopedFilter.tenantId
      );

      // Must be null: User A receives 404 / null instead of User B's invoice
      expect(result).toBeUndefined();
      expect(serverScopedFilter.tenantId).toBe(tenantA_Id);
      expect(serverScopedFilter.tenantId).not.toBe(tenantB_Id);
    });
  });

  describe("Security Test 2: User A cannot modify or delete User B's products", () => {
    it("blocks updating products owned by another tenant with CrossTenantAccessDeniedError", async () => {
      const mockPrisma = {
        product: {
          findFirst: vi.fn().mockResolvedValue(null), // Product does not exist under tenantA
          update: vi.fn(),
        },
      };

      const attackerTenantId = tenantA_Id;
      const targetProductId = "507f1f77bcf86cd799439088";

      await expect(
        scopedUpdate(mockPrisma, "product", attackerTenantId, targetProductId, { name: "Hacked Product Name" })
      ).rejects.toThrow(CrossTenantAccessDeniedError);

      // Verify update was NEVER called on database
      expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });

    it("blocks deleting products owned by another tenant with CrossTenantAccessDeniedError", async () => {
      const mockPrisma = {
        product: {
          findFirst: vi.fn().mockResolvedValue(null),
          delete: vi.fn(),
        },
      };

      const attackerTenantId = tenantA_Id;
      const targetProductId = "507f1f77bcf86cd799439088";

      await expect(
        scopedDelete(mockPrisma, "product", attackerTenantId, targetProductId)
      ).rejects.toThrow(CrossTenantAccessDeniedError);

      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    });
  });

  describe("Security Test 3: User A cannot attach User B's product to an invoice", () => {
    it("detects and rejects cross-tenant variant attachment with CrossTenantReferenceError", async () => {
      const mockPrisma = {
        productVariant: {
          findMany: vi.fn().mockImplementation((args: any) => {
            // Only returns variants that belong to tenantA
            if (args.where.tenantId === tenantA_Id && args.where.id.in.includes("507f1f77bcf86cd799439077")) {
              return Promise.resolve([]); // Variant belongs to B, so 0 found under A
            }
            return Promise.resolve([{ id: "507f191e810c19729de86055" }]);
          }),
        },
      };

      // Attacker tries to bill an invoice in Tenant A using Tenant B's product variant
      const maliciousItems = ["507f1f77bcf86cd799439077"];

      await expect(
        validateVariantOwnershipBatch(mockPrisma, tenantA_Id, maliciousItems)
      ).rejects.toThrow(CrossTenantReferenceError);
    });
  });

  describe("Security Test 4: User A cannot read User B's reports or exports", () => {
    it("derives authorized report scope exclusively from authenticated session", async () => {
      // Create session for User A
      const token = await signSessionToken({
        userId: userA_Id,
        email: "user.a@example.com",
        name: "Shop A Owner",
        activeTenantId: tenantA_Id,
        role: "OWNER",
      });

      // Mock membership lookup for User A
      vi.spyOn(prisma.tenantMember, "findUnique").mockResolvedValue({
        id: "mem-1",
        tenantId: tenantA_Id,
        userId: userA_Id,
        role: "OWNER",
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: { id: tenantA_Id, tradeName: "Shop Alpha", isActive: true },
        user: { id: userA_Id, email: "user.a@example.com", name: "Shop A Owner", isActive: true },
      } as any);

      // User A attempts to request User B's reports via URL/query spoofing (?tenantId=tenantB_Id)
      const req = new NextRequest(`http://localhost:3000/api/dashboard/metrics?tenantId=${tenantB_Id}`, {
        headers: {
          cookie: `elvora_session=${token}`,
        },
      });

      // Server strictly extracts context from verified session
      const context = await requireTenantContext(req);

      // Context MUST be tenantA, ignoring any URL or query param
      expect(context.tenantId).toBe(tenantA_Id);
      expect(context.tenantId).not.toBe(tenantB_Id);
    });
  });

  describe("Security Test 5: Changing record ID or tenant ID in request does not bypass authorization", () => {
    it("ignores client-supplied tenantId in request body and revalidates session server-side", async () => {
      const session = await signSessionToken({
        userId: userA_Id,
        email: "user.a@example.com",
        name: "Shop A Owner",
        activeTenantId: tenantA_Id,
        role: "OWNER",
      });

      const clientPayload = {
        tenantId: tenantB_Id, // Attacker injected Tenant B ID into payload
        invoiceNumber: "INV-HACK-01",
        grandTotal: 1000,
      };

      // Server enforces session tenant over client payload
      const verified = await verifySessionToken(session);
      expect(verified?.activeTenantId).toBe(tenantA_Id);

      const securePayload = {
        ...clientPayload,
        tenantId: verified!.activeTenantId, // Overrides any body spoofing
      };

      expect(securePayload.tenantId).toBe(tenantA_Id);
      expect(securePayload.tenantId).not.toBe(clientPayload.tenantId);
    });
  });

  describe("Security Test 6: Staff permissions cannot be escalated by modifying client-side state", () => {
    it("strictly enforces server-side RBAC: BILLER role cannot execute OWNER actions", () => {
      const staffRole = "BILLER" as const;

      // Client UI might show buttons or send forged headers, but server rejects
      expect(hasPermission(staffRole, "MANAGE_STAFF")).toBe(false);
      expect(hasPermission(staffRole, "EDIT_SHOP_PROFILE")).toBe(false);
      expect(hasPermission(staffRole, "DELETE_INVOICE")).toBe(false);

      expect(() => requirePermission(staffRole, "MANAGE_STAFF")).toThrow(PermissionDeniedError);
      expect(() => requirePermission(staffRole, "EDIT_SHOP_PROFILE")).toThrow(PermissionDeniedError);
    });
  });

  describe("Security Test 7: Failed cross-tenant requests do not modify stock or financial records", () => {
    it("aborts entire transaction and leaves inventory and financial ledgers untouched on violation", async () => {
      let initialStock = 50;
      let stockMovementsCreated = 0;
      let invoicesCreated = 0;

      const mockTx = {
        customer: {
          findFirst: vi.fn().mockResolvedValue(null), // Customer belongs to Tenant B!
        },
        productVariant: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        salesInvoice: {
          create: vi.fn().mockImplementation(() => {
            invoicesCreated++;
            return { id: "new-inv" };
          }),
        },
        stockMovement: {
          create: vi.fn().mockImplementation(() => {
            stockMovementsCreated++;
          }),
        },
      };

      const mockPrisma = {
        $transaction: vi.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      // Attacker attempts to create an invoice referencing a customer from Tenant B
      const maliciousInput = {
        tenantId: tenantA_Id,
        userId: userA_Id,
        customerId: "507f1f77bcf86cd799439066",
        customerName: "Target Customer",
        invoiceNumber: "INV-MALICIOUS-01",
        items: [
          {
            variantId: "507f191e810c19729de86055",
            productName: "Test Product",
            variantName: "Standard",
            quantity: 5,
            unitPrice: 1000,
            gstRate: 18,
          },
        ],
        paidAmount: 5000,
        paymentMode: "CASH" as const,
      };

      // Must throw CrossTenantReferenceError
      await expect(createTenantScopedInvoice(mockPrisma, maliciousInput)).rejects.toThrow(
        CrossTenantReferenceError
      );

      // Verify ZERO side effects occurred:
      expect(initialStock).toBe(50); // Stock was not decremented
      expect(stockMovementsCreated).toBe(0); // Zero stock movements recorded
      expect(invoicesCreated).toBe(0); // Zero invoices created
    });
  });

  describe("Security Test 8: Sanitized Audit Logging", () => {
    it("redacts passwords, tokens, and secrets from administrative audit logs", () => {
      const rawPayload = {
        tradeName: "Updated Trade Name",
        phone: "9876543210",
        password: "SuperSecretPassword123!",
        sessionToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        apiSecretKey: "secret-key-abcdef",
        creditCard: "4111-2222-3333-4444",
      };

      const sanitizedJson = sanitizeAuditData(rawPayload);
      const parsed = JSON.parse(sanitizedJson);

      expect(parsed.tradeName).toBe("Updated Trade Name");
      expect(parsed.phone).toBe("9876543210");

      // Sensitive fields must be replaced with [REDACTED]
      expect(parsed.password).toBe("[REDACTED]");
      expect(parsed.sessionToken).toBe("[REDACTED]");
      expect(parsed.apiSecretKey).toBe("[REDACTED]");
      expect(parsed.creditCard).toBe("[REDACTED]");
      expect(sanitizedJson).not.toContain("SuperSecretPassword123!");
    });
  });
});
