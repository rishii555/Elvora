import prisma from "@/lib/db/prisma";
import { CreateFollowUpTaskInput } from "./types";
import { createNotification } from "./notifications";

export async function createFollowUpTask(
  tenantId: string,
  input: CreateFollowUpTaskInput,
  client: any = prisma
) {
  const task = await client.followUpTask.create({
    data: {
      tenantId,
      targetType: input.targetType,
      customerId: input.customerId || null,
      supplierId: input.supplierId || null,
      invoiceId: input.invoiceId || null,
      title: input.title,
      notes: input.notes || null,
      dueDate: new Date(input.dueDate),
      assignedToId: input.assignedToId || null,
      priority: input.priority || "NORMAL",
      status: "PENDING",
    },
  });

  if (input.assignedToId) {
    await createNotification(
      {
        tenantId,
        userId: input.assignedToId,
        title: `New Follow-up Task: ${input.title}`,
        message: `You have been assigned a task due on ${new Date(input.dueDate).toLocaleDateString()}.`,
        category: "AUTOMATION",
        priority: input.priority || "NORMAL",
        linkUrl: `/automations`,
      },
      client
    );
  }

  return task;
}

export async function listFollowUpTasks(
  tenantId: string,
  options?: {
    status?: string;
    targetType?: string;
    customerId?: string;
    supplierId?: string;
    assignedToId?: string;
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
  if (options?.targetType) where.targetType = options.targetType;
  if (options?.customerId) where.customerId = options.customerId;
  if (options?.supplierId) where.supplierId = options.supplierId;
  if (options?.assignedToId) where.assignedToId = options.assignedToId;

  const [items, total] = await Promise.all([
    client.followUpTask.findMany({
      where,
      orderBy: { dueDate: "asc" },
      skip,
      take: limit,
    }),
    client.followUpTask.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateFollowUpTask(
  tenantId: string,
  taskId: string,
  data: {
    status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    notes?: string;
    dueDate?: string | Date;
    assignedToId?: string;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  },
  client: any = prisma
) {
  const updateData: any = {};
  if (data.status) {
    updateData.status = data.status;
    if (data.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }
  }
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
  if (data.priority) updateData.priority = data.priority;

  return await client.followUpTask.updateMany({
    where: { id: taskId, tenantId },
    data: updateData,
  });
}

export async function completeFollowUpTask(
  tenantId: string,
  taskId: string,
  client: any = prisma
) {
  return await client.followUpTask.updateMany({
    where: { id: taskId, tenantId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
}
