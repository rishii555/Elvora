import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { createFollowUpTask, listFollowUpTasks } from "@/lib/automation/follow-ups";
import { CreateFollowUpTaskSchema } from "@/lib/automation/types";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const targetType = searchParams.get("targetType") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const data = await listFollowUpTasks(context.tenantId, {
      status,
      targetType,
      customerId,
      supplierId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...data });
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
    const json = await req.json();
    const parsed = CreateFollowUpTaskSchema.parse(json);

    const task = await createFollowUpTask(context.tenantId, parsed);
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}
