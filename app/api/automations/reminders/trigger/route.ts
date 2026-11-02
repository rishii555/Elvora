import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { triggerManualInvoiceReminder } from "@/lib/automation/reminders";
import { z } from "zod";

const TriggerReminderSchema = z.object({
  invoiceId: z.string().min(1, "invoiceId is required"),
});

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const json = await req.json();
    const parsed = TriggerReminderSchema.parse(json);

    const result = await triggerManualInvoiceReminder(
      context.tenantId,
      parsed.invoiceId,
      context.userId
    );

    return NextResponse.json(result);
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
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 400 });
  }
}
