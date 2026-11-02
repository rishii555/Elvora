/**
 * Multi-Industry Template Definitions & Registry for Elvora
 * 
 * Defines foundational industry templates:
 * 1. Sanitaryware & Bath Fittings
 * 2. Grocery & FMCG
 * 3. Electronics & Mobiles
 * 4. Clothing & Apparel
 * 5. Hardware & Tools
 * 6. Wholesale / B2B
 * 7. Manufacturing
 * 
 * Rules:
 * - Universal SaaS architecture; no single industry is the global default.
 * - Sanitaryware-specific items/attributes belong strictly to sanitaryware.
 * - No tile logic, Sq.Ft calculations, or pieces-per-box formulas in sanitaryware.
 * - Backward compatible with existing tenant records.
 */

export type IndustryTemplateId =
  | "sanitaryware"
  | "fmcg"
  | "electronics"
  | "apparel"
  | "hardware"
  | "wholesale"
  | "manufacturing";

export type UnitOfMeasureCode = "PCS" | "SET" | "BOX" | "MTR" | "PAIR" | "KG";

export interface TemplateAttributeDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "boolean";
  options?: string[];
  isRequired?: boolean;
  isVariantDimension?: boolean;
  placeholder?: string;
  description?: string;
}

export interface TemplateCategoryDefinition {
  name: string;
  code?: string;
  description?: string;
}

export interface TemplateFeatureFlags {
  enablePos: boolean;
  enableWarehouses: boolean;
  enableSerialImei: boolean;
  enableMatrixVariant: boolean;
  enableCreditLimit: boolean;
  enableBatchExpiry: boolean;
  enableBomManufacturing: boolean;
  enableWholesalePricing: boolean;
}

export interface TemplateOptionalModule {
  id: string;
  name: string;
  description: string;
  enabledByDefault: boolean;
}

export interface TemplateInvoiceSettings {
  showItemDescription: boolean;
  showHsn: boolean;
  showBarcode: boolean;
  showDiscount: boolean;
  showBatchExpiry?: boolean;
  showSerialImei?: boolean;
  printFormat: "A4" | "THERMAL_3INCH";
}

export interface IndustryTemplate {
  id: IndustryTemplateId;
  name: string;
  tagline: string;
  description: string;
  defaultUom: UnitOfMeasureCode;
  supportedUoms: UnitOfMeasureCode[];
  categories: TemplateCategoryDefinition[];
  attributes: TemplateAttributeDefinition[];
  featureFlags: TemplateFeatureFlags;
  optionalModules: TemplateOptionalModule[];
  defaultInvoiceSettings: TemplateInvoiceSettings;
  defaultDashboardCards: string[];
}

