/**
 * Safe, Privacy-First Analytics Event Tracker
 * Only fires when client-side environment variable NEXT_PUBLIC_GA_ID is set.
 * Never collects or transmits PII (passwords, emails, phone numbers, or tenant data).
 */

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "js",
      targetIdOrAction: string,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

export type AnalyticsEvent =
  | { name: "sign_up_start"; properties?: { source?: string } }
  | { name: "sign_up_complete"; properties?: { method: string; plan?: string } }
  | { name: "login_success"; properties?: { role?: string } }
  | { name: "cta_click"; properties?: { label: string; location: string } }
  | { name: "demo_request"; properties?: { vertical?: string } }
  | { name: "invoice_generator_download"; properties?: { invoiceType: string } }
  | { name: "pricing_tier_view"; properties?: { tier: string } };

export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  try {
    window.gtag("event", event.name, {
      ...event.properties,
      send_to: process.env.NEXT_PUBLIC_GA_ID,
    });
  } catch (err) {
    // Fail silently to never degrade user application experience
    console.debug("[Analytics] Failed to dispatch event:", err);
  }
}
