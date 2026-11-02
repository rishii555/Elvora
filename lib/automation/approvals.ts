import prisma from "@/lib/db/prisma";
import { createNotification } from "./notifications";
import { publishAutomationEvent } from "./events";
import { hasPermission } from "@/lib/auth/permissions";

export interface RequestApprovalParams {
  tenantId: string;
  workflowType: "PURCHASE_ORDER" | "EXPENSE" | "PAYMENT" | "STOCK_ADJUSTMENT" | "JOURNAL_ENTRY";
  entityType: string;
  entityId: string;
  entityNumber?: string;
  amount?: number;
  requesterId: string;
  requesterName?: string;
  metadata?: Record<string, any>;
}

export interface ProcessDecisionParams {
  tenantId: string;
  approvalId: string;
  approverId: string;
  approverName?: string;
  approverRole: "OWNER" | "MANAGER" | "ACCOUNTANT" | "BILLER";
  decision: "APPROVED" | "REJECTED";
  notes?: string;
  rejectionReason?: string;
}

/**
 * Creates an approval request and notifies designated approvers.
 */
export async function requestWorkflowApproval(
  params: RequestApprovalParams,
  client: any = prisma
) {
  const {
    tenantId,
    workflowType,
    entityType,
    entityId,
    entityNumber,
    amount,
    requesterId,
    requesterName,
    metadata,
  } = params;

  // Check if an active pending approval already exists for this entity
  const existing = await client.workflowApproval.findFirst({
    where: {
      tenantId,
      workflowType,
      entityId,
      status: "PENDING",
    },
  });

  if (existing) {
    return { isDuplicate: true, approval: existing };
  }

  const approval = await client.workflowApproval.create({
    data: {
      tenantId,
      workflowType,
      entityType,
      entityId,
      entityNumber: entityNumber || null,
      amount: amount || null,
      requesterId,
      requesterName: requesterName || "User",
      status: "PENDING",
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });

  // Notify managers and owners about pending approval
  await createNotification(
    {
      tenantId,
      title: `Approval Required: ${workflowType.replace(/_/g, " ")}`,
      message: `${requesterName || "A user"} submitted ${workflowType.replace(/_/g, " ")} (${entityNumber || entityId}) for ₹${(amount || 0).toFixed(2)}.`,
      category: "APPROVALS",
      priority: "HIGH",
      linkUrl: `/automations`,
      metadata: { approvalId: approval.id, workflowType, entityId },
    },
    client
  );

  await publishAutomationEvent(
    {
      tenantId,
      eventType: "APPROVAL_REQUESTED",
      entityType: "WORKFLOW_APPROVAL",
      entityId: approval.id,
      payload: {
        approvalId: approval.id,
        workflowType,
        entityId,
        entityNumber,
        amount,
        requesterId,
      },
    },
    client
  );

  return { isDuplicate: false, approval };
}

/**
 * Processes an approval decision (APPROVE or REJECT) with segregation of duties checks.
 */
export async function processApprovalDecision(
  params: ProcessDecisionParams,
  client: any = prisma
) {
  const {
    tenantId,
    approvalId,
    approverId,
    approverName,
    approverRole,
    decision,
    notes,
    rejectionReason,
  } = params;

  // 1. Role permission check: must have APPROVE_WORKFLOWS
  if (!hasPermission(approverRole, "APPROVE_WORKFLOWS")) {
    throw new Error(
      `Access Denied: Role '${approverRole}' does not possess 'APPROVE_WORKFLOWS' permission.`
    );
  }

  // 2. Fetch approval request
  const approval = await client.workflowApproval.findFirst({
    where: { id: approvalId, tenantId },
  });

  if (!approval) {
    throw new Error("Approval request not found.");
  }

  if (approval.status !== "PENDING") {
    throw new Error(`Approval request has already been ${approval.status.toLowerCase()}.`);
  }

  // 3. Segregation of duties: Requesters cannot approve their own requests
  if (approval.requesterId === approverId) {
    throw new Error(
      "Segregation of duties violation: You cannot approve your own approval request."
    );
  }

  const now = new Date();

  // 4. Update approval record
  const updated = await client.workflowApproval.update({
    where: { id: approval.id },
    data: {
      status: decision,
      approverId,
      approverName: approverName || "Approver",
      approvalNotes: notes || null,
      rejectionReason: decision === "REJECTED" ? rejectionReason || "Rejected by reviewer" : null,
      approvedAt: decision === "APPROVED" ? now : null,
      rejectedAt: decision === "REJECTED" ? now : null,
    },
  });

  // 5. Notify the requester
  await createNotification(
    {
      tenantId,
      userId: approval.requesterId,
      title: `Approval ${decision}: ${approval.workflowType.replace(/_/g, " ")}`,
      message: `Your request (${approval.entityNumber || approval.entityId}) was ${decision.toLowerCase()} by ${approverName || "reviewer"}.${decision === "REJECTED" ? ` Reason: ${rejectionReason || "N/A"}` : ""}`,
      category: "APPROVALS",
      priority: decision === "APPROVED" ? "NORMAL" : "HIGH",
      linkUrl: `/automations`,
      metadata: { approvalId: approval.id, status: decision },
    },
    client
  );

  // 6. Emit event
  await publishAutomationEvent(
    {
      tenantId,
      eventType: "APPROVAL_COMPLETED",
      entityType: "WORKFLOW_APPROVAL",
      entityId: approval.id,
      payload: {
        approvalId: approval.id,
        workflowType: approval.workflowType,
        entityId: approval.entityId,
        decision,
        approverId,
      },
    },
    client
  );

  return updated;
}

/**
 * Lists approval requests with filtering.
 */
export async function listApprovals(
  tenantId: string,
  options?: {
    status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    workflowType?: string;
    requesterId?: string;
    page?: number;
    limit?: number;
  },
  client: any = prisma
) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = { tenantId };
  if (options?.status) where.status = options.status;
  if (options?.workflowType) where.workflowType = options.workflowType;
  if (options?.requesterId) where.requesterId = options.requesterId;

  const [items, total] = await Promise.all([
    client.workflowApproval.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    client.workflowApproval.count({ where }),
  ]);

  return {
    items: items.map((a: any) => ({
      ...a,
      metadata: a.metadataJson ? JSON.parse(a.metadataJson) : null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