// -------------------------------------------------------------
// 1. Sanitaryware & Bath Fittings Template
// -------------------------------------------------------------
export const SANITARYWARE_TEMPLATE: IndustryTemplate = {
  id: "sanitaryware",
  name: "Sanitaryware & Bath Fittings",
  tagline: "Bath showrooms, sanitary retailers, and CP fittings distributors",
  description:
    "Tailored for showrooms and suppliers dealing in ceramic sanitaryware, brass taps, showers, diverters, vanities, and allied bathroom accessories.",
  defaultUom: "PCS",
  supportedUoms: ["PCS", "SET", "PAIR", "BOX", "MTR", "KG"],
  categories: [
    { name: "Western Toilet", code: "SAN-WT", description: "Floor mounted & wall hung western closets" },
    { name: "One Piece Closet", code: "SAN-OPC", description: "Single-piece integrated ceramic water closets" },
    { name: "Wall Hung Closet", code: "SAN-WHC", description: "Concealed flush wall-mounted closets" },
    { name: "Wash Basin", code: "SAN-BAS", description: "Countertop, pedestal & wall hung ceramic basins" },
    { name: "Cistern", code: "SAN-CIS", description: "Concealed & exposed flushing cistern tanks" },
    { name: "Urinal", code: "SAN-URN", description: "Ceramic flat back & sensor urinals" },
    { name: "Bib Cock", code: "BATH-BIB", description: "Wall mounted bib taps & short body cocks" },
    { name: "Pillar Cock", code: "BATH-PIL", description: "Basin mounted single lever pillar taps" },
    { name: "Basin Mixer", code: "BATH-BMX", description: "Hot & cold single lever basin mixer taps" },
    { name: "Wall Mixer", code: "BATH-WMX", description: "Telephonic wall mixers with bend & shower" },
    { name: "Shower", code: "BATH-SHW", description: "Overhead rain showers, hand showers & arms" },
    { name: "Health Faucet", code: "BATH-HFC", description: "ABS & brass health faucets with braided tubes" },
    { name: "Angle Valve", code: "BATH-ANG", description: "Heavy brass angle stop cocks for geysers & basins" },
    { name: "Diverter", code: "BATH-DIV", description: "Concealed high-flow shower diverters" },
    { name: "Bathroom Accessories", code: "BATH-ACC", description: "Towel bars, soap holders, paper holders, robe hooks" },
    { name: "Ceramic Sanitaryware", code: "SAN-CER", description: "Washbasins, water closets, bidets, and urinals" },
    { name: "Faucets & CP Taps", code: "SAN-TAP", description: "Basin mixers, bib cocks, pillar taps, sink mixers" },
    { name: "Showers & Diverters", code: "SAN-SHWD", description: "Overhead showers, hand showers, concealed diverters" },
    { name: "Vanities & Cabinets", code: "SAN-VAN", description: "Mirror cabinets, vanity counters, storage units" },
    { name: "Piping & Flush Fittings", code: "SAN-PIP", description: "Cisterns, flush valves, waste couplings, angle cocks" },
  ],
  attributes: [
    { key: "brand", label: "Brand / Manufacturer", type: "text", isRequired: false, placeholder: "e.g. Jaquar, Cera, Hindware, Kohler" },
    { key: "model", label: "Model / Series", type: "text", isRequired: false, placeholder: "e.g. Alive, Prime, Wall-Hung Rimless" },
    { key: "size", label: "Size / Dimensions", type: "text", isRequired: false, placeholder: "e.g. 550x400 mm, 18x12 inch" },
    {
      key: "finish",
      label: "Finish",
      type: "select",
      options: ["Chrome Plated", "Matte Black", "Rose Gold", "Brushed Nickel", "Gloss White", "Matte White", "Gold", "Antique Bronze"],
      isVariantDimension: true,
      description: "Surface electroplating or coating finish",
    },
    { key: "color", label: "Colour", type: "text", isRequired: false, placeholder: "e.g. White, Ivory, Matte Black" },
    {
      key: "colorFinish",
      label: "Color / Finish",
      type: "select",
      options: ["Chrome Plated", "Matte Black", "Rose Gold", "Brushed Nickel", "Gloss White", "Matte White", "Gold"],
      isVariantDimension: true,
      description: "Surface finish or ceramic glaze color",
    },
    {
      key: "material",
      label: "Material",
      type: "select",
      options: ["Vitreous China Ceramic", "Forged Brass", "SS-304 Stainless Steel", "Solid Surface", "Engineered Polymer"],
      description: "Core manufacturing material",
    },
    {
      key: "mountingType",
      label: "Mounting Type",
      type: "select",
      options: ["Wall Hung", "Floor Mounted", "Deck Mounted", "Countertop / Tabletop", "Concealed In-Wall"],
      description: "Installation placement orientation",
    },
    { key: "warrantyDuration", label: "Warranty (Years)", type: "number", isRequired: false, placeholder: "e.g. 5, 10" },
  ],
  featureFlags: {
    enablePos: true,
    enableWarehouses: false, // strictly false by default across all templates
    enableSerialImei: false,
    enableMatrixVariant: true,
    enableCreditLimit: true,
    enableBatchExpiry: false,
    enableBomManufacturing: false,
    enableWholesalePricing: true,
  },
  optionalModules: [
    { id: "brand_catalog", name: "Brand & Series Catalog", description: "Organize items by manufacturer catalog series", enabledByDefault: true },
    { id: "counter_pos", name: "Showroom Counter POS", description: "Fast billing at showroom checkouts", enabledByDefault: true },
    { id: "b2b_trade_pricing", name: "Contractor / Architect Pricing", description: "Special credit limits and wholesale discounts", enabledByDefault: true },
  ],
  defaultInvoiceSettings: {
    showItemDescription: true,
    showHsn: true,
    showBarcode: false,
    showDiscount: true,
    printFormat: "A4",
  },
  defaultDashboardCards: [
    "sales_summary",
    "taxable_turnover",
    "receivables_due",
    "top_brands",
    "fast_moving_products",
  ],
};

