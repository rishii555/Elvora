import prisma from "@/lib/db/prisma";
import { PlanCode } from "@/lib/billing/types";

export interface ListPlatformTenantsOptions {
  search?: string;
  status?: string;
  planCode?: string;
  page?: number;
  limit?: number;
}

/**
 * Platform Administration Service.
 *
 * PRIVACY GUARANTEE:
 * Does not expose shop private financial transactions (sales invoices, customer balances, profits).
 * Exposes only account status, subscription tiers, plan quotas, and support metadata.
 */
export async function listPlatformTenants(
  options: ListPlatformTenantsOptions = {},
  client: any = prisma
) {
  const { search, status, planCode, page = 1, limit = 50 } = options;

  const where: any = {};

  if (search) {
    where.OR = [
      { legalName: { contains: search, mode: "insensitive" } },
      { tradeName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status && status !== "ALL") {
    where.subscription = { status };
  }

  if (planCode && planCode !== "ALL") {
    where.subscription = {
      ...where.subscription,
      plan: { code: planCode },
    };
  }

  const [totalCount, tenants] = await Promise.all([
    client.tenant.count({ where }),
    client.tenant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        gstin: true,
        stateCode: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        subscription: {
          select: {
            id: true,
            status: true,
            billingProvider: true,
            trialEndsAt: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            plan: {
              select: {
                id: true,
                code: true,
                name: true,
                priceMonthly: true,
              },
            },
          },
        },
        members: {
          where: { role: "OWNER" },
          take: 1,
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    tenants: tenants.map((t: any) => ({
      id: t.id,
      legalName: t.legalName,
      tradeName: t.tradeName,
      gstin: t.gstin || "Unregistered",
      stateCode: t.stateCode,
      phone: t.phone,
      email: t.email,
      isActive: t.isActive,
      createdAt: t.createdAt,
      owner: t.members[0]?.user || { name: "Owner", email: "—" },
      subscription: t.subscription || {
        status: "ACTIVE",
        plan: { code: "ENTERPRISE", name: "Enterprise Business", priceMonthly: 0 },
      },
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

/**
 * Updates a tenant's subscription status, extends trial, or alters plan tier.
 */
export async function updateTenantSubscriptionByAdmin(
  tenantId: string,
  data: {
    status?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" | "GRACE_PERIOD";
    planCode?: PlanCode;
    extendTrialDays?: number;
  },
  client: any = prisma
) {
  let sub = await client.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  const updateData: any = {};

  if (data.status) {
    updateData.status = data.status;
  }

  if (data.planCode) {
    const plan = await client.subscriptionPlan.findUnique({
      where: { code: data.planCode },
    });
    if (!plan) throw new Error(`Plan code '${data.planCode}' not found`);
    updateData.planId = plan.id;
  }

  if (data.extendTrialDays && data.extendTrialDays > 0) {
    const baseDate = sub?.trialEndsAt && new Date(sub.trialEndsAt) > new Date()
      ? new Date(sub.trialEndsAt)
      : new Date();
    updateData.trialEndsAt = new Date(baseDate.getTime() + data.extendTrialDays * 24 * 60 * 60 * 1000);
    updateData.status = "TRIALING";
  }

  if (!sub) {
    const defaultPlan =
      (await client.subscriptionPlan.findUnique({
        where: { code: updateData.planCode || "ENTERPRISE" },
      })) ||
      (await client.subscriptionPlan.findFirst({
        where: { isActive: true },
      }));

    if (!defaultPlan) throw new Error("No subscription plan available");

    sub = await client.subscription.create({
      data: {
        tenantId,
        planId: updateData.planId || defaultPlan.id,
        status: updateData.status || (updateData.trialEndsAt ? "TRIALING" : "ACTIVE"),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        trialEndsAt: updateData.trialEndsAt || null,
      },
      include: { plan: true },
    });
    return sub;
  }

  return await client.subscription.update({
    where: { tenantId },
    data: updateData,
    include: { plan: true },
  });
}

/**
 * Suspends or reactivates a tenant workspace for terms or abuse enforcement.
 */
export async function toggleTenantAccountActive(
  tenantId: string,
  isActive: boolean,
  client: any = prisma
) {
  return await client.tenant.update({
    where: { id: tenantId },
    data: { isActive },
  });
}

/**
 * Platform metrics: overall tenant registrations and subscription health.
 */
export async function getPlatformStats(client: any = prisma) {
  const [totalTenants, activeSubscriptions, trialingCount, suspendedCount] = await Promise.all([
    client.tenant.count(),
    client.subscription.count({ where: { status: "ACTIVE" } }),
    client.subscription.count({ where: { status: "TRIALING" } }),
    client.tenant.count({ where: { isActive: false } }),
  ]);

  return {
    totalTenants,
    activePaidSubscriptions: activeSubscriptions,
    trialingSubscriptions: trialingCount,
    suspendedTenants: suspendedCount,
  };
}
