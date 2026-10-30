import React from "react";
import Script from "next/script";

/**
 * Google Analytics 4 Script Provider
 * Safe SSR component: completely inert unless NEXT_PUBLIC_GA_ID is set in environment.
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId || gaId.trim() === "") {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              restricted_data_processing: true
            });
          `,
        }}
      />
    </>
  );
}