// -------------------------------------------------------------
// 2. Grocery & FMCG Template
// -------------------------------------------------------------
export const FMCG_TEMPLATE: IndustryTemplate = {
  id: "fmcg",
  name: "Grocery & FMCG",
  tagline: "Supermarkets, grocery marts, and packaged consumer goods distributors",
  description:
    "Optimized for fast-paced consumer goods with barcode scanning, batch expiry tracking, thermal receipt printing, and fast counter checkouts.",
  defaultUom: "PCS",
  supportedUoms: ["PCS", "KG", "BOX", "SET"],
  categories: [
    { name: "Packaged Foods & Snacks", code: "FMCG-FS", description: "Biscuits, noodles, chips, snacks" },
    { name: "Beverages & Dairy", code: "FMCG-BD", description: "Juices, tea, coffee, milk products, soft drinks" },
    { name: "Grains, Pulses & Staples", code: "FMCG-GPS", description: "Flour, rice, dal, sugar, edible oils" },
    { name: "Personal Care & Hygiene", code: "FMCG-PCH", description: "Soaps, shampoos, oral care, lotions" },
    { name: "Household Cleaning", code: "FMCG-HHC", description: "Detergents, dishwashers, surface cleaners" },
    { name: "Spices & Condiments", code: "FMCG-SPC", description: "Masalas, sauces, pickles, vinegar" },
  ],
  attributes: [
    { key: "brand", label: "Brand", type: "text", isRequired: false, placeholder: "e.g. Nestlé, ITC, Britannia, Amul" },
    { key: "barcode", label: "Barcode / EAN-13", type: "text", isRequired: false, placeholder: "Scanned barcode" },
    { key: "netWeight", label: "Net Weight / Volume", type: "text", isRequired: false, placeholder: "e.g. 500g, 1L, 200ml" },
    { key: "batchNumber", label: "Batch No.", type: "text", isRequired: false, placeholder: "Batch identifier" },
    { key: "expiryDate", label: "Expiry Date", type: "date", isRequired: false, description: "Tracks shelf-life expiration" },
  ],
  featureFlags: {
    enablePos: true,
    enableWarehouses: false,
    enableSerialImei: false,
    enableMatrixVariant: false,
    enableCreditLimit: false,
    enableBatchExpiry: true,
    enableBomManufacturing: false,
    enableWholesalePricing: false,
  },
  optionalModules: [
    { id: "fast_pos", name: "High-Speed Barcode POS", description: "Rapid barcode scanning and cash drawer integration", enabledByDefault: true },
    { id: "batch_expiry", name: "Batch & Expiry Monitor", description: "Alerts for expiring inventory on shelves", enabledByDefault: true },
  ],
  defaultInvoiceSettings: {
    showItemDescription: false,
    showHsn: false,
    showBarcode: true,
    showDiscount: true,
    showBatchExpiry: true,
    printFormat: "THERMAL_3INCH",
  },
  defaultDashboardCards: [
    "pos_daily_register",
    "sales_summary",
    "expiring_stock_alerts",
    "fast_moving_products",
  ],
};

