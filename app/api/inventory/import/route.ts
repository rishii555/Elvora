import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { parseInventoryCsv, importInventoryRows } from "@/lib/inventory/csv";

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    let csvContent = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No CSV file provided in upload" },
          { status: 400 }
        );
      }
      csvContent = await file.text();
    } else {
      const body = await req.json();
      csvContent = body.csvData || "";
    }

    if (!csvContent || !csvContent.trim()) {
      return NextResponse.json(
        { success: false, error: "CSV content cannot be empty" },
        { status: 400 }
      );
    }

    // Security Guard: Prevent DoS via oversized file payload (5MB limit)
    const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024;
    if (Buffer.byteLength(csvContent, "utf-8") > MAX_CSV_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Payload too large: CSV file exceeds the 5MB maximum allowed upload size" },
        { status: 413 }
      );
    }

    const parseResult = parseInventoryCsv(csvContent);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "CSV validation failed",
          details: parseResult.errors,
        },
        { status: 400 }
      );
    }

    // Security Guard: Prevent CPU exhaustion via excessive batch rows (2,500 row limit)
    const MAX_IMPORT_ROWS = 2500;
    if (parseResult.rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch row limit exceeded: CSV contains ${parseResult.rows.length} rows (maximum allowed per batch is ${MAX_IMPORT_ROWS})`,
        },
        { status: 400 }
      );
    }

    const importResult = await importInventoryRows(context.tenantId, parseResult.rows);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${parseResult.rows.length} items (${importResult.importedCount} new, ${importResult.updatedCount} updated)`,
      importedCount: importResult.importedCount,
      updatedCount: importResult.updatedCount,
      errors: importResult.errors,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to import CSV";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
