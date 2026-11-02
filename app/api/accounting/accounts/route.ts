import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import {
  listLedgerAccounts,
  createLedgerAccount,
  AccountType,
} from "@/lib/accounting/service";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

const CreateAccountSchema = z.object({
  code: z
    .string()
    .min(3, "Account code must be at least 3 characters")
    .max(30, "Account code cannot exceed 30 characters")
    .regex(/^[A-Z0-9_]+$/, "Account code must contain only uppercase letters, numbers, and underscores"),
  name: z.string().min(2, "Account name must be at least 2 characters").max(100),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  category: z.string().max(50).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type");
    const search = searchParams.get("search") || undefined;

    const validTypes: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
    const type = validTypes.includes(typeParam as AccountType) ? (typeParam as AccountType) : undefined;

    const accounts = await listLedgerAccounts(context.tenantId, { type, search });

    return NextResponse.json({
      success: true,
      accounts,
      count: accounts.length,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch accounts";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_ACCOUNTING");

    const body = await req.json();
    const validated = CreateAccountSchema.parse({
      ...body,
      code: typeof body.code === "string" ? body.code.trim().toUpperCase() : body.code,
    });

    const account = await createLedgerAccount(context.tenantId, {
      code: validated.code,
      name: validated.name,
      type: validated.type,
      category: validated.category,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Account '${account.name}' (${account.code}) created successfully`,
        account,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Failed to create account";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
