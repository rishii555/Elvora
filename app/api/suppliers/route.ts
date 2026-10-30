import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import { createSupplier, listSuppliers } from "@/lib/purchases/service";

const CreateSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  companyName: z.string().optional(),
  gstin: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  stateCode: z.string().default("09"),
  openingBalance: z.coerce.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await listSuppliers(context.tenantId, { search, page, limit });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load suppliers";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "RECORD_PURCHASE");

    const body = await req.json();
    const validated = CreateSupplierSchema.parse(body);

    const supplier = await createSupplier({
      tenantId: context.tenantId,
      name: validated.name,
      companyName: validated.companyName,
      gstin: validated.gstin,
      phone: validated.phone,
      email: validated.email || undefined,
      address: validated.address,
      stateCode: validated.stateCode,
      openingBalance: validated.openingBalance || 0,
    });

    return NextResponse.json({
      success: true,
      message: "Supplier profile created successfully",
      supplier,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create supplier";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
