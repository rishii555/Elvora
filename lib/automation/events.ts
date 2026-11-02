import prisma from "@/lib/db/prisma";
import { AutomationEventType } from "./types";
import crypto from "crypto";

export interface PublishEventParams {
  tenantId: string;
  eventType: AutomationEventType;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
  idempotencyKey?: string;
}

/**
 * Publishes an event to the persistent event outbox.
 * Idempotently handles duplicates without failing.
 */
export async function publishAutomationEvent(
  params: PublishEventParams,
  client: any = prisma
) {
  const {
    tenantId,
    eventType,
    entityType,
    entityId,
    payload,
    idempotencyKey,
  } = params;

  // Generate deterministic or supplied idempotency key
  const finalKey =
    idempotencyKey ||
    `evt_${tenantId}_${eventType}_${entityId}_${crypto
      .createHash("md5")
      .update(JSON.stringify(payload))
      .digest("hex")}`;

  // Check if event already exists
  const existing = await client.automationEvent.findUnique({
    where: { idempotencyKey: finalKey },
  });

  if (existing) {
    return { isDuplicate: true, event: existing };
  }

  const event = await client.automationEvent.create({
    data: {
      tenantId,
      eventType,
      entityType,
      entityId,
      payloadJson: JSON.stringify(payload),
      idempotencyKey: finalKey,
      status: "PENDING",
    },
  });

  return { isDuplicate: false, event };
}

/**
 * Fetches pending events for processing.
 */
export async function getPendingEvents(
  tenantId?: string,
  limit = 50,
  client: any = prisma
) {
  const where: any = { status: "PENDING" };
  if (tenantId) {
    where.tenantId = tenantId;
  }

  return await client.automationEvent.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * Updates status of an event after processing.
 */
export async function markEventStatus(
  eventId: string,
  status: "PROCESSED" | "FAILED" | "IGNORED",
  error?: string,
  client: any = prisma
) {
  return await client.automationEvent.update({
    where: { id: eventId },
    data: {
      status,
      error: error || null,
      processedAt: new Date(),
    },
  });
}
