# Elvora Commercial SaaS & Subscription Architecture Guide

> **Elvora** — *Simpler Business. Smarter Growth.*

This document details the commercial SaaS architecture, server-side quota enforcement, platform administration, and the transition path from local mock billing to production payment gateways (Razorpay / Stripe).

---

## 1. Architectural Highlights

Elvora is engineered from the ground up as a production-grade multi-tenant SaaS application:

1. **Strict Multi-Tenant Isolation**: Every database entity is scoped by `tenantId`. Session contexts derive authorization strictly server-side from verified memberships.
2. **Pluggable Billing Provider Interface**: Abstracted provider interface (`BillingProvider` in `lib/billing/types.ts`) allowing zero-cost local development and rapid swap to live gateways.
3. **Automatic 14-Day Free Commercial Trial**: Every newly registered shop automatically receives a 14-day full-access trial (`FREE_TRIAL` plan) without requiring upfront credit card details.
4. **Permanent Data Safeguard (Read-Only Mode on Expiry)**: If a subscription or trial expires or is canceled, **existing shop data remains 100% safe, readable, and exportable**. Server-side guards (`checkPlanLimit`) block only new resource creation (invoices, products, additional staff).
5. **Platform Admin Cryptographic Separation**: Platform administrators (`PlatformAdminUser`) operate on dedicated tokens (`elvora_platform_admin_session`) with **no `tenantId`**. They cannot query tenant-scoped financial endpoints (invoices, ledgers, profit/loss), guaranteeing commercial data privacy.

---

## 2. Standard Subscription Tiers

Defined in `lib/billing/service.ts`:

| Tier | Code | Price (Monthly / Yearly) | Invoices/Month | Products | Staff Seats | Multi-Location | Advanced Reports |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Free Trial** | `FREE_TRIAL` | ₹0 (14 Days) | 100 | 100 | 2 | No | Yes |
| **Starter** | `STARTER` | ₹499 / ₹4,990 | 150 | 500 | 2 | No | No |
| **Growth Pro** | `GROWTH` | ₹1,299 / ₹12,990 | Unlimited (`-1`) | Unlimited (`-1`) | 10 | Yes | Yes |
| **Enterprise** | `ENTERPRISE` | ₹2,999 / ₹29,990 | Unlimited (`-1`) | Unlimited (`-1`) | Unlimited (`-1`)| Yes | Yes |

---

## 3. Local Development Mock Billing (`MockBillingProvider`)

During development and staging, no paid third-party subscriptions or live API keys are required:

- **Provider**: `MockBillingProvider` (`lib/billing/mock-provider.ts`).
- **Safety Flags**: Explicitly returns `isMock = true` and `provider = "mock"`.
- **Checkout URLs**: Redirects to `/api/billing/subscription?mock_checkout=success&session_id=...` simulating instant approval.
- **Safety Guarantee**: Does not process credit cards, does not hit external APIs, and logs clear console markers: `[MOCK BILLING PROVIDER] Generated simulated checkout session`.

---

## 4. Transitioning to Production Gateways

### A. Razorpay (Recommended for Indian GST & UPI/Cards/Netbanking)

1. **Install SDK**:
   ```bash
   npm install razorpay
   ```

2. **Configure Environment Variables** (`.env`):
   ```env
   BILLING_PROVIDER=razorpay
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_signing_secret
   ```

