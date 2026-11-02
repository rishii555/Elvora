import { redactSensitiveData } from "@/lib/audit/service";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  action?: string;
  path?: string;
  method?: string;
  durationMs?: number;
  statusCode?: number;
  [key: string]: any;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class StructuredLogger {
  private defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
  }

  child(extraContext: LogContext): StructuredLogger {
    return new StructuredLogger({
      ...this.defaultContext,
      ...extraContext,
    });
  }

  private write(level: LogLevel, message: string, context?: LogContext, err?: unknown): void {
    const isTest = process.env.NODE_ENV === "test";
    const mergedContext = redactSensitiveData({
      ...this.defaultContext,
      ...(context || {}),
    });

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(Object.keys(mergedContext).length > 0 ? { context: mergedContext } : {}),
    };

    if (err instanceof Error) {
      entry.error = {
        name: err.name,
        message: err.message,
        // Exclude full stack in production logs unless debug enabled
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      };
    } else if (err && typeof err === "object") {
      entry.error = {
        name: "UnknownError",
        message: String((err as any)?.message || JSON.stringify(err)),
      };
    }

    if (isTest && level !== "error" && !(console.log as any).mock) {
      // Keep test output clean unless console.log is explicitly spied on
      return;
    }

    const json = JSON.stringify(entry);
    switch (level) {
      case "error":
        console.error(json);
        break;
      case "warn":
        console.warn(json);
        break;
      case "debug":
        if (process.env.DEBUG === "true" || process.env.NODE_ENV === "development") {
          console.debug(json);
        }
        break;
      case "info":
      default:
        console.log(json);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext, err?: unknown): void {
    this.write("warn", message, context, err);
  }

  error(message: string, err?: unknown, context?: LogContext): void {
    this.write("error", message, context, err);
  }
}

export const logger = new StructuredLogger();
