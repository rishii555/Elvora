import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";
import {
  releaseStockReservation,
  ReservationNotFoundError,
  InvalidReservationStateError,
} from "@/lib/inventory/reservation-service";
import { DatabaseTransactionUnavailableError } from "@/lib/db/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const { id } = await params;
    const result = await releaseStockReservation(context.tenantId, id);

    return NextResponse.json({
      success: true,
      message: result.idempotent
        ? "Reservation was already released"
        : "Stock reservation released back to available inventory",
      reservation: result.reservation,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof DatabaseTransactionUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    if (error instanceof ReservationNotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof InvalidReservationStateError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to release reservation";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
