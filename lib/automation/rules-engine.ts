import prisma from "@/lib/db/prisma";
import {
  CreateAutomationRuleInput,
  RuleConditionGroup,
  UpdateAutomationRuleInput,
} from "./types";
import { createNotification } from "./notifications";

/**
 * Safely resolves a nested property from an object using a dot-delimited path.
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") return undefined;
  return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

/**
 * Evaluates a single rule condition against an event payload.
 */
function evaluateCondition(condition: { field: string; operator: string; value?: any }, payload: any): boolean {
  const actual = getNestedValue(payload, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case "eq":
      return actual == expected;
    case "neq":
      return actual != expected;
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "contains":
      if (typeof actual === "string") {
        return actual.toLowerCase().includes(String(expected).toLowerCase());
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected);
      }
      return false;
    case "in":
      if (Array.isArray(expected)) {
        return expected.includes(actual);
      }
      return false;
    default:
      return false;
  }
}

/**
 * Safely evaluates a condition group (AND / OR) without any code execution.
 */
export function evaluateRuleConditions(conditions: RuleConditionGroup | null | undefined, payload: any): boolean {
  if (!conditions || !conditions.conditions || conditions.conditions.length === 0) {
    return true; // No conditions = unconditionally matches
  }

  const { logic = "AND", conditions: list } = conditions;

  if (logic === "AND") {
    return list.every((c) => evaluateCondition(c, payload));
  } else {
    return list.some((c) => evaluateCondition(c, payload));
  }
}

/**
 * Executes the configured action for an automation rule.
 */
export async function executeAutomationAction(
  tenantId: string,
  actionType: string,
  actionConfig: any,
  payload: any,
  client: any = prisma
) {
  switch (actionType) {
    case "SEND_NOTIFICATION": {
      // Interpolate placeholders in title/message if provided
      let title = actionConfig.title || "Automation Alert";
      let message = actionConfig.message || "An automated action was triggered.";

      for (const [key, val] of Object.entries(payload)) {
        if (typeof val === "string" || typeof val === "number") {
          title = title.replace(new RegExp(`{${key}}`, "g"), String(val));
          message = message.replace(new RegExp(`{${key}}`, "g"), String(val));
        }
      }

      await createNotification(
        {
          tenantId,
          userId: actionConfig.targetUserId || null,
          title,
          message,
          category: actionConfig.category || "AUTOMATION",
          priority: actionConfig.priority || "NORMAL",
          linkUrl: actionConfig.linkUrl || null,
          metadata: { payload, actionConfig },
        },
        client
      );
      return { success: true, action: "SEND_NOTIFICATION" };
    }

    case "CREATE_REMINDER": {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (actionConfig.daysFromNow || 1));

      await client.followUpTask.create({
        data: {
          tenantId,
          targetType: actionConfig.targetType || "CUSTOMER",
          customerId: payload.customerId || null,
          supplierId: payload.supplierId || null,
          invoiceId: payload.invoiceId || null,
          title: actionConfig.title || `Follow up on ${payload.invoiceNumber || "Record"}`,
          notes: actionConfig.notes || `Automated follow-up created from rule.`,
          dueDate,
          priority: actionConfig.priority || "NORMAL",
          status: "PENDING",
        },
      });
      return { success: true, action: "CREATE_REMINDER" };
    }

    case "REQUEST_APPROVAL": {
      await client.workflowApproval.create({
        data: {
          tenantId,
          workflowType: actionConfig.workflowType || "EXPENSE",
          entityType: payload.entityType || "RECORD",
          entityId: payload.id || payload.entityId || "UNKNOWN",
          entityNumber: payload.invoiceNumber || payload.billNumber || null,
          amount: payload.totalAmount || payload.amount || 0,
          requesterId: payload.userId || payload.requesterId || "SYSTEM",
          requesterName: payload.userName || "System Automation",
          status: "PENDING",
          metadataJson: JSON.stringify({ payload, actionConfig }),
        },
      });
      return { success: true, action: "REQUEST_APPROVAL" };
    }

    case "CREATE_PURCHASE_DRAFT": {
      await createNotification(
        {
          tenantId,
          title: `Smart Reorder Suggestion: ${payload.productName || "Product"}`,
          message: `Stock is at ${payload.currentStock || 0}. Reorder recommended.`,
          category: "INVENTORY",
          priority: "HIGH",
          linkUrl: `/inventory`,
          metadata: payload,
        },
        client
      );
      return { success: true, action: "CREATE_PURCHASE_DRAFT" };
    }

    default:
      return { success: true, action: "NOOP" };
  }
}