// -------------------------------------------------------------
// 3. Electronics & Mobiles Template
// -------------------------------------------------------------
export const ELECTRONICS_TEMPLATE: IndustryTemplate = {
  id: "electronics",
  name: "Electronics & Mobiles",
  tagline: "Smartphone dealers, IT retailers, gadgets, and appliance stores",
  description:
    "Tailored for high-value consumer electronics with IMEI/serial number tracking, warranty recording, and multi-variant RAM/storage options.",
  defaultUom: "PCS",
  supportedUoms: ["PCS", "SET", "BOX"],
  categories: [
    { name: "Smartphones & Tablets", code: "ELEC-MOB", description: "Mobile phones, tablets, e-readers" },
    { name: "Laptops & Computers", code: "ELEC-PC", description: "Notebooks, desktops, monitors, components" },
    { name: "Audio & Wearables", code: "ELEC-AUD", description: "Headphones, TWS earbuds, smartwatches, speakers" },
    { name: "Chargers & Cables", code: "ELEC-ACC", description: "Fast adapters, USB-C cables, power banks" },
    { name: "Home & Kitchen Appliances", code: "ELEC-APP", description: "Microwaves, smart TVs, geysers, air purifiers" },
    { name: "Storage & Peripherals", code: "ELEC-STR", description: "External SSDs, flash drives, keyboards, mice" },
  ],
  attributes: [
    { key: "brand", label: "Brand", type: "text", isRequired: false, placeholder: "e.g. Apple, Samsung, OnePlus, Dell, HP" },
    { key: "model", label: "Model Name / Number", type: "text", isRequired: false, placeholder: "e.g. Galaxy S24, iPhone 16 Pro" },
    { key: "imeiSerial", label: "IMEI / Serial Number", type: "text", isRequired: false, placeholder: "15-digit IMEI or hardware serial" },
    { key: "color", label: "Color", type: "text", isRequired: false, isVariantDimension: true, placeholder: "e.g. Titanium Gray, Midnight Blue" },
    { key: "storageRam", label: "RAM / Storage", type: "text", isRequired: false, isVariantDimension: true, placeholder: "e.g. 8GB/256GB, 16GB/512GB" },
    { key: "warrantyMonths", label: "Warranty (Months)", type: "number", isRequired: false, placeholder: "e.g. 12, 24" },
  ],
  featureFlags: {
    enablePos: true,
    enableWarehouses: false,
    enableSerialImei: true,
    enableMatrixVariant: true,
    enableCreditLimit: true,
    enableBatchExpiry: false,
    enableBomManufacturing: false,
    enableWholesalePricing: true,
  },
  optionalModules: [
    { id: "serial_tracker", name: "IMEI / Serial Life Tracker", description: "Trace units from purchase inward to sale invoice", enabledByDefault: true },
    { id: "warranty_mgmt", name: "Warranty Verification", description: "Instant warranty lookup by serial number", enabledByDefault: true },
  ],
  defaultInvoiceSettings: {
    showItemDescription: true,
    showHsn: true,
    showBarcode: true,
    showDiscount: true,
    showSerialImei: true,
    printFormat: "A4",
  },
  defaultDashboardCards: [
    "sales_summary",
    "receivables_due",
    "high_value_inventory",
    "serial_warranty_tracking",
  ],
};

// -------------------------------------------------------------
// 4. Clothing & Apparel Template
// -------------------------------------------------------------
export const APPAREL_TEMPLATE: IndustryTemplate = {
  id: "apparel",
  name: "Clothing & Apparel",
  tagline: "Fashion boutiques, garment showrooms, and footwear stores",
  description:
    "Engineered for fashion retail requiring 2D variant matrices (Size × Color), seasonal collections, barcode labels, and fast counter checkouts.",
  defaultUom: "PCS",
  supportedUoms: ["PCS", "PAIR", "SET", "MTR"],
  categories: [
    { name: "Men's Apparel", code: "APP-MEN", description: "Shirts, trousers, jeans, t-shirts, blazers" },
    { name: "Women's Apparel", code: "APP-WOM", description: "Dresses, ethnic wear, tops, jeans, sarees" },
    { name: "Kids & Infants", code: "APP-KID", description: "Children's wear, baby clothing, sets" },
    { name: "Footwear & Shoes", code: "APP-FTW", description: "Formal shoes, sneakers, sandals, slippers" },
    { name: "Fashion Accessories", code: "APP-ACC", description: "Belts, wallets, ties, scarves, caps" },
    { name: "Fabrics & Unstitched", code: "APP-FAB", description: "Suiting, shirting, dress material (sold per meter)" },
  ],
  attributes: [
    { key: "brand", label: "Brand / Label", type: "text", isRequired: false, placeholder: "e.g. Zara, Levi's, Raymond, Allen Solly" },
    { key: "size", label: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "38", "40", "42", "Free Size"], isVariantDimension: true },
    { key: "color", label: "Color", type: "text", isRequired: false, isVariantDimension: true, placeholder: "e.g. Navy Blue, Olive Green, Crimson" },
    { key: "fabric", label: "Fabric / Material", type: "text", isRequired: false, placeholder: "e.g. 100% Cotton, Linen Blend, Silk" },
    { key: "gender", label: "Gender", type: "select", options: ["Men", "Women", "Unisex", "Boys", "Girls"] },
    { key: "season", label: "Season / Collection", type: "text", isRequired: false, placeholder: "e.g. Festive 2026, Summer 2026" },
  ],
  featureFlags: {
    enablePos: true,
    enableWarehouses: false,
    enableSerialImei: false,
    enableMatrixVariant: true,
    enableCreditLimit: false,
    enableBatchExpiry: false,
    enableBomManufacturing: false,
    enableWholesalePricing: false,
  },
  optionalModules: [
    { id: "variant_matrix", name: "Size-Color Matrix Grid", description: "Bulk order & stock input via 2D variant matrix", enabledByDefault: true },
    { id: "barcode_tags", name: "Garment Barcode Tags", description: "Print adhesive tags and thermal price tickets", enabledByDefault: true },
  ],
  defaultInvoiceSettings: {
    showItemDescription: true,
    showHsn: false,
    showBarcode: true,
    showDiscount: true,
    printFormat: "THERMAL_3INCH",
  },
  defaultDashboardCards: [
    "pos_daily_register",
    "sales_summary",
    "variant_matrix_inventory",
    "fast_moving_products",
  ],
};

