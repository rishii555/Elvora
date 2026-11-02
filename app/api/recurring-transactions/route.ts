import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import {
  createRecurringTransaction,
  listRecurringTransactions,
} from "@/lib/automation/recurring";
import { CreateRecurringTransactionSchema } from "@/lib/automation/types";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const transactionType = searchParams.get("type") as any;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined;

    const items = await listRecurringTransactions(context.tenantId, {
      transactionType,
      isActive,
    });

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_AUTOMATION");

    const json = await req.json();
    const parsed = CreateRecurringTransactionSchema.parse(json);

    const created = await createRecurringTransaction(context.tenantId, parsed);
    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}
