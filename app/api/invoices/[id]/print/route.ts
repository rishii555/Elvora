import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { getInvoicePrintDetails } from "@/lib/invoices/service";
import { generateA4InvoiceHtml, generateThermalReceiptHtml } from "@/lib/invoices/print-template";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "a4"; // "a4" | "thermal"

    const data = await getInvoicePrintDetails(context.tenantId, id);

    const html =
      format === "thermal"
        ? generateThermalReceiptHtml(data)
        : generateA4InvoiceHtml(data);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load invoice for printing";
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}
