export type PlanCode = "FREE_TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";

export interface PlanLimits {
  maxProducts: number; // -1 for unlimited
  maxInvoicesPerMonth: number; // -1 for unlimited
  maxStaffMembers: number;
  hasAdvancedReports: boolean;
  hasAuditLogs: boolean;
  hasMultiLocation: boolean;
}

export interface CheckoutSessionParams {
  tenantId: string;
  planCode: PlanCode;
  billingCycle: "MONTHLY" | "YEARLY";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  isMock: boolean;
  provider: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventType: string;
  tenantId?: string;
  providerSubscriptionId?: string;
  planCode?: string;
  status?: string;
  rawPayload: any;
}

/**
 * Universal Billing Provider Interface for commercial subscriptions.
 * Allows pluggable providers (Stripe, Razorpay, Mock for Local Dev).
 */
export interface BillingProvider {
  name: string;
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<{ success: boolean; canceledAt: Date }>;
  verifyWebhookSignature(payload: string | any, signature: string, secret: string): Promise<WebhookVerificationResult>;
}

export class PlanLimitExceededError extends Error {
  public limitType: string;
  public currentUsage: number;
  public maxLimit: number;

  constructor(limitType: string, currentUsage: number, maxLimit: number, planName = "Current Plan") {
    super(
      `Plan Limit Exceeded: You have reached the limit of ${maxLimit} ${limitType} on your ${planName}. Please upgrade your subscription to continue.`
    );
    this.name = "PlanLimitExceededError";
    this.limitType = limitType;
    this.currentUsage = currentUsage;
    this.maxLimit = maxLimit;
  }
}
