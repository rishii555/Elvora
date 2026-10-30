import {
  BillingProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  WebhookVerificationResult,
} from "./types";

/**
 * Mock Billing Provider for Local Development & Staging.
 *
 * STRICT SAFEGUARD:
 * - Does not contact real payment rails.
 * - Explicitly marks mock transactions with isMock = true.
 * - Does not charge real credit cards or bank accounts.
 */
export class MockBillingProvider implements BillingProvider {
  public readonly name = "MOCK_DEVELOPMENT_PROVIDER";

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const mockSessionId = `mock_sess_${params.planCode.toLowerCase()}_${Date.now()}`;
    const mockRedirectUrl = `${params.successUrl}?session_id=${mockSessionId}&mock_payment=true&plan=${params.planCode}`;

    console.info(
      `[MOCK BILLING PROVIDER] Generated simulated checkout session for tenant ${params.tenantId} (Plan: ${params.planCode}, Cycle: ${params.billingCycle}). NOT A REAL TRANSACTION.`
    );

    return {
      sessionId: mockSessionId,
      checkoutUrl: mockRedirectUrl,
      isMock: true,
      provider: this.name,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<{ success: boolean; canceledAt: Date }> {
    console.info(
      `[MOCK BILLING PROVIDER] Simulated subscription cancellation for ID ${providerSubscriptionId}`
    );
    return {
      success: true,
      canceledAt: new Date(),
    };
  }

  async verifyWebhookSignature(
    payload: string | any,
    signature: string,
    secret: string
  ): Promise<WebhookVerificationResult> {
    // In mock mode, verify that secret matches MOCK_WEBHOOK_SECRET
    const expectedSecret = process.env.MOCK_WEBHOOK_SECRET || "mock_secret_elvora_dev";
    const isValid = secret === expectedSecret || signature === "mock_signature_test";

    const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;

    return {
      isValid,
      eventType: parsed.event || parsed.type || "mock.subscription.activated",
      tenantId: parsed.tenantId,
      providerSubscriptionId: parsed.subscriptionId || `mock_sub_${Date.now()}`,
      planCode: parsed.planCode,
      status: parsed.status || "ACTIVE",
      rawPayload: parsed,
    };
  }
}

export const mockBillingProvider = new MockBillingProvider();
