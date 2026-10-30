import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminContext, PlatformAdminAuthError } from "@/lib/admin/auth";
import {
  updateTenantSubscriptionByAdmin,
  toggleTenantAccountActive,
} from "@/lib/admin/service";

const UpdateTenantSchema = z.object({
  isActive: z.boolean().optional(),
  subscriptionStatus: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED", "GRACE_PERIOD"]).optional(),
  planCode: z.enum(["FREE_TRIAL", "STARTER", "GROWTH", "ENTERPRISE"]).optional(),
  extendTrialDays: z.number().int().min(1).max(90).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdminContext(req);
    const { id } = await params;

    const json = await req.json();
    const validated = UpdateTenantSchema.parse(json);

    if (validated.isActive !== undefined) {
      await toggleTenantAccountActive(id, validated.isActive);
    }

    if (validated.subscriptionStatus || validated.planCode || validated.extendTrialDays) {
      await updateTenantSubscriptionByAdmin(id, {
        status: validated.subscriptionStatus,
        planCode: validated.planCode,
        extendTrialDays: validated.extendTrialDays,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Tenant account & subscription updated successfully`,
    });
  } catch (error: unknown) {
    if (error instanceof PlatformAdminAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update tenant";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
