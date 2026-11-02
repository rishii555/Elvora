import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { runSchedulerCycle } from "@/lib/automation/scheduler";
import { checkTenantRateLimit } from "@/lib/auth/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_AUTOMATION");

    // Rate limit expensive background task cycles (max 10 per minute per tenant)
    const rateLimit = checkTenantRateLimit(context.tenantId, "automation-run", {
      windowMs: 60 * 1000,
      maxAttempts: 10,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Rate limit exceeded. Please wait ${rateLimit.retryAfterSeconds}s before triggering again.` },
        { status: 429, headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() } }
      );
    }

    const result = await runSchedulerCycle(context.tenantId);

    return NextResponse.json({
      success: true,
      summary: result,
    });
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
