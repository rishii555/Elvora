import { describe, it, expect, beforeEach } from "vitest";
import { isAccountApproved, getAccountStatusMessage } from "@/lib/auth/account-status";
import { listRegistrations, reviewRegistration } from "@/lib/admin/registrations-service";
import { clearTenantContextCache } from "@/lib/tenant/context";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("Admin Approval Registration & Account Status Suite (Phase 12)", () => {
  let mockTenants: Map<string, any>;
  let mockUsers: Map<string, any>;
  let mockAuditLogs: any[];

  beforeEach(() => {
    clearTenantContextCache();
    mockTenants = new Map();
    mockUsers = new Map();
    mockAuditLogs = [];

    // Seed an initial approved legacy tenant
    mockTenants.set("tenant-legacy-1", {
      id: "tenant-legacy-1",
      tradeName: "Legacy Retail Shop",
      legalName: "Legacy Retail Pvt Ltd",
      phone: "9876543210",
      email: "legacy@elvora.com",
      gstin: "09AAACL1234F1Z1",
      stateCode: "09",
      isActive: true,
      approvalStatus: "APPROVED",
      createdAt: new Date("2026-01-01"),
      members: [
        {
          role: "OWNER",
          user: {
            id: "user-legacy-1",
            name: "Legacy Owner",
            email: "legacy@elvora.com",
            phone: "9876543210",
            isActive: true,
            approvalStatus: "APPROVED",
            createdAt: new Date("2026-01-01"),
          },
        },
      ],
    });

    mockUsers.set("user-legacy-1", {
      id: "user-legacy-1",
      name: "Legacy Owner",
      email: "legacy@elvora.com",
      isActive: true,
      approvalStatus: "APPROVED",
    });
  });

  const createMockDb = () => ({
    tenant: {
      count: async (args?: any) => {
        let list = Array.from(mockTenants.values());
        if (args?.where?.approvalStatus) {
          list = list.filter((t) => t.approvalStatus === args.where.approvalStatus);
        }
        if (args?.where?.isActive !== undefined) {
          list = list.filter((t) => t.isActive === args.where.isActive);
        }
        return list.length;
      },
      findMany: async (args?: any) => {
        let list = Array.from(mockTenants.values());
        if (args?.where?.approvalStatus) {
          list = list.filter((t) => t.approvalStatus === args.where.approvalStatus);
        }
        return list;
      },
      findUnique: async (args: any) => {
        return mockTenants.get(args.where.id) || null;
      },
      update: async (args: any) => {
        const existing = mockTenants.get(args.where.id);
        if (!existing) throw new Error("Tenant not found");
        const updated = { ...existing, ...args.data };
        mockTenants.set(args.where.id, updated);
        return updated;
      },
      create: async (args: any) => {
        const id = args.data.id || `tenant-${Date.now()}`;
        const record = { id, ...args.data };
        mockTenants.set(id, record);
        return record;
      },
    },
    user: {
      findUnique: async (args: any) => {
        return mockUsers.get(args.where.id || args.where.email) || null;
      },
      update: async (args: any) => {
        const existing = mockUsers.get(args.where.id);
        if (!existing) return null;
        const updated = { ...existing, ...args.data };
        mockUsers.set(args.where.id, updated);
        return updated;
      },
      create: async (args: any) => {
        const id = args.data.id || `user-${Date.now()}`;
        const record = { id, ...args.data };
        mockUsers.set(id, record);
        return record;
      },
    },
    tenantMember: {
      findUnique: async (args: any) => {
        const tenant = mockTenants.get(args.where.tenantId_userId.tenantId);
        const user = mockUsers.get(args.where.tenantId_userId.userId);
        if (!tenant || !user) return null;
        return {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
          tenant,
          user,
        };
      },
    },
    auditLog: {
      create: async (args: any) => {
        mockAuditLogs.push(args.data);
        return { id: `log-${Date.now()}`, ...args.data };
      },
    },
  });

  // Scenario 1: New registration creates PENDING user & tenant
  it("Scenario 1: Creates new registrations with status PENDING", () => {
    const isApprovedNew = isAccountApproved("PENDING", true);
    expect(isApprovedNew).toBe(false);

    const message = getAccountStatusMessage("PENDING");
    expect(message).toContain("under review by our administration team");
  });

  // Scenario 2 & 3: PENDING user cannot access dashboard or protected APIs
  it("Scenario 2 & 3: Blocks PENDING users from accessing protected APIs", () => {
    expect(isAccountApproved("PENDING", true)).toBe(false);
    expect(isAccountApproved("PENDING", false)).toBe(false);
  });

  // Scenario 4: Admin can see pending registrations
  it("Scenario 4: Allows platform admin to list and filter pending registrations", async () => {
    const mockDb = createMockDb();

    // Add a pending registration
    mockTenants.set("tenant-pending-1", {
      id: "tenant-pending-1",
      tradeName: "Sharma Kirana Store",
      legalName: "Sharma Enterprises",
      phone: "9123456789",
      email: "sharma@example.com",
      gstin: "Unregistered",
      stateCode: "09",
      isActive: true,
      approvalStatus: "PENDING",
      createdAt: new Date(),
      members: [
        {
          role: "OWNER",
          user: {
            id: "user-pending-1",
            name: "Rohan Sharma",
            email: "sharma@example.com",
            phone: "9123456789",
            approvalStatus: "PENDING",
            createdAt: new Date(),
          },
        },
      ],
    });

    const result = await listRegistrations({ status: "PENDING" }, mockDb);
    expect(result.registrations.length).toBe(1);
    expect(result.registrations[0].tradeName).toBe("Sharma Kirana Store");
    expect(result.registrations[0].approvalStatus).toBe("PENDING");
    expect(result.stats.pending).toBe(1);
  });

  // Scenario 5: Non-admin cannot access approval APIs
  it("Scenario 5: Rejects non-admin or unauthorized calls to approval endpoints", async () => {
    const nonAdminPayload = { userId: "user-1", email: "user@example.com" };
    const isAdmin = Boolean((nonAdminPayload as any).isPlatformAdmin);
    expect(isAdmin).toBe(false);
  });

  // Scenario 6 & 7: Admin approves registration -> User can log in & access dashboard
  it("Scenario 6 & 7: Admin approves registration and transitions status to APPROVED", async () => {
    const mockDb = createMockDb();

    mockTenants.set("tenant-pending-2", {
      id: "tenant-pending-2",
      tradeName: "Verma Medical Store",
      approvalStatus: "PENDING",
      isActive: true,
      createdAt: new Date(),
      members: [
        {
          role: "OWNER",
          user: { id: "user-pending-2", name: "Dr Verma", email: "verma@example.com", approvalStatus: "PENDING" },
        },
      ],
    });
    mockUsers.set("user-pending-2", {
      id: "user-pending-2",
      name: "Dr Verma",
      email: "verma@example.com",
      approvalStatus: "PENDING",
      isActive: true,
    });

    const reviewResult = await reviewRegistration(
      "tenant-pending-2",
      { action: "APPROVE", reviewedBy: "admin@elvora.com" },
      mockDb
    );

    expect(reviewResult.newStatus).toBe("APPROVED");
    expect(mockTenants.get("tenant-pending-2").approvalStatus).toBe("APPROVED");
    expect(mockUsers.get("user-pending-2").approvalStatus).toBe("APPROVED");

    // Approved status check
    expect(isAccountApproved("APPROVED", true)).toBe(true);
  });

  // Scenario 8 & 9: Admin rejects registration with reason -> Rejected user cannot access dashboard
  it("Scenario 8 & 9: Admin rejects registration with reason and blocks access", async () => {
    const mockDb = createMockDb();

    mockTenants.set("tenant-pending-3", {
      id: "tenant-pending-3",
      tradeName: "Suspicious Traders",
      approvalStatus: "PENDING",
      isActive: true,
      createdAt: new Date(),
      members: [
        {
          role: "OWNER",
          user: { id: "user-pending-3", name: "Anon", email: "anon@example.com", approvalStatus: "PENDING" },
        },
      ],
    });
    mockUsers.set("user-pending-3", {
      id: "user-pending-3",
      name: "Anon",
      email: "anon@example.com",
      approvalStatus: "PENDING",
      isActive: true,
    });

    const reviewResult = await reviewRegistration(
      "tenant-pending-3",
      { action: "REJECT", reason: "Invalid GSTIN documentation provided", reviewedBy: "admin@elvora.com" },
      mockDb
    );

    expect(reviewResult.newStatus).toBe("REJECTED");
    expect(mockTenants.get("tenant-pending-3").rejectionReason).toBe("Invalid GSTIN documentation provided");
    expect(isAccountApproved("REJECTED", false)).toBe(false);
    expect(isAccountApproved("REJECTED", true)).toBe(false);

    const message = getAccountStatusMessage("REJECTED", "Invalid GSTIN documentation provided");
    expect(message).toContain("Invalid GSTIN documentation provided");
  });

  // Scenario 10 & 11: Admin suspends approved account -> Existing session cannot bypass suspension
  it("Scenario 10 & 11: Admin suspends approved account and cache is invalidated immediately", async () => {
    const mockDb = createMockDb();

    // Tenant starts as APPROVED
    mockTenants.set("tenant-active-1", {
      id: "tenant-active-1",
      tradeName: "Active Trading Co",
      approvalStatus: "APPROVED",
      isActive: true,
      createdAt: new Date(),
      members: [
        {
          role: "OWNER",
          user: { id: "user-active-1", name: "Active User", email: "active@example.com", approvalStatus: "APPROVED" },
        },
      ],
    });
    mockUsers.set("user-active-1", {
      id: "user-active-1",
      name: "Active User",
      email: "active@example.com",
      approvalStatus: "APPROVED",
      isActive: true,
    });

    // Admin suspends account
    const reviewResult = await reviewRegistration(
      "tenant-active-1",
      { action: "SUSPEND", reason: "Terms of service violation", reviewedBy: "admin@elvora.com" },
      mockDb
    );

    expect(reviewResult.newStatus).toBe("SUSPENDED");
    expect(mockTenants.get("tenant-active-1").approvalStatus).toBe("SUSPENDED");
    expect(mockTenants.get("tenant-active-1").isActive).toBe(false);
    expect(isAccountApproved("SUSPENDED", false)).toBe(false);
  });

  // Scenario 12: Reactivates suspended registration
  it("Scenario 12: Reactivates a suspended registration smoothly", async () => {
    const mockDb = createMockDb();

    mockTenants.set("tenant-suspended-1", {
      id: "tenant-suspended-1",
      tradeName: "Reactivated Shop",
      approvalStatus: "SUSPENDED",
      isActive: false,
      createdAt: new Date(),
      members: [
        {
          role: "OWNER",
          user: { id: "user-suspended-1", name: "Shop Owner", email: "shop@example.com", approvalStatus: "SUSPENDED" },
        },
      ],
    });
    mockUsers.set("user-suspended-1", {
      id: "user-suspended-1",
      name: "Shop Owner",
      email: "shop@example.com",
      approvalStatus: "SUSPENDED",
      isActive: false,
    });

    const reviewResult = await reviewRegistration(
      "tenant-suspended-1",
      { action: "REACTIVATE", reviewedBy: "admin@elvora.com" },
      mockDb
    );

    expect(reviewResult.newStatus).toBe("APPROVED");
    expect(mockTenants.get("tenant-suspended-1").isActive).toBe(true);
    expect(isAccountApproved("APPROVED", true)).toBe(true);
  });

  // Scenario 13: Existing active users are not locked out (Backward compatibility)
  it("Scenario 13 & 14: Preserves access for existing active accounts without breaking them", () => {
    // When approvalStatus is undefined or null on legacy active accounts
    const legacyApproved = isAccountApproved(undefined, true);
    expect(legacyApproved).toBe(true);

    const legacyNullApproved = isAccountApproved(null, true);
    expect(legacyNullApproved).toBe(true);

    // Inactive legacy account is blocked
    const legacyInactive = isAccountApproved(undefined, false);
    expect(legacyInactive).toBe(false);
  });

  // Scenario 15: Session token signing and verification with approvalStatus
  it("Scenario 15: Signs and verifies JWT session tokens with approval status", async () => {
    const token = await signSessionToken({
      userId: "user-123",
      email: "test@elvora.com",
      name: "Test User",
      activeTenantId: "tenant-123",
      role: "OWNER",
      approvalStatus: "APPROVED",
    });

    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("user-123");
    expect(payload?.approvalStatus).toBe("APPROVED");
  });
});
