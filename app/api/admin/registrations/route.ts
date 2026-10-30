import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminContext, PlatformAdminAuthError } from "@/lib/admin/auth";
import { listRegistrations } from "@/lib/admin/registrations-service";
import { AccountStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdminContext(req);

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await listRegistrations({
      status: statusParam as "ALL" | AccountStatus,
      search,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof PlatformAdminAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load registrations";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
