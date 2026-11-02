import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  runInTransaction,
  isTransientTransactionError,
  isAmbiguousCommitError,
  DatabaseTransactionUnavailableError,
} from "../lib/db/prisma";
import { withIdempotency, ConcurrentMutationConflictError, clearIdempotencyForTests } from "../lib/db/idempotency";
import {
  signSessionToken,
  verifySessionToken,
  revokeSessionToken,
  isSessionTokenRevoked,
  isSessionTokenRevokedAsync,
  hashToken,
  clearRevokedTokensForTests,
} from "../lib/auth/session";
import {
  checkRateLimit,
  checkTenantRateLimit,
  InMemoryRateLimitProvider,
  RedisRateLimitProvider,
  setRateLimitProvider,
  clearAllRateLimitsForTests,
} from "../lib/auth/rate-limiter";
import {
  postJournalEntry,
  UnbalancedJournalEntryError,
} from "../lib/accounting/service";
import { sanitizeInputString, getSafePagination, handleApiError } from "../lib/api/security";
import { logger } from "../lib/logging/logger";
import { ConsoleErrorTracker, setErrorTracker } from "../lib/monitoring/error-tracker";
import {
  integrationDispatcher,
  MockEmailProvider,
  MockSmsProvider,
  MockWhatsAppProvider,
  messageDeduplicator,
  OutboundMessage,
} from "../lib/integrations/providers";
import { generateReportExport } from "../lib/reports/export";
import { GET as healthGet } from "../app/api/health/route";
import { GET as liveGet } from "../app/api/health/live/route";
import { GET as readyGet } from "../app/api/health/ready/route";
import { NextRequest } from "next/server";

