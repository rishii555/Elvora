import prisma from "@/lib/db/prisma";
import { PlanCode, PlanLimitExceededError } from "./types";

export interface SystemPlanDef {
  code: PlanCode;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxProducts: number;
  maxInvoicesPerMonth: number;
  maxStaffMembers: number;
  hasAdvancedReports: boolean;
  hasAuditLogs: boolean;
  hasMultiLocation: boolean;
}

export const SYSTEM_PLANS: SystemPlanDef[] = [
  {
    code: "FREE_TRIAL",
    name: "14-Day Full Access Trial",
    description: "Experience all pro features of Elvora risk-free for 14 days.",
    priceMonthly: 0,
    priceYearly: 0,
    maxProducts: 100,
    maxInvoicesPerMonth: 50,
    maxStaffMembers: 2,
    hasAdvancedReports: true,
    hasAuditLogs: true,
    hasMultiLocation: false,
  },
  {
    code: "STARTER",
    name: "Starter Business",
    description: "Ideal for retail shops, independent counters and small distribution agencies.",
    priceMonthly: 499,
    priceYearly: 4990,
    maxProducts: 500,
    maxInvoicesPerMonth: 300,
    maxStaffMembers: 3,
    hasAdvancedReports: false,
    hasAuditLogs: false,
    hasMultiLocation: false,
  },
  {
    code: "GROWTH",
    name: "Growth Professional",
    description: "Engineered for scaling wholesalers, retail chains, and high-volume commerce outlets.",
    priceMonthly: 1499,
    priceYearly: 14990,
    maxProducts: 5000,
    maxInvoicesPerMonth: -1, // Unlimited
    maxStaffMembers: 10,
    hasAdvancedReports: true,
    hasAuditLogs: true,
    hasMultiLocation: true,
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise Multi-Branch",
    description: "Complete control for large corporate distributors, factory depots and chains.",
    priceMonthly: 3999,
    priceYearly: 39990,
    maxProducts: -1, // Unlimited
    maxInvoicesPerMonth: -1, // Unlimited
    maxStaffMembers: 50,
    hasAdvancedReports: true,
    hasAuditLogs: true,
    hasMultiLocation: true,
  },
];

let defaultPlansEnsured = false;

/**
 * Ensures system plans exist in the database.
 */
export async function ensureDefaultPlans(client: any = prisma) {
  if (defaultPlansEnsured && client === prisma) {
    return;
  }
  const existing = await client.subscriptionPlan.findMany();
  const existingSet = new Set(existing.map((p: any) => p.code));

  for (const plan of SYSTEM_PLANS) {
    if (!existingSet.has(plan.code)) {
      await client.subscriptionPlan.create({
        data: {
          code: plan.code,
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          maxProducts: plan.maxProducts,
          maxInvoicesPerMonth: plan.maxInvoicesPerMonth,
          maxStaffMembers: plan.maxStaffMembers,
          hasAdvancedReports: plan.hasAdvancedReports,
          hasAuditLogs: plan.hasAuditLogs,
          hasMultiLocation: plan.hasMultiLocation,
          isActive: true,
        },
      });
    }
  }

  if (client === prisma) {
    defaultPlansEnsured = true;
  }
  return existing;
}

/**
 * Provisions a 14-day free trial subscription for a newly onboarded tenant.
 */
export async function provisionTrialSubscription(tenantId: string, client: any = prisma) {
  await ensureDefaultPlans(client);

  const trialPlan = await client.subscriptionPlan.findUnique({
    where: { code: "FREE_TRIAL" },
  });

  if (!trialPlan) {
    throw new Error("Free Trial plan could not be located in database");
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days later

  // Upsert subscription
  const sub = await client.subscription.upsert({
    where: { tenantId },
    update: {
      planId: trialPlan.id,
      status: "TRIALING",
      billingProvider: "MOCK",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      trialEndsAt,
    },
    create: {
      tenantId,
      planId: trialPlan.id,
      status: "TRIALING",
      billingProvider: "MOCK",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      trialEndsAt,
    },
    include: {
      plan: true,
    },
  });

  // Provision usage tracker
  await client.tenantUsage.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      monthlyInvoiceCount: 0,
      lastResetDate: now,
    },
  });

  return sub;
}

/**
 * Retrieves the tenant's current subscription, active limits and trial status.
 */
