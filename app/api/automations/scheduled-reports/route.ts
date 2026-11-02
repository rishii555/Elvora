import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import {
  createScheduledReport,
  listScheduledReports,
  toggleScheduledReport,
  deleteScheduledReport,
} from "@/lib/automation/scheduled-reports";
import { z } from "zod";

const CreateScheduleSchema = z.object({
  reportType: z.enum([
    "SALES_SUMMARY",
    "PURCHASE_SUMMARY",
    "PROFITABILITY",
    "EXPENSES",
    "INVENTORY_VALUATION",
    "STOCK_MOVEMENT",
    "LOW_STOCK",
    "CUSTOMER_OUTSTANDING",
    "SUPPLIER_OUTSTANDING",
    "CASH_FLOW",
    "GENERAL_LEDGER",
    "TRIAL_BALANCE",
    "BALANCE_SHEET",
  ]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("DAILY"),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(["CSV", "JSON"]).default("CSV"),
  startDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const schedules = await listScheduledReports(context.tenantId);
    return NextResponse.json({ success: true, schedules });
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
    const parsed = CreateScheduleSchema.parse(json);

    const schedule = await createScheduledReport(context.tenantId, parsed as any);
    return NextResponse.json({ success: true, schedule }, { status: 201 });
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

export async function PATCH(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_AUTOMATION");

    const json = await req.json();
    if (!json.id || typeof json.isEnabled !== "boolean") {
      return NextResponse.json({ success: false, error: "id and isEnabled boolean required" }, { status: 400 });
    }

    await toggleScheduledReport(context.tenantId, json.id, json.isEnabled);
    return NextResponse.json({ success: true, isEnabled: json.isEnabled });
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

export async function DELETE(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_AUTOMATION");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Schedule id required" }, { status: 400 });
    }

    await deleteScheduledReport(context.tenantId, id);
    return NextResponse.json({ success: true, message: "Schedule deleted" });
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
