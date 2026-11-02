import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getCashAndBankBook, postCashBankTransfer } from "@/lib/accounting/service";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

const ContraTransferSchema = z.object({
  fromAccountCode: z.string().min(1, "Source account code is required"),
  toAccountCode: z.string().min(1, "Destination account code is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  date: z.string().optional(),
  narration: z.string().optional(),
  referenceNumber: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const report = await getCashAndBankBook(context.tenantId, {
      startDate: startDateParam ? new Date(startDateParam) : undefined,
      endDate: endDateParam ? new Date(endDateParam) : undefined,
    });

    return NextResponse.json({
      success: true,
      report,
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
    const message = error instanceof Error ? error.message : "Failed to generate Cash & Bank Book";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "RECORD_PAYMENT");

    const body = await req.json();
    const validated = ContraTransferSchema.parse(body);

    const result = await postCashBankTransfer(context.tenantId, {
      fromAccountCode: validated.fromAccountCode,
      toAccountCode: validated.toAccountCode,
      amount: validated.amount,
      date: validated.date ? new Date(validated.date) : new Date(),
      narration: validated.narration,
      referenceNumber: validated.referenceNumber,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Contra transfer of ₹${validated.amount.toFixed(2)} posted successfully (Voucher #${result.journalEntry.entryNumber})`,
        journalEntry: result.journalEntry,
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
    const message = error instanceof Error ? error.message : "Failed to record contra transfer";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
