import prisma, { runInTransaction } from "@/lib/db/prisma";
import { CreateRecurringTransactionInput } from "./types";
import { createSalesInvoice, getNextSequentialNumber } from "@/lib/invoices/service";
import { getIndianFinancialYear } from "@/lib/finance/decimal";
import { postExpenseAccounting } from "@/lib/accounting/service";
import { createNotification } from "./notifications";
import { publishAutomationEvent } from "./events";

/**
 * Calculates the next run date based on frequency.
 */
export function calculateNextRunDate(
  currentDate: Date,
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/**
 * Creates a new recurring transaction template.
 */
export async function createRecurringTransaction(
  tenantId: string,
  input: CreateRecurringTransactionInput,
  client: any = prisma
) {
  const startDate = new Date(input.startDate);

  return await client.recurringTransaction.create({
    data: {
      tenantId,
      transactionType: input.transactionType,
      title: input.title,
      frequency: input.frequency,
      customerId: input.customerId || null,
      supplierId: input.supplierId || null,
      templateData: JSON.stringify(input.templateData),
      nextRunDate: startDate,
      endDate: input.endDate ? new Date(input.endDate) : null,
      isActive: true,
      totalGenerated: 0,
    },
  });
}

/**
 * Lists recurring transactions for a tenant.
 */
export async function listRecurringTransactions(
  tenantId: string,
  options?: {
    transactionType?: "INVOICE" | "EXPENSE";
    isActive?: boolean;
  },
  client: any = prisma
) {
  const where: any = { tenantId };
  if (options?.transactionType) where.transactionType = options.transactionType;
  if (typeof options?.isActive === "boolean") where.isActive = options.isActive;

  const items = await client.recurringTransaction.findMany({
    where,
    orderBy: { nextRunDate: "asc" },
  });

  return items.map((t: any) => ({
    ...t,
    templateData: t.templateData ? JSON.parse(t.templateData) : {},
  }));
}

/**
 * Toggles active/paused status of a recurring transaction.
 */
export async function setRecurringTransactionActive(
  tenantId: string,
  id: string,
  isActive: boolean,
  client: any = prisma
) {
  return await client.recurringTransaction.updateMany({
    where: { id, tenantId },
    data: { isActive },
  });
}

/**
 * Updates a recurring transaction template.
 */
export async function updateRecurringTransaction(
  tenantId: string,
  id: string,
  data: {
    title?: string;
    frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
    templateData?: Record<string, any>;
    endDate?: string | Date | null;
  },
  client: any = prisma
) {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.templateData !== undefined) updateData.templateData = JSON.stringify(data.templateData);
  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  }

  return await client.recurringTransaction.updateMany({
    where: { id, tenantId },
    data: updateData,
  });
}

/**
 * Deletes a recurring transaction template.
 */
export async function deleteRecurringTransaction(
  tenantId: string,
  id: string,
  client: any = prisma
) {
  return await client.recurringTransaction.deleteMany({
    where: { id, tenantId },
  });
}

/**
 * Evaluates and executes all due recurring transactions for a tenant.
 */
