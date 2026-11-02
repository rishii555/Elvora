import prisma from "@/lib/db/prisma";

export interface CreateNotificationParams {
  tenantId: string;
  userId?: string | null;
  title: string;
  message: string;
  category?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  linkUrl?: string | null;
  metadata?: Record<string, any> | null;
}

export interface NotificationProvider {
  sendInApp(notification: CreateNotificationParams): Promise<void>;
  sendEmailMock(to: string, subject: string, body: string): Promise<boolean>;
  sendSmsMock(to: string, message: string): Promise<boolean>;
}

export class MockNotificationProvider implements NotificationProvider {
  async sendInApp(_notification: CreateNotificationParams): Promise<void> {
    // In-app notifications are persisted directly to the database
  }

  async sendEmailMock(to: string, subject: string, _body: string): Promise<boolean> {
    // Development-safe mock: logs without sending real emails
    if (process.env.NODE_ENV !== "test") {
      console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
    }
    return true;
  }

  async sendSmsMock(to: string, message: string): Promise<boolean> {
    // Development-safe mock: logs without sending real SMS
    if (process.env.NODE_ENV !== "test") {
      console.log(`[MOCK SMS] To: ${to} | Message: ${message}`);
    }
    return true;
  }
}

export const notificationProvider = new MockNotificationProvider();

/**
 * Creates an in-app notification with tenant scoping and category preferences.
 */
export async function createNotification(
  params: CreateNotificationParams,
  client: any = prisma
) {
  const {
    tenantId,
    userId,
    title,
    message,
    category = "AUTOMATION",
    priority = "NORMAL",
    linkUrl,
    metadata,
  } = params;

  if (userId) {
    // Check user preference
    const pref = await client.notificationPreference.findFirst({
      where: { tenantId, userId, category },
    });
    if (pref && !pref.inAppEnabled) {
      // User has explicitly muted in-app notifications for this category
      return null;
    }
  }

  return await client.notification.create({
    data: {
      tenantId,
      userId: userId || null,
      title,
      message,
      category,
      priority,
      linkUrl: linkUrl || null,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
      isRead: false,
    },
  });
}

/**
 * Lists notifications for a tenant user with pagination and category filtering.
 */
export async function listNotifications(
  tenantId: string,
  userId?: string | null,
  options?: {
    category?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
  },
  client: any = prisma
) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {
    tenantId,
    OR: [
      { userId: null }, // broadcast to tenant
      ...(userId ? [{ userId }] : []),
    ],
  };

  if (options?.category) {
    where.category = options.category;
  }

  if (typeof options?.isRead === "boolean") {
    where.isRead = options.isRead;
  }

  const [items, total] = await Promise.all([
    client.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    client.notification.count({ where }),
  ]);

  return {
    items: items.map((item: any) => ({
      ...item,
      metadata: item.metadataJson ? JSON.parse(item.metadataJson) : null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationRead(
  tenantId: string,
  notificationId: string,
  _userId?: string | null,
  client: any = prisma
) {
  return await client.notification.updateMany({
    where: {
      id: notificationId,
      tenantId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Marks all notifications as read for a tenant.
 */
export async function markAllNotificationsRead(
  tenantId: string,
  userId?: string | null,
  client: any = prisma
) {
  const where: any = {
    tenantId,
    isRead: false,
  };

  if (userId) {
    where.OR = [{ userId: null }, { userId }];
  }

  return await client.notification.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Gets count of unread notifications.
 */
export async function getUnreadNotificationCount(
  tenantId: string,
  userId?: string | null,
  client: any = prisma
): Promise<number> {
  const where: any = {
    tenantId,
    isRead: false,
    OR: [
      { userId: null },
      ...(userId ? [{ userId }] : []),
    ],
  };

  return await client.notification.count({ where });
}

/**
 * Gets notification preferences for a user.
 */
export async function getNotificationPreferences(
  tenantId: string,
  userId: string,
  client: any = prisma
) {
  return await client.notificationPreference.findMany({
    where: { tenantId, userId },
  });
}

/**
 * Updates or sets a notification preference for a user.
 */
export async function updateNotificationPreference(
  tenantId: string,
  userId: string,
  category: string,
  inAppEnabled: boolean,
  emailMockEnabled: boolean,
  client: any = prisma
) {
  const existing = await client.notificationPreference.findFirst({
    where: { tenantId, userId, category },
  });

  if (existing) {
    return await client.notificationPreference.update({
      where: { id: existing.id },
      data: { inAppEnabled, emailMockEnabled },
    });
  }

  return await client.notificationPreference.create({
    data: {
      tenantId,
      userId,
      category,
      inAppEnabled,
      emailMockEnabled,
    },
  });
}