3. **Implement Provider Class** (`lib/billing/razorpay-provider.ts`):
   ```typescript
   import Razorpay from "razorpay";
   import crypto from "crypto";
   import { BillingProvider, CheckoutSessionParams, CheckoutSessionResult, WebhookVerificationResult } from "./types";

   export class RazorpayBillingProvider implements BillingProvider {
     name = "razorpay";
     private client: Razorpay;

     constructor() {
       this.client = new Razorpay({
         key_id: process.env.RAZORPAY_KEY_ID!,
         key_secret: process.env.RAZORPAY_KEY_SECRET!,
       });
     }

     async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
       // Create Razorpay Subscription or Payment Link
       const subscription = await this.client.subscriptions.create({
         plan_id: getRazorpayPlanId(params.planCode, params.billingCycle),
         total_count: params.billingCycle === "YEARLY" ? 1 : 12,
         customer_notify: 1,
         notes: { tenantId: params.tenantId, planCode: params.planCode },
       });

       return {
         sessionId: subscription.id,
         checkoutUrl: subscription.short_url,
         isMock: false,
         provider: "razorpay",
       };
     }

     async cancelSubscription(providerSubscriptionId: string) {
       await this.client.subscriptions.cancel(providerSubscriptionId);
       return { success: true, canceledAt: new Date() };
     }

     async verifyWebhookSignature(payload: any, signature: string, secret: string): Promise<WebhookVerificationResult> {
       const bodyString = typeof payload === "string" ? payload : JSON.stringify(payload);
       const expectedSignature = crypto
         .createHmac("sha256", secret)
         .update(bodyString)
         .digest("hex");

       const isValid = expectedSignature === signature;
       return {
         isValid,
         eventType: payload.event,
         tenantId: payload.payload?.subscription?.entity?.notes?.tenantId,
         providerSubscriptionId: payload.payload?.subscription?.entity?.id,
         status: payload.payload?.subscription?.entity?.status,
         rawPayload: payload,
       };
     }
   }
   ```

4. **Register in Factory** (`lib/billing/service.ts`):
   ```typescript
   export function getBillingProvider(): BillingProvider {
     if (process.env.BILLING_PROVIDER === "razorpay") {
       return new RazorpayBillingProvider();
     }
     return new MockBillingProvider();
   }
   ```

5. **Configure Webhook Endpoint**:
   - Webhook URL: `https://your-domain.com/api/billing/webhook`
   - Subscribed Events:
     - `subscription.charged` -> Updates subscription to `ACTIVE` and extends `currentPeriodEnd`.
     - `subscription.pending` -> Updates subscription to `PAST_DUE`.
     - `subscription.cancelled` -> Updates subscription to `CANCELED`.

---

### B. Stripe (For International Billing)

1. **Install SDK**:
   ```bash
   npm install stripe
   ```

2. **Configure Environment Variables**:
   ```env
   BILLING_PROVIDER=stripe
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```

3. **Verify Webhooks Securely**:
   Always pass raw body buffer to `stripe.webhooks.constructEvent(rawBody, signature, secret)` to prevent replay attacks and signature mismatches.

---

## 5. Server-Side Quota Enforcement Matrix

All checks are enforced on the server via `checkPlanLimit(tenantId, limitType)`:

| Operation | Checked Metric | Free Trial | Starter | Growth Pro | Expired Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **New Invoice** (`POST /api/invoices`) | `monthlyInvoiceCount` | 100/mo | 150/mo | Unlimited | **Blocked** (403 `PLAN_LIMIT_EXCEEDED`) |
| **New Product** (`POST /api/inventory`) | Total variants count | 100 items | 500 items | Unlimited | **Blocked** (403 `PLAN_LIMIT_EXCEEDED`) |
| **Invite Staff** (`POST /api/tenant/members`) | Active memberships | 2 seats | 2 seats | 10 seats | **Blocked** (403 `PLAN_LIMIT_EXCEEDED`) |
| **Read / View Invoices** | None (Read-only) | Allowed | Allowed | Allowed | **Allowed 100%** |
| **Export Reports / CSV / PDF** | None (Read-only) | Allowed | Allowed | Allowed | **Allowed 100%** |
| **Print Tax Invoices / Thermal** | None (Read-only) | Allowed | Allowed | Allowed | **Allowed 100%** |

---

## 6. Platform Administration & Privacy Guarantees

- **Login URL**: `/admin/login`
- **Dashboard URL**: `/admin/dashboard`
- **Session Cookie**: `elvora_platform_admin_session` (isolated from `elvora_session`)
- **Capabilities**:
  - View registered business workspaces and trial status.
  - Extend commercial trials (e.g. +7, +14, +30 days) for customer support.
  - Upgrade or downgrade subscription tiers manually.
  - Suspend / reactivate tenant accounts in case of Terms of Service violations.
- **Privacy Barrier**:
  - The Platform Admin user has **zero permissions** to query tenant customer ledgers, invoices, profit/loss calculations, or supplier costs.
  - All tenant financial APIs mandate `requireTenantContext` which platform admin tokens cannot fulfill.
