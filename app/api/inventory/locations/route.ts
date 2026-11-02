import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createInventoryLocation,
  listInventoryLocations,
  getOrCreateDefaultLocation,
  LocationNameExistsError,
} from "@/lib/inventory/warehouse-service";

const CreateLocationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  code: z.string().optional(),
  address: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

const ToggleWarehouseSchema = z.object({
  enableWarehouses: z.boolean(),
  defaultWarehouseName: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);

    const [config, locations] = await Promise.all([
      prisma.tenantConfig.findUnique({
        where: { tenantId: context.tenantId },
      }),
      listInventoryLocations(context.tenantId, { includeInactive: false }),
    ]);

    const enableWarehouses = config?.enableWarehouses ?? false;
    const defaultWarehouse = locations.find((l: any) => !l.isDefault) || locations[0];
    const defaultWarehouseName = defaultWarehouse?.name || "Central Godown";

    return NextResponse.json({
      success: true,
      enableWarehouses,
      defaultWarehouseName,
      locations,
      totalLocations: locations.length,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch locations";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();

    // 1. Handle multi-warehouse mode toggle
    if (body.action === "TOGGLE_WAREHOUSES" || "enableWarehouses" in body) {
      const parsed = ToggleWarehouseSchema.parse(body);

      const updatedConfig = await prisma.tenantConfig.upsert({
        where: { tenantId: context.tenantId },
        update: {
          enableWarehouses: parsed.enableWarehouses,
        },
        create: {
          tenantId: context.tenantId,
          businessType: "sanitaryware",
          enableWarehouses: parsed.enableWarehouses,
        },
      });

      // When enabling warehouses, guarantee at least a primary and secondary warehouse exist
      if (parsed.enableWarehouses) {
        await getOrCreateDefaultLocation(context.tenantId);

        const whName = parsed.defaultWarehouseName?.trim() || "Central Godown";
        const existingWh = await prisma.inventoryLocation.findFirst({
          where: {
            tenantId: context.tenantId,
            name: { equals: whName, mode: "insensitive" },
          },
        });

        if (!existingWh) {
          await createInventoryLocation(context.tenantId, {
            name: whName,
            code: "WH-1",
            isDefault: false,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: parsed.enableWarehouses
          ? "Multi-warehouse management enabled"
          : "Single shop counter mode active",
        config: updatedConfig,
      });
    }

    // 2. Create new inventory location
    const validated = CreateLocationSchema.parse(body);

    const location = await createInventoryLocation(context.tenantId, {
      name: validated.name,
      code: validated.code,
      address: validated.address,
      isDefault: validated.isDefault,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Location created successfully",
        location,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof LocationNameExistsError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to process location request";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
