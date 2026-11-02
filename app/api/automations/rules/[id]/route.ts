import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { UpdateAutomationRuleSchema } from "@/lib/automation/types";
import { updateAutomationRule, deleteAutomationRule } from "@/lib/automation/rules-engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;

    const rule = await prisma.automationRule.findFirst({
      where: { id, tenantId: context.tenantId },
      include: { executions: { take: 10, orderBy: { executedAt: "desc" } } },
    });

    if (!rule) {
      return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        conditions: rule.conditionsJson ? JSON.parse(rule.conditionsJson) : null,
        actionConfig: rule.actionConfigJson ? JSON.parse(rule.actionConfigJson) : {},
      },
    });
  } catch (error: any) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_AUTOMATION");
    const { id } = await params;

    const json = await req.json();
    const parsed = UpdateAutomationRuleSchema.parse(json);

    await updateAutomationRule(context.tenantId, id, parsed);
    return NextResponse.json({ success: true, message: "Rule updated" });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_AUTOMATION");
    const { id } = await params;

    const json = await req.json();
    if (typeof json.isEnabled !== "boolean") {
      return NextResponse.json({ success: false, error: "isEnabled boolean required" }, { status: 400 });
    }

    await updateAutomationRule(context.tenantId, id, { isEnabled: json.isEnabled });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_AUTOMATION");
    const { id } = await params;

    await deleteAutomationRule(context.tenantId, id);
    return NextResponse.json({ success: true, message: "Rule deleted" });
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
