import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminContext, PlatformAdminAuthError } from "@/lib/admin/auth";
import { listPlatformTenants, getPlatformStats } from "@/lib/admin/service";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdminContext(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const planCode = searchParams.get("planCode") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const [tenantsResult, stats] = await Promise.all([
      listPlatformTenants({ search, status, planCode, page, limit }),
      getPlatformStats(),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      ...tenantsResult,
    });
  } catch (error: unknown) {
    if (error instanceof PlatformAdminAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load platform tenants";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
