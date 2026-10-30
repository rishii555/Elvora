export interface MockItem {
  id: string;
  name: string;
  code: string;
  barcode: string;
  type: "PRODUCT" | "SERVICE";
  brandOrVendor: string;
  category: string;
  hsnOrSac: string; // HSN for goods, SAC for services
  uom: "PCS" | "SET" | "BOX" | "HRS" | "MTR" | "KG" | "UNIT";
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  gstRate: number; // 0, 5, 12, 18, 28
  stock: number;
  minStockAlert: number;
  tracksStock: boolean;
}

export interface MockCustomer {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  gstin?: string;
  stateCode: string;
  city: string;
  type: "CORPORATE" | "RETAIL" | "WHOLESALE" | "CONTRACTOR";
  creditLimit: number;
  outstandingBalance: number;
  lastBillDate: string;
}

export interface MockSupplier {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email?: string;
  gstin: string;
  stateCode: string;
  city: string;
  category: string;
  balancePayable: number;
}

export interface MockInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  invoiceType: "B2B_TAX_INVOICE" | "B2C_RETAIL_BILL";
  paymentMode: "CASH" | "UPI" | "CREDIT" | "BANK_TRANSFER";
  itemsCount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  status: "FINALIZED" | "DRAFT" | "CANCELLED";
}

// Universal Cross-Industry Items (Goods + Services)
export const MOCK_PRODUCTS: MockItem[] = [
  {
    id: "prod-1",
    name: "Ergonomic High-Back Executive Office Chair",
    code: "FUR-CHR-001",
    barcode: "8901001001011",
    type: "PRODUCT",
    brandOrVendor: "Steelmate",
    category: "Office Furniture & Setup",
    hsnOrSac: "9403",
    uom: "PCS",
    purchasePrice: 4200.0,
    sellingPrice: 5990.0,
    mrp: 6999.0,
    gstRate: 18,
    stock: 12,
    minStockAlert: 4,
    tracksStock: true,
  },
  {
    id: "prod-2",
    name: "Logitech MX Master 3S Wireless Bluetooth Mouse",
    code: "ACC-MOU-302",
    barcode: "8901001001028",
    type: "PRODUCT",
    brandOrVendor: "Logitech",
    category: "Computer Hardware & Electronics",
    hsnOrSac: "8471",
    uom: "PCS",
    purchasePrice: 6500.0,
    sellingPrice: 8495.0,
    mrp: 9995.0,
    gstRate: 18,
    stock: 18,
    minStockAlert: 5,
    tracksStock: true,
  },
  {
    id: "prod-3",
    name: "JK Copier Multi-Purpose A4 Paper (75 GSM, Carton of 5 Reams)",
    code: "STN-PPR-75G",
    barcode: "8901001001035",
    type: "PRODUCT",
    brandOrVendor: "JK Paper",
    category: "Stationery & Packaging Supplies",
    hsnOrSac: "4802",
    uom: "BOX",
    purchasePrice: 1180.0,
    sellingPrice: 1550.0,
    mrp: 1750.0,
    gstRate: 12,
    stock: 35,
    minStockAlert: 10,
    tracksStock: true,
  },
  {
    id: "prod-4",
    name: "Dell UltraSharp 27-inch 4K USB-C Hub Monitor",
    code: "DSP-MN-274K",
    barcode: "8901001001042",
    type: "PRODUCT",
    brandOrVendor: "Dell",
    category: "Computer Hardware & Electronics",
    hsnOrSac: "8528",
    uom: "PCS",
    purchasePrice: 34500.0,
    sellingPrice: 42900.0,
    mrp: 48500.0,
    gstRate: 18,
    stock: 2,
    minStockAlert: 3, // Low stock indicator
    tracksStock: true,
  },
  {
    id: "prod-5",
    name: "Enterprise Annual IT Support & Cloud Backup (Quarterly Retainer)",
    code: "SRV-IT-QRT",
    barcode: "8901001001059",
    type: "SERVICE",
    brandOrVendor: "In-House Service",
    category: "Professional Services & Consulting",
    hsnOrSac: "9983", // SAC code for IT services
    uom: "SET",
    purchasePrice: 0.0,
    sellingPrice: 18500.0,
    mrp: 20000.0,
    gstRate: 18,
    stock: 999,
    minStockAlert: 0,
    tracksStock: false, // Service does not track physical stock
  },
  {
    id: "prod-6",
    name: "Industrial Heavy-Duty Cordless Impact Drill Kit (18V Li-ion)",
    code: "TOL-DRL-18V",
    barcode: "8901001001066",
    type: "PRODUCT",
    brandOrVendor: "Bosch",
    category: "Tools, Hardware & Equipment",
    hsnOrSac: "8467",
    uom: "SET",
    purchasePrice: 6800.0,
    sellingPrice: 8900.0,
    mrp: 10200.0,
    gstRate: 18,
    stock: 3,
    minStockAlert: 4, // Low stock indicator
    tracksStock: true,
  },
  {
    id: "prod-7",
    name: "Premium Bio-Washed Combed Cotton Polo Shirt (Navy Blue - Pack of 10)",
    code: "APP-POL-10P",
    barcode: "8901001001073",
    type: "PRODUCT",
    brandOrVendor: "AeroWear",
    category: "Apparel & Merchandise",
    hsnOrSac: "6105",
    uom: "BOX",
    purchasePrice: 3200.0,
    sellingPrice: 4600.0,
    mrp: 5500.0,
    gstRate: 5,
    stock: 24,
    minStockAlert: 6,
    tracksStock: true,
  },
  {
    id: "prod-8",
    name: "Heavy-Duty Corrugated Shipping Boxes (3-Ply 12x10x8 inch, Pack of 50)",
    code: "PKG-BOX-50P",
    barcode: "8901001001080",
    type: "PRODUCT",
    brandOrVendor: "EcoPack",
    category: "Stationery & Packaging Supplies",
    hsnOrSac: "4819",
    uom: "BOX",
    purchasePrice: 920.0,
    sellingPrice: 1350.0,
    mrp: 1500.0,
    gstRate: 12,
    stock: 40,
    minStockAlert: 12,
    tracksStock: true,
  },
];