/**
 * Creates an automation rule with tenant validation.
 */
export async function createAutomationRule(
  tenantId: string,
  userId: string,
  input: CreateAutomationRuleInput,
  client: any = prisma
) {
  return await client.automationRule.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description || null,
      triggerType: input.triggerType,
      eventType: input.eventType || null,
      conditionsJson: input.conditions ? JSON.stringify(input.conditions) : null,
      actionType: input.actionType,
      actionConfigJson: JSON.stringify(input.actionConfig),
      isEnabled: input.isEnabled ?? true,
      createdById: userId,
    },
  });
}

/**
 * Lists automation rules for a tenant.
 */
export async function listAutomationRules(
  tenantId: string,
  client: any = prisma
) {
  const rules = await client.automationRule.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { executions: true },
      },
    },
  });

  return rules.map((r: any) => ({
    ...r,
    conditions: r.conditionsJson ? JSON.parse(r.conditionsJson) : null,
    actionConfig: r.actionConfigJson ? JSON.parse(r.actionConfigJson) : {},
  }));
}

/**
 * Updates an automation rule.
 */
export async function updateAutomationRule(
  tenantId: string,
  ruleId: string,
  input: UpdateAutomationRuleInput,
  client: any = prisma
) {
  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.triggerType !== undefined) data.triggerType = input.triggerType;
  if (input.eventType !== undefined) data.eventType = input.eventType;
  if (input.conditions !== undefined) data.conditionsJson = JSON.stringify(input.conditions);
  if (input.actionType !== undefined) data.actionType = input.actionType;
  if (input.actionConfig !== undefined) data.actionConfigJson = JSON.stringify(input.actionConfig);
  if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;

  return await client.automationRule.updateMany({
    where: { id: ruleId, tenantId },
    data,
  });
}

/**
 * Deletes an automation rule.
 */
export async function deleteAutomationRule(
  tenantId: string,
  ruleId: string,
  client: any = prisma
) {
  return await client.automationRule.deleteMany({
    where: { id: ruleId, tenantId },
  });
}

/**
 * Records an execution attempt in the database.
 */
export async function recordAutomationExecution(
  params: {
    tenantId: string;
    ruleId?: string | null;
    triggerType: string;
    eventType?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    status: "SUCCESS" | "FAILED" | "SKIPPED";
    errorMessage?: string | null;
    executionLog?: string | null;
    durationMs?: number;
  },
  client: any = prisma
) {
  return await client.automationExecution.create({
    data: {
      tenantId: params.tenantId,
      ruleId: params.ruleId || null,
      triggerType: params.triggerType,
      eventType: params.eventType || null,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      status: params.status,
      errorMessage: params.errorMessage || null,
      executionLog: params.executionLog || null,
      durationMs: params.durationMs || 0,
      executedAt: new Date(),
    },
  });
}

/**
 * Lists execution history with pagination.
 */
export async function listAutomationExecutions(
  tenantId: string,
  options?: {
    status?: string;
    ruleId?: string;
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
  if (options?.ruleId) where.ruleId = options.ruleId;

  const [items, total] = await Promise.all([
    client.automationExecution.findMany({
      where,
      orderBy: { executedAt: "desc" },
      skip,
      take: limit,
      include: {
        rule: { select: { name: true } },
      },
    }),
    client.automationExecution.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
