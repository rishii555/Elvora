import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { generateReportExport, ExportReportType, ExportFormat } from "@/lib/reports/export";
import { AnalyticsPeriod } from "@/lib/analytics/service";
import { checkTenantRateLimit } from "@/lib/auth/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    // Rate limit report exports (max 30 per minute per tenant)
    const rateLimit = checkTenantRateLimit(context.tenantId, "report-export", {
      windowMs: 60 * 1000,
      maxAttempts: 30,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Export rate limit exceeded. Please retry in ${rateLimit.retryAfterSeconds}s.` },
        { status: 429, headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() } }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "SALES_SUMMARY") as ExportReportType;
    const period = (searchParams.get("period") || "monthly") as AnalyticsPeriod;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const rawFormat = (searchParams.get("format") || "CSV").toUpperCase();
    let format: ExportFormat = "CSV";
    if (rawFormat === "EXCEL" || rawFormat === "XLS" || rawFormat === "XLSX") {
      format = "EXCEL";
    } else if (rawFormat === "PDF" || rawFormat === "HTML") {
      format = "PDF";
    }

    const { filename, content, contentType } = await generateReportExport(
      context.tenantId,
      type,
      {
        period,
        startDate,
        endDate,
      },
      format
    );

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to export report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