export async function getTenantSubscription(tenantId: string, client: any = prisma) {
  let sub = await client.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  if (!sub) {
    // Lazily provision trial if not present
    sub = await provisionTrialSubscription(tenantId, client);
  }

  const now = new Date();
  let effectiveStatus = sub.status;

  // Check if trial has expired
  if (sub.status === "TRIALING" && sub.trialEndsAt && now > new Date(sub.trialEndsAt)) {
    effectiveStatus = "EXPIRED";
  }

  // Check if period has ended on paid plan
  if (sub.status === "ACTIVE" && now > new Date(sub.currentPeriodEnd)) {
    effectiveStatus = "GRACE_PERIOD";
  }

  const trialDaysRemaining = sub.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    subscription: sub,
    plan: sub.plan,
    status: effectiveStatus,
    isTrialing: effectiveStatus === "TRIALING",
    isExpired: effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELED",
    trialDaysRemaining,
    limits: {
      maxProducts: sub.plan.maxProducts,
      maxInvoicesPerMonth: sub.plan.maxInvoicesPerMonth,
      maxStaffMembers: sub.plan.maxStaffMembers,
      hasAdvancedReports: sub.plan.hasAdvancedReports,
      hasAuditLogs: sub.plan.hasAuditLogs,
      hasMultiLocation: sub.plan.hasMultiLocation,
    },
  };
}

/**
 * Server-Side Plan Limit Enforcement.
 * Checks whether the tenant can perform an operation based on their plan limits.
 *
 * Safeguard Guarantee:
 * - If subscription expires, existing shop data remains protected and readable.
 * - Creating new resources beyond allowed quotas throws PlanLimitExceededError.
 */
export async function checkPlanLimit(
  tenantId: string,
  limitType: "INVOICE_CREATION" | "PRODUCT_CREATION" | "STAFF_MEMBER" | "ADVANCED_REPORTS",
  client: any = prisma
) {
  const { plan, status, limits } = await getTenantSubscription(tenantId, client);

  // If expired, allow read operations but block new billings/products if beyond free threshold
  if (status === "EXPIRED" || status === "CANCELED") {
    throw new PlanLimitExceededError(
      "new creation",
      0,
      0,
      `${plan.name} (Expired). Your historical data is safe, but subscription renewal is required to issue new invoices or add items`
    );
  }

  switch (limitType) {
    case "INVOICE_CREATION": {
      if (limits.maxInvoicesPerMonth === -1) return true; // Unlimited
      const usage = await client.tenantUsage.findUnique({ where: { tenantId } });
      const currentCount = usage?.monthlyInvoiceCount || 0;
      if (currentCount >= limits.maxInvoicesPerMonth) {
        throw new PlanLimitExceededError(
          "invoices this month",
          currentCount,
          limits.maxInvoicesPerMonth,
          plan.name
        );
      }
      return true;
    }

    case "PRODUCT_CREATION": {
      if (limits.maxProducts === -1) return true; // Unlimited
      const productCount = await client.product.count({ where: { tenantId } });
      if (productCount >= limits.maxProducts) {
        throw new PlanLimitExceededError(
          "products",
          productCount,
          limits.maxProducts,
          plan.name
        );
      }
      return true;
    }

    case "STAFF_MEMBER": {
      const memberCount = await client.tenantMember.count({ where: { tenantId } });
      if (memberCount >= limits.maxStaffMembers) {
        throw new PlanLimitExceededError(
          "staff members",
          memberCount,
          limits.maxStaffMembers,
          plan.name
        );
      }
      return true;
    }

    case "ADVANCED_REPORTS": {
      if (!limits.hasAdvancedReports) {
        throw new PlanLimitExceededError(
          "access to Advanced Reports & Tax Analytics",
          0,
          0,
          plan.name
        );
      }
      return true;
    }

    default:
      return true;
  }
}

/**
 * Upgrades or renews a tenant subscription.
 */
export async function upgradeTenantSubscription(
  tenantId: string,
  planCode: PlanCode,
  billingProvider = "MOCK",
  providerSubscriptionId?: string,
  client: any = prisma
) {
  const plan = await client.subscriptionPlan.findUnique({
    where: { code: planCode },
  });

  if (!plan) {
    throw new Error(`Plan code '${planCode}' not recognized`);
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days period

  return await client.subscription.upsert({
    where: { tenantId },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      billingProvider,
      providerSubscriptionId: providerSubscriptionId || `sub_${planCode.toLowerCase()}_${Date.now()}`,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
    },
    create: {
      tenantId,
      planId: plan.id,
      status: "ACTIVE",
      billingProvider,
      providerSubscriptionId: providerSubscriptionId || `sub_${planCode.toLowerCase()}_${Date.now()}`,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
    },
    include: {
      plan: true,
    },
  });
}
