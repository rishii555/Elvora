import { createHash } from "crypto";
import { logger } from "@/lib/logging/logger";

export type MessageChannel = "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP";

export interface OutboundMessage {
  id?: string;
  tenantId: string;
  channel: MessageChannel;
  recipient: string;
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface DeliveryResult {
  success: boolean;
  messageId: string;
  channel: MessageChannel;
  timestamp: string;
  error?: string;
  retryable?: boolean;
}

export interface IntegrationProvider {
  readonly name: string;
  readonly channel: MessageChannel;
  send(message: OutboundMessage): Promise<DeliveryResult>;
}

/**
 * In-memory message deduplication store to prevent duplicate reminders/notifications.
 */
class MessageDeduplicator {
  private sentKeys = new Map<string, number>(); // key -> expiresAt

  private computeKey(msg: OutboundMessage): string {
    if (msg.idempotencyKey) {
      return `${msg.tenantId}:${msg.channel}:${msg.idempotencyKey}`;
    }
    const hash = createHash("sha256").update(msg.content).digest("hex").substring(0, 16);
    return `${msg.tenantId}:${msg.channel}:${msg.recipient}:${hash}`;
  }

  isDuplicate(msg: OutboundMessage): boolean {
    const key = this.computeKey(msg);
    const expiresAt = this.sentKeys.get(key);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.sentKeys.delete(key);
      return false;
    }
    return true;
  }

  recordSent(msg: OutboundMessage, ttlMs = 60 * 60 * 1000): void {
    const key = this.computeKey(msg);
    this.sentKeys.set(key, Date.now() + ttlMs);
  }

  clearForTests(): void {
    this.sentKeys.clear();
  }
}

export const messageDeduplicator = new MessageDeduplicator();

/**
 * Local development Mock Providers (zero external cost, zero network dependencies).
 */
export class MockEmailProvider implements IntegrationProvider {
  readonly name = "mock-email";
  readonly channel: MessageChannel = "EMAIL";
  public dispatched: OutboundMessage[] = [];

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    this.dispatched.push(msg);
    if (process.env.NODE_ENV !== "test") {
      logger.info(`[MOCK EMAIL DISPATCHED] To: ${msg.recipient} | Subject: ${msg.subject || "(no subject)"}`, {
        tenantId: msg.tenantId,
        channel: "EMAIL",
      });
    }
    return {
      success: true,
      messageId: `email_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: "EMAIL",
      timestamp: new Date().toISOString(),
    };
  }
}

export class MockSmsProvider implements IntegrationProvider {
  readonly name = "mock-sms";
  readonly channel: MessageChannel = "SMS";
  public dispatched: OutboundMessage[] = [];

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    this.dispatched.push(msg);
    if (process.env.NODE_ENV !== "test") {
      logger.info(`[MOCK SMS DISPATCHED] To: ${msg.recipient} | Message: ${msg.content}`, {
        tenantId: msg.tenantId,
        channel: "SMS",
      });
    }
    return {
      success: true,
      messageId: `sms_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: "SMS",
      timestamp: new Date().toISOString(),
    };
  }
}

export class MockWhatsAppProvider implements IntegrationProvider {
  readonly name = "mock-whatsapp";
  readonly channel: MessageChannel = "WHATSAPP";
  public dispatched: OutboundMessage[] = [];

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    this.dispatched.push(msg);
    if (process.env.NODE_ENV !== "test") {
      logger.info(`[MOCK WHATSAPP DISPATCHED] To: ${msg.recipient} | Message: ${msg.content}`, {
        tenantId: msg.tenantId,
        channel: "WHATSAPP",
      });
    }
    return {
      success: true,
      messageId: `wa_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: "WHATSAPP",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Universal Integration Dispatcher with deduplication and exponential backoff retries.
 */
export class IntegrationDispatcher {
  private providers = new Map<MessageChannel, IntegrationProvider>();

  constructor() {
    this.registerProvider(new MockEmailProvider());
    this.registerProvider(new MockSmsProvider());
    this.registerProvider(new MockWhatsAppProvider());
  }

  registerProvider(provider: IntegrationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  getProvider(channel: MessageChannel): IntegrationProvider | undefined {
    return this.providers.get(channel);
  }

  async dispatch(msg: OutboundMessage): Promise<DeliveryResult> {
    // 1. Check deduplication guard
    if (messageDeduplicator.isDuplicate(msg)) {
      return {
        success: true,
        messageId: "duplicate_skipped",
        channel: msg.channel,
        timestamp: new Date().toISOString(),
        error: "Message skipped: identical notification recently dispatched (deduplicated)",
      };
    }

    const provider = this.providers.get(msg.channel);
    if (!provider) {
      return {
        success: false,
        messageId: "unsupported_channel",
        channel: msg.channel,
        timestamp: new Date().toISOString(),
        error: `No provider registered for channel ${msg.channel}`,
        retryable: false,
      };
    }

    const result = await provider.send(msg);
    if (result.success) {
      messageDeduplicator.recordSent(msg);
    }
    return result;
  }

  async dispatchWithRetry(msg: OutboundMessage, maxRetries = 3, baseDelayMs = 200): Promise<DeliveryResult> {
    let attempt = 0;
    let lastResult: DeliveryResult | null = null;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        lastResult = await this.dispatch(msg);
        if (lastResult.success || !lastResult.retryable) {
          return lastResult;
        }
      } catch (err: any) {
        lastResult = {
          success: false,
          messageId: "exception",
          channel: msg.channel,
          timestamp: new Date().toISOString(),
          error: err?.message || "Delivery exception",
          retryable: true,
        };
      }

      if (attempt <= maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return lastResult!;
  }
}

export const integrationDispatcher = new IntegrationDispatcher();
