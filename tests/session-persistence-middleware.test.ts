import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getSessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";
import { middleware } from "@/middleware";

describe("Authentication Session Persistence & Middleware Routing Suite", () => {
  const mockUserPayload = {
    userId: "test-user-id-001",
    email: "test.merchant@elvora.com",
    name: "Test Merchant",
    activeTenantId: "test-tenant-id-001",
    role: "OWNER" as const,
  };

  describe("Cookie Configuration & Specifications", () => {
    it("enforces exact cookie name 'elvora_session'", () => {
      expect(SESSION_COOKIE_NAME).toBe("elvora_session");
    });

    it("enforces 7-day expiration (604,800 seconds)", () => {
      expect(SESSION_MAX_AGE_SECONDS).toBe(604800);
      const options = getSessionCookieOptions();
      expect(options.maxAge).toBe(604800);
    });

    it("configures HttpOnly: true, SameSite: lax, Path: /", () => {
      const options = getSessionCookieOptions();
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe("lax");
      expect(options.path).toBe("/");
    });

    it("configures Secure flag dynamically based on environment", () => {
      // In development / test environment
      const devOptions = getSessionCookieOptions();
      expect(devOptions.secure).toBe(process.env.NODE_ENV === "production");
    });

    it("configures maxAge: 0 for logout cookie invalidation", () => {
      const logoutOptions = getSessionCookieOptions(0);
      expect(logoutOptions.maxAge).toBe(0);
      expect(logoutOptions.httpOnly).toBe(true);
      expect(logoutOptions.sameSite).toBe("lax");
      expect(logoutOptions.path).toBe("/");
    });
  });

  describe("JWT Signing and Verification Integrity", () => {
    it("signs and successfully verifies a 7-day session token", async () => {
      const token = await signSessionToken(mockUserPayload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // Standard 3-segment JWT

      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(mockUserPayload.userId);
      expect(verified?.email).toBe(mockUserPayload.email);
      expect(verified?.activeTenantId).toBe(mockUserPayload.activeTenantId);
      expect(verified?.role).toBe(mockUserPayload.role);
    });

    it("rejects forged or corrupted tokens", async () => {
      const verified = await verifySessionToken("invalid.corrupted.token");
      expect(verified).toBeNull();
    });
  });

  describe("Middleware Route Protection & Session Detection", () => {
    it("redirects authenticated user from root '/' to '/dashboard'", async () => {
      const token = await signSessionToken(mockUserPayload);
      const req = new NextRequest("http://localhost:3000/", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${token}`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(307); // Temporary redirect
      const location = res.headers.get("location");
      expect(location).toBe("http://localhost:3000/dashboard");
    });

    it("allows unauthenticated user to view public landing page at root '/'", async () => {
      const req = new NextRequest("http://localhost:3000/");
      const res = await middleware(req);
      // Next() does not redirect
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects authenticated user from '/login' to '/dashboard'", async () => {
      const token = await signSessionToken(mockUserPayload);
      const req = new NextRequest("http://localhost:3000/login", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${token}`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("redirects authenticated user from '/register' to '/dashboard'", async () => {
      const token = await signSessionToken(mockUserPayload);
      const req = new NextRequest("http://localhost:3000/register", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${token}`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("redirects unauthenticated user accessing protected '/dashboard' to '/login' with returnUrl", async () => {
      const req = new NextRequest("http://localhost:3000/dashboard");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe("http://localhost:3000/login?returnUrl=%2Fdashboard");
    });

    it("redirects unauthenticated user accessing protected '/pos' to '/login' with returnUrl", async () => {
      const req = new NextRequest("http://localhost:3000/pos");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe("http://localhost:3000/login?returnUrl=%2Fpos");
    });

    it("allows authenticated user with valid session cookie to access protected routes", async () => {
      const token = await signSessionToken(mockUserPayload);
      const req = new NextRequest("http://localhost:3000/dashboard", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${token}`,
        },
      });

      const res = await middleware(req);
      // Allowed through
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects to login when session cookie contains an invalid or expired token on protected route", async () => {
      const req = new NextRequest("http://localhost:3000/inventory", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=expired.invalid.token`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/login?returnUrl=%2Finventory");
    });
  });
});
