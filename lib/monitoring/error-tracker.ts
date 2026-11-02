import { redactSensitiveData } from "@/lib/audit/service";

export interface ErrorContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  url?: string;
  method?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export interface ErrorTracker {
  name: string;
  captureException(error: unknown, context?: ErrorContext): string;
  captureMessage(message: string, level?: "info" | "warning" | "error", context?: ErrorContext): string;
  setUser(user: { id?: string; email?: string; tenantId?: string } | null): void;
}

/**
 * Default local error tracker. Logs cleanly to console with redacted sensitive details.
 * Zero external credentials, zero network calls.
 */
export class ConsoleErrorTracker implements ErrorTracker {
  readonly name = "console";
  private currentUser: any = null;
  private capturedEvents: Array<{ id: string; error: any; context: any; timestamp: string }> = [];

  setUser(user: { id?: string; email?: string; tenantId?: string } | null): void {
    this.currentUser = user ? redactSensitiveData(user) : null;
  }

  captureException(error: unknown, context?: ErrorContext): string {
    const eventId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedContext = redactSensitiveData({
      ...context,
      user: this.currentUser,
    });

    const event = {
      id: eventId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      context: sanitizedContext,
      timestamp: new Date().toISOString(),
    };

    this.capturedEvents.push(event);

    if (process.env.NODE_ENV !== "test") {
      console.error(`[ErrorTracker:${eventId}]`, error instanceof Error ? error.message : error, sanitizedContext);
    }

    return eventId;
  }

  captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: ErrorContext): string {
    const eventId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedContext = redactSensitiveData({
      ...context,
      user: this.currentUser,
      level,
    });

    if (process.env.NODE_ENV !== "test") {
      console.warn(`[ErrorTracker:${eventId}] [${level.toUpperCase()}] ${message}`, sanitizedContext);
    }

    return eventId;
  }

  getCapturedEvents(): any[] {
    return this.capturedEvents;
  }

  clearEventsForTests(): void {
    this.capturedEvents = [];
    this.currentUser = null;
  }
}

/**
 * Production error tracker adapter conforming to standard Sentry contracts.
 * Activated in production if SENTRY_DSN is provided.
 */
export class SentryErrorTracker implements ErrorTracker {
  readonly name = "sentry";
  private client: any;

  constructor(client?: any) {
    this.client = client;
  }

  setUser(user: { id?: string; email?: string; tenantId?: string } | null): void {
    if (this.client?.setUser) {
      this.client.setUser(user);
    }
  }

  captureException(error: unknown, context?: ErrorContext): string {
    if (this.client?.captureException) {
      return this.client.captureException(error, { extra: redactSensitiveData(context) });
    }
    return defaultConsoleTracker.captureException(error, context);
  }

  captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: ErrorContext): string {
    if (this.client?.captureMessage) {
      return this.client.captureMessage(message, level, { extra: redactSensitiveData(context) });
    }
    return defaultConsoleTracker.captureMessage(message, level, context);
  }
}

const defaultConsoleTracker = new ConsoleErrorTracker();
let activeTracker: ErrorTracker = defaultConsoleTracker;

export function getErrorTracker(): ErrorTracker {
  return activeTracker;
}

export function setErrorTracker(tracker: ErrorTracker): void {
  activeTracker = tracker;
}
