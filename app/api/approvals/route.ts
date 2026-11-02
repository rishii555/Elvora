import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { listApprovals, requestWorkflowApproval } from "@/lib/automation/approvals";
import { z } from "zod";

const RequestApprovalSchema = z.object({
  workflowType: z.enum([
    "PURCHASE_ORDER",
    "EXPENSE",
    "PAYMENT",
    "STOCK_ADJUSTMENT",
    "JOURNAL_ENTRY",
  ]),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  entityNumber: z.string().optional(),
  amount: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as any;
    const workflowType = searchParams.get("workflowType") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const data = await listApprovals(context.tenantId, {
      status,
      workflowType,
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
    const parsed = RequestApprovalSchema.parse(json);

    const result = await requestWorkflowApproval({
      tenantId: context.tenantId,
      workflowType: parsed.workflowType,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      entityNumber: parsed.entityNumber,
      amount: parsed.amount,
      requesterId: context.userId,
      requesterName: "User",
      metadata: parsed.metadata,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
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