// -------------------------------------------------------------
// 5. Hardware & Tools Template
// -------------------------------------------------------------
export const HARDWARE_TEMPLATE: IndustryTemplate = {
  id: "hardware",
  name: "Hardware & Tools",
  tagline: "Industrial hardware, power tools, fasteners, and contractor supplies",
  description:
    "Designed for hardware merchants, building material suppliers, and tool stockists managing mixed units (pieces, kilograms, meters) and contractor credit.",
  defaultUom: "PCS",
  supportedUoms: ["PCS", "SET", "BOX", "KG", "MTR"],
  categories: [
    { name: "Power Tools & Machinery", code: "HDW-PWR", description: "Drills, angle grinders, circular saws, rotary hammers" },
    { name: "Hand Tools", code: "HDW-HND", description: "Wrenches, pliers, hammers, screwdrivers, tape measures" },
    { name: "Fasteners & Screws", code: "HDW-FST", description: "Bolts, nuts, self-tapping screws, wall anchors (sold in KG or BOX)" },
    { name: "Paints & Adhesives", code: "HDW-PNT", description: "Wall paints, sealants, silicones, wood glues" },
    { name: "Electrical & Wiring", code: "HDW-ELE", description: "Conduits, wire rolls, switches, junction boxes" },
    { name: "Safety & PPE", code: "HDW-SAF", description: "Helmets, safety goggles, gloves, harness kits" },
  ],
  attributes: [
    { key: "brand", label: "Brand / Maker", type: "text", isRequired: false, placeholder: "e.g. Bosch, Stanley, DeWalt, Asian Paints" },
    { key: "specification", label: "Grade / Specification", type: "text", isRequired: false, placeholder: "e.g. Grade 8.8, SS-304, Heavy Duty" },
    { key: "material", label: "Material", type: "text", isRequired: false, placeholder: "e.g. High Carbon Steel, Brass, Cast Iron" },
    { key: "sizeDimension", label: "Size / Diameter", type: "text", isRequired: false, placeholder: "e.g. M8x50mm, 1/2 inch, 100mm" },
    { key: "powerRating", label: "Power / Voltage Rating", type: "text", isRequired: false, placeholder: "e.g. 750W, 220V, 18V Cordless" },
  ],
  featureFlags: {
    enablePos: true,
    enableWarehouses: false,
    enableSerialImei: false,
    enableMatrixVariant: false,
    enableCreditLimit: true,
    enableBatchExpiry: false,
    enableBomManufacturing: false,
    enableWholesalePricing: true,
  },
  optionalModules: [
    { id: "mixed_uom", name: "Mixed UOM Pricing", description: "Sell goods by weight (KG), length (MTR), or piece (PCS)", enabledByDefault: true },
    { id: "contractor_ledger", name: "Contractor Credit Ledger", description: "Maintain running balance accounts for builders", enabledByDefault: true },
  ],
  defaultInvoiceSettings: {
    showItemDescription: true,
    showHsn: true,
    showBarcode: false,
    showDiscount: true,
    printFormat: "A4",
  },
  defaultDashboardCards: [
    "sales_summary",
    "receivables_due",
    "low_stock_alerts",
    "supplier_payables",
  ],
};

