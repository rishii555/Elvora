import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import {
  updateInventoryLocation,
  archiveInventoryLocation,
  LocationNotFoundError,
  LocationNameExistsError,
  LocationHasStockError,
} from "@/lib/inventory/warehouse-service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

const UpdateLocationSchema = z.object({
  name: z.string().min(1, "Location name cannot be empty").optional(),
  code: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireTenantContext(req);
    const { id } = await params;

    const location = await prisma.inventoryLocation.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!location) {
      return NextResponse.json({ success: false, error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, location });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch location";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const { id } = await params;
    const body = await req.json();
    const validated = UpdateLocationSchema.parse(body);

    const updated = await updateInventoryLocation(context.tenantId, id, validated);

    return NextResponse.json({
      success: true,
      message: "Location updated successfully",
      location: updated,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof LocationNotFoundError || error instanceof CrossTenantAccessDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof LocationNameExistsError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof LocationHasStockError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          remainingStock: error.remainingStock,
        },
        { status: 400 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update location";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const { id } = await params;

    const archived = await archiveInventoryLocation(context.tenantId, id);

    return NextResponse.json({
      success: true,
      message: "Location successfully archived",
      location: archived,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof LocationNotFoundError || error instanceof CrossTenantAccessDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof LocationHasStockError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          remainingStock: error.remainingStock,
        },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to archive location";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
