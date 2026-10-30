import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getTenantSubscription, upgradeTenantSubscription, ensureDefaultPlans } from "@/lib/billing/service";
import { mockBillingProvider } from "@/lib/billing/mock-provider";

const UpgradePlanSchema = z.object({
  planCode: z.enum(["FREE_TRIAL", "STARTER", "GROWTH", "ENTERPRISE"]),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    await ensureDefaultPlans();

    const subscriptionData = await getTenantSubscription(context.tenantId);

    return NextResponse.json({
      success: true,
      ...subscriptionData,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load subscription details";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "EDIT_SHOP_PROFILE");

    const json = await req.json();
    const validated = UpgradePlanSchema.parse(json);

    // Generate mock checkout session for local development
    const checkoutResult = await mockBillingProvider.createCheckoutSession({
      tenantId: context.tenantId,
      planCode: validated.planCode,
      billingCycle: validated.billingCycle,
      successUrl: `${req.nextUrl.origin}/settings?billing_success=true`,
      cancelUrl: `${req.nextUrl.origin}/settings?billing_canceled=true`,
      customerEmail: context.userEmail,
      customerName: context.userName,
    });

    // In mock mode, also activate the plan directly for immediate local testing
    const updatedSub = await upgradeTenantSubscription(
      context.tenantId,
      validated.planCode,
      "MOCK_DEVELOPMENT_PROVIDER"
    );

    return NextResponse.json({
      success: true,
      message: `[MOCK MODE] Plan upgraded to ${validated.planCode}. (Notice: This is a simulated development transaction, no real payment was processed)`,
      checkout: checkoutResult,
      subscription: updatedSub,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to process subscription upgrade";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