// Universal Clients & Customers
export const MOCK_CUSTOMERS: MockCustomer[] = [
  {
    id: "cust-1",
    name: "Apex Infotech Solutions Pvt Ltd",
    company: "Apex Infotech",
    phone: "9811223344",
    email: "procurement@apexinfotech.com",
    gstin: "09AAACA1234F1Z5",
    stateCode: "09",
    city: "Noida, Sector 63",
    type: "CORPORATE",
    creditLimit: 150000,
    outstandingBalance: 38400,
    lastBillDate: "28/10/2026",
  },
  {
    id: "cust-2",
    name: "Sunrise Retail Mart (Gaurav Tandon)",
    company: "Sunrise Mart",
    phone: "9910482910",
    email: "sunrise.retail@gmail.com",
    gstin: "07AABCS5678M1Z8",
    stateCode: "07",
    city: "New Delhi",
    type: "WHOLESALE",
    creditLimit: 250000,
    outstandingBalance: 64200,
    lastBillDate: "27/10/2026",
  },
  {
    id: "cust-3",
    name: "Pooja Mehta (Consultant)",
    phone: "9871234091",
    email: "pooja.mehta@outlook.com",
    stateCode: "09",
    city: "Greater Noida",
    type: "RETAIL",
    creditLimit: 0,
    outstandingBalance: 0,
    lastBillDate: "29/10/2026",
  },
  {
    id: "cust-4",
    name: "Metro Horizon Logistics LLP",
    company: "Metro Horizon",
    phone: "9899120485",
    email: "accounts@metrohorizon.in",
    gstin: "08AAACM9876H1Z2",
    stateCode: "08",
    city: "Jaipur, Rajasthan",
    type: "CORPORATE",
    creditLimit: 100000,
    outstandingBalance: 12550,
    lastBillDate: "24/10/2026",
  },
];

// Universal Vendors & Suppliers
export const MOCK_SUPPLIERS: MockSupplier[] = [
  {
    id: "supp-1",
    name: "National Tech & Electronics Distribution Hub",
    companyName: "National Tech Distro Ltd",
    phone: "9811002233",
    email: "sales@nationaltechdistro.com",
    gstin: "07AAACN1234K1Z2",
    stateCode: "07",
    city: "Okhla Industrial Area, Delhi",
    category: "IT Hardware & Peripherals",
    balancePayable: 142000,
  },
  {
    id: "supp-2",
    name: "Apex Paper Mills & Packaging Depot",
    companyName: "Apex Paper & Pack Corp",
    phone: "9822334411",
    email: "orders@apexpaper.in",
    gstin: "09AABCP5678L1Z9",
    stateCode: "09",
    city: "Ghaziabad, UP",
    category: "Paper, Packaging & Stationery",
    balancePayable: 54800,
  },
];

// Universal Invoices
export const MOCK_INVOICES: MockInvoice[] = [
  {
    id: "inv-101",
    invoiceNumber: "INV-2026-00101",
    date: "29/10/2026",
    customerName: "Pooja Mehta (Consultant)",
    customerPhone: "9871234091",
    invoiceType: "B2C_RETAIL_BILL",
    paymentMode: "UPI",
    itemsCount: 2,
    taxableAmount: 14480.0,
    totalTax: 2410.0,
    grandTotal: 16890.0,
    paidAmount: 16890.0,
    balanceAmount: 0.0,
    status: "FINALIZED",
  },
  {
    id: "inv-100",
    invoiceNumber: "INV-2026-00100",
    date: "28/10/2026",
    customerName: "Apex Infotech Solutions Pvt Ltd",
    customerPhone: "9811223344",
    invoiceType: "B2B_TAX_INVOICE",
    paymentMode: "CREDIT",
    itemsCount: 4,
    taxableAmount: 32542.37,
    totalTax: 5857.63,
    grandTotal: 38400.0,
    paidAmount: 0.0,
    balanceAmount: 38400.0,
    status: "FINALIZED",
  },
  {
    id: "inv-099",
    invoiceNumber: "INV-2026-00099",
    date: "27/10/2026",
    customerName: "Sunrise Retail Mart (Gaurav Tandon)",
    customerPhone: "9910482910",
    invoiceType: "B2B_TAX_INVOICE",
    paymentMode: "BANK_TRANSFER",
    itemsCount: 6,
    taxableAmount: 54406.78,
    totalTax: 9793.22,
    grandTotal: 64200.0,
    paidAmount: 20000.0,
    balanceAmount: 44200.0,
    status: "FINALIZED",
  },
  {
    id: "inv-098",
    invoiceNumber: "INV-2026-00098",
    date: "26/10/2026",
    customerName: "Direct Counter Walk-in",
    customerPhone: "-",
    invoiceType: "B2C_RETAIL_BILL",
    paymentMode: "CASH",
    itemsCount: 1,
    taxableAmount: 1383.93,
    totalTax: 166.07,
    grandTotal: 1550.0,
    paidAmount: 1550.0,
    balanceAmount: 0.0,
    status: "FINALIZED",
  },
];

// Compatibility alias for existing imports
export type MockProduct = MockItem;
