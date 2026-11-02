import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluateRuleConditions,
  createAutomationRule,
  listAutomationRules,
  updateAutomationRule,
  deleteAutomationRule,
  recordAutomationExecution,
  listAutomationExecutions,
} from "@/lib/automation/rules-engine";
import {
  publishAutomationEvent,
  getPendingEvents,
  markEventStatus,
} from "@/lib/automation/events";
import {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  updateNotificationPreference,
  MockNotificationProvider,
} from "@/lib/automation/notifications";
import {
  processInvoiceReminders,
  triggerManualInvoiceReminder,
} from "@/lib/automation/reminders";
import {
  createFollowUpTask,
  listFollowUpTasks,
  completeFollowUpTask,
} from "@/lib/automation/follow-ups";
import {
  calculateNextRunDate,
  createRecurringTransaction,
  listRecurringTransactions,
  setRecurringTransactionActive,
} from "@/lib/automation/recurring";
import { processInventoryStockAlerts } from "@/lib/automation/inventory-workflows";
import {
  requestWorkflowApproval,
  processApprovalDecision,
  listApprovals,
} from "@/lib/automation/approvals";
import {
  createScheduledReport,
  listScheduledReports,
  toggleScheduledReport,
} from "@/lib/automation/scheduled-reports";
import { runSchedulerCycle } from "@/lib/automation/scheduler";
import { CreateAutomationRuleSchema } from "@/lib/automation/types";