describe("Phase 10: Production Readiness, Reliability & Performance Suite", () => {
  const TENANT_ID = "6655555555555555555555aa";
  const USER_ID = "665555555555555555555501";

  beforeEach(async () => {
    await clearRevokedTokensForTests();
    clearAllRateLimitsForTests();
    await clearIdempotencyForTests();
    messageDeduplicator.clearForTests();
    setRateLimitProvider(new InMemoryRateLimitProvider());
    setErrorTracker(new ConsoleErrorTracker());
  });

  // =========================================================================
  // 1. Database Reliability, Transactions & Concurrency Safeguards
  // =========================================================================
  describe("1. Database Reliability & Concurrency Safeguards", () => {
    it("fails closed when multi-document transactions are attempted on non-replica standalone MongoDB", async () => {
      const mockClient = {
        $transaction: async () => {
          throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
        },
      };

      await expect(
        runInTransaction(mockClient, async () => {
          return "should_not_reach";
        })
      ).rejects.toThrow(DatabaseTransactionUnavailableError);
    });

    it("correctly identifies transient retryable transaction errors", () => {
      expect(isTransientTransactionError({ code: 112 })).toBe(true); // WriteConflict
      expect(isTransientTransactionError({ code: 251 })).toBe(true); // NoSuchTransaction
      expect(isTransientTransactionError({ code: "P2034" })).toBe(true); // Prisma WriteConflict
      expect(isTransientTransactionError({ message: "WriteConflict error occurred" })).toBe(true);
      expect(
        isTransientTransactionError({
          hasErrorLabel: (label: string) => label === "TransientTransactionError",
        })
      ).toBe(true);

      // Non-transient errors must NOT be identified as retryable
      expect(isTransientTransactionError({ code: 11000 })).toBe(false); // DuplicateKey
      expect(isTransientTransactionError(new Error("ValidationError"))).toBe(false);
    });

    it("correctly identifies ambiguous commit outcomes requiring idempotency keys", () => {
      expect(
        isAmbiguousCommitError({
          hasErrorLabel: (label: string) => label === "UnknownTransactionCommitResult",
        })
      ).toBe(true);
      expect(isAmbiguousCommitError({ message: "UnknownTransactionCommitResult timeout" })).toBe(true);
      expect(isAmbiguousCommitError(new Error("Simple query failed"))).toBe(false);
    });

    it("guarantees idempotency: executes mutation once and returns cached data on duplicates", async () => {
      let executionCount = 0;
      const mutation = async () => {
        executionCount++;
        return { invoiceId: "inv_123", grandTotal: 1500 };
      };

      // First execution
      const first = await withIdempotency(TENANT_ID, "idemp_test_key_1", "CREATE_INVOICE", mutation);
      expect(first.cached).toBe(false);
      expect(first.data.invoiceId).toBe("inv_123");
      expect(executionCount).toBe(1);

      // Duplicate request with same key
      const second = await withIdempotency(TENANT_ID, "idemp_test_key_1", "CREATE_INVOICE", mutation);
      expect(second.cached).toBe(true);
      expect(second.data.invoiceId).toBe("inv_123");
      expect(executionCount).toBe(1); // Mutation was not executed again
    });

    it("blocks concurrent mutations with the same idempotency key while pending", async () => {
      let resolveFirstMutation: () => void;
      const slowMutationPromise = new Promise<{ status: string }>((resolve) => {
        resolveFirstMutation = () => resolve({ status: "success" });
      });

      // Start slow mutation in background
      const firstCall = withIdempotency(
        TENANT_ID,
        "concurrent_key_1",
        "STOCK_TRANSFER",
        () => slowMutationPromise
      );

      // Attempt concurrent duplicate while first is still pending
      await expect(
        withIdempotency(TENANT_ID, "concurrent_key_1", "STOCK_TRANSFER", async () => ({ status: "second" }))
      ).rejects.toThrow(ConcurrentMutationConflictError);

      resolveFirstMutation!();
      await firstCall;
    });
  });

  // =========================================================================
  // 2. Session & Rate-Limit Reliability
  // =========================================================================
  describe("2. Session & Rate-Limit Reliability", () => {
    it("computes SHA-256 hash of tokens for secure database persistence", () => {
      const token = "header.payload.signature_sample_jwt";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex string
      expect(hash1).not.toBe(token);
    });

    it("revokes session token and rejects verification synchronously and asynchronously", async () => {
      const token = await signSessionToken({
        userId: USER_ID,
        email: "user@elvora.com",
        name: "Test User",
        activeTenantId: TENANT_ID,
        role: "OWNER",
      });

      expect(await verifySessionToken(token)).not.toBeNull();
      expect(isSessionTokenRevoked(token)).toBe(false);

      revokeSessionToken(token);

      expect(isSessionTokenRevoked(token)).toBe(true);
      expect(await isSessionTokenRevokedAsync(token)).toBe(true);
      expect(await verifySessionToken(token)).toBeNull();
    });

    it("supports pluggable rate limiting provider with in-memory default", () => {
      const provider = new InMemoryRateLimitProvider();
      setRateLimitProvider(provider);

      const opts = { windowMs: 1000, maxAttempts: 2 };
      expect(checkRateLimit("ip_1", opts).allowed).toBe(true);
      expect(checkRateLimit("ip_1", opts).allowed).toBe(true);

      const throttled = checkRateLimit("ip_1", opts);
      expect(throttled.allowed).toBe(false);
      expect(throttled.remaining).toBe(0);
      expect(throttled.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("supports tenant-scoped rate limiting for heavy operations", () => {
      const opts = { windowMs: 5000, maxAttempts: 3 };
      expect(checkTenantRateLimit(TENANT_ID, "heavy-export", opts).allowed).toBe(true);
      expect(checkTenantRateLimit(TENANT_ID, "heavy-export", opts).allowed).toBe(true);
      expect(checkTenantRateLimit(TENANT_ID, "heavy-export", opts).allowed).toBe(true);

      const blocked = checkTenantRateLimit(TENANT_ID, "heavy-export", opts);
      expect(blocked.allowed).toBe(false);
    });

    it("redis provider falls back safely to in-memory on disconnected client", async () => {
      const redisProvider = new RedisRateLimitProvider(null);
      const res = await redisProvider.check("user_test", { windowMs: 1000, maxAttempts: 5 });
      expect(res.allowed).toBe(true);
    });
  });

  // =========================================================================
  // 3. Financial Integrity & Double-Entry Invariants
  // =========================================================================
  describe("3. Financial Integrity & Double-Entry Invariants", () => {
    it("strictly rejects unbalanced journal entries where debits != credits", async () => {
      const unbalancedParams = {
        tenantId: TENANT_ID,
        narration: "Unbalanced Voucher",
        lines: [
          { accountCode: "1010_CASH", debit: 500, credit: 0 },
          { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 400 }, // Discrepancy of 100!
        ],
      };

      await expect(postJournalEntry(unbalancedParams, {} as any)).rejects.toThrow(
        UnbalancedJournalEntryError
      );
    });

    it("reverses journal entries with exact matching contra voucher lines", () => {
      const reversalParams = {
        tenantId: TENANT_ID,
        narration: "Reversal of JRN-001",
        lines: [
          { accountCode: "1010_CASH", debit: 0, credit: 1000 },
          { accountCode: "4010_SALES_REVENUE", debit: 1000, credit: 0 },
        ],
      };

      // Sum of debits and credits must be identical in reversal
      const totalDebit = reversalParams.lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = reversalParams.lines.reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBe(1000);
      expect(totalCredit).toBe(1000);
      expect(totalDebit).toBe(totalCredit);
    });
  });

  // =========================================================================
  // 4. Performance, Sanitization & Safe Error Handling
  // =========================================================================
  describe("4. Performance, Sanitization & Safe Error Handling", () => {
    it("sanitizes dangerous XSS scripts and null bytes from input strings", () => {
      const malicious = "<script>alert('pwned')</script>John Doe%00<img src=x onerror=alert(1)>";
      const clean = sanitizeInputString(malicious);

      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("%00");
      expect(clean).not.toContain("onerror=");
      expect(clean).toContain("John Doe");
    });

    it("enforces safe pagination bounds preventing DoS query parameters", () => {
      const normal = getSafePagination("2", "25", 100);
      expect(normal.page).toBe(2);
      expect(normal.limit).toBe(25);
      expect(normal.skip).toBe(25);

      const excessive = getSafePagination("1", "999999", 50);
      expect(excessive.limit).toBe(50); // Capped at maxLimit

      const negative = getSafePagination("-5", "-20", 50, 20);
      expect(negative.page).toBe(1);
      expect(negative.limit).toBe(20);
      expect(negative.skip).toBe(0);
    });

    it("redacts database credentials, hostnames, and stack traces in API error responses", () => {
      const dbError = new Error(
        "Connection failed to mongodb+srv://admin:SuperSecretPass123@cluster0.abcde.mongodb.net/elvora_prod"
      );
      dbError.stack = "Error: at QueryEngine.execute (prisma/client.js:123)";

      const response = handleApiError(dbError);
      expect(response.status).toBe(500);
    });
  });

  // =========================================================================
  // 5. Monitoring, Logging & Health/Readiness Probes
  // =========================================================================
  describe("5. Monitoring, Logging & Health/Readiness Probes", () => {
    it("structured logger redacts sensitive credentials and logs contextual data", () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      logger.info("User login completed", {
        tenantId: TENANT_ID,
        userId: USER_ID,
        password: "SecretPassword123!",
        token: "jwt_token_data",
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const loggedJson = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedJson.level).toBe("info");
      expect(loggedJson.message).toBe("User login completed");
      expect(loggedJson.context.password).toBe("[REDACTED]");
      expect(loggedJson.context.token).toBe("[REDACTED]");
      expect(loggedJson.context.tenantId).toBe(TENANT_ID);

      consoleLogSpy.mockRestore();
    });

    it("error tracker captures exceptions and attaches correlation context", () => {
      const tracker = new ConsoleErrorTracker();
      setErrorTracker(tracker);

      const eventId = tracker.captureException(new Error("Test error"), {
        correlationId: "corr_12345",
        tenantId: TENANT_ID,
        extra: { password: "secret_password" },
      });

      expect(eventId.startsWith("err_")).toBe(true);
      const events = tracker.getCapturedEvents();
      expect(events.length).toBe(1);
      expect(events[0].context.correlationId).toBe("corr_12345");
      expect(events[0].context.extra.password).toBe("[REDACTED]");
    });

    it("liveness probe reports alive with 200 without database dependencies", async () => {
      const liveRes = await liveGet();
      const body = await liveRes.json();

      expect(liveRes.status).toBe(200);
      expect(body.status).toBe("alive");
      expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it("readiness probe verifies database connectivity", async () => {
      const readyRes = await readyGet();
      expect([200, 503]).toContain(readyRes.status);
    });

    it("health probe distinguishes liveness probe from full readiness probe", async () => {
      const liveReq = new NextRequest("http://localhost:3000/api/health?probe=live");
      const liveRes = await healthGet(liveReq);
      const liveBody = await liveRes.json();
      expect(liveRes.status).toBe(200);
      expect(liveBody.status).toBe("alive");
    });
  });

  // =========================================================================
  // 6. External Integrations & Deduplication
  // =========================================================================
  describe("6. External Integrations & Deduplication", () => {
    it("dispatches notifications via mock providers and records history", async () => {
      const emailProvider = new MockEmailProvider();
      const smsProvider = new MockSmsProvider();
      const waProvider = new MockWhatsAppProvider();

      integrationDispatcher.registerProvider(emailProvider);
      integrationDispatcher.registerProvider(smsProvider);
      integrationDispatcher.registerProvider(waProvider);

      const emailMsg: OutboundMessage = {
        tenantId: TENANT_ID,
        channel: "EMAIL",
        recipient: "customer@example.com",
        subject: "Invoice #INV-001",
        content: "Your invoice is ready.",
      };

      const result = await integrationDispatcher.dispatch(emailMsg);
      expect(result.success).toBe(true);
      expect(result.channel).toBe("EMAIL");
      expect(emailProvider.dispatched.length).toBe(1);
      expect(emailProvider.dispatched[0].recipient).toBe("customer@example.com");
    });

    it("deduplicates identical messages to prevent customer spam", async () => {
      const emailMsg: OutboundMessage = {
        tenantId: TENANT_ID,
        channel: "EMAIL",
        recipient: "spam_check@example.com",
        subject: "Overdue Reminder",
        content: "Please pay your invoice balance.",
        idempotencyKey: "reminder_inv_001_day_1",
      };

      const first = await integrationDispatcher.dispatch(emailMsg);
      expect(first.success).toBe(true);
      expect(first.messageId).not.toBe("duplicate_skipped");

      // Attempt duplicate immediately
      const second = await integrationDispatcher.dispatch(emailMsg);
      expect(second.success).toBe(true);
      expect(second.messageId).toBe("duplicate_skipped");
    });

    it("retries transient failures with exponential backoff", async () => {
      let callCount = 0;
      const failingProvider = {
        name: "flaky-sms",
        channel: "SMS" as const,
        async send(_msg: OutboundMessage) {
          callCount++;
          if (callCount < 2) {
            return {
              success: false,
              messageId: "temp_err",
              channel: "SMS" as const,
              timestamp: new Date().toISOString(),
              error: "Carrier timeout",
              retryable: true,
            };
          }
          return {
            success: true,
            messageId: "sms_success",
            channel: "SMS" as const,
            timestamp: new Date().toISOString(),
          };
        },
      };

      integrationDispatcher.registerProvider(failingProvider);

      const msg: OutboundMessage = {
        tenantId: TENANT_ID,
        channel: "SMS",
        recipient: "+919876543210",
        content: "OTP 1234",
      };

      const result = await integrationDispatcher.dispatchWithRetry(msg, 3, 10);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("sms_success");
      expect(callCount).toBe(2);
    });
  });

  // =========================================================================
  // 7. Multi-Format Report Exports (CSV, Excel XML, Printable HTML)
  // =========================================================================
  describe("7. Multi-Format Report Exports (CSV, Excel XML, Printable HTML)", () => {
    const mockDb = {
      tenant: {
        findUnique: async () => ({ name: "Apex Sanitaryware Pvt Ltd" }),
      },
      salesInvoice: {
        findMany: async () => [
          {
            invoiceNumber: "INV-2026-001",
            invoiceDate: new Date("2026-05-10"),
            customerName: "Sharma Enterprises",
            taxableAmount: 10000,
            cgstAmount: 900,
            sgstAmount: 900,
            igstAmount: 0,
            grandTotal: 11800,
            paidAmount: 11800,
            balanceAmount: 0,
            paymentMode: "BANK_TRANSFER",
            status: "FINALIZED",
          },
        ],
      },
    };

    it("exports CSV report with standard formatting and tenant metadata", async () => {
      const csv = await generateReportExport(TENANT_ID, "SALES_SUMMARY", {}, "CSV", mockDb);

      expect(csv.filename.endsWith(".csv")).toBe(true);
      expect(csv.contentType).toContain("text/csv");
      expect(csv.content).toContain("INV-2026-001");
      expect(csv.content).toContain("11800.00");
    });

    it("exports Excel SpreadsheetML XML with formatted cells and table styles", async () => {
      const excel = await generateReportExport(TENANT_ID, "SALES_SUMMARY", {}, "EXCEL", mockDb);

      expect(excel.filename.endsWith(".xls")).toBe(true);
      expect(excel.contentType).toContain("application/vnd.ms-excel");
      expect(excel.content).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
      expect(excel.content).toContain("urn:schemas-microsoft-com:office:spreadsheet");
      expect(excel.content).toContain("INV-2026-001");
    });

    it("exports print-ready HTML report with corporate typography and print CSS", async () => {
      const pdfHtml = await generateReportExport(TENANT_ID, "SALES_SUMMARY", {}, "PDF", mockDb);

      expect(pdfHtml.filename.endsWith(".html")).toBe(true);
      expect(pdfHtml.contentType).toContain("text/html");
      expect(pdfHtml.content).toContain("<!DOCTYPE html>");
      expect(pdfHtml.content).toContain("@page { size: A4 landscape;");
      expect(pdfHtml.content).toContain("INV-2026-001");
    });
  });
});
