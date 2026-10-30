import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminContext, PlatformAdminAuthError } from "@/lib/admin/auth";
import { reviewRegistration } from "@/lib/admin/registrations-service";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "REACTIVATE"]),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePlatformAdminContext(req);
    const { id } = await params;

    const body = await req.json();
    const validated = reviewSchema.parse(body);

    const result = await reviewRegistration(id, {
      action: validated.action,
      reason: validated.reason,
      reviewedBy: admin.email,
    });

    return NextResponse.json({
      message: `Registration successfully updated to ${result.newStatus}`,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof PlatformAdminAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to review registration";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