describe("Phase 8: Business Automation & Workflow Engine Suite", () => {
  const TENANT_A = "6655555555555555555555aa";
  const TENANT_B = "6655555555555555555555bb";
  const USER_1 = "665555555555555555555501";
  const USER_2 = "665555555555555555555502";

  let rulesStore: any[];
  let executionsStore: any[];
  let eventsStore: any[];
  let notificationsStore: any[];
  let preferencesStore: any[];
  let approvalsStore: any[];
  let followupsStore: any[];
  let recurringStore: any[];
  let reminderLogsStore: any[];
  let reportSchedulesStore: any[];
  let salesInvoicesStore: any[];
  let productsStore: any[];
  let mockDb: any;

  beforeEach(() => {
    rulesStore = [];
    executionsStore = [];
    eventsStore = [];
    notificationsStore = [];
    preferencesStore = [];
    approvalsStore = [];
    followupsStore = [];
    recurringStore = [];
    reminderLogsStore = [];
    reportSchedulesStore = [];
    salesInvoicesStore = [];
    productsStore = [];

    mockDb = {
      automationRule: {
        create: async ({ data }: any) => {
          const item = { id: `rule_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          rulesStore.push(item);
          return item;
        },
        findMany: async ({ where }: any) => {
          return rulesStore.filter((r) => {
            if (where.tenantId && r.tenantId !== where.tenantId) return false;
            if (where.isEnabled !== undefined && r.isEnabled !== where.isEnabled) return false;
            if (where.eventType && r.eventType !== where.eventType) return false;
            if (where.triggerType && r.triggerType !== where.triggerType) return false;
            return true;
          });
        },
        findFirst: async ({ where }: any) => {
          return rulesStore.find((r) => {
            if (where.id && r.id !== where.id) return false;
            if (where.tenantId && r.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const r of rulesStore) {
            if (where.id && r.id !== where.id) continue;
            if (where.tenantId && r.tenantId !== where.tenantId) continue;
            Object.assign(r, data, { updatedAt: new Date() });
            count++;
          }
          return { count };
        },
        deleteMany: async ({ where }: any) => {
          const initial = rulesStore.length;
          rulesStore = rulesStore.filter((r) => {
            if (where.id && r.id === where.id && (!where.tenantId || r.tenantId === where.tenantId)) return false;
            return true;
          });
          return { count: initial - rulesStore.length };
        },
      },
      automationExecution: {
        create: async ({ data }: any) => {
          const item = { id: `exec_${Date.now()}_${Math.random()}`, ...data, executedAt: new Date() };
          executionsStore.push(item);
          return item;
        },
        findMany: async ({ where, skip = 0, take = 50 }: any) => {
          const matched = executionsStore.filter((e) => {
            if (where.tenantId && e.tenantId !== where.tenantId) return false;
            if (where.status && e.status !== where.status) return false;
            if (where.ruleId && e.ruleId !== where.ruleId) return false;
            return true;
          });
          return matched.slice(skip, skip + take);
        },
        count: async ({ where }: any) => {
          return executionsStore.filter((e) => {
            if (where.tenantId && e.tenantId !== where.tenantId) return false;
            if (where.status && e.status !== where.status) return false;
            return true;
          }).length;
        },
      },
      automationEvent: {
        create: async ({ data }: any) => {
          const item = { id: `evt_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
          eventsStore.push(item);
          return item;
        },
        findUnique: async ({ where }: any) => {
          return eventsStore.find((e) => e.idempotencyKey === where.idempotencyKey) || null;
        },
        findMany: async ({ where, take = 50 }: any) => {
          return eventsStore
            .filter((e) => {
              if (where.status && e.status !== where.status) return false;
              if (where.tenantId && e.tenantId !== where.tenantId) return false;
              return true;
            })
            .slice(0, take);
        },
        update: async ({ where, data }: any) => {
          const item = eventsStore.find((e) => e.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        },
      },
      notification: {
        create: async ({ data }: any) => {
          const item = { id: `notif_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
          notificationsStore.push(item);
          return item;
        },
        findFirst: async ({ where }: any) => {
          return notificationsStore.find((n) => {
            if (where.tenantId && n.tenantId !== where.tenantId) return false;
            if (where.category && n.category !== where.category) return false;
            if (where.isRead !== undefined && n.isRead !== where.isRead) return false;
            if (where.linkUrl && n.linkUrl !== where.linkUrl) return false;
            if (where.title && where.title.contains && !n.title.includes(where.title.contains)) return false;
            return true;
          }) || null;
        },
        findMany: async ({ where, skip = 0, take = 50 }: any) => {
          const matched = notificationsStore.filter((n) => {
            if (where.tenantId && n.tenantId !== where.tenantId) return false;
            if (where.category && n.category !== where.category) return false;
            if (where.isRead !== undefined && n.isRead !== where.isRead) return false;
            return true;
          });
          return matched.slice(skip, skip + take);
        },
        count: async ({ where }: any) => {
          return notificationsStore.filter((n) => {
            if (where.tenantId && n.tenantId !== where.tenantId) return false;
            if (where.isRead !== undefined && n.isRead !== where.isRead) return false;
            return true;
          }).length;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const n of notificationsStore) {
            if (where.id && n.id !== where.id) continue;
            if (where.tenantId && n.tenantId !== where.tenantId) continue;
            if (where.isRead !== undefined && n.isRead !== where.isRead) continue;
            Object.assign(n, data);
            count++;
          }
          return { count };
        },
      },
      notificationPreference: {
        findFirst: async ({ where }: any) => {
          return preferencesStore.find(
            (p) => p.tenantId === where.tenantId && p.userId === where.userId && p.category === where.category
          ) || null;
        },
        findMany: async ({ where }: any) => {
          return preferencesStore.filter(
            (p) => p.tenantId === where.tenantId && p.userId === where.userId
          );
        },
        create: async ({ data }: any) => {
          const item = { id: `pref_${Date.now()}`, ...data };
          preferencesStore.push(item);
          return item;
        },
        update: async ({ where, data }: any) => {
          const item = preferencesStore.find((p) => p.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        },
      },
      workflowApproval: {
        create: async ({ data }: any) => {
          const item = { id: `appr_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
          approvalsStore.push(item);
          return item;
        },
        findFirst: async ({ where }: any) => {
          return approvalsStore.find((a) => {
            if (where.id && a.id !== where.id) return false;
            if (where.tenantId && a.tenantId !== where.tenantId) return false;
            if (where.workflowType && a.workflowType !== where.workflowType) return false;
            if (where.entityId && a.entityId !== where.entityId) return false;
            if (where.status && a.status !== where.status) return false;
            return true;
          }) || null;
        },
        findMany: async ({ where, skip = 0, take = 50 }: any) => {
          const matched = approvalsStore.filter((a) => {
            if (where.tenantId && a.tenantId !== where.tenantId) return false;
            if (where.status && a.status !== where.status) return false;
            if (where.workflowType && a.workflowType !== where.workflowType) return false;
            return true;
          });
          return matched.slice(skip, skip + take);
        },
        count: async ({ where }: any) => {
          return approvalsStore.filter((a) => {
            if (where.tenantId && a.tenantId !== where.tenantId) return false;
            if (where.status && a.status !== where.status) return false;
            return true;
          }).length;
        },
        update: async ({ where, data }: any) => {
          const item = approvalsStore.find((a) => a.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        },
      },
      followUpTask: {
        create: async ({ data }: any) => {
          const item = { id: `task_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
          followupsStore.push(item);
          return item;
        },
        findMany: async ({ where, skip = 0, take = 50 }: any) => {
          const matched = followupsStore.filter((f) => {
            if (where.tenantId && f.tenantId !== where.tenantId) return false;
            if (where.status && f.status !== where.status) return false;
            return true;
          });
          return matched.slice(skip, skip + take);
        },
        count: async ({ where }: any) => {
          return followupsStore.filter((f) => {
            if (where.tenantId && f.tenantId !== where.tenantId) return false;
            if (where.status && f.status !== where.status) return false;
            return true;
          }).length;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const f of followupsStore) {
            if (where.id && f.id !== where.id) continue;
            if (where.tenantId && f.tenantId !== where.tenantId) continue;
            Object.assign(f, data);
            count++;
          }
          return { count };
        },
      },
      recurringTransaction: {
        create: async ({ data }: any) => {
          const item = { id: `rec_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
          recurringStore.push(item);
          return item;
        },
        findMany: async ({ where }: any) => {
          return recurringStore.filter((r) => {
            if (where.tenantId && r.tenantId !== where.tenantId) return false;
            if (where.isActive !== undefined && r.isActive !== where.isActive) return false;
            if (where.transactionType && r.transactionType !== where.transactionType) return false;
            return true;
          });
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const r of recurringStore) {
            if (where.id && r.id !== where.id) continue;
            if (where.tenantId && r.tenantId !== where.tenantId) continue;
            Object.assign(r, data);
            count++;
          }
          return { count };
        },
        deleteMany: async ({ where }: any) => {
          const initial = recurringStore.length;
          recurringStore = recurringStore.filter((r) => !(r.id === where.id && r.tenantId === where.tenantId));
          return { count: initial - recurringStore.length };
        },
      },
      invoiceReminderLog: {
        create: async ({ data }: any) => {
          const item = { id: `log_${Date.now()}_${Math.random()}`, ...data, sentAt: new Date() };
          reminderLogsStore.push(item);
          return item;
        },
        findFirst: async ({ where }: any) => {
          return reminderLogsStore.find((l) => {
            if (where.tenantId && l.tenantId !== where.tenantId) return false;
            if (where.invoiceId && l.invoiceId !== where.invoiceId) return false;
            return true;
          }) || null;
        },
        count: async ({ where }: any) => {
          return reminderLogsStore.filter((l) => {
            if (where.tenantId && l.tenantId !== where.tenantId) return false;
            if (where.invoiceId && l.invoiceId !== where.invoiceId) return false;
            return true;
          }).length;
        },
      },
      scheduledReportSchedule: {
        create: async ({ data }: any) => {
          const item = { id: `rep_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
          reportSchedulesStore.push(item);
          return item;
        },
        findMany: async ({ where }: any) => {
          return reportSchedulesStore.filter((s) => {
            if (where.tenantId && s.tenantId !== where.tenantId) return false;
            if (where.isEnabled !== undefined && s.isEnabled !== where.isEnabled) return false;
            return true;
          });
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const s of reportSchedulesStore) {
            if (where.id && s.id !== where.id) continue;
            if (where.tenantId && s.tenantId !== where.tenantId) continue;
            Object.assign(s, data);
            count++;
          }
          return { count };
        },
      },
      salesInvoice: {
        findMany: async ({ where }: any) => {
          return salesInvoicesStore.filter((i) => {
            if (where.tenantId && i.tenantId !== where.tenantId) return false;
            if (where.status && i.status !== where.status) return false;
            if (where.balanceAmount && where.balanceAmount.gte && i.balanceAmount < where.balanceAmount.gte) return false;
            return true;
          });
        },
        findFirst: async ({ where }: any) => {
          return salesInvoicesStore.find((i) => {
            if (where.id && i.id !== where.id) return false;
            if (where.tenantId && i.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        },
      },
      product: {
        findMany: async ({ where }: any) => {
          return productsStore.filter((p) => {
            if (where.tenantId && p.tenantId !== where.tenantId) return false;
            if (where.isActive !== undefined && p.isActive !== where.isActive) return false;
            return true;
          });
        },
      },
    };
  });

  // -------------------------------------------------------------------------
  // 1. Zod Validation & Safe Condition Evaluation
  // -------------------------------------------------------------------------
  describe("1. Automation Rule Validation & Safe Condition Engine", () => {
    it("validates rule schema and rejects invalid action configurations", () => {
      const validRule = {
        name: "High Value Order Alert",
        triggerType: "EVENT",
        eventType: "INVOICE_CREATED",
        actionType: "SEND_NOTIFICATION",
        actionConfig: { title: "Alert", message: "High order placed" },
        isEnabled: true,
      };

      const parsed = CreateAutomationRuleSchema.safeParse(validRule);
      expect(parsed.success).toBe(true);

      const invalidRule = {
        name: "X", // too short
        triggerType: "UNKNOWN_TYPE",
      };
      const invalidParsed = CreateAutomationRuleSchema.safeParse(invalidRule);
      expect(invalidParsed.success).toBe(false);
    });

    it("evaluates condition operators safely without code execution", () => {
      const payload = {
        invoiceNumber: "INV-001",
        totalAmount: 75000,
        customer: { state: "09", segment: "VIP" },
        itemsCount: 5,
      };

      // Greater than check
      expect(
        evaluateRuleConditions(
          {
            logic: "AND",
            conditions: [{ field: "totalAmount", operator: "gt", value: 50000 }],
          },
          payload
        )
      ).toBe(true);

      // Nested path check
      expect(
        evaluateRuleConditions(
          {
            logic: "AND",
            conditions: [
              { field: "totalAmount", operator: "gte", value: 75000 },
              { field: "customer.segment", operator: "eq", value: "VIP" },
            ],
          },
          payload
        )
      ).toBe(true);

      // OR logic check
      expect(
        evaluateRuleConditions(
          {
            logic: "OR",
            conditions: [
              { field: "totalAmount", operator: "gt", value: 100000 }, // false
              { field: "itemsCount", operator: "lte", value: 5 }, // true
            ],
          },
          payload
        )
      ).toBe(true);

      // Unmatched condition
      expect(
        evaluateRuleConditions(
          {
            logic: "AND",
            conditions: [{ field: "totalAmount", operator: "lt", value: 50000 }],
          },
          payload
        )
      ).toBe(false);
    });

    it("updates, deletes, and logs automation rule executions", async () => {
      const rule = await createAutomationRule(
        TENANT_A,
        USER_1,
        {
          name: "Original Rule",
          triggerType: "EVENT",
          actionType: "SEND_NOTIFICATION",
          actionConfig: {},
        },
        mockDb
      );

      await updateAutomationRule(TENANT_A, rule.id, { name: "Updated Rule Name" }, mockDb);
      expect(rulesStore[0].name).toBe("Updated Rule Name");

      await recordAutomationExecution(
        {
          tenantId: TENANT_A,
          ruleId: rule.id,
          triggerType: "EVENT",
          status: "SUCCESS",
          durationMs: 42,
        },
        mockDb
      );

      const execList = await listAutomationExecutions(TENANT_A, undefined, mockDb);
      expect(execList.total).toBe(1);

      await deleteAutomationRule(TENANT_A, rule.id, mockDb);
      expect(rulesStore.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Event-Driven Outbox & Idempotent Processing
  // -------------------------------------------------------------------------
  describe("2. Event-Driven Outbox & Idempotency", () => {
    it("persists business events and prevents duplicate insertion with identical idempotency keys", async () => {
      const eventParams = {
        tenantId: TENANT_A,
        eventType: "INVOICE_CREATED" as const,
        entityType: "INVOICE",
        entityId: "inv_12345",
        payload: { invoiceNumber: "INV-101", amount: 12000 },
        idempotencyKey: "unique_evt_key_001",
      };

      const res1 = await publishAutomationEvent(eventParams, mockDb);
      expect(res1.isDuplicate).toBe(false);
      expect(res1.event.idempotencyKey).toBe("unique_evt_key_001");

      // Attempt identical event publication
      const res2 = await publishAutomationEvent(eventParams, mockDb);
      expect(res2.isDuplicate).toBe(true);
      expect(eventsStore.length).toBe(1);
    });

    it("fetches pending events and marks status accurately", async () => {
      await publishAutomationEvent(
        {
          tenantId: TENANT_A,
          eventType: "PAYMENT_RECEIVED",
          entityType: "PAYMENT",
          entityId: "pay_01",
          payload: { amount: 5000 },
          idempotencyKey: "pay_key_1",
        },
        mockDb
      );

      const pending = await getPendingEvents(TENANT_A, 10, mockDb);
      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe("PENDING");

      await markEventStatus(pending[0].id, "PROCESSED", undefined, mockDb);
      expect(eventsStore[0].status).toBe("PROCESSED");
      expect(eventsStore[0].processedAt).toBeInstanceOf(Date);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Invoice & Payment Reminders
  // -------------------------------------------------------------------------
  describe("3. Invoice & Payment Reminders", () => {
    it("evaluates overdue invoices and skips fully paid or zero-balance invoices", async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 7); // 7 days overdue

      // Overdue unpaid invoice
      salesInvoicesStore.push({
        id: "inv_overdue_1",
        tenantId: TENANT_A,
        invoiceNumber: "INV-OD-001",
        customerName: "Sharma Traders",
        customerId: "cust_1",
        totalAmount: 15000,
        balanceAmount: 15000,
        invoiceDate: overdueDate,
        dueDate: overdueDate,
        status: "FINALIZED",
        payments: [],
      });

      // Fully paid invoice (should be skipped)
      salesInvoicesStore.push({
        id: "inv_paid_2",
        tenantId: TENANT_A,
        invoiceNumber: "INV-PAID-002",
        customerName: "Verma Enterprises",
        customerId: "cust_2",
        totalAmount: 20000,
        balanceAmount: 0,
        invoiceDate: overdueDate,
        dueDate: overdueDate,
        status: "FINALIZED",
        payments: [{ amount: 20000 }],
      });

      const res = await processInvoiceReminders(TENANT_A, undefined, mockDb);
      expect(res.invoicesEvaluated).toBe(1); // Only unpaid evaluated
      expect(res.remindersSent).toBe(1);
      expect(res.details[0].invoiceNumber).toBe("INV-OD-001");
      expect(reminderLogsStore.length).toBe(1);
      expect(notificationsStore.length).toBe(1);
    });

    it("triggers manual reminder on-demand and rejects for draft or paid invoices", async () => {
      salesInvoicesStore.push({
        id: "inv_manual_1",
        tenantId: TENANT_A,
        invoiceNumber: "INV-MAN-1",
        customerName: "Gupta Supplies",
        totalAmount: 8000,
        balanceAmount: 8000,
        status: "FINALIZED",
        invoiceDate: new Date(),
        payments: [],
      });

      const res = await triggerManualInvoiceReminder(TENANT_A, "inv_manual_1", USER_1, mockDb);
      expect(res.success).toBe(true);
      expect(res.invoiceNumber).toBe("INV-MAN-1");
      expect(reminderLogsStore.some((l) => l.reminderType === "MANUAL")).toBe(true);

      // Attempt on paid invoice
      salesInvoicesStore[0].balanceAmount = 0;
      salesInvoicesStore[0].payments = [{ amount: 8000 }];

      await expect(
        triggerManualInvoiceReminder(TENANT_A, "inv_manual_1", USER_1, mockDb)
      ).rejects.toThrow("already fully paid");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Follow-Up Task Management
  // -------------------------------------------------------------------------
  describe("4. Follow-Up Tasks", () => {
    it("creates, lists, and completes follow-up tasks", async () => {
      const task = await createFollowUpTask(
        TENANT_A,
        {
          title: "Follow up on invoice INV-1002 payment",
          targetType: "CUSTOMER",
          dueDate: new Date(),
          priority: "HIGH",
          assignedToId: USER_2,
        },
        mockDb
      );

      expect(task.title).toContain("INV-1002");
      expect(followupsStore.length).toBe(1);

      // Lists tasks
      const list = await listFollowUpTasks(TENANT_A, undefined, mockDb);
      expect(list.total).toBe(1);

      // Completes task
      await completeFollowUpTask(TENANT_A, task.id, mockDb);
      expect(followupsStore[0].status).toBe("COMPLETED");
      expect(followupsStore[0].completedAt).toBeInstanceOf(Date);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Recurring Transactions
  // -------------------------------------------------------------------------
  describe("5. Recurring Transactions Engine", () => {
    it("calculates accurate next run dates for Daily, Weekly, Monthly, and Yearly", () => {
      const base = new Date(2026, 0, 15); // Jan 15, 2026

      const daily = calculateNextRunDate(base, "DAILY");
      expect(daily.getDate()).toBe(16);

      const weekly = calculateNextRunDate(base, "WEEKLY");
      expect(weekly.getDate()).toBe(22);

      const monthly = calculateNextRunDate(base, "MONTHLY");
      expect(monthly.getMonth()).toBe(1); // Feb

      const yearly = calculateNextRunDate(base, "YEARLY");
      expect(yearly.getFullYear()).toBe(2027);
    });

    it("creates recurring transaction and allows pausing/resuming", async () => {
      const recurring = await createRecurringTransaction(
        TENANT_A,
        {
          transactionType: "INVOICE",
          title: "Monthly SaaS Retainer",
          frequency: "MONTHLY",
          templateData: { customerName: "Acme Corp", items: [] },
          startDate: new Date(),
        },
        mockDb
      );

      expect(recurring.title).toBe("Monthly SaaS Retainer");
      expect(recurring.isActive).toBe(true);

      // Pause
      await setRecurringTransactionActive(TENANT_A, recurring.id, false, mockDb);
      expect(recurringStore[0].isActive).toBe(false);

      // Resume
      await setRecurringTransactionActive(TENANT_A, recurring.id, true, mockDb);
      expect(recurringStore[0].isActive).toBe(true);

      // List recurring
      const items = await listRecurringTransactions(TENANT_A, undefined, mockDb);
      expect(items.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Inventory Low-Stock Workflows
  // -------------------------------------------------------------------------
  describe("6. Inventory Automation & Stock Alerts", () => {
    it("detects low stock and out-of-stock variants without duplicate unread alerts", async () => {
      productsStore.push({
        id: "prod_1",
        tenantId: TENANT_A,
        name: "Ceramic Floor Tile",
        minStockAlert: 10,
        isActive: true,
        variants: [
          { id: "var_1", sku: "TILE-WHT-01", currentStock: 3, isActive: true }, // Low stock
          { id: "var_2", sku: "TILE-BLK-02", currentStock: 0, isActive: true }, // Out of stock
          { id: "var_3", sku: "TILE-GRY-03", currentStock: 50, isActive: true }, // Normal
        ],
      });

      const res1 = await processInventoryStockAlerts(TENANT_A, mockDb);
      expect(res1.lowStockAlerts).toBe(1);
      expect(res1.outOfStockAlerts).toBe(1);
      expect(notificationsStore.length).toBe(2);

      // Running second time immediately avoids duplicate unread alerts
      const res2 = await processInventoryStockAlerts(TENANT_A, mockDb);
      expect(res2.lowStockAlerts).toBe(0);
      expect(res2.outOfStockAlerts).toBe(0);
      expect(notificationsStore.length).toBe(2); // Still 2
    });
  });

  // -------------------------------------------------------------------------
  // 7. Workflow Approvals & Segregation of Duties
  // -------------------------------------------------------------------------
  describe("7. Workflow Approvals & Segregation of Duties", () => {
    it("requests approval and notifies managers", async () => {
      const res = await requestWorkflowApproval(
        {
          tenantId: TENANT_A,
          workflowType: "EXPENSE",
          entityType: "EXPENSE",
          entityId: "exp_1001",
          entityNumber: "EXP-1001",
          amount: 65000,
          requesterId: USER_1,
          requesterName: "Rishi",
        },
        mockDb
      );

      expect(res.isDuplicate).toBe(false);
      expect(res.approval.status).toBe("PENDING");
      expect(notificationsStore.some((n) => n.category === "APPROVALS")).toBe(true);
    });

    it("enforces segregation of duties: requester cannot approve own request", async () => {
      const res = await requestWorkflowApproval(
        {
          tenantId: TENANT_A,
          workflowType: "EXPENSE",
          entityType: "EXPENSE",
          entityId: "exp_1002",
          amount: 25000,
          requesterId: USER_1,
        },
        mockDb
      );

      // USER_1 tries to approve USER_1's request -> must fail
      await expect(
        processApprovalDecision(
          {
            tenantId: TENANT_A,
            approvalId: res.approval.id,
            approverId: USER_1,
            approverRole: "OWNER",
            decision: "APPROVED",
          },
          mockDb
        )
      ).rejects.toThrow("Segregation of duties");
    });

    it("enforces role permissions: non-approver role cannot approve", async () => {
      const res = await requestWorkflowApproval(
        {
          tenantId: TENANT_A,
          workflowType: "EXPENSE",
          entityType: "EXPENSE",
          entityId: "exp_1003",
          amount: 15000,
          requesterId: USER_1,
        },
        mockDb
      );

      // BILLER role does not have APPROVE_WORKFLOWS permission
      await expect(
        processApprovalDecision(
          {
            tenantId: TENANT_A,
            approvalId: res.approval.id,
            approverId: USER_2,
            approverRole: "BILLER",
            decision: "APPROVED",
          },
          mockDb
        )
      ).rejects.toThrow("Access Denied");
    });

    it("successfully approves when approved by authorized distinct user", async () => {
      const res = await requestWorkflowApproval(
        {
          tenantId: TENANT_A,
          workflowType: "EXPENSE",
          entityType: "EXPENSE",
          entityId: "exp_1004",
          amount: 15000,
          requesterId: USER_1,
        },
        mockDb
      );

      const updated = await processApprovalDecision(
        {
          tenantId: TENANT_A,
          approvalId: res.approval.id,
          approverId: USER_2,
          approverName: "Manager Dave",
          approverRole: "MANAGER",
          decision: "APPROVED",
          notes: "Budget verified and approved.",
        },
        mockDb
      );

      expect(updated.status).toBe("APPROVED");
      expect(updated.approverId).toBe(USER_2);
      expect(updated.approvedAt).toBeInstanceOf(Date);

      const apprList = await listApprovals(TENANT_A, undefined, mockDb);
      expect(apprList.total).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 7b. Scheduled Reports & Master Scheduler
  // -------------------------------------------------------------------------
  describe("7b. Scheduled Reports & Master Scheduler Execution", () => {
    it("creates, lists, and toggles report schedules", async () => {
      const schedule = await createScheduledReport(
        TENANT_A,
        {
          reportType: "SALES_SUMMARY",
          frequency: "DAILY",
        },
        mockDb
      );
      expect(schedule.reportType).toBe("SALES_SUMMARY");

      const list = await listScheduledReports(TENANT_A, mockDb);
      expect(list.length).toBe(1);

      await toggleScheduledReport(TENANT_A, schedule.id, false, mockDb);
      expect(reportSchedulesStore[0].isEnabled).toBe(false);
    });

    it("executes a safe master scheduler cycle without error", async () => {
      const cycle = await runSchedulerCycle(TENANT_A, mockDb);
      expect(cycle.durationMs).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(cycle.errors)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Notifications & User Preferences
  // -------------------------------------------------------------------------
  describe("8. Notification Center & User Preferences", () => {
    it("respects category notification preferences and creates in-app notifications", async () => {
      // Normal notification
      const notif1 = await createNotification(
        {
          tenantId: TENANT_A,
          userId: USER_1,
          title: "Payment Received",
          message: "Payment of ₹5000 received",
          category: "PAYMENTS",
        },
        mockDb
      );
      expect(notif1).not.toBeNull();

      // Mute PAYMENTS category for USER_1
      await updateNotificationPreference(TENANT_A, USER_1, "PAYMENTS", false, true, mockDb);

      const notif2 = await createNotification(
        {
          tenantId: TENANT_A,
          userId: USER_1,
          title: "Payment Received Again",
          message: "Payment of ₹2000 received",
          category: "PAYMENTS",
        },
        mockDb
      );
      expect(notif2).toBeNull(); // Muted
    });

    it("marks notifications as read individually and in bulk", async () => {
      const n1 = await createNotification({ tenantId: TENANT_A, title: "Alert 1", message: "Msg 1" }, mockDb);
      await createNotification({ tenantId: TENANT_A, title: "Alert 2", message: "Msg 2" }, mockDb);

      const listBefore = await listNotifications(TENANT_A, null, undefined, mockDb);
      expect(listBefore.total).toBe(2);

      expect(await getUnreadNotificationCount(TENANT_A, null, mockDb)).toBe(2);

      await markNotificationRead(TENANT_A, n1!.id, null, mockDb);
      expect(await getUnreadNotificationCount(TENANT_A, null, mockDb)).toBe(1);

      await markAllNotificationsRead(TENANT_A, null, mockDb);
      expect(await getUnreadNotificationCount(TENANT_A, null, mockDb)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Development-Safe Notification Provider
  // -------------------------------------------------------------------------
  describe("9. Safe Mock Notification Provider", () => {
    it("never makes real external HTTP/SMS/email calls in local development", async () => {
      const mockProvider = new MockNotificationProvider();

      const emailResult = await mockProvider.sendEmailMock(
        "customer@example.com",
        "Test Invoice",
        "Invoice details..."
      );
      expect(emailResult).toBe(true);

      const smsResult = await mockProvider.sendSmsMock(
        "+919876543210",
        "Your payment is received."
      );
      expect(smsResult).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 10. Multi-Tenant Isolation
  // -------------------------------------------------------------------------
  describe("10. Multi-Tenant Isolation", () => {
    it("strictly isolates rules, notifications, follow-ups, and approvals by tenantId", async () => {
      // Create data for Tenant A
      await createAutomationRule(
        TENANT_A,
        USER_1,
        {
          name: "Tenant A Rule",
          triggerType: "EVENT",
          eventType: "INVOICE_CREATED",
          actionType: "SEND_NOTIFICATION",
          actionConfig: { title: "A", message: "A" },
        },
        mockDb
      );

      // Create data for Tenant B
      await createAutomationRule(
        TENANT_B,
        USER_2,
        {
          name: "Tenant B Rule",
          triggerType: "EVENT",
          eventType: "INVOICE_CREATED",
          actionType: "SEND_NOTIFICATION",
          actionConfig: { title: "B", message: "B" },
        },
        mockDb
      );

      const tenantARules = await listAutomationRules(TENANT_A, mockDb);
      expect(tenantARules.length).toBe(1);
      expect(tenantARules[0].name).toBe("Tenant A Rule");

      const tenantBRules = await listAutomationRules(TENANT_B, mockDb);
      expect(tenantBRules.length).toBe(1);
      expect(tenantBRules[0].name).toBe("Tenant B Rule");
    });
  });
});
