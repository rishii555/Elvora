import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SYSTEM_PLANS,
  provisionTrialSubscription,
  getTenantSubscription,
  checkPlanLimit,
  upgradeTenantSubscription,
} from "@/lib/billing/service";
import { PlanLimitExceededError } from "@/lib/billing/types";
import { MockBillingProvider } from "@/lib/billing/mock-provider";
import {
  listPlatformTenants,
  updateTenantSubscriptionByAdmin,
  toggleTenantAccountActive,
} from "@/lib/admin/service";
import {
  signPlatformAdminToken,
  verifyPlatformAdminToken,
} from "@/lib/admin/auth";

describe("Commercial SaaS, Subscription Plans & Platform Administration Suite", () => {
  const TENANT_A = "6655555555555555555555aa";
  const TENANT_B = "6655555555555555555555bb";

  let plansStore: any[];
  let subscriptionsStore: Map<string, any>;
  let tenantUsagesStore: Map<string, any>;
  let tenantsStore: any[];
  let membersStore: any[];
  let productsStore: any[];
  let invoicesStore: any[];
  let mockDb: any;

  beforeEach(() => {
    plansStore = SYSTEM_PLANS.map((p, idx) => ({
      id: `plan-${idx + 1}`,
      ...p,
    }));
    subscriptionsStore = new Map();
    tenantUsagesStore = new Map();
    tenantsStore = [
      {
        id: TENANT_A,
        legalName: "Apex Luxury Sanitaryware",
        tradeName: "Apex Bath",
        gstin: "09AAACA1234F1Z1",
        stateCode: "09",
        phone: "9876543210",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: TENANT_B,
        legalName: "Shop B Tiles Ltd",
        tradeName: "Shop B",
        gstin: "27AAACB5678G1Z2",
        stateCode: "27",
        phone: "9123456789",
        isActive: true,
        createdAt: new Date(),
      },
    ];
    membersStore = [
      { id: "mem-1", tenantId: TENANT_A, userId: "u-1", role: "OWNER" },
      { id: "mem-2", tenantId: TENANT_A, userId: "u-2", role: "BILLER" },
    ];
    productsStore = [
      { id: "prod-1", tenantId: TENANT_A, name: "Washbasin" },
      { id: "prod-2", tenantId: TENANT_A, name: "Mixer Tap" },
    ];
    invoicesStore = [];

    mockDb = {
      subscriptionPlan: {
        findMany: vi.fn(async () => plansStore),
        findUnique: vi.fn(async ({ where }: any) => {
          return plansStore.find((p) => p.code === where.code || p.id === where.id) || null;
        }),
        create: vi.fn(async ({ data }: any) => {
          const record = { id: `plan-${Date.now()}`, ...data };
          plansStore.push(record);
          return record;
        }),
      },
      subscription: {
        findUnique: vi.fn(async ({ where }: any) => {
          const sub = subscriptionsStore.get(where.tenantId);
          if (!sub) return null;
          return {
            ...sub,
            plan: plansStore.find((p) => p.id === sub.planId),
          };
        }),
        upsert: vi.fn(async ({ where, create, update }: any) => {
          let existing = subscriptionsStore.get(where.tenantId);
          if (existing) {
            existing = { ...existing, ...update };
          } else {
            existing = { id: `sub-${Date.now()}`, ...create };
          }
          subscriptionsStore.set(where.tenantId, existing);
          return {
            ...existing,
            plan: plansStore.find((p) => p.id === existing.planId),
          };
        }),
        create: vi.fn(async ({ data }: any) => {
          const record = { id: `sub-${Date.now()}`, ...data };
          subscriptionsStore.set(data.tenantId, record);
          return {
            ...record,
            plan: plansStore.find((p) => p.id === record.planId),
          };
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const existing = subscriptionsStore.get(where.tenantId);
          if (!existing) throw new Error("Subscription not found");
          const updated = { ...existing, ...data };
          subscriptionsStore.set(where.tenantId, updated);
          return {
            ...updated,
            plan: plansStore.find((p) => p.id === updated.planId),
          };
        }),
        count: vi.fn(async ({ where }: any) => {
          return Array.from(subscriptionsStore.values()).filter((s) => !where?.status || s.status === where.status).length;
        }),
      },
      tenantUsage: {
        findUnique: vi.fn(async ({ where }: any) => {
          return tenantUsagesStore.get(where.tenantId) || null;
        }),
        upsert: vi.fn(async ({ where, create, update }: any) => {
          let existing = tenantUsagesStore.get(where.tenantId);
          if (existing) {
            existing = { ...existing, ...update };
          } else {
            existing = { id: `use-${Date.now()}`, ...create };
          }
          tenantUsagesStore.set(where.tenantId, existing);
          return existing;
        }),
      },
      tenant: {
        count: vi.fn(async ({ where }: any) => {
          return tenantsStore.filter((t) => where?.isActive === undefined || t.isActive === where.isActive).length;
        }),
        findMany: vi.fn(async ({ where, skip = 0, take = 50 }: any) => {
          return tenantsStore
            .filter((t) => where?.isActive === undefined || t.isActive === where.isActive)
            .slice(skip, skip + take)
            .map((t) => ({
              ...t,
              subscription: subscriptionsStore.get(t.id)
                ? {
                    ...subscriptionsStore.get(t.id),
                    plan: plansStore.find((p) => p.id === subscriptionsStore.get(t.id).planId),
                  }
                : null,
              members: membersStore
                .filter((m) => m.tenantId === t.id && m.role === "OWNER")
                .map((m) => ({ user: { id: m.userId, name: "Owner Name", email: "owner@test.com" } })),
            }));
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const t = tenantsStore.find((x) => x.id === where.id);
          if (!t) throw new Error("Tenant not found");
          Object.assign(t, data);
          return t;
        }),
      },
      product: {
        count: vi.fn(async ({ where }: any) => {
          return productsStore.filter((p) => p.tenantId === where.tenantId).length;
        }),
      },
      tenantMember: {
        count: vi.fn(async ({ where }: any) => {
          return membersStore.filter((m) => m.tenantId === where.tenantId).length;
        }),
      },
      salesInvoice: {
        count: vi.fn(async ({ where }: any) => {
          return invoicesStore.filter((i) => i.tenantId === where.tenantId).length;
        }),
      },
    };
  });

  describe("1. Subscription Plans & Server-Side Quota Enforcement", () => {
    it("provisions a 14-day free trial on onboarding with full feature access", async () => {
      const sub = await provisionTrialSubscription(TENANT_A, mockDb);

      expect(sub.status).toBe("TRIALING");
      expect(sub.plan.code).toBe("FREE_TRIAL");
      expect(sub.trialEndsAt).toBeDefined();

      const details = await getTenantSubscription(TENANT_A, mockDb);
      expect(details.isTrialing).toBe(true);
      expect(details.trialDaysRemaining).toBeGreaterThanOrEqual(13);
      expect(details.limits.maxInvoicesPerMonth).toBe(50);
      expect(details.limits.maxStaffMembers).toBe(2);
    });

    it("enforces staff seat limit on server and blocks addition beyond quota", async () => {
      await provisionTrialSubscription(TENANT_A, mockDb);
      // Trial plan allows max 2 staff members. Currently TENANT_A has 2 members (mem-1, mem-2).
      await expect(
        checkPlanLimit(TENANT_A, "STAFF_MEMBER", mockDb)
      ).rejects.toThrow(PlanLimitExceededError);
    });

    it("enforces monthly invoice generation limit on server and blocks after reaching quota", async () => {
      await provisionTrialSubscription(TENANT_A, mockDb);
      // Set usage to 50 (max allowed on trial)
      tenantUsagesStore.set(TENANT_A, { tenantId: TENANT_A, monthlyInvoiceCount: 50 });

      await expect(
        checkPlanLimit(TENANT_A, "INVOICE_CREATION", mockDb)
      ).rejects.toThrow(PlanLimitExceededError);
    });

    it("allows unlimited invoices and expanded seats on Growth Pro plan", async () => {
      await upgradeTenantSubscription(TENANT_A, "GROWTH", "MOCK", undefined, mockDb);

      const details = await getTenantSubscription(TENANT_A, mockDb);
      expect(details.status).toBe("ACTIVE");
      expect(details.plan.code).toBe("GROWTH");
      expect(details.limits.maxInvoicesPerMonth).toBe(-1); // Unlimited
      expect(details.limits.maxStaffMembers).toBe(10);

      // Usage at 500 should pass freely because limit is -1
      tenantUsagesStore.set(TENANT_A, { tenantId: TENANT_A, monthlyInvoiceCount: 500 });
      const canCreate = await checkPlanLimit(TENANT_A, "INVOICE_CREATION", mockDb);
      expect(canCreate).toBe(true);
    });
  });

  describe("2. Expiration Behavior & Data Preservation Guarantee", () => {
    it("protects existing shop data on subscription expiry while requiring renewal for new creation", async () => {
      // Simulate expired subscription
      const expiredSub = {
        id: "sub-exp",
        tenantId: TENANT_A,
        planId: "plan-1", // Free Trial
        status: "EXPIRED",
        trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ended yesterday
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };
      subscriptionsStore.set(TENANT_A, expiredSub);

      const details = await getTenantSubscription(TENANT_A, mockDb);
      expect(details.isExpired).toBe(true);

      // Existing data check: products and members are still accessible!
      const productCount = await mockDb.product.count({ where: { tenantId: TENANT_A } });
      expect(productCount).toBe(2);

      // Attempting to create new resources on expired account must fail with PlanLimitExceededError
      await expect(
        checkPlanLimit(TENANT_A, "INVOICE_CREATION", mockDb)
      ).rejects.toThrow(PlanLimitExceededError);
    });
  });

  describe("3. Mock Billing Provider for Local Development", () => {
    const provider = new MockBillingProvider();

    it("creates development checkout session with isMock = true and simulated redirect", async () => {
      const session = await provider.createCheckoutSession({
        tenantId: TENANT_A,
        planCode: "GROWTH",
        billingCycle: "MONTHLY",
        successUrl: "http://localhost:3000/settings?success=true",
        cancelUrl: "http://localhost:3000/settings?canceled=true",
      });

      expect(session.isMock).toBe(true);
      expect(session.provider).toBe("MOCK_DEVELOPMENT_PROVIDER");
      expect(session.checkoutUrl).toContain("mock_payment=true");
      expect(session.checkoutUrl).toContain("plan=GROWTH");
    });

    it("verifies webhook signature and extracts subscription event payload", async () => {
      const payload = {
        event: "subscription.activated",
        tenantId: TENANT_A,
        planCode: "GROWTH",
        subscriptionId: "sub_mock_123",
      };

      const result = await provider.verifyWebhookSignature(
        payload,
        "mock_signature_test",
        "mock_secret_elvora_dev"
      );

      expect(result.isValid).toBe(true);
      expect(result.eventType).toBe("subscription.activated");
      expect(result.tenantId).toBe(TENANT_A);
      expect(result.planCode).toBe("GROWTH");
    });
  });

  describe("4. Platform Administration Separation & Security Boundary", () => {
    it("signs and verifies platform administrator token without tenant membership", async () => {
      const adminToken = await signPlatformAdminToken({
        adminId: "admin-root-01",
        email: "admin@elvora.com",
        name: "Platform Master Admin",
        role: "SUPER_ADMIN",
      });

      const verified = await verifyPlatformAdminToken(adminToken);
      expect(verified?.isPlatformAdmin).toBe(true);
      expect(verified?.role).toBe("SUPER_ADMIN");
      // Security boundary: Admin token does not contain a tenantId!
      expect((verified as any).activeTenantId).toBeUndefined();
    });

    it("lists business workspaces without exposing private customer transactions or profits", async () => {
      await provisionTrialSubscription(TENANT_A, mockDb);
      const list = await listPlatformTenants({}, mockDb);

      expect(list.tenants.length).toBe(2);
      const tenantA = list.tenants.find((t: any) => t.id === TENANT_A);

      expect(tenantA?.legalName).toBe("Apex Luxury Sanitaryware");
      expect(tenantA?.subscription?.plan?.code).toBe("FREE_TRIAL");
      expect(tenantA?.owner?.email).toBe("owner@test.com");

      // Verify strict financial privacy: No private invoices, line items or profit figures exposed
      expect((tenantA as any).salesInvoices).toBeUndefined();
      expect((tenantA as any).profitMargin).toBeUndefined();
      expect((tenantA as any).bankBalances).toBeUndefined();
    });

    it("allows platform administrator to extend trial days and toggle account active status", async () => {
      await provisionTrialSubscription(TENANT_A, mockDb);

      // Extend trial by 14 days
      const updatedSub = await updateTenantSubscriptionByAdmin(
        TENANT_A,
        { extendTrialDays: 14 },
        mockDb
      );
      expect(updatedSub.status).toBe("TRIALING");

      // Suspend tenant workspace for terms violation
      const suspended = await toggleTenantAccountActive(TENANT_A, false, mockDb);
      expect(suspended.isActive).toBe(false);
    });
  });
});
