import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { listAuditLogs } from "@/lib/audit/service";
import { handleApiError, getSafePagination } from "@/lib/api/security";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const action = searchParams.get("action") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const { page, limit } = getSafePagination(
      searchParams.get("page"),
      searchParams.get("limit"),
      100,
      50
    );

    const result = await listAuditLogs(context.tenantId, {
      entityType,
      entityId,
      action,
      userId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