export async function processRecurringTransactions(
  tenantId?: string,
  client: any = prisma
) {
  const now = new Date();
  const where: any = {
    isActive: true,
    nextRunDate: { lte: now },
  };
  if (tenantId) where.tenantId = tenantId;

  const dueTransactions = await client.recurringTransaction.findMany({
    where,
    take: 50,
  });

  let generatedCount = 0;
  const results: Array<{
    id: string;
    type: string;
    title: string;
    generatedEntityId: string;
  }> = [];

  for (const item of dueTransactions) {
    const template = item.templateData ? JSON.parse(item.templateData) : {};
    let generatedEntityId = "";

    try {
      if (item.transactionType === "INVOICE") {
        // Idempotency key for recurring invoice
        const idempotencyKey = `rec_inv_${item.id}_${item.nextRunDate.toISOString().slice(0, 10)}`;

        const invResult = await createSalesInvoice(
          {
            tenantId: item.tenantId,
            userId: template.userId || "RECURRING_ENGINE",
            customerId: item.customerId || template.customerId,
            customerName: template.customerName || "Recurring Customer",
            customerPhone: template.customerPhone,
            customerEmail: template.customerEmail,
            customerGstin: template.customerGstin,
            customerStateCode: template.customerStateCode || "09",
            items: template.items || [],
            paymentMode: template.paymentMode || "CREDIT",
            status: "FINALIZED",
            notes: `Auto-generated from recurring template: ${item.title}`,
            idempotencyKey,
          },
          client
        );

        generatedEntityId = invResult.invoice.id;

        await publishAutomationEvent(
          {
            tenantId: item.tenantId,
            eventType: "RECURRING_INVOICE_GENERATED",
            entityType: "INVOICE",
            entityId: generatedEntityId,
            payload: {
              recurringId: item.id,
              invoiceNumber: invResult.invoice.invoiceNumber,
              totalAmount: invResult.invoice.totalAmount,
            },
          },
          client
        );

        await createNotification(
          {
            tenantId: item.tenantId,
            title: `Recurring Invoice Generated`,
            message: `Invoice #${invResult.invoice.invoiceNumber} for ₹${invResult.invoice.totalAmount} was generated from template "${item.title}".`,
            category: "INVOICES",
            priority: "NORMAL",
            linkUrl: `/invoices`,
          },
          client
        );
      } else if (item.transactionType === "EXPENSE") {
        const expenseDate = now;
        const fiscalYear = getIndianFinancialYear(expenseDate);

        const expResult = await runInTransaction(client, async (tx: any) => {
          const expenseNumber = await getNextSequentialNumber(
            item.tenantId,
            "EXPENSE",
            fiscalYear,
            "EXP-",
            tx
          );

          const created = await tx.expense.create({
            data: {
              tenantId: item.tenantId,
              expenseNumber,
              expenseDate,
              category: (template.category || "GENERAL_EXPENSE").toUpperCase().replace(/\s+/g, "_"),
              payee: (template.payee || item.title).trim(),
              amount: Number(template.amount || 0),
              taxAmount: Number(template.taxAmount || 0),
              paymentMode: template.paymentMode || "BANK_TRANSFER",
              paymentRef: template.paymentRef || "RECURRING",
              description: `Recurring Expense: ${item.title}`,
              notes: template.notes || null,
            },
          });

          await postExpenseAccounting(item.tenantId, created, tx);
          return created;
        });

        generatedEntityId = expResult.id;

        await publishAutomationEvent(
          {
            tenantId: item.tenantId,
            eventType: "RECURRING_EXPENSE_GENERATED",
            entityType: "EXPENSE",
            entityId: generatedEntityId,
            payload: {
              recurringId: item.id,
              expenseNumber: expResult.expenseNumber,
              amount: expResult.amount,
            },
          },
          client
        );

        await createNotification(
          {
            tenantId: item.tenantId,
            title: `Recurring Expense Recorded`,
            message: `Expense #${expResult.expenseNumber} for ₹${expResult.amount} was recorded from template "${item.title}".`,
            category: "EXPENSES",
            priority: "NORMAL",
            linkUrl: `/expenses`,
          },
          client
        );
      }

      // Calculate next run date
      const nextDate = calculateNextRunDate(item.nextRunDate, item.frequency as any);
      const isPastEndDate = item.endDate && nextDate > new Date(item.endDate);

      await client.recurringTransaction.update({
        where: { id: item.id },
        data: {
          lastRunDate: now,
          nextRunDate: nextDate,
          lastGeneratedId: generatedEntityId,
          totalGenerated: { increment: 1 },
          isActive: !isPastEndDate,
        },
      });

      generatedCount++;
      results.push({
        id: item.id,
        type: item.transactionType,
        title: item.title,
        generatedEntityId,
      });
    } catch (err: any) {
      console.error(`[RECURRING ENGINE ERROR] Failed processing ${item.id}:`, err);
    }
  }

  return {
    evaluated: dueTransactions.length,
    generatedCount,
    results,
  };
}
