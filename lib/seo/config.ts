export const siteConfig = {
  name: "Elvora",
  legalName: "Elvora",
  tagline: "Simpler Business. Smarter Growth.",
  description:
    "Manage GST billing, inventory, sales, purchases, customers, expenses and business accounts with Elvora. Simplify daily operations and grow your business with one intelligent platform.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://elvora.qd.je",
  ogImage: "/og-image.png",
  logo: "/elvora-logo.png",
  icon: "/icon.png",
  currency: "INR",
  contact: {
    email: "support@elvora.qd.je",
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
    sameAs: [
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
    featureList: [
      "F2 Keyboard-First Fast Counter POS",
      "Exact Precision Indian GST Slabs (0%, 5%, 12%, 18%, 28%)",
      "Automated CGST/SGST vs IGST Interstate Routing",
      "Thermal Receipt Printing (58mm, 80mm) & Formal A4 Tax Invoices",
      "Real-Time Stock Ledger with Product Variants & Reorder Alerts",
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