// -------------------------------------------------------------
// 6. Wholesale & B2B Distribution Template
// -------------------------------------------------------------
export const WHOLESALE_TEMPLATE: IndustryTemplate = {
  id: "wholesale",
  name: "Wholesale & B2B Distribution",
  tagline: "Wholesale merchants, distributors, bulk stockists, and trading firms",
  description:
    "Configured for high-volume commercial traders with case/carton packaging, tiered wholesale pricing, B2B credit terms, and GST invoicing.",
  defaultUom: "BOX",
  supportedUoms: ["BOX", "PCS", "SET", "KG", "MTR"],
  categories: [
    { name: "Bulk Commodities & Goods", code: "WHL-COM", description: "Master trade commodities and high-turnover lines" },
    { name: "Packaged Cases & Cartons", code: "WHL-CS", description: "Pre-packaged master cartons and outer packaging" },
    { name: "Commercial Supplies", code: "WHL-SUP", description: "Institutional and enterprise consumable supplies" },
    { name: "Industrial Consumables", code: "WHL-IND", description: "Regular replenishment commercial inventory" },
    { name: "Distribution Stock", code: "WHL-DST", description: "Brand distributor allocated stocks" },
  ],
  attributes: [
    { key: "brand", label: "Brand", type: "text", isRequired: false, placeholder: "Brand or principal supplier" },
    { key: "casePackQuantity", label: "Units Per Case (Inner Pack)", type: "number", isRequired: false, placeholder: "e.g. 12, 24, 48" },
    { key: "minOrderQuantity", label: "Min Order Qty (MOQ)", type: "number", isRequired: false, placeholder: "e.g. 5, 10" },
    { key: "tierPricingAvailable", label: "Tier Pricing Enabled", type: "boolean", isRequired: false },
    { key: "originCountry", label: "Country of Origin", type: "text", isRequired: false, placeholder: "e.g. India, Germany, Japan" },
  ],
  featureFlags: {
    enablePos: false, // B2B traders invoice via A4 trade invoices, not counter POS
    enableWarehouses: false,
    enableSerialImei: false,
    enableMatrixVariant: false,
    enableCreditLimit: true,
    enableBatchExpiry: false,
    enableBomManufacturing: false,
    enableWholesalePricing: true,
  },
  optionalModules: [
    { id: "case_pricing", name: "Case & Master Carton Logic", description: "Automatically calculate pieces from cartons", enabledByDefault: true },
    { id: "credit_control", name: "Strict Credit Limit Enforcement", description: "Block invoice generation when client credit limit is exceeded", enabledByDefault: true },
  ],
  defaultInvoiceSettings: {
    showItemDescription: true,
    showHsn: true,
    showBarcode: false,
    showDiscount: true,
    printFormat: "A4",
  },
  defaultDashboardCards: [
    "sales_summary",
    "receivables_due",
    "supplier_payables",
    "taxable_turnover",
    "b2b_credit_exposure",
  ],
};

// -------------------------------------------------------------
// 7. Manufacturing & Production Template
// -------------------------------------------------------------
export const MANUFACTURING_TEMPLATE: IndustryTemplate = {
  id: "manufacturing",
  name: "Manufacturing & Production",
  tagline: "Workshops, fabrication units, assemblers, and batch processors",
  description:
    "Built for producers tracking raw material consumption, work in progress, finished goods, batch lots, and supplier procurement.",
  defaultUom: "PCS",
  supportedUoms: ["PCS", "KG", "MTR", "SET", "BOX"],
  categories: [
    { name: "Raw Materials", code: "MFG-RAW", description: "Basic inputs, sheets, ingots, chemicals, unworked parts" },
    { name: "Work in Progress (WIP)", code: "MFG-WIP", description: "Semi-finished assemblies and stage-processed goods" },
    { name: "Finished Goods", code: "MFG-FGD", description: "Completed products packaged and ready for commercial dispatch" },
    { name: "Packaging Materials", code: "MFG-PKG", description: "Cartons, bubbles, labels, pallets, shrink wraps" },
    { name: "Machine Spares & Consumables", code: "MFG-SPR", description: "Lubricants, tooling tips, replacement belts" },
  ],
  attributes: [
    { key: "partNumber", label: "Part / Drawing No.", type: "text", isRequired: false, placeholder: "e.g. DWG-2026-A4" },
    { key: "materialGrade", label: "Material Grade", type: "text", isRequired: false, placeholder: "e.g. EN8, SS316L, MS-IS2062" },
    { key: "batchLotNumber", label: "Production Batch / Lot", type: "text", isRequired: false, placeholder: "Batch identifier" },
    { key: "standardUnitCost", label: "Standard Production Cost", type: "number", isRequired: false, placeholder: "₹ 0.00" },
    { key: "leadTimeDays", label: "Lead Time (Days)", type: "number", isRequired: false, placeholder: "e.g. 7, 14, 30" },
  ],
  featureFlags: {
    enablePos: false,
    enableWarehouses: false,
    enableSerialImei: false,
    enableMatrixVariant: false,
    enableCreditLimit: true,
    enableBatchExpiry: true,
    enableBomManufacturing: true,
    enableWholesalePricing: true,
  },
  optionalModules: [
    { id: "bom_assembly", name: "Bill of Materials (BOM)", description: "Define material recipes for finished products", enabledByDefault: true },
    { id: "raw_material_consumption", name: "Automated Material Deductions", description: "Deplete raw materials when finished items are booked", enabledByDefault: true },
  ],
  defaultInvoiceSettings: {
    showItemDescription: true,
    showHsn: true,
    showBarcode: false,
    showDiscount: false,
    printFormat: "A4",
  },
  defaultDashboardCards: [
    "production_wip",
    "raw_material_shortage",
    "finished_goods_inventory",
    "supplier_payables",
  ],
};

