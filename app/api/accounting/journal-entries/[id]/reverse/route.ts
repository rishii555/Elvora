import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { reverseJournalEntry } from "@/lib/accounting/service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

const ReverseJournalSchema = z.object({
  reversalDate: z.string().optional(),
  reason: z.string().min(3, "Reversal reason is required").optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_ACCOUNTING");

    const { id } = await params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }
    const validated = ReverseJournalSchema.parse(body);

    const result = await reverseJournalEntry(
      context.tenantId,
      id,
      validated.reversalDate ? new Date(validated.reversalDate) : new Date(),
      validated.reason
    );

    return NextResponse.json({
      success: true,
      message: `Reversal voucher #${result.journalEntry.entryNumber} posted successfully`,
      journalEntry: result.journalEntry,
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
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Failed to reverse journal entry";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
