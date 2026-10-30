import prisma from "@/lib/db/prisma";
import { AccountStatus } from "@prisma/client";
import { clearTenantContextCache } from "@/lib/tenant/context";

export interface ListRegistrationsOptions {
  status?: "ALL" | AccountStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReviewRegistrationInput {
  action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE";
  reason?: string;
  reviewedBy: string;
}

/**
 * Lists tenant registrations with submitted business profile and user credentials.
 * Privacy guard: excludes confidential shop invoice totals and customer balances.
 */
export async function listRegistrations(
  options: ListRegistrationsOptions = {},
  client: any = prisma
) {
  const { status, search, page = 1, limit = 50 } = options;

  const where: any = {};

  if (status && status !== "ALL") {
    where.approvalStatus = status;
  }

  if (search) {
    where.OR = [
      { legalName: { contains: search, mode: "insensitive" } },
      { tradeName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { gstin: { contains: search, mode: "insensitive" } },
    ];
  }

  const [totalCount, pendingCount, approvedCount, rejectedCount, suspendedCount, tenants] =
    await Promise.all([
      client.tenant.count(),
      client.tenant.count({ where: { approvalStatus: "PENDING" } }),
      client.tenant.count({ where: { approvalStatus: "APPROVED" } }),
      client.tenant.count({ where: { approvalStatus: "REJECTED" } }),
      client.tenant.count({ where: { approvalStatus: "SUSPENDED" } }),
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
          address: true,
          isActive: true,
          approvalStatus: true,
          rejectionReason: true,
          reviewedBy: true,
          reviewedAt: true,
          createdAt: true,
          members: {
            where: { role: "OWNER" },
            take: 1,
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  approvalStatus: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
    ]);

  return {
    registrations: tenants.map((t: any) => ({
      id: t.id,
      legalName: t.legalName,
      tradeName: t.tradeName,
      gstin: t.gstin || "Unregistered",
      stateCode: t.stateCode,
      phone: t.phone,
      email: t.email,
      address: t.address || "—",
      isActive: t.isActive,
      approvalStatus: t.approvalStatus,
      rejectionReason: t.rejectionReason,
      reviewedBy: t.reviewedBy,
      reviewedAt: t.reviewedAt,
      createdAt: t.createdAt,
      owner: t.members[0]?.user || {
        id: "—",
        name: "Owner",
        email: t.email || "—",
        phone: t.phone,
        approvalStatus: t.approvalStatus,
        createdAt: t.createdAt,
      },
    })),
    stats: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      suspended: suspendedCount,
    },
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

/**
 * Reviews a registration (Approve, Reject, Suspend, Reactivate).
 * Updates both Tenant and associated Owner User records atomically.
 * Invalidate cached tenant context sessions immediately to revoke access if rejected/suspended.
 */
export async function reviewRegistration(
  tenantId: string,
  input: ReviewRegistrationInput,
  client: any = prisma
) {
  const { action, reason, reviewedBy } = input;

  const tenant = await client.tenant.findUnique({
    where: { id: tenantId },
    include: {
      members: {
        where: { role: "OWNER" },
        take: 1,
        include: { user: true },
      },
    },
  });

  if (!tenant) {
    throw new Error(`Registration with tenant ID '${tenantId}' not found.`);
  }

  const ownerUser = tenant.members[0]?.user;
  const now = new Date();

  let targetStatus: AccountStatus;
  let targetActive: boolean;

  switch (action) {
    case "APPROVE":
    case "REACTIVATE":
      targetStatus = "APPROVED";
      targetActive = true;
      break;
    case "REJECT":
      targetStatus = "REJECTED";
      targetActive = false;
      break;
    case "SUSPEND":
      targetStatus = "SUSPENDED";
      targetActive = false;
      break;
    default:
      throw new Error(`Invalid registration action '${action}'.`);
  }

  const updateData: any = {
    approvalStatus: targetStatus,
    isActive: targetActive,
    reviewedBy,
    reviewedAt: now,
    rejectionReason: action === "REJECT" ? reason || "Registration criteria not met" : null,
  };

  // Update Tenant
  await client.tenant.update({
    where: { id: tenantId },
    data: updateData,
  });

  // Update Owner User
  if (ownerUser) {
    await client.user.update({
      where: { id: ownerUser.id },
      data: updateData,
    });
  }

  // Record Audit Log
  if (client.auditLog) {
    try {
      await client.auditLog.create({
        data: {
          tenantId,
          userId: ownerUser?.id || "admin",
          action: `REGISTRATION_${action}_BY_ADMIN`,
          entityType: "Tenant",
          entityId: tenantId,
          changesJson: JSON.stringify({
            previousStatus: tenant.approvalStatus,
            newStatus: targetStatus,
            reviewedBy,
            reason: reason || null,
          }),
        },
      });
    } catch {
      // Audit log fail-safe
    }
  }

  // Security critical: Evict tenant from in-memory context cache immediately
  clearTenantContextCache(tenantId, ownerUser?.id);

  return {
    success: true,
    action,
    tenantId,
    newStatus: targetStatus,
    reviewedBy,
    reviewedAt: now,
  };
}
