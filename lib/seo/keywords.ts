/**
 * Elvora SEO Keyword Research & Page Mapping Matrix
 * Covering Brand, India (Domestic Priority), and Global Markets.
 * Note: Monthly Search Volume and Difficulty require ongoing validation via GSC / keyword tools.
 */

export interface KeywordMapping {
  keyword: string;
  category: "BRAND" | "INDIA" | "GLOBAL";
  searchIntent: "Informational" | "Commercial" | "Transactional" | "Navigational";
  targetCountry: "IN" | "GLOBAL" | "US" | "UK";
  targetRoute: string;
  relatedKeywords: string[];
  conversionIntent: "High" | "Medium" | "Low";
  contentRequirements: string[];
}

export const KEYWORD_REGISTRY: KeywordMapping[] = [
  // --- BRAND KEYWORDS ---
  {
    keyword: "Elvora",
    category: "BRAND",
    searchIntent: "Navigational",
    targetCountry: "GLOBAL",
    targetRoute: "/",
    relatedKeywords: ["Elvora app", "Elvora login", "Elvora business"],
    conversionIntent: "High",
    contentRequirements: [
      "Brand identity: Simpler Business. Smarter Growth.",
      "Primary product modules overview",
      "Direct sign-in and free-trial registration links",
    ],
  },
  {
    keyword: "Elvora software",
    category: "BRAND",
    searchIntent: "Navigational",
    targetCountry: "GLOBAL",
    targetRoute: "/",
    relatedKeywords: ["Elvora ERP", "Elvora SaaS", "Elvora download"],
    conversionIntent: "High",
    contentRequirements: [
      "Universal SaaS architecture overview",
      "Platform compatibility across desktop & mobile browsers",
      "Supported commercial verticals",
    ],
  },
  {
    keyword: "Elvora business management",
    category: "BRAND",
    searchIntent: "Commercial",
    targetCountry: "GLOBAL",
    targetRoute: "/business-management-software",
    relatedKeywords: ["Elvora business ERP", "Elvora store management"],
    conversionIntent: "High",
    contentRequirements: [
      "Unified operations: Billing, inventory, accounting, reporting",
      "Multi-tenant data vault security details",
    ],
  },
  {
    keyword: "Elvora GST billing",
    category: "BRAND",
    searchIntent: "Commercial",
    targetCountry: "IN",
    targetRoute: "/gst-billing-software",
    relatedKeywords: ["Elvora billing app", "Elvora GST invoice"],
    conversionIntent: "High",
    contentRequirements: [
      "Indian GST precision calculations (CGST/SGST/IGST)",
      "Thermal 58mm/80mm & A4 laser printing",
      "GSTR-1 and GSTR-3B audit reconciliation",
    ],
  },

  // --- INDIA PRIORITY KEYWORDS ---
  {
    keyword: "GST billing software",
    category: "INDIA",
    searchIntent: "Commercial",
    targetCountry: "IN",
    targetRoute: "/gst-billing-software",
    relatedKeywords: [
      "GST billing software for retail shop",
      "best GST billing software India",
      "GST invoicing software for PC",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "HSN/SAC code search and validation",
      "Automated intra-state vs inter-state tax split",
      "Compliant invoice format under Rule 46 of CGST rules",
      "Thermal receipt printing demo",
    ],
  },
  {
    keyword: "GST invoice software",
    category: "INDIA",
    searchIntent: "Transactional",
    targetCountry: "IN",
    targetRoute: "/gst-billing-software",
    relatedKeywords: [
      "GST invoice maker online",
      "tax invoice generator India",
      "e-invoicing software",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "B2B and B2C invoice generation workflows",
      "State code lookup table",
      "Dynamic UPI QR code on invoice",
    ],
  },
  {
    keyword: "Inventory management software",
    category: "INDIA",
    searchIntent: "Commercial",
    targetCountry: "IN",
    targetRoute: "/inventory-management-software",
    relatedKeywords: [
      "stock management software India",
      "warehouse inventory software",
      "inventory tracking software for small business",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "Barcode scanning and label generation",
      "SKU variant management (sizes, colors, finishes)",
      "Low stock alerts and reorder point automation",
      "FIFO and Weighted Average Costing",
    ],
  },
  {
    keyword: "Billing software for small business",
    category: "INDIA",
    searchIntent: "Commercial",
    targetCountry: "IN",
    targetRoute: "/gst-billing-software",
    relatedKeywords: [
      "simple billing software for shop",
      "counter billing software",
      "retail bill maker software",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "Fast learning curve for shop attendants",
      "Single-click customer lookup",
      "Split payment methods (Cash, UPI, Card, Udhar)",
    ],
  },
  {
    keyword: "Stock management software",
    category: "INDIA",
    searchIntent: "Commercial",
    targetCountry: "IN",
    targetRoute: "/inventory-management-software",
    relatedKeywords: [
      "stock ledger software",
      "shop stock register online",
      "physical stock reconciliation",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "Audit trail with immutable movement logs",
      "Stock shrinkage and wastage tracking",
      "Supplier purchase inward linkage",
    ],
  },
  {
    keyword: "POS software for retail shops",
    category: "INDIA",
    searchIntent: "Transactional",
    targetCountry: "IN",
    targetRoute: "/pos-software",
    relatedKeywords: [
      "retail POS system India",
      "counter POS billing machine software",
      "supermarket POS software",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "Keyboard shortcut map (F2 search, F8 print)",
      "Barcode scanner plug-and-play compatibility",
      "Fast checkout speed benchmarks (under 3 seconds)",
    ],
  },
  {
    keyword: "Business management software India",
    category: "INDIA",
    searchIntent: "Commercial",
    targetCountry: "IN",
    targetRoute: "/business-management-software",
    relatedKeywords: [
      "SMB ERP software India",
      "all in one business software",
      "dukan management software",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "Unified dashboard tracking revenue, expenses, and profit",
      "Parties khata ledger (receivables & payables)",
      "Multi-user roles with permission controls",
    ],
  },

  // --- GLOBAL EXPANSION KEYWORDS ---
  {
    keyword: "Small business management software",
    category: "GLOBAL",
    searchIntent: "Commercial",
    targetCountry: "GLOBAL",
    targetRoute: "/business-management-software",
    relatedKeywords: [
      "SME operations platform",
      "cloud business suite for small business",
      "business operations software",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "Cloud architecture and multi-device access",
      "Modular workflows connecting sales, stock, and expenses",
      "Data export and audit compliance",
    ],
  },
  {
    keyword: "Online invoicing software",
    category: "GLOBAL",
    searchIntent: "Transactional",
    targetCountry: "GLOBAL",
    targetRoute: "/online-invoicing-software",
    relatedKeywords: [
      "cloud billing software",
      "send invoices online",
      "automated billing software",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "Digital invoice sharing via link and PDF",
      "Multi-currency support and payment tracking",
      "Custom branding and professional invoice templates",
    ],
  },
  {
    keyword: "Inventory tracking software",
    category: "GLOBAL",
    searchIntent: "Commercial",
    targetCountry: "GLOBAL",
    targetRoute: "/inventory-management-software",
    relatedKeywords: [
      "real time inventory tracking",
      "multi location stock tracker",
      "SKU inventory management",
    ],
    conversionIntent: "Medium",
    contentRequirements: [
      "Real-time stock valuation",
      "Barcode tracking and batch management",
      "Inventory movement history",
    ],
  },
  {
    keyword: "Retail POS software",
    category: "GLOBAL",
    searchIntent: "Commercial",
    targetCountry: "GLOBAL",
    targetRoute: "/pos-software",
    relatedKeywords: [
      "cloud point of sale",
      "fast counter POS software",
      "retail checkout system",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "High-speed checkout workflows",
      "Hardware compatibility (thermal printers, barcode scanners)",
      "Instant cashier reconciliation",
    ],
  },
  {
    keyword: "Free invoice generator",
    category: "GLOBAL",
    searchIntent: "Transactional",
    targetCountry: "GLOBAL",
    targetRoute: "/invoice-generator",
    relatedKeywords: [
      "online invoice maker free",
      "instant invoice generator no signup",
      "GST invoice template free",
    ],
    conversionIntent: "High",
    contentRequirements: [
      "Interactive in-browser invoice creation tool",
      "Instant print and PDF export",
      "Zero registration required for standard invoices",
    ],
  },
];
