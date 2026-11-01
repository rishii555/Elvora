import { describe, it, expect, beforeEach } from "vitest";
import {
  provisionDefaultSubscription,
  provisionTrialSubscription,
  getTenantSubscription,
  checkPlanLimit,
} from "@/lib/billing/service";
import { isAccountApproved } from "@/lib/auth/account-status";
import { reviewRegistration } from "@/lib/admin/registrations-service";
import { updateTenantSubscriptionByAdmin } from "@/lib/admin/service";
import { PlanLimitExceededError } from "@/lib/billing/types";

describe("Regression Audit: 14-Day Free Trial Removal & Access Control Consistency", () => {
  let subscriptionsStore: Map<string, any>;
  let subscriptionPlansStore: Map<string, any>;
  let tenantUsagesStore: Map<string, any>;
  let tenantsStore: Map<string, any>;
  let usersStore: Map<string, any>;
  let auditLogsStore: any[];

  const TENANT_NEW = "tenant-new-001";
  const TENANT_EXISTING_PAID = "tenant-paid-002";
  const TENANT_LEGACY_TRIAL = "tenant-legacy-trial-003";
  const TENANT_EXPIRED_TRIAL = "tenant-legacy-expired-004";

  let mockDb: any;

  beforeEach(() => {
    subscriptionsStore = new Map();
    subscriptionPlansStore = new Map();
    tenantUsagesStore = new Map();
    tenantsStore = new Map();
    usersStore = new Map();
    auditLogsStore = [];

    // Seed default subscription plans
    subscriptionPlansStore.set("FREE_TRIAL", {
      id: "plan-trial",
      code: "FREE_TRIAL",
      name: "14-Day Full Access Trial",
      priceMonthly: 0,
      priceYearly: 0,
      maxProducts: 100,
      maxInvoicesPerMonth: 50,
      maxStaffMembers: 2,
      hasAdvancedReports: true,
      hasAuditLogs: true,
      hasMultiLocation: false,
      isActive: true,
    });

    subscriptionPlansStore.set("STARTER", {
      id: "plan-starter",
      code: "STARTER",
      name: "Starter Business",
      priceMonthly: 499,
      priceYearly: 4990,
      maxProducts: 500,
      maxInvoicesPerMonth: 300,
      maxStaffMembers: 3,
      hasAdvancedReports: false,
      hasAuditLogs: false,
      hasMultiLocation: false,
      isActive: true,
    });

    subscriptionPlansStore.set("GROWTH", {
      id: "plan-growth",
      code: "GROWTH",
      name: "Growth Professional",
      priceMonthly: 1499,
      priceYearly: 14990,
      maxProducts: 5000,
      maxInvoicesPerMonth: -1,
      maxStaffMembers: 10,
      hasAdvancedReports: true,
      hasAuditLogs: true,
      hasMultiLocation: true,
      isActive: true,
    });

    subscriptionPlansStore.set("ENTERPRISE", {
      id: "plan-enterprise",
      code: "ENTERPRISE",
      name: "Enterprise Multi-Branch",
      priceMonthly: 3999,
      priceYearly: 39990,
      maxProducts: -1,
      maxInvoicesPerMonth: -1,
      maxStaffMembers: 50,
      hasAdvancedReports: true,
      hasAuditLogs: true,
      hasMultiLocation: true,
      isActive: true,
    });

    mockDb = {
      subscriptionPlan: {
        findMany: async () => Array.from(subscriptionPlansStore.values()),
        findUnique: async (args: any) => subscriptionPlansStore.get(args.where.code || args.where.id) || null,
        findFirst: async () => subscriptionPlansStore.get("ENTERPRISE") || null,
        create: async (args: any) => {
          const rec = { id: `plan-${Date.now()}`, ...args.data };
          subscriptionPlansStore.set(rec.code, rec);
          return rec;
        },
      },
      subscription: {
        findUnique: async (args: any) => {
          const sub = subscriptionsStore.get(args.where.tenantId);
          if (!sub) return null;
          const plan = Array.from(subscriptionPlansStore.values()).find((p) => p.id === sub.planId);
          return { ...sub, plan };
        },
        upsert: async (args: any) => {
          const existing = subscriptionsStore.get(args.where.tenantId);
          const data = existing ? args.update : args.create;
          const rec = {
            id: existing?.id || `sub-${Date.now()}`,
            tenantId: args.where.tenantId,
            ...data,
          };
          subscriptionsStore.set(args.where.tenantId, rec);
          const plan = Array.from(subscriptionPlansStore.values()).find((p) => p.id === rec.planId);
          return { ...rec, plan };
        },
        create: async (args: any) => {
          const rec = { id: `sub-${Date.now()}`, ...args.data };
          subscriptionsStore.set(args.data.tenantId, rec);
          const plan = Array.from(subscriptionPlansStore.values()).find((p) => p.id === rec.planId);
          return { ...rec, plan };
        },
        update: async (args: any) => {
          const existing = subscriptionsStore.get(args.where.tenantId);
          if (!existing) throw new Error("Subscription not found");
          const rec = { ...existing, ...args.data };
          subscriptionsStore.set(args.where.tenantId, rec);
          const plan = Array.from(subscriptionPlansStore.values()).find((p) => p.id === rec.planId);
          return { ...rec, plan };
        },
      },
      tenantUsage: {
        findUnique: async (args: any) => tenantUsagesStore.get(args.where.tenantId) || null,
        upsert: async (args: any) => {
          const existing = tenantUsagesStore.get(args.where.tenantId);
          const rec = { ...existing, ...args.create, ...args.update };
          tenantUsagesStore.set(args.where.tenantId, rec);
          return rec;
        },
      },
      tenant: {
        findUnique: async (args: any) => tenantsStore.get(args.where.id) || null,
        update: async (args: any) => {
          const existing = tenantsStore.get(args.where.id);
          if (!existing) throw new Error("Tenant not found");
          const rec = { ...existing, ...args.data };
          tenantsStore.set(args.where.id, rec);
          return rec;
        },
      },
      user: {
        findUnique: async (args: any) => usersStore.get(args.where.id) || null,
        update: async (args: any) => {
          const existing = usersStore.get(args.where.id);
          if (!existing) throw new Error("User not found");
          const rec = { ...existing, ...args.data };
          usersStore.set(args.where.id, rec);
          return rec;
        },
      },
      auditLog: {
        create: async (args: any) => {
          auditLogsStore.push(args.data);
          return args.data;
        },
      },
      product: {
        count: async () => 0,
      },
      tenantMember: {
        count: async () => 1,
      },
    };
  });

  describe("1. New User Registration & Subscription Provisioning", () => {
    it("provisions an ACTIVE commercial subscription with trialEndsAt: null for new registrants", async () => {
      const sub = await provisionDefaultSubscription(TENANT_NEW, mockDb);

      expect(sub.status).toBe("ACTIVE");
      expect(sub.trialEndsAt).toBeNull();
      expect(sub.billingProvider).toBe("ADMIN_APPROVED");
      expect(sub.plan.code).toBe("ENTERPRISE");

      const tenantSub = await getTenantSubscription(TENANT_NEW, mockDb);
      expect(tenantSub.status).toBe("ACTIVE");
      expect(tenantSub.isTrialing).toBe(false);
      expect(tenantSub.isExpired).toBe(false);
      expect(tenantSub.trialDaysRemaining).toBe(0);
    });

    it("lazily provisions ACTIVE default subscription (no trial) if tenant has no subscription row", async () => {
      const tenantSub = await getTenantSubscription("unprovisioned-tenant", mockDb);

      expect(tenantSub.status).toBe("ACTIVE");
      expect(tenantSub.isTrialing).toBe(false);
      expect(tenantSub.subscription.trialEndsAt).toBeNull();
      expect(tenantSub.trialDaysRemaining).toBe(0);
    });
  });

  describe("2. Admin Approval Gate vs ACTIVE Subscription Separation", () => {
    it("strictly rejects unapproved tenants even if their subscription row is ACTIVE", () => {
      // Simulate tenant registered with PENDING approval status but an ACTIVE subscription
      const pendingApprovalStatus = "PENDING";
      const hasActiveSubscription = true;

      // Approval check MUST evaluate approvalStatus, completely decoupled from subscription status
      expect(isAccountApproved(pendingApprovalStatus)).toBe(false);
      expect(isAccountApproved("REJECTED")).toBe(false);
      expect(isAccountApproved("SUSPENDED")).toBe(false);
      expect(isAccountApproved("APPROVED")).toBe(true);

      // Verify that having an active subscription NEVER makes isAccountApproved true
      const effectiveAccessGranted = isAccountApproved(pendingApprovalStatus) && hasActiveSubscription;
      expect(effectiveAccessGranted).toBe(false);
    });
  });

  describe("3. Preservation of Existing Users and Paid Subscriptions", () => {
    it("preserves existing paid subscription tier without resetting to default", async () => {
      // Seed existing tenant on GROWTH plan
      const now = new Date();
      subscriptionsStore.set(TENANT_EXISTING_PAID, {
        id: "sub-growth-001",
        tenantId: TENANT_EXISTING_PAID,
        planId: "plan-growth",
        status: "ACTIVE",
        billingProvider: "MOCK",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        trialEndsAt: null,
      });

      const tenantSub = await getTenantSubscription(TENANT_EXISTING_PAID, mockDb);
      expect(tenantSub.status).toBe("ACTIVE");
      expect(tenantSub.plan.code).toBe("GROWTH");
      expect(tenantSub.plan.name).toBe("Growth Professional");
      expect(tenantSub.limits.maxInvoicesPerMonth).toBe(-1); // Unlimited on Growth
      expect(tenantSub.limits.maxStaffMembers).toBe(10);
    });
  });

  describe("4. Preservation and Safe Handling of Legacy TRIALING Subscriptions", () => {
    it("preserves active legacy TRIALING subscriptions and calculates remaining trial days", async () => {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days remaining

      subscriptionsStore.set(TENANT_LEGACY_TRIAL, {
        id: "sub-legacy-trial",
        tenantId: TENANT_LEGACY_TRIAL,
        planId: "plan-trial",
        status: "TRIALING",
        billingProvider: "MOCK",
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        trialEndsAt,
      });

      const tenantSub = await getTenantSubscription(TENANT_LEGACY_TRIAL, mockDb);
      expect(tenantSub.status).toBe("TRIALING");
      expect(tenantSub.isTrialing).toBe(true);
      expect(tenantSub.isExpired).toBe(false);
      expect(tenantSub.trialDaysRemaining).toBeGreaterThanOrEqual(4);
      expect(tenantSub.limits.maxInvoicesPerMonth).toBe(50);
    });

    it("correctly flags expired legacy TRIALING subscriptions as EXPIRED and blocks creation", async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000); // Ended yesterday

      subscriptionsStore.set(TENANT_EXPIRED_TRIAL, {
        id: "sub-legacy-expired",
        tenantId: TENANT_EXPIRED_TRIAL,
        planId: "plan-trial",
        status: "TRIALING",
        billingProvider: "MOCK",
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: past,
        trialEndsAt: past,
      });

      const tenantSub = await getTenantSubscription(TENANT_EXPIRED_TRIAL, mockDb);
      expect(tenantSub.status).toBe("EXPIRED");
      expect(tenantSub.isExpired).toBe(true);

      // Should block invoice creation with PlanLimitExceededError
      await expect(
        checkPlanLimit(TENANT_EXPIRED_TRIAL, "INVOICE_CREATION", mockDb)
      ).rejects.toThrow(PlanLimitExceededError);
    });
  });

  describe("5. Admin Review Workflow and Subscription Administration", () => {
    beforeEach(() => {
      tenantsStore.set("tenant-review-01", {
        id: "tenant-review-01",
        tradeName: "Audit Test Shop",
        approvalStatus: "PENDING",
        isActive: false,
        members: [{ user: { id: "user-review-01" } }],
      });
      usersStore.set("user-review-01", {
        id: "user-review-01",
        approvalStatus: "PENDING",
        isActive: false,
      });
    });

    it("approves pending tenant, activating both tenant and user", async () => {
      const res = await reviewRegistration(
        "tenant-review-01",
        { action: "APPROVE", reviewedBy: "platform-admin-1" },
        mockDb
      );

      expect(res.newStatus).toBe("APPROVED");
      expect(res.success).toBe(true);

      const updatedTenant = tenantsStore.get("tenant-review-01");
      const updatedUser = usersStore.get("user-review-01");
      expect(updatedTenant.approvalStatus).toBe("APPROVED");
      expect(updatedTenant.isActive).toBe(true);
      expect(updatedUser.approvalStatus).toBe("APPROVED");
      expect(updatedUser.isActive).toBe(true);
    });

    it("rejects pending tenant with mandatory reason, keeping isActive: false", async () => {
      const res = await reviewRegistration(
        "tenant-review-01",
        { action: "REJECT", reviewedBy: "platform-admin-1", reason: "Incomplete GST documentation" },
        mockDb
      );

      expect(res.newStatus).toBe("REJECTED");
      expect(res.success).toBe(true);

      const updatedTenant = tenantsStore.get("tenant-review-01");
      expect(updatedTenant.approvalStatus).toBe("REJECTED");
      expect(updatedTenant.isActive).toBe(false);
      expect(updatedTenant.rejectionReason).toBe("Incomplete GST documentation");
    });

    it("suspends active tenant, deactivating access immediately", async () => {
      // First approve
      await reviewRegistration(
        "tenant-review-01",
        { action: "APPROVE", reviewedBy: "platform-admin-1" },
        mockDb
      );
      // Then suspend
      const res = await reviewRegistration(
        "tenant-review-01",
        { action: "SUSPEND", reviewedBy: "platform-admin-1" },
        mockDb
      );
      expect(res.newStatus).toBe("SUSPENDED");
      expect(res.success).toBe(true);

      const updatedTenant = tenantsStore.get("tenant-review-01");
      expect(updatedTenant.approvalStatus).toBe("SUSPENDED");
      expect(updatedTenant.isActive).toBe(false);
    });

    it("updates subscription via admin without forcing a 14-day trial for unassigned tenants", async () => {
      const updated = await updateTenantSubscriptionByAdmin(
        "tenant-review-01",
        { status: "ACTIVE", planCode: "GROWTH" },
        mockDb
      );

      expect(updated.status).toBe("ACTIVE");
      expect(updated.plan.code).toBe("GROWTH");
      expect(updated.trialEndsAt).toBeNull();
    });
  });

  describe("6. Deprecated Trial Provisioning Isolation", () => {
    it("allows provisionTrialSubscription to run for test fixtures without affecting default flow", async () => {
      const trialSub = await provisionTrialSubscription("tenant-test-isolated-trial", mockDb);
      expect(trialSub.status).toBe("TRIALING");
      expect(trialSub.plan.code).toBe("FREE_TRIAL");
      expect(trialSub.trialEndsAt).toBeDefined();
    });
  });
});
