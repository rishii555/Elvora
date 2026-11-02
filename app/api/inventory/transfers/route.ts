import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import {
  executeWarehouseTransfer,
  InvalidTransferError,
} from "@/lib/inventory/warehouse-service";
import { InsufficientStockError } from "@/lib/inventory/service";
import {
  QuantityPrecisionError,
  QuantityValidationError,
  UOMMismatchError,
} from "@/lib/inventory/precision";
import { CrossTenantReferenceError } from "@/lib/tenant/isolation";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

const TransferItemSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z.union([z.number(), z.string()]).refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Quantity must be a positive number" }
  ),
  uom: z.string().optional(),
});

const CreateTransferSchema = z.object({
  sourceLocationId: z.string().min(1, "Source location ID is required"),
  destinationLocationId: z.string().min(1, "Destination location ID is required"),
  items: z.array(TransferItemSchema).min(1, "At least one item must be transferred"),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();
    const validated = CreateTransferSchema.parse(body);

    const result = await executeWarehouseTransfer({
      tenantId: context.tenantId,
      sourceLocationId: validated.sourceLocationId,
      destinationLocationId: validated.destinationLocationId,
      items: validated.items,
      notes: validated.notes,
      idempotencyKey: validated.idempotencyKey,
      userId: context.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.idempotent
          ? "Transfer already processed (idempotent response)"
          : "Warehouse stock transfer executed successfully",
        idempotent: result.idempotent,
        transferId: result.transferId,
        movements: result.movements,
      },
      { status: result.idempotent ? 200 : 201 }
    );
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          variantId: error.variantId,
          availableStock: error.availableStock,
          requestedQuantity: error.requestedQuantity,
        },
        { status: 422 }
      );
    }
    if (
      error instanceof InvalidTransferError ||
      error instanceof QuantityPrecisionError ||
      error instanceof QuantityValidationError ||
      error instanceof UOMMismatchError
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof CrossTenantReferenceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to execute stock transfer";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const locationId = searchParams.get("locationId") || undefined;

    const where: any = {
      tenantId: context.tenantId,
      type: "TRANSFER",
    };
    if (locationId) {
      where.locationId = locationId;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        location: { select: { id: true, name: true, code: true } },
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            product: { select: { name: true, uom: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      transfers: movements.map((m: any) => ({
        id: m.id,
        transferId: m.referenceId,
        type: m.type,
        reason: m.reason,
        locationId: m.locationId,
        locationName: m.location?.name || "Unknown Location",
        variantId: m.variantId,
        variantName: m.variant?.name,
        sku: m.variant?.sku,
        productName: m.variant?.product?.name,
        uom: m.variant?.product?.uom,
        quantity: m.quantity,
        balanceAfter: m.balanceAfter,
        notes: m.notes,
        createdAt: m.createdAt,
      })),
      totalCount: movements.length,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch transfers";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
