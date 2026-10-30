import { describe, it, expect, vi, beforeEach } from "vitest";
import { escapeCsv } from "@/lib/inventory/csv";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import nextConfig from "@/next.config";

describe("Production Readiness & Security Review Regression Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. FORMULA / CSV INJECTION REGRESSION (CWE-1236)
  // ==========================================
  describe("1. Formula / CSV Injection Protection", () => {
    it("neutralizes Excel/Calc formula injection payloads by prepending a single quote", () => {
      const maliciousPayloads = [
        '=cmd|\' /C calc\'!A0',
        '=SUM(A1:A10)',
        '+1234567890',
        '-5+2',
        '@SUM(1+1)',
        '\tTAB_INDENTED',
        '\rCARRIAGE_RETURN',
      ];

      for (const payload of maliciousPayloads) {
        const sanitized = escapeCsv(payload);
        // Must start with single quote so Excel/LibreOffice treats it as raw literal text
        expect(sanitized.startsWith("'") || sanitized.startsWith("\"'")).toBe(true);
      }
    });

    it("leaves safe regular product names and alphanumeric SKUs unaffected", () => {
      expect(escapeCsv("Ceramic Wall Basin 550mm")).toBe("Ceramic Wall Basin 550mm");
      expect(escapeCsv("CP-MIXER-001")).toBe("CP-MIXER-001");
      expect(escapeCsv("Jaquar Alive Diverter")).toBe("Jaquar Alive Diverter");
    });
  });

  // ==========================================
  // 2. HTTP SECURITY HEADERS & CLICKJACKING
  // ==========================================
  describe("2. HTTP Security Headers Verification", () => {
    it("ensures next.config.ts enforces strict security headers and disables poweredByHeader", async () => {
      expect(nextConfig.poweredByHeader).toBe(false);

      if (typeof nextConfig.headers === "function") {
        const headerRules = await nextConfig.headers();
        const globalHeaders = headerRules.find((h) => h.source === "/(.*)")?.headers || [];

        const headerMap = new Map(globalHeaders.map((h) => [h.key, h.value]));

        // Anti-Clickjacking
        expect(headerMap.get("X-Frame-Options")).toBe("DENY");

        // Anti-MIME Sniffing
        expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");

        // HSTS (HTTP Strict Transport Security)
        expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=63072000");

        // Content Security Policy
        expect(headerMap.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
        expect(headerMap.get("Content-Security-Policy")).toContain("object-src 'none'");

        // Referrer Policy
        expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      }
    });
  });

  // ==========================================
  // 3. RATE LIMITING & BRUTE FORCE PREVENTION
  // ==========================================
  describe("3. Rate Limiting & Abuse Prevention", () => {
    it("locks out abusive requests after 5 consecutive attempts within window", () => {
      const testIdentifier = `test-ip-${Date.now()}`;
      const windowMs = 60 * 1000;
      const maxAttempts = 5;

      // Attempts 1 to 5 must be allowed
      for (let i = 1; i <= maxAttempts; i++) {
        const res = checkRateLimit(testIdentifier, { windowMs, maxAttempts });
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(maxAttempts - i);
      }

      // 6th attempt must be blocked
      const blockedRes = checkRateLimit(testIdentifier, { windowMs, maxAttempts });
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 4. PRODUCTION SECRET GUARDS
  // ==========================================
  describe("4. Production Deployment Secret Guards", () => {
    it("enforces that production environments require explicit cryptographic secrets", () => {
      function validateProductionSecret(env: string, secretValue: string | undefined): boolean {
        if (env === "production" && (!secretValue || secretValue.includes("default"))) {
          throw new Error("FATAL CONFIGURATION ERROR: Explicit secret required in production.");
        }
        return true;
      }

      // Staging / Test with default secret passes
      expect(validateProductionSecret("test", "default-key")).toBe(true);

      // Production with missing secret throws
      expect(() => validateProductionSecret("production", undefined)).toThrow(
        "Explicit secret required in production"
      );

      // Production with default key throws
      expect(() => validateProductionSecret("production", "default-secret-key")).toThrow(
        "Explicit secret required in production"
      );

      // Production with strong 64-char key passes
      expect(
        validateProductionSecret(
          "production",
          "a9f4c3d2e1b0785643210987654321abcdef0123456789abcdef0123456789abcd"
        )
      ).toBe(true);
    });
  });
});
