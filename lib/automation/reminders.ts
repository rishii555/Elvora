import prisma from "@/lib/db/prisma";
import { createNotification, notificationProvider } from "./notifications";
import { publishAutomationEvent } from "./events";

export interface ProcessRemindersResult {
  invoicesEvaluated: number;
  remindersSent: number;
  skipped: number;
  details: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    reminderType: string;
    daysOverdue: number;
    amount: number;
  }>;
}

/**
 * Evaluates unpaid finalized invoices and dispatches payment reminders.
 */
export async function processInvoiceReminders(
  tenantId: string,
  options?: {
    minOutstandingAmount?: number;
    daysBeforeDue?: number;
    maxRemindersPerInvoice?: number;
  },
  client: any = prisma
): Promise<ProcessRemindersResult> {
  const minAmount = options?.minOutstandingAmount ?? 1;
  const daysBeforeDue = options?.daysBeforeDue ?? 2;
  const maxReminders = options?.maxRemindersPerInvoice ?? 5;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Fetch only FINALIZED, unpaid invoices with balanceAmount >= minAmount
  const invoices = await client.salesInvoice.findMany({
    where: {
      tenantId,
      status: "FINALIZED",
      balanceAmount: { gte: minAmount },
    },
    include: {
      customer: true,
      payments: true,
    },
    take: 100, // Batch limit
  });

  let remindersSent = 0;
  let skipped = 0;
  const details: ProcessRemindersResult["details"] = [];

  for (const invoice of invoices) {
    // Authoritative balance recalculation: exclude if paidAmount covers total
    const totalPaid = (invoice.payments || []).reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0
    );
    const authoritativeBalance = Math.max(0, invoice.totalAmount - totalPaid);

    if (authoritativeBalance < minAmount) {
      skipped++;
      continue;
    }

    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date(invoice.invoiceDate);
    const dueDateMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    const diffDays = Math.floor(
      (startOfToday.getTime() - dueDateMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );

    let reminderType: string | null = null;

    if (diffDays === -daysBeforeDue) {
      reminderType = "BEFORE_DUE";
    } else if (diffDays === 0) {
      reminderType = "ON_DUE";
    } else if (diffDays > 0) {
      // Overdue intervals: day 1, 7, 15, 30, etc.
      if (diffDays === 1 || diffDays % 7 === 0) {
        reminderType = "OVERDUE_PERIODIC";
      }
    }

    if (!reminderType) {
      skipped++;
      continue;
    }

    // 2. Prevent duplicate reminders on the same day for this invoice
    const reminderToday = await client.invoiceReminderLog.findFirst({
      where: {
        tenantId,
        invoiceId: invoice.id,
        sentAt: { gte: startOfToday },
      },
    });

    if (reminderToday) {
      skipped++;
      continue;
    }

    // 3. Check max reminders threshold
    const totalPreviousReminders = await client.invoiceReminderLog.count({
      where: {
        tenantId,
        invoiceId: invoice.id,
      },
    });

    if (totalPreviousReminders >= maxReminders) {
      skipped++;
      continue;
    }

    // 4. Log reminder to InvoiceReminderLog
    await client.invoiceReminderLog.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        customerId: invoice.customerId || "UNREGISTERED",
        reminderType,
        channel: "IN_APP",
        recipientName: invoice.customerName,
        outstandingAmount: authoritativeBalance,
        daysOverdue: Math.max(0, diffDays),
      },
    });

    // 5. In-app notification
    const daysLabel =
      diffDays > 0
        ? `${diffDays} day(s) overdue`
        : diffDays === 0
        ? "due today"
        : `due in ${-diffDays} day(s)`;

    await createNotification(
      {
        tenantId,
        title: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
        message: `Invoice for ${invoice.customerName} is ${daysLabel}. Outstanding: ₹${authoritativeBalance.toFixed(2)}.`,
        category: "INVOICES",
        priority: diffDays > 7 ? "URGENT" : diffDays > 0 ? "HIGH" : "NORMAL",
        linkUrl: `/invoices`,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          balanceAmount: authoritativeBalance,
          daysOverdue: diffDays,
        },
      },
      client
    );

    // Mock external notification call (safe in dev, no network calls)
    if (invoice.customerEmail) {
      await notificationProvider.sendEmailMock(
        invoice.customerEmail,
        `Payment Reminder - Invoice #${invoice.invoiceNumber}`,
        `Dear ${invoice.customerName}, your invoice #${invoice.invoiceNumber} is ${daysLabel}.`
      );
    }

    // Emit event
    await publishAutomationEvent(
      {
        tenantId,
        eventType: diffDays > 0 ? "INVOICE_OVERDUE" : "INVOICE_DUE_SOON",
        entityType: "INVOICE",
        entityId: invoice.id,
        payload: {
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          customerId: invoice.customerId,
          balanceAmount: authoritativeBalance,
          daysOverdue: diffDays,
          reminderType,
        },
      },
      client
    );

    remindersSent++;
    details.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      reminderType,
      daysOverdue: diffDays,
      amount: authoritativeBalance,
    });
  }

  return {
    invoicesEvaluated: invoices.length,
    remindersSent,
    skipped,
    details,
  };
}

/**
 * Manually triggers a reminder for a specific invoice.
 */
export async function triggerManualInvoiceReminder(
  tenantId: string,
  invoiceId: string,
  _requestedByUserId: string,
  client: any = prisma
) {
  const invoice = await client.salesInvoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { payments: true },
  });

  if (!invoice) {
    throw new Error("Invoice not found or does not belong to this tenant.");
  }

  if (invoice.status !== "FINALIZED") {
    throw new Error("Cannot send reminders for draft or cancelled invoices.");
  }

  const totalPaid = (invoice.payments || []).reduce(
    (sum: number, p: any) => sum + (p.amount || 0),
    0
  );
  const balance = Math.max(0, invoice.totalAmount - totalPaid);

  if (balance <= 0) {
    throw new Error("Invoice is already fully paid. No reminder needed.");
  }

  const now = new Date();
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date(invoice.invoiceDate);
  const daysOverdue = Math.max(
    0,
    Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Log reminder
  const log = await client.invoiceReminderLog.create({
    data: {
      tenantId,
      invoiceId: invoice.id,
      customerId: invoice.customerId || "UNREGISTERED",
      reminderType: "MANUAL",
      channel: "IN_APP",
      recipientName: invoice.customerName,
      outstandingAmount: balance,
      daysOverdue,
    },
  });

  // Create notification
  await createNotification(
    {
      tenantId,
      title: `Manual Reminder: Invoice ${invoice.invoiceNumber}`,
      message: `Manual reminder issued for ${invoice.customerName}. Outstanding: ₹${balance.toFixed(2)}.`,
      category: "INVOICES",
      priority: "NORMAL",
      linkUrl: `/invoices`,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    },
    client
  );

  return {
    success: true,
    reminderLogId: log.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    outstandingAmount: balance,
    daysOverdue,
  };
}

/**
 * Retrieves reminder history for an invoice or tenant.
 */
export async function getInvoiceReminderHistory(
  tenantId: string,
  invoiceId?: string,
  client: any = prisma
) {
  const where: any = { tenantId };
  if (invoiceId) where.invoiceId = invoiceId;

  return await client.invoiceReminderLog.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 50,
  });
}
