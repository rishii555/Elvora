import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import {
  listJournalEntries,
  createManualJournalEntry,
  UnbalancedJournalEntryError,
} from "@/lib/accounting/service";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

const JournalLineSchema = z.object({
  accountCode: z.string().min(1, "Account code is required"),
  debit: z.coerce.number().min(0, "Debit cannot be negative").default(0),
  credit: z.coerce.number().min(0, "Credit cannot be negative").default(0),
  description: z.string().optional(),
});

const CreateJournalEntrySchema = z.object({
  entryDate: z.string().optional(),
  narration: z.string().min(3, "Narration is required and must be at least 3 characters"),
  referenceId: z.string().optional(),
  lines: z
    .array(JournalLineSchema)
    .min(2, "Journal entry must have at least two lines (one debit and one credit)"),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const referenceType = searchParams.get("referenceType") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await listJournalEntries(context.tenantId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      referenceType,
      search,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
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
    const message = error instanceof Error ? error.message : "Failed to fetch journal entries";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_ACCOUNTING");

    const body = await req.json();
    const validated = CreateJournalEntrySchema.parse(body);

    const result = await createManualJournalEntry(context.tenantId, {
      entryDate: validated.entryDate ? new Date(validated.entryDate) : new Date(),
      narration: validated.narration,
      referenceId: validated.referenceId,
      lines: validated.lines,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Journal voucher #${result.journalEntry.entryNumber} posted successfully`,
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
    if (error instanceof UnbalancedJournalEntryError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 422 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Failed to post journal entry";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
