import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { TenantAuthorizationError } from "@/lib/tenant/context";
import { PermissionDeniedError } from "@/lib/auth/permissions";
import { CrossTenantAccessDeniedError, CrossTenantReferenceError } from "@/lib/tenant/isolation";

/**
 * Sanitizes user input string against XSS, null-byte injection, and control characters.
 */
export function sanitizeInputString(input: string): string {
  if (typeof input !== "string") return input;

  return input
    .replace(/\0/g, "") // Remove actual null bytes
    .replace(/%00/gi, "") // Remove encoded null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Strip script blocks
    .replace(/javascript:/gi, "") // Strip javascript: URIs
    .replace(/on\w+=/gi, "") // Strip inline event handlers like onerror=, onclick=
    .trim();
}

/**
 * Bounds-checked pagination helper preventing resource exhaustion (Denial of Service).
 */
export function getSafePagination(
  pageParam: string | null | undefined,
  limitParam: string | null | undefined,
  maxLimit = 100,
  defaultLimit = 20
) {
  const parsedPage = parseInt(pageParam || "1", 10);
  const parsedLimit = parseInt(limitParam || String(defaultLimit), 10);

  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const limit = isNaN(parsedLimit) || parsedLimit < 1 ? defaultLimit : Math.min(parsedLimit, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Creates a safe, non-leaking error response for API routes.
 * Redacts database connection strings, credentials, hosts, and internal stack traces.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation error",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  if (error instanceof TenantAuthorizationError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }

  if (error instanceof PermissionDeniedError || error instanceof CrossTenantAccessDeniedError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 403 }
    );
  }

  if (error instanceof CrossTenantReferenceError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  // Generic internal or unexpected database error
  const rawMessage = error instanceof Error ? error.message : String(error);

  // Redact any potential connection string or credentials
  const isDbLeak =
    rawMessage.includes("mongodb://") ||
    rawMessage.includes("mongodb+srv://") ||
    rawMessage.includes("password") ||
    rawMessage.includes("at ") ||
    rawMessage.includes("PrismaClient");

  const safeMessage = isDbLeak
    ? "A database operation failed safely. Please contact support if the issue persists."
    : rawMessage;

  return NextResponse.json(
    {
      success: false,
      error: safeMessage,
    },
    { status: 500 }
  );
}
