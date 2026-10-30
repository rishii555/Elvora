import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";

const updateProfileSchema = z.object({
  tradeName: z.string().min(2, "Trade/Shop name must be at least 2 characters"),
  legalName: z.string().min(2, "Legal name must be at least 2 characters"),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid 15-character GSTIN format")
    .optional()
    .nullable()
    .or(z.literal("")),
  stateCode: z.string().length(2, "State code must be 2 digits (e.g., 09 for UP, 07 for DL)"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Valid email required").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  invoicePrefix: z.string().min(1).max(10).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);

    if (context.tenantId === "demo-tenant-id") {
      return NextResponse.json({
        success: true,
        tenant: {
          id: "demo-tenant-id",
          tradeName: "Universal Enterprises (Demo)",
          legalName: "Universal Enterprises Private Limited",
          gstin: "09AAACU9842F1Z6",
          stateCode: "09",
          phone: "9876543210",
          email: "admin@elvora.com",
          address: "102 Industrial Area, Sector 62, Noida, Uttar Pradesh",
          invoicePrefix: "INV-",
          currency: "INR",
        },
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: context.tenantId },
      select: {
        id: true,
        tradeName: true,
        legalName: true,
        gstin: true,
        stateCode: true,
        phone: true,
        email: true,
        address: true,
        invoicePrefix: true,
        currency: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);

    // Enforce role permission: Only OWNER can modify legal business profile
    requirePermission(context.role, "EDIT_SHOP_PROFILE");

    const body = await req.json();
    const validated = updateProfileSchema.parse(body);

    if (context.tenantId === "demo-tenant-id") {
      return NextResponse.json({
        success: true,
        message: "Profile updated successfully (Demo Mode)",
        tenant: {
          id: "demo-tenant-id",
          ...validated,
        },
      });
    }

    const updated = await prisma.tenant.update({
      where: { id: context.tenantId },
      data: {
        tradeName: validated.tradeName,
        legalName: validated.legalName,
        gstin: validated.gstin?.toUpperCase() || null,
        stateCode: validated.stateCode,
        phone: validated.phone,
        email: validated.email || null,
        address: validated.address || null,
        invoicePrefix: validated.invoicePrefix || "INV-",
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        action: "SHOP_PROFILE_UPDATED",
        entityType: "Tenant",
        entityId: context.tenantId,
        changesJson: JSON.stringify(validated),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Shop profile updated successfully",
      tenant: updated,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
