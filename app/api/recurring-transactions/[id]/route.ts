import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import {
  setRecurringTransactionActive,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "@/lib/automation/recurring";
import prisma from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;

    const item = await prisma.recurringTransaction.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: "Recurring transaction not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        templateData: item.templateData ? JSON.parse(item.templateData) : {},
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
    requirePermission(context.role, "MANAGE_AUTOMATION");
    const { id } = await params;

    const json = await req.json();
    if (typeof json.isActive !== "boolean") {
      return NextResponse.json({ success: false, error: "isActive boolean required" }, { status: 400 });
    }

    await setRecurringTransactionActive(context.tenantId, id, json.isActive);
    return NextResponse.json({ success: true, isActive: json.isActive });
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_AUTOMATION");
    const { id } = await params;

    const json = await req.json();
    await updateRecurringTransaction(context.tenantId, id, json);

    return NextResponse.json({ success: true, message: "Template updated" });
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

    await deleteRecurringTransaction(context.tenantId, id);
    return NextResponse.json({ success: true, message: "Template deleted" });
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
