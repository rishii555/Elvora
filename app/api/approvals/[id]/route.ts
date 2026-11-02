import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { processApprovalDecision } from "@/lib/automation/approvals";
import { ApprovalDecisionSchema } from "@/lib/automation/types";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;

    const approval = await prisma.workflowApproval.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!approval) {
      return NextResponse.json({ success: false, error: "Approval request not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      approval: {
        ...approval,
        metadata: approval.metadataJson ? JSON.parse(approval.metadataJson) : null,
      },
    });
  } catch (error: any) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "APPROVE_WORKFLOWS");
    const { id } = await params;

    const json = await req.json();
    const parsed = ApprovalDecisionSchema.parse(json);

    const updated = await processApprovalDecision({
      tenantId: context.tenantId,
      approvalId: id,
      approverId: context.userId,
      approverName: "Reviewer",
      approverRole: context.role,
      decision: parsed.decision,
      notes: parsed.notes,
      rejectionReason: parsed.rejectionReason,
    });

    return NextResponse.json({ success: true, approval: updated });
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
    // Segregation of duties error or validation error
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 400 });
  }
}
