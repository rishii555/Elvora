import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { updateFollowUpTask, completeFollowUpTask } from "@/lib/automation/follow-ups";
import prisma from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;

    const task = await prisma.followUpTask.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, task });
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
    const { id } = await params;
    const json = await req.json();

    if (json.complete) {
      await completeFollowUpTask(context.tenantId, id);
      return NextResponse.json({ success: true, message: "Task marked complete" });
    }

    await updateFollowUpTask(context.tenantId, id, json);
    return NextResponse.json({ success: true, message: "Task updated" });
  } catch (error: any) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
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
    const { id } = await params;

    await prisma.followUpTask.deleteMany({
      where: { id, tenantId: context.tenantId },
    });

    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error: any) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}
