import prisma from "@/lib/db/prisma";

export interface RecordAuditLogParams {
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "token",
  "rawtoken",
  "secret",
  "sessionsecret",
  "jwt",
  "authorization",
  "cookie",
  "creditcard",
  "cvv",
  "aadhaar",
  "pan",
]);

/**
 * Deeply redacts sensitive keys from audit log objects and payloads.
 */
export function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Records an immutable audit log entry with automatic redaction of sensitive credentials and secrets.
 */
export async function recordAuditLog(
  params: RecordAuditLogParams,
  client: any = prisma
) {
  const {
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    changes,
    ipAddress,
    userAgent,
  } = params;

  const sanitizedChanges = changes ? redactSensitiveData(changes) : null;

  return await client.auditLog.create({
    data: {
      tenantId,
      userId: userId || null,
      action,
      entityType,
      entityId,
      changesJson: sanitizedChanges ? JSON.stringify(sanitizedChanges) : null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });
}

/**
 * Lists audit logs for a tenant with strict pagination and scoping.
 */
export async function listAuditLogs(
  tenantId: string,
  options?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    page?: number;
    limit?: number;
  },
  client: any = prisma
) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 50));
  const skip = (page - 1) * limit;

  const where: any = { tenantId };
  if (options?.entityType) where.entityType = options.entityType;
  if (options?.entityId) where.entityId = options.entityId;
  if (options?.userId) where.userId = options.userId;
  if (options?.action) where.action = options.action;

  const [items, total] = await Promise.all([
    client.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    client.auditLog.count({ where }),
  ]);

  return {
    items: items.map((item: any) => ({
      ...item,
      changes: item.changesJson ? JSON.parse(item.changesJson) : null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
