import prisma from "@/lib/db/prisma";
import { getPendingEvents, markEventStatus } from "./events";
import { evaluateRuleConditions, executeAutomationAction, recordAutomationExecution } from "./rules-engine";
import { processInvoiceReminders } from "./reminders";
import { processInventoryStockAlerts } from "./inventory-workflows";
import { processRecurringTransactions } from "./recurring";
import { processScheduledReports } from "./scheduled-reports";

export interface SchedulerExecutionResult {
  tenantId?: string;
  eventsProcessed: number;
  rulesExecuted: number;
  remindersSent: number;
  stockAlertsSent: number;
  recurringGenerated: number;
  reportsGenerated: number;
  errors: string[];
  durationMs: number;
}

/**
 * Processes pending events in the persistent outbox and triggers matching automation rules.
 */
export async function processOutboxEvents(
  tenantId?: string,
  limit = 50,
  client: any = prisma
) {
  const pendingEvents = await getPendingEvents(tenantId, limit, client);
  let processedCount = 0;
  let rulesExecuted = 0;

  for (const event of pendingEvents) {
    const startTime = Date.now();
    try {
      const payload = event.payloadJson ? JSON.parse(event.payloadJson) : {};

      // Find matching enabled rules for this tenant and eventType
      const rules = await client.automationRule.findMany({
        where: {
          tenantId: event.tenantId,
          isEnabled: true,
          triggerType: "EVENT",
          eventType: event.eventType,
        },
      });

      for (const rule of rules) {
        const conditions = rule.conditionsJson ? JSON.parse(rule.conditionsJson) : null;
        const matches = evaluateRuleConditions(conditions, payload);

        if (matches) {
          const actionConfig = rule.actionConfigJson ? JSON.parse(rule.actionConfigJson) : {};
          const actionResult = await executeAutomationAction(
            event.tenantId,
            rule.actionType,
            actionConfig,
            payload,
            client
          );

          await recordAutomationExecution(
            {
              tenantId: event.tenantId,
              ruleId: rule.id,
              triggerType: "EVENT",
              eventType: event.eventType,
              entityType: event.entityType,
              entityId: event.entityId,
              status: "SUCCESS",
              executionLog: JSON.stringify(actionResult),
              durationMs: Date.now() - startTime,
            },
            client
          );
          rulesExecuted++;
        } else {
          await recordAutomationExecution(
            {
              tenantId: event.tenantId,
              ruleId: rule.id,
              triggerType: "EVENT",
              eventType: event.eventType,
              entityType: event.entityType,
              entityId: event.entityId,
              status: "SKIPPED",
              executionLog: "Conditions did not match payload.",
              durationMs: Date.now() - startTime,
            },
            client
          );
        }
      }

      await markEventStatus(event.id, "PROCESSED", undefined, client);
      processedCount++;
    } catch (err: any) {
      console.error(`[EVENT RUNNER ERROR] Failed event ${event.id}:`, err);
      await markEventStatus(event.id, "FAILED", err.message || String(err), client);
    }
  }

  return { processedCount, rulesExecuted };
}

/**
 * Master scheduler runner that claims and executes all due tasks safely and idempotently.
 */
export async function runSchedulerCycle(
  tenantId?: string,
  client: any = prisma
): Promise<SchedulerExecutionResult> {
  const start = Date.now();
  const errors: string[] = [];

  let eventsProcessed = 0;
  let rulesExecuted = 0;
  let remindersSent = 0;
  let stockAlertsSent = 0;
  let recurringGenerated = 0;
  let reportsGenerated = 0;

  // 1. Process Event Outbox
  try {
    const outboxRes = await processOutboxEvents(tenantId, 50, client);
    eventsProcessed = outboxRes.processedCount;
    rulesExecuted = outboxRes.rulesExecuted;
  } catch (err: any) {
    errors.push(`Outbox error: ${err.message}`);
  }

  // 2. Invoice Reminders
  if (tenantId) {
    try {
      const remRes = await processInvoiceReminders(tenantId, undefined, client);
      remindersSent = remRes.remindersSent;
    } catch (err: any) {
      errors.push(`Reminders error: ${err.message}`);
    }

    // 3. Stock Alerts
    try {
      const stockRes = await processInventoryStockAlerts(tenantId, client);
      stockAlertsSent = stockRes.lowStockAlerts + stockRes.outOfStockAlerts;
    } catch (err: any) {
      errors.push(`Stock alerts error: ${err.message}`);
    }
  }

  // 4. Recurring Transactions
  try {
    const recRes = await processRecurringTransactions(tenantId, client);
    recurringGenerated = recRes.generatedCount;
  } catch (err: any) {
    errors.push(`Recurring transactions error: ${err.message}`);
  }

  // 5. Scheduled Reports
  try {
    const repRes = await processScheduledReports(tenantId, client);
    reportsGenerated = repRes.generatedCount;
  } catch (err: any) {
    errors.push(`Scheduled reports error: ${err.message}`);
  }

  return {
    tenantId,
    eventsProcessed,
    rulesExecuted,
    remindersSent,
    stockAlertsSent,
    recurringGenerated,
    reportsGenerated,
    errors,
    durationMs: Date.now() - start,
  };
}

/**
 * Initializes default scheduled tasks for a tenant if not present.
 */
export async function ensureDefaultScheduledTasks(
  tenantId: string,
  client: any = prisma
) {
  const existing = await client.scheduledTask.findMany({
    where: { tenantId },
  });

  if (existing.length > 0) return existing;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9:00 AM

  const defaultTasks = [
    {
      tenantId,
      taskType: "INVOICE_REMINDERS",
      name: "Daily Invoice Payment Reminders",
      frequency: "DAILY",
      nextRunAt: tomorrow,
      isEnabled: true,
      status: "IDLE",
    },
    {
      tenantId,
      taskType: "STOCK_ALERTS",
      name: "Daily Stock & Threshold Alerts",
      frequency: "DAILY",
      nextRunAt: tomorrow,
      isEnabled: true,
      status: "IDLE",
    },
    {
      tenantId,
      taskType: "RECURRING_INVOICES",
      name: "Daily Recurring Transactions Processor",
      frequency: "DAILY",
      nextRunAt: tomorrow,
      isEnabled: true,
      status: "IDLE",
    },
    {
      tenantId,
      taskType: "SCHEDULED_REPORTS",
      name: "Automated Report Delivery",
      frequency: "DAILY",
      nextRunAt: tomorrow,
      isEnabled: true,
      status: "IDLE",
    },
  ];

  await client.scheduledTask.createMany({
    data: defaultTasks,
  });

  return await client.scheduledTask.findMany({ where: { tenantId } });
}
