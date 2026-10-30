import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { calculateTenantDashboardMetrics, DateRangeKey } from "@/lib/dashboard/metrics";

export async function GET(req: NextRequest) {
  const reqStart = performance.now();
  let authDuration = 0;
  let dbDuration = 0;

  try {
    // Strictly authenticate tenant context from session cookie
    const authStart = performance.now();
    const context = await requireTenantContext(req);
    authDuration = performance.now() - authStart;

    const { searchParams } = new URL(req.url);
    const rangeParam = (searchParams.get("range") || "30d").toLowerCase() as DateRangeKey;

    const validRanges: DateRangeKey[] = ["7d", "30d", "this_month", "90d", "this_year"];
    const range: DateRangeKey = validRanges.includes(rangeParam) ? rangeParam : "30d";

    // Strictly isolated query using verified session tenantId
    const dbStart = performance.now();
    const metrics = await calculateTenantDashboardMetrics(context.tenantId, range);
    dbDuration = performance.now() - dbStart;

    const totalDuration = performance.now() - reqStart;

    const response = NextResponse.json({
      success: true,
      tenant: {
        id: context.tenantId,
        name: context.tenantName,
        role: context.role,
      },
      ...metrics,
    });

    response.headers.set(
      "Server-Timing",
      `auth;dur=${authDuration.toFixed(1)}, db;dur=${dbDuration.toFixed(1)}, total;dur=${totalDuration.toFixed(1)}`
    );

    return response;
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to load dashboard metrics";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
