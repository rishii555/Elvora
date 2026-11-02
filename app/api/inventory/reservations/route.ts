import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import {
  reserveStock,
  listStockReservations,
  InsufficientAvailableStockError,
  InvalidReservationStateError,
} from "@/lib/inventory/reservation-service";
import {
  QuantityPrecisionError,
  QuantityValidationError,
} from "@/lib/inventory/precision";
import { CrossTenantReferenceError } from "@/lib/tenant/isolation";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

const CreateReservationSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  locationId: z.string().nullable().optional(),
  quantity: z.union([z.number(), z.string()]).refine(
    (n) => Number(n) > 0,
    { message: "Quantity must be greater than 0" }
  ),
  referenceType: z.string().min(1, "Reference type is required"),
  referenceId: z.string().min(1, "Reference ID is required"),
  notes: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();
    const validated = CreateReservationSchema.parse(body);

    const result = await reserveStock({
      tenantId: context.tenantId,
      variantId: validated.variantId,
      locationId: validated.locationId || null,
      quantity: validated.quantity,
      referenceType: validated.referenceType,
      referenceId: validated.referenceId,
      notes: validated.notes,
      expiresAt: validated.expiresAt || null,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.idempotent
          ? "Reservation already recorded (idempotent)"
          : "Stock successfully reserved",
        idempotent: result.idempotent,
        reservation: result.reservation,
        availability: result.availability,
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
    if (error instanceof InsufficientAvailableStockError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          physicalStock: error.physicalStock,
          reservedStock: error.reservedStock,
          availableStock: error.availableStock,
          requestedQuantity: error.requestedQuantity,
        },
        { status: 422 }
      );
    }
    if (
      error instanceof QuantityPrecisionError ||
      error instanceof QuantityValidationError ||
      error instanceof InvalidReservationStateError
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof CrossTenantReferenceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to reserve stock";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const variantId = searchParams.get("variantId") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const status = (searchParams.get("status") || undefined) as any;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const reservations = await listStockReservations(context.tenantId, {
      variantId,
      locationId,
      status,
      limit,
    });

    return NextResponse.json({
      success: true,
      reservations,
      totalCount: reservations.length,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch reservations";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
