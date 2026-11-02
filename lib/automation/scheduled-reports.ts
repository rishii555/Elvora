import prisma from "@/lib/db/prisma";
import { generateReportCSV, ExportReportType } from "@/lib/reports/export";
import { createNotification, notificationProvider } from "./notifications";
import { publishAutomationEvent } from "./events";
import { calculateNextRunDate } from "./recurring";

export interface CreateReportScheduleInput {
  reportType: ExportReportType;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  recipients?: string[];
  format?: "CSV" | "JSON";
  startDate?: string | Date;
}

/**
 * Creates a scheduled report definition.
 */
export async function createScheduledReport(
  tenantId: string,
  input: CreateReportScheduleInput,
  client: any = prisma
) {
  const startDate = input.startDate ? new Date(input.startDate) : new Date();

  return await client.scheduledReportSchedule.create({
    data: {
      tenantId,
      reportType: input.reportType,
      frequency: input.frequency,
      recipientsJson: input.recipients ? JSON.stringify(input.recipients) : null,
      format: input.format || "CSV",
      nextRunDate: startDate,
      isEnabled: true,
    },
  });
}

/**
 * Lists scheduled reports for a tenant.
 */
export async function listScheduledReports(
  tenantId: string,
  client: any = prisma
) {
  const items = await client.scheduledReportSchedule.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return items.map((r: any) => ({
    ...r,
    recipients: r.recipientsJson ? JSON.parse(r.recipientsJson) : [],
    lastGeneratedSummary: r.lastGeneratedSummary ? JSON.parse(r.lastGeneratedSummary) : null,
  }));
}

/**
 * Toggles or deletes a scheduled report.
 */
export async function toggleScheduledReport(
  tenantId: string,
  id: string,
  isEnabled: boolean,
  client: any = prisma
) {
  return await client.scheduledReportSchedule.updateMany({
    where: { id, tenantId },
    data: { isEnabled },
  });
}

export async function deleteScheduledReport(
  tenantId: string,
  id: string,
  client: any = prisma
) {
  return await client.scheduledReportSchedule.deleteMany({
    where: { id, tenantId },
  });
}

/**
 * Evaluates and executes due scheduled reports.
 */
export async function processScheduledReports(
  tenantId?: string,
  client: any = prisma
) {
  const now = new Date();
  const where: any = {
    isEnabled: true,
    nextRunDate: { lte: now },
  };
  if (tenantId) where.tenantId = tenantId;

  const dueSchedules = await client.scheduledReportSchedule.findMany({
    where,
    take: 20,
  });

  let generatedCount = 0;
  const results: Array<{
    scheduleId: string;
    reportType: string;
    filename: string;
    lineCount: number;
  }> = [];

  for (const schedule of dueSchedules) {
    try {
      // Determine date range according to frequency
      const rangeType =
        schedule.frequency === "DAILY"
          ? "yesterday"
          : schedule.frequency === "WEEKLY"
          ? "last_week"
          : "last_month";

      const reportResult = await generateReportCSV(
        schedule.tenantId,
        schedule.reportType as ExportReportType,
        { period: rangeType as any }
      );

      const lineCount = reportResult.content.split("\n").length;
      const summary = {
        generatedAt: now.toISOString(),
        filename: reportResult.filename,
        lineCount,
        bytes: reportResult.content.length,
      };

      // In-app notification
      await createNotification(
        {
          tenantId: schedule.tenantId,
          title: `Scheduled Report Generated: ${schedule.reportType.replace(/_/g, " ")}`,
          message: `${schedule.reportType.replace(/_/g, " ")} (${schedule.frequency}) is ready for download.`,
          category: "REPORTS",
          priority: "NORMAL",
          linkUrl: `/analytics`,
          metadata: summary,
        },
        client
      );

      // Safe mock email notification
      const recipients: string[] = schedule.recipientsJson ? JSON.parse(schedule.recipientsJson) : [];
      for (const email of recipients) {
        await notificationProvider.sendEmailMock(
          email,
          `Automated Report Ready: ${schedule.reportType}`,
          `Your scheduled report ${schedule.reportType} has been compiled successfully.`
        );
      }

      // Emit event
      await publishAutomationEvent(
        {
          tenantId: schedule.tenantId,
          eventType: "SCHEDULED_REPORT_GENERATED",
          entityType: "SCHEDULED_REPORT",
          entityId: schedule.id,
          payload: {
            reportType: schedule.reportType,
            frequency: schedule.frequency,
            summary,
          },
        },
        client
      );

      // Advance schedule
      const nextDate = calculateNextRunDate(schedule.nextRunDate, schedule.frequency as any);
      await client.scheduledReportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunDate: now,
          nextRunDate: nextDate,
          lastGeneratedSummary: JSON.stringify(summary),
        },
      });

      generatedCount++;
      results.push({
        scheduleId: schedule.id,
        reportType: schedule.reportType,
        filename: reportResult.filename,
        lineCount,
      });
    } catch (err: any) {
      console.error(`[SCHEDULED REPORT ERROR] Failed generating ${schedule.id}:`, err);
    }
  }

  return {
    evaluated: dueSchedules.length,
    generatedCount,
    results,
  };
}
