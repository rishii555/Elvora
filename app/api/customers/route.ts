import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";

const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Phone number is required"),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().optional(),
  stateCode: z.string().default("09"),
  address: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
  openingBalance: z.coerce.number().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {
      tenantId: context.tenantId,
    };

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { phone: { contains: s, mode: "insensitive" } },
        { gstin: { contains: s, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [totalCount, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    const totalOutstanding = await prisma.customer.aggregate({
      where: { tenantId: context.tenantId },
      _sum: { outstandingBalance: true },
    });

    return NextResponse.json({
      success: true,
      customers,
      totalCount,
      totalOutstanding: totalOutstanding._sum?.outstandingBalance || 0,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load customers";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "CREATE_INVOICE");

    const body = await req.json();
    const validated = CreateCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        tenantId: context.tenantId,
        name: validated.name,
        phone: validated.phone,
        email: validated.email || null,
        gstin: validated.gstin?.toUpperCase() || null,
        stateCode: validated.stateCode,
        address: validated.address || null,
        creditLimit: validated.creditLimit,
        outstandingBalance: validated.openingBalance || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer added successfully",
      customer,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create customer";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
