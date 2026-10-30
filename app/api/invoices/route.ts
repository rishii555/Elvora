import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { createSalesInvoice, listSalesInvoices } from "@/lib/invoices/service";
import { PlanLimitExceededError } from "@/lib/billing/types";

const CreateInvoiceItemSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  isTaxInclusive: z.boolean().optional(),
});

const CreateSalesInvoiceSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerGstin: z.string().optional(),
  customerStateCode: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  placeOfSupply: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(CreateInvoiceItemSchema).min(1, "At least one line item is required"),
  additionalDiscount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  paymentMode: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CREDIT", "SPLIT"]).default("CASH"),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "FINALIZED"]).default("FINALIZED"),
  idempotencyKey: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") || "ALL") as any;
    const invoiceType = (searchParams.get("invoiceType") || "ALL") as any;
    const paymentStatus = (searchParams.get("paymentStatus") || "ALL") as any;
    const customerId = searchParams.get("customerId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await listSalesInvoices(context.tenantId, {
      search,
      status,
      invoiceType,
      paymentStatus,
      customerId,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: context.tenantId,
        name: context.tenantName,
        role: context.role,
      },
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load invoices";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "CREATE_INVOICE");

    const body = await req.json();
    const validated = CreateSalesInvoiceSchema.parse(body);

    const result = await createSalesInvoice({
      tenantId: context.tenantId,
      userId: context.userId,
      customerId: validated.customerId,
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      customerEmail: validated.customerEmail || undefined,
      customerGstin: validated.customerGstin,
      customerStateCode: validated.customerStateCode,
      billingAddress: validated.billingAddress,
      shippingAddress: validated.shippingAddress,
      placeOfSupply: validated.placeOfSupply,
      invoiceDate: validated.invoiceDate ? new Date(validated.invoiceDate) : new Date(),
      dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
      items: validated.items,
      additionalDiscount: validated.additionalDiscount || 0,
      paidAmount: validated.paidAmount || 0,
      paymentMode: validated.paymentMode,
      notes: validated.notes,
      status: validated.status,
      idempotencyKey: validated.idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      message: result.isDuplicate
        ? "Invoice already exists (idempotent response)"
        : "Invoice created successfully",
      isDuplicate: result.isDuplicate,
      invoice: result.invoice,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PlanLimitExceededError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "PLAN_LIMIT_EXCEEDED",
          limitType: error.limitType,
          currentUsage: error.currentUsage,
          maxLimit: error.maxLimit,
        },
        { status: 403 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create invoice";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
