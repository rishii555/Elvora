import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { createPurchaseInvoice, listPurchaseInvoices } from "@/lib/purchases/service";

const PurchaseItemSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative"),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  gstRate: z.coerce.number().min(0).optional(),
  supplierItemCode: z.string().optional(),
});

const CreatePurchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required"),
  invoiceNumber: z.string().min(1, "Supplier invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, "At least one item is required"),
  freightAmount: z.coerce.number().min(0).optional(),
  additionalDiscount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]).default("BANK_TRANSFER"),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const supplierId = searchParams.get("supplierId") || undefined;
    const search = searchParams.get("search") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await listPurchaseInvoices(context.tenantId, {
      supplierId,
      search,
      paymentStatus,
      status,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load purchases";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "RECORD_PURCHASE");

    const body = await req.json();
    const validated = CreatePurchaseInvoiceSchema.parse(body);

    const invoice = await createPurchaseInvoice({
      tenantId: context.tenantId,
      userId: context.userId,
      supplierId: validated.supplierId,
      invoiceNumber: validated.invoiceNumber,
      invoiceDate: new Date(validated.invoiceDate),
      dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
      items: validated.items,
      freightAmount: validated.freightAmount || 0,
      additionalDiscount: validated.additionalDiscount || 0,
      paidAmount: validated.paidAmount || 0,
      paymentMode: validated.paymentMode,
      paymentReference: validated.paymentReference,
      notes: validated.notes,
    });

    return NextResponse.json({
      success: true,
      message: `Purchase bill #${invoice.invoiceNumber} recorded and stock receipted successfully`,
      invoice,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to record purchase";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
