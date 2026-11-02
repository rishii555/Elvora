import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from "@/lib/automation/notifications";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || undefined;
    const isReadParam = searchParams.get("isRead");
    const isRead = isReadParam !== null ? isReadParam === "true" : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const [data, unreadCount] = await Promise.all([
      listNotifications(context.tenantId, context.userId, {
        category,
        isRead,
        page,
        limit,
      }),
      getUnreadNotificationCount(context.tenantId, context.userId),
    ]);

    return NextResponse.json({
      success: true,
      unreadCount,
      ...data,
    });
  } catch (error: any) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const json = await req.json().catch(() => ({}));

    if (json.all) {
      await markAllNotificationsRead(context.tenantId, context.userId);
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (json.id) {
      await markNotificationRead(context.tenantId, json.id, context.userId);
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    }

    return NextResponse.json({ success: false, error: "Provide notification id or all: true" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}
