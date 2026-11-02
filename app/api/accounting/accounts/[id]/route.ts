import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma, { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { updateLedgerAccount, deleteLedgerAccount, getAccountLedger } from "@/lib/accounting/service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

const UpdateAccountSchema = z.object({
  name: z.string().min(2, "Account name must be at least 2 characters").max(100).optional(),
  category: z.string().max(50).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { id } = await params;
    const account = await prisma.ledgerAccount.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const ledger = await getAccountLedger(
      context.tenantId,
      account.code,
      {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined,
      }
    );

    return NextResponse.json({
      success: true,
      account,
      ledger: ledger.ledger,
      currentBalance: ledger.currentBalance,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch account ledger";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_ACCOUNTING");

    const { id } = await params;
    const body = await req.json();
    const validated = UpdateAccountSchema.parse(body);

    const updated = await updateLedgerAccount(context.tenantId, id, validated);

    return NextResponse.json({
      success: true,
      message: `Account '${updated.name}' updated successfully`,
      account: updated,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof CrossTenantAccessDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update account";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_ACCOUNTING");

    const { id } = await params;
    await deleteLedgerAccount(context.tenantId, id);

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof CrossTenantAccessDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Failed to delete account";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
