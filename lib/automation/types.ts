import { z } from "zod";

// ---------------------------------------------------------------------------
// 1. Event & Trigger Definitions
// ---------------------------------------------------------------------------

export const AutomationEventTypeEnum = z.enum([
  "INVOICE_CREATED",
  "INVOICE_DUE_SOON",
  "INVOICE_OVERDUE",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PURCHASE_CREATED",
  "EXPENSE_CREATED",
  "STOCK_LOW",
  "STOCK_OUT",
  "TRANSFER_COMPLETED",
  "CUSTOMER_CREATED",
  "SUPPLIER_CREATED",
  "APPROVAL_REQUESTED",
  "APPROVAL_COMPLETED",
  "RECURRING_INVOICE_GENERATED",
  "RECURRING_EXPENSE_GENERATED",
  "SCHEDULED_REPORT_GENERATED",
]);

export type AutomationEventType = z.infer<typeof AutomationEventTypeEnum>;

export const AutomationTriggerTypeEnum = z.enum(["EVENT", "SCHEDULE"]);
export type AutomationTriggerType = z.infer<typeof AutomationTriggerTypeEnum>;

export const AutomationActionTypeEnum = z.enum([
  "SEND_NOTIFICATION",
  "CREATE_REMINDER",
  "REQUEST_APPROVAL",
  "EXECUTE_RECURRING",
  "CREATE_PURCHASE_DRAFT",
  "GENERATE_REPORT",
]);
export type AutomationActionType = z.infer<typeof AutomationActionTypeEnum>;

// ---------------------------------------------------------------------------
// 2. Condition Evaluation Definitions
// ---------------------------------------------------------------------------

export const ConditionOperatorEnum = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "in",
]);
export type ConditionOperator = z.infer<typeof ConditionOperatorEnum>;

export const RuleConditionSchema = z.object({
  field: z.string(),
  operator: ConditionOperatorEnum,
  value: z.any(),
});
export type RuleCondition = z.infer<typeof RuleConditionSchema>;

export const RuleConditionGroupSchema = z.object({
  logic: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(RuleConditionSchema),
});
export type RuleConditionGroup = z.infer<typeof RuleConditionGroupSchema>;

// ---------------------------------------------------------------------------
// 3. Action Configurations
// ---------------------------------------------------------------------------

export const NotificationActionConfigSchema = z.object({
  title: z.string(),
  message: z.string(),
  category: z.enum([
    "PAYMENTS",
    "INVOICES",
    "INVENTORY",
    "APPROVALS",
    "EXPENSES",
    "PURCHASES",
    "REPORTS",
    "AUTOMATION",
  ]).default("AUTOMATION"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  linkUrl: z.string().optional(),
  targetRole: z.enum(["OWNER", "MANAGER", "ACCOUNTANT", "BILLER"]).optional(),
  targetUserId: z.string().optional(),
});
export type NotificationActionConfig = z.infer<typeof NotificationActionConfigSchema>;

export const ApprovalActionConfigSchema = z.object({
  workflowType: z.enum([
    "PURCHASE_ORDER",
    "EXPENSE",
    "PAYMENT",
    "STOCK_ADJUSTMENT",
    "JOURNAL_ENTRY",
  ]),
  thresholdAmount: z.number().min(0).default(0),
  requiredRole: z.enum(["OWNER", "MANAGER", "ACCOUNTANT"]).default("MANAGER"),
});
export type ApprovalActionConfig = z.infer<typeof ApprovalActionConfigSchema>;

// ---------------------------------------------------------------------------
// 4. Automation Rule Schema
// ---------------------------------------------------------------------------

export const CreateAutomationRuleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(300).optional(),
  triggerType: AutomationTriggerTypeEnum.default("EVENT"),
  eventType: AutomationEventTypeEnum.optional(),
  conditions: RuleConditionGroupSchema.optional(),
  actionType: AutomationActionTypeEnum.default("SEND_NOTIFICATION"),
  actionConfig: z.record(z.any()),
  isEnabled: z.boolean().optional().default(true),
});
export type CreateAutomationRuleInput = z.input<typeof CreateAutomationRuleSchema>;

export const UpdateAutomationRuleSchema = CreateAutomationRuleSchema.partial();
export type UpdateAutomationRuleInput = z.infer<typeof UpdateAutomationRuleSchema>;

// ---------------------------------------------------------------------------
// 5. Follow-Up Task Schema
// ---------------------------------------------------------------------------

export const CreateFollowUpTaskSchema = z.object({
  targetType: z.enum(["CUSTOMER", "SUPPLIER", "INVOICE", "PURCHASE"]).default("CUSTOMER"),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  invoiceId: z.string().optional(),
  title: z.string().min(2, "Task title must be at least 2 characters"),
  notes: z.string().optional(),
  dueDate: z.string().or(z.date()),
  assignedToId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});
export type CreateFollowUpTaskInput = z.infer<typeof CreateFollowUpTaskSchema>;

// ---------------------------------------------------------------------------
// 6. Recurring Transaction Schema
// ---------------------------------------------------------------------------

export const CreateRecurringTransactionSchema = z.object({
  transactionType: z.enum(["INVOICE", "EXPENSE"]),
  title: z.string().min(2, "Title is required"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  templateData: z.record(z.any()),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional(),
});
export type CreateRecurringTransactionInput = z.infer<typeof CreateRecurringTransactionSchema>;

// ---------------------------------------------------------------------------
// 7. Workflow Approval Decision Schema
// ---------------------------------------------------------------------------

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;
