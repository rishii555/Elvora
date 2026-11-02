import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import {
  getNotificationPreferences,
  updateNotificationPreference,
} from "@/lib/automation/notifications";
import { z } from "zod";

const UpdatePreferenceSchema = z.object({
  category: z.string().min(1),
  inAppEnabled: z.boolean(),
  emailMockEnabled: z.boolean(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const preferences = await getNotificationPreferences(context.tenantId, context.userId);
    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const json = await req.json();
    const parsed = UpdatePreferenceSchema.parse(json);

    const updated = await updateNotificationPreference(
      context.tenantId,
      context.userId,
      parsed.category,
      parsed.inAppEnabled,
      parsed.emailMockEnabled
    );

    return NextResponse.json({ success: true, preference: updated });
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
