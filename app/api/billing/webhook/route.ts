import { NextRequest, NextResponse } from "next/server";
import { mockBillingProvider } from "@/lib/billing/mock-provider";
import { upgradeTenantSubscription } from "@/lib/billing/service";
import { PlanCode } from "@/lib/billing/types";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-billing-signature") || "";
    const rawBody = await req.text();

    const webhookSecret = process.env.MOCK_WEBHOOK_SECRET || "mock_secret_elvora_dev";

    // Verify signature through provider interface
    const verified = await mockBillingProvider.verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (!verified.isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const { eventType, tenantId, planCode, providerSubscriptionId } = verified;

    if (eventType === "subscription.activated" || eventType === "invoice.paid") {
      if (tenantId && planCode) {
        await upgradeTenantSubscription(
          tenantId,
          planCode as PlanCode,
          "MOCK_DEVELOPMENT_PROVIDER",
          providerSubscriptionId
        );
      }
    }

    return NextResponse.json({
      received: true,
      eventType,
      tenantId,
      notice: "Webhook processed (Mock development mode: No real payment occurred)",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
