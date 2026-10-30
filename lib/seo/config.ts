export const siteConfig = {
  name: "Elvora",
  legalName: "Elvora Technologies Private Limited",
  tagline: "Simpler Business. Smarter Growth.",
  description:
    "Universal multi-tenant business management SaaS for Indian retailers, wholesalers, and manufacturers. High-speed counter POS, precision GST tax billing, real-time variant stock tracking, double-entry accounting ledgers, and automated GSTR-ready financial reports.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://elvora.com",
  ogImage: "/og-image.png",
  logo: "/elvora-logo.png",
  currency: "INR",
  contact: {
    email: "support@elvora.com",
    phone: "+91-9876543210",
    address: "102 Industrial Area, Sector 62, Noida, Uttar Pradesh, India",
    country: "IN",
  },
  keywords: [
    "GST billing software",
    "Indian business management software",
    "retail counter POS software",
    "inventory management SaaS",
    "small business accounting software India",
    "GSTR-1 and GSTR-3B tax report generator",
    "wholesale distribution billing software",
    "thermal invoice printer software",
    "customer khata udhar ledger app",
    "multi-tenant ERP SaaS",
    "barcode billing software India",
    "e-invoice GST software",
  ],
};

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logo}`,
    description: siteConfig.description,
    email: siteConfig.contact.email,
    telephone: siteConfig.contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "102 Industrial Area, Sector 62",
      addressLocality: "Noida",
      addressRegion: "Uttar Pradesh",
      addressCountry: siteConfig.contact.country,
    },
    sameAs: [
      "https://twitter.com/elvorahq",
      "https://linkedin.com/company/elvora",
      "https://github.com/rishii555/Elvora",
    ],
  };
}

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en-IN",
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: `${siteConfig.url}${siteConfig.logo}`,
    },
  };
}

export function getSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Windows, macOS, Linux, Android, iOS",
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en-IN",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        name: "14-Day Free Trial",
        description: "Full-feature 14-day trial without credit card requirement",
      },
      {
        "@type": "Offer",
        price: "499",
        priceCurrency: "INR",
        billingDuration: "P1M",
        name: "Starter Plan",
        description: "For retail counters, standalone shops, and boutique traders",
      },
      {
        "@type": "Offer",
        price: "1499",
        priceCurrency: "INR",
        billingDuration: "P1M",
        name: "Growth Pro Plan",
        description: "For high-volume wholesalers, multi-counter stores, and distributors",
      },
      {
        "@type": "Offer",
        price: "3999",
        priceCurrency: "INR",
        billingDuration: "P1M",
        name: "Enterprise Plan",
        description: "For multi-warehouse chains, manufacturing depots, and enterprise traders",
      },
    ],
    featureList: [
      "F2 Keyboard-First Fast Counter POS",
      "Exact Precision Indian GST Slabs (0%, 5%, 12%, 18%, 28%)",
      "Automated CGST/SGST vs IGST Interstate Routing",
      "Thermal Receipt Printing (58mm, 80mm) & Formal A4 Tax Invoices",
      "Real-Time Stock Ledger with Variants, Batch, & Low-Stock Alerts",
      "Atomic Double-Entry General Ledger Accounting",
      "Customer Udhar Khata & Aging Receivables Tracker",
      "GSTR-1, GSTR-3B & P&L Exportable Audit Sheets",
    ],
  };
}

export function getFaqSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  };
}