// -------------------------------------------------------------
// Universal Registry Collection
// -------------------------------------------------------------
export const TEMPLATE_REGISTRY: Record<IndustryTemplateId, IndustryTemplate> = {
  sanitaryware: SANITARYWARE_TEMPLATE,
  fmcg: FMCG_TEMPLATE,
  electronics: ELECTRONICS_TEMPLATE,
  apparel: APPAREL_TEMPLATE,
  hardware: HARDWARE_TEMPLATE,
  wholesale: WHOLESALE_TEMPLATE,
  manufacturing: MANUFACTURING_TEMPLATE,
};

/**
 * Normalizes any free-form or user-entered business sector string to
 * one of the seven canonical IndustryTemplateId keys.
 */
export function normalizeBusinessType(input?: string | null): IndustryTemplateId | null {
  if (!input || typeof input !== "string") return null;

  const clean = input.trim().toLowerCase();

  // 1. Electronics & Mobiles (checked first so "Electronics, Hardware & Gadgets" resolves to electronics)
  if (
    clean === "electronics" ||
    clean === "mobile" ||
    clean.includes("electronics") ||
    clean.includes("gadget") ||
    clean.includes("smartphone") ||
    clean.includes("computer") ||
    clean.includes("appliances")
  ) {
    return "electronics";
  }

  // 2. Hardware & Tools (checked before sanitaryware so "Hardware, Sanitary & Building Materials" resolves to hardware)
  if (
    clean === "hardware" ||
    clean === "tools" ||
    clean.includes("hardware") ||
    clean.includes("tool") ||
    clean.includes("fastener") ||
    clean.includes("building material")
  ) {
    return "hardware";
  }

  // 3. Sanitaryware & Bath Fittings
  if (
    clean === "sanitaryware" ||
    clean === "sanitary" ||
    clean.includes("sanitary") ||
    clean.includes("bath") ||
    clean.includes("faucet") ||
    clean.includes("vanity")
  ) {
    return "sanitaryware";
  }

  // 4. Grocery & FMCG
  if (
    clean === "fmcg" ||
    clean === "grocery" ||
    clean.includes("fmcg") ||
    clean.includes("supermarket") ||
    clean.includes("grocery") ||
    clean.includes("food") ||
    clean.includes("packaged goods")
  ) {
    return "fmcg";
  }

  // 5. Clothing & Apparel
  if (
    clean === "apparel" ||
    clean === "clothing" ||
    clean.includes("apparel") ||
    clean.includes("garment") ||
    clean.includes("fashion") ||
    clean.includes("textile") ||
    clean.includes("footwear")
  ) {
    return "apparel";
  }

  // 6. Wholesale & B2B Distribution
  if (
    clean === "wholesale" ||
    clean === "b2b" ||
    clean.includes("wholesale") ||
    clean.includes("distribution") ||
    clean.includes("distributor") ||
    clean.includes("b2b")
  ) {
    return "wholesale";
  }

  // 7. Manufacturing & Production
  if (
    clean === "manufacturing" ||
    clean === "production" ||
    clean.includes("manufactur") ||
    clean.includes("production") ||
    clean.includes("assembly") ||
    clean.includes("fabrication") ||
    clean.includes("industrial supplies")
  ) {
    return "manufacturing";
  }

  // Universal / Retail fallback mappings
  if (clean === "retail" || clean.includes("retail")) {
    return "fmcg";
  }

  return null;
}
