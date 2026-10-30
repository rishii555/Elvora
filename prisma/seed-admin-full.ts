import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to MongoDB Atlas to push complete Admin workspace dataset...");

  // 1. Check or create Super Admin User
  let adminUser = await prisma.user.findUnique({
    where: { email: "admin@elvora.com" },
  });

  const passwordHash = await bcrypt.hash("admin123", 12);

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: "Elvora Super Admin",
        email: "admin@elvora.com",
        passwordHash,
        phone: "9876543210",
        isActive: true,
      },
    });
    console.log(`Created Super Admin user: ${adminUser.email}`);
  } else {
    // Update password hash if needed
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: { passwordHash, isActive: true },
    });
    console.log(`Found existing Super Admin user: ${adminUser.email}`);
  }

  // 2. Check or create Staff Users (Accountant & Biller)
  let billerUser = await prisma.user.findUnique({ where: { email: "biller@elvora.com" } });
  if (!billerUser) {
    billerUser = await prisma.user.create({
      data: {
        name: "Counter Cashier (Staff)",
        email: "biller@elvora.com",
        passwordHash: await bcrypt.hash("biller123", 12),
        phone: "9876543211",
        isActive: true,
      },
    });
    console.log("Created staff biller: biller@elvora.com / biller123");
  }

  let accountantUser = await prisma.user.findUnique({ where: { email: "accountant@elvora.com" } });
  if (!accountantUser) {
    accountantUser = await prisma.user.create({
      data: {
        name: "Senior Accountant (Staff)",
        email: "accountant@elvora.com",
        passwordHash: await bcrypt.hash("accountant123", 12),
        phone: "9876543212",
        isActive: true,
      },
    });
    console.log("Created staff accountant: accountant@elvora.com / accountant123");
  }

  // 3. Check or create Main Admin Tenant (Universal Enterprises)
  let tenant = await prisma.tenant.findFirst({
    where: { email: "admin@elvora.com" },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        tradeName: "Universal Enterprises",
        legalName: "Universal Enterprises Private Limited",
        gstin: "09AAACU9842F1Z6",
        stateCode: "09", // Uttar Pradesh
        phone: "9876543210",
        email: "admin@elvora.com",
        address: "102 Industrial Tech Park, Sector 62, Noida, Uttar Pradesh - 201309",
        invoicePrefix: "INV-",
        nextInvoiceNumber: 105,
        currency: "INR",
        isActive: true,
      },
    });
    console.log(`Created primary tenant workspace: ${tenant.tradeName}`);
  }

  const tenantId = tenant.id;

  // 4. Ensure Memberships for Admin and Staff
  const adminMembership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: adminUser.id } },
  });
  if (!adminMembership) {
    await prisma.tenantMember.create({
      data: {
        tenantId,
        userId: adminUser.id,
        role: "OWNER",
        isDefault: true,
      },
    });
  }

  const billerMembership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: billerUser.id } },
  });
  if (!billerMembership) {
    await prisma.tenantMember.create({
      data: {
        tenantId,
        userId: billerUser.id,
        role: "BILLER",
        isDefault: true,
      },
    });
  }

  const accountantMembership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: accountantUser.id } },
  });
  if (!accountantMembership) {
    await prisma.tenantMember.create({
      data: {
        tenantId,
        userId: accountantUser.id,
        role: "ACCOUNTANT",
        isDefault: true,
      },
    });
  }

  // 4b. Seed Default Inventory Locations
  const locations = [
    { name: "Main Store Counter", code: "LOC-COUNTER", isDefault: true },
    { name: "Warehouse Central (Godown A)", code: "LOC-WH-A", isDefault: false },
  ];
  for (const loc of locations) {
    const existingLoc = await prisma.inventoryLocation.findUnique({
      where: { tenantId_name: { tenantId, name: loc.name } },
    });
    if (!existingLoc) {
      await prisma.inventoryLocation.create({
        data: {
          tenantId,
          name: loc.name,
          code: loc.code,
          isDefault: loc.isDefault,
        },
      });
    }
  }

  // 4c. Seed Configurable Tax Classifications
  const taxSlabs = [
    { name: "GST 18%", code: "GST_18", rate: 18.0, cgst: 9.0, sgst: 9.0, igst: 18.0, isDefault: true },
    { name: "GST 12%", code: "GST_12", rate: 12.0, cgst: 6.0, sgst: 6.0, igst: 12.0, isDefault: false },
    { name: "GST 5%", code: "GST_5", rate: 5.0, cgst: 2.5, sgst: 2.5, igst: 5.0, isDefault: false },
    { name: "GST 0% / Nil", code: "GST_0", rate: 0.0, cgst: 0.0, sgst: 0.0, igst: 0.0, isDefault: false },
    { name: "Exempt Goods", code: "EXEMPT", rate: 0.0, cgst: 0.0, sgst: 0.0, igst: 0.0, isDefault: false },
  ];
  for (const slab of taxSlabs) {
    const existingSlab = await prisma.taxClassification.findUnique({
      where: { tenantId_code: { tenantId, code: slab.code } },
    });
    if (!existingSlab) {
      await prisma.taxClassification.create({
        data: {
          tenantId,
          name: slab.name,
          code: slab.code,
          rate: slab.rate,
          cgstRate: slab.cgst,
          sgstRate: slab.sgst,
          igstRate: slab.igst,
          isDefault: slab.isDefault,
        },
      });
    }
  }

  // 4d. Seed Financial Year Invoice Sequences
  const sequences = [
    { fiscalYear: "2026-27", seriesType: "TAX_INVOICE", prefix: "INV-", nextNumber: 43 },
    { fiscalYear: "2026-27", seriesType: "RETAIL_BILL", prefix: "BILL-", nextNumber: 15 },
    { fiscalYear: "2026-27", seriesType: "CREDIT_NOTE", prefix: "CN-", nextNumber: 3 },
  ];
  for (const seq of sequences) {
    const existingSeq = await prisma.invoiceSequence.findUnique({
      where: { tenantId_fiscalYear_seriesType: { tenantId, fiscalYear: seq.fiscalYear, seriesType: seq.seriesType } },
    });
    if (!existingSeq) {
      await prisma.invoiceSequence.create({
        data: {
          tenantId,
          fiscalYear: seq.fiscalYear,
          seriesType: seq.seriesType,
          prefix: seq.prefix,
          nextNumber: seq.nextNumber,
        },
      });
    }
  }

  // 5. Seed Core Double-Entry Ledger Accounts
  const defaultAccounts = [
    { code: "CASH", name: "Cash on Hand", type: "ASSET" as const, balance: 45000.0 },
    { code: "BANK", name: "HDFC Primary Current Account", type: "ASSET" as const, balance: 185000.0 },
    { code: "ACCOUNTS_RECEIVABLE", name: "Sundry Debtors (Customers)", type: "ASSET" as const, balance: 45300.0 },
    { code: "ACCOUNTS_PAYABLE", name: "Sundry Creditors (Suppliers)", type: "LIABILITY" as const, balance: 22400.0 },
    { code: "SALES", name: "Sales Account", type: "REVENUE" as const, balance: 386400.0 },
    { code: "PURCHASES", name: "Purchase Account", type: "EXPENSE" as const, balance: 184500.0 },
    { code: "GST_PAYABLE", name: "GST Output Tax Liability", type: "LIABILITY" as const, balance: 34200.0 },
    { code: "GST_INPUT_CREDIT", name: "GST Input Tax Credit (ITC)", type: "ASSET" as const, balance: 18600.0 },
    { code: "RENT_EXPENSE", name: "Office & Warehouse Rent", type: "EXPENSE" as const, balance: 35000.0 },
    { code: "UTILITY_EXPENSE", name: "Electricity & High-Speed Internet", type: "EXPENSE" as const, balance: 12400.0 },
    { code: "SALARY_EXPENSE", name: "Staff Payroll & Wages", type: "EXPENSE" as const, balance: 54000.0 },
  ];

  for (const acc of defaultAccounts) {
    const existing = await prisma.ledgerAccount.findUnique({
      where: { tenantId_code: { tenantId, code: acc.code } },
    });
    if (!existing) {
      await prisma.ledgerAccount.create({
        data: {
          tenantId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
        },
      });
    }
  }

  // 6. Seed Product Categories
  const categoryNames = [
    "Office Furniture & Fixtures",
    "Office Equipment & Electronics",
    "Packaging & Paper Supplies",
    "Industrial Hardware & Tools",
    "Apparel & Workwear",
    "Professional & IT Services",
  ];

  const categoryMap = new Map<string, string>();
  for (const catName of categoryNames) {
    let cat = await prisma.category.findUnique({
      where: { tenantId_name: { tenantId, name: catName } },
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: { tenantId, name: catName },
      });
    }
    categoryMap.set(catName, cat.id);
  }

  // 7. Seed Full Catalog of Products & Variants
  const catalog = [
    {
      name: "Ergonomic Mesh Office Chair",
      code: "CHR-ERGO-01",
      category: "Office Furniture & Fixtures",
      hsnCode: "9403",
      uom: "PCS" as const,
      minStockAlert: 5,
      variants: [
        {
          name: "High Back - Charcoal Black",
          sku: "CHR-ERGO-BLK",
          purchasePrice: 4200.0,
          sellingPrice: 6500.0,
          mrp: 7500.0,
          gstRate: 18.0,
          currentStock: 14,
        },
        {
          name: "Mid Back - Steel Grey",
          sku: "CHR-ERGO-GRY",
          purchasePrice: 3800.0,
          sellingPrice: 5800.0,
          mrp: 6800.0,
          gstRate: 18.0,
          currentStock: 4, // low stock trigger
        },
      ],
    },
    {
      name: "Wireless Optical Mouse (Silent Click)",
      code: "MSE-WRL-02",
      category: "Office Equipment & Electronics",
      hsnCode: "8471",
      uom: "PCS" as const,
      minStockAlert: 10,
      variants: [
        {
          name: "Matte Black (2.4GHz + BT)",
          sku: "MSE-WRL-BLK",
          purchasePrice: 480.0,
          sellingPrice: 899.0,
          mrp: 1299.0,
          gstRate: 18.0,
          currentStock: 42,
        },
      ],
    },
    {
      name: "Copier Paper A4 75 GSM",
      code: "PPR-A4-75G",
      category: "Packaging & Paper Supplies",
      hsnCode: "4802",
      uom: "BOX" as const,
      minStockAlert: 15,
      variants: [
        {
          name: "Box of 5 Reams (2500 Sheets)",
          sku: "PPR-A4-BOX",
          purchasePrice: 950.0,
          sellingPrice: 1350.0,
          mrp: 1500.0,
          gstRate: 12.0,
          currentStock: 35,
        },
      ],
    },
    {
      name: "Heavy Duty Power Drill 750W",
      code: "DRL-750W-03",
      category: "Industrial Hardware & Tools",
      hsnCode: "8467",
      uom: "PCS" as const,
      minStockAlert: 5,
      variants: [
        {
          name: "Standard Kit (13mm Chuck)",
          sku: "DRL-750W-KIT",
          purchasePrice: 1850.0,
          sellingPrice: 2850.0,
          mrp: 3400.0,
          gstRate: 18.0,
          currentStock: 3, // low stock trigger
        },
      ],
    },
    {
      name: "Executive Cotton Formal Shirt",
      code: "APP-SHIRT-04",
      category: "Apparel & Workwear",
      hsnCode: "6205",
      uom: "PCS" as const,
      minStockAlert: 10,
      variants: [
        {
          name: "Slim Fit - Sky Blue (Size 40)",
          sku: "SHIRT-BLU-40",
          purchasePrice: 650.0,
          sellingPrice: 1299.0,
          mrp: 1799.0,
          gstRate: 5.0,
          currentStock: 22,
        },
      ],
    },
    {
      name: "Annual IT Infrastructure Maintenance Retainer",
      code: "SRV-IT-AMC",
      category: "Professional & IT Services",
      hsnCode: "9983",
      uom: "SET" as const,
      minStockAlert: 0,
      variants: [
        {
          name: "Standard Monthly SLA Retainer",
          sku: "SRV-AMC-STD",
          purchasePrice: 0.0, // pure service
          sellingPrice: 15000.0,
          mrp: 18000.0,
          gstRate: 18.0,
          currentStock: 999,
        },
      ],
    },
  ];

  const variantMap = new Map<string, { id: string; name: string; productName: string; price: number; hsn: string; gstRate: number }>();

  for (const item of catalog) {
    let product = await prisma.product.findUnique({
      where: { tenantId_code: { tenantId, code: item.code } },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          tenantId,
          name: item.name,
          code: item.code,
          categoryId: categoryMap.get(item.category),
          hsnCode: item.hsnCode,
          uom: item.uom,
          minStockAlert: item.minStockAlert,
        },
      });
    }

    for (const v of item.variants) {
      let variant = await prisma.productVariant.findUnique({
        where: { tenantId_sku: { tenantId, sku: v.sku } },
      });

      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            tenantId,
            productId: product.id,
            name: v.name,
            sku: v.sku,
            purchasePrice: v.purchasePrice,
            sellingPrice: v.sellingPrice,
            mrp: v.mrp,
            gstRate: v.gstRate,
            currentStock: v.currentStock,
          },
        });
      } else {
        variant = await prisma.productVariant.update({
          where: { id: variant.id },
          data: { currentStock: v.currentStock },
        });
      }

      variantMap.set(v.sku, {
        id: variant.id,
        name: v.name,
        productName: item.name,
        price: v.sellingPrice,
        hsn: item.hsnCode,
        gstRate: v.gstRate,
      });
    }
  }
  console.log(`Pushed products and variants to catalog.`);

  // 8. Seed Corporate Clients & Retail Customers
  const customerList = [
    {
      name: "Apex Horizon Technologies Ltd",
      phone: "9811223344",
      email: "accounts@apexhorizon.com",
      gstin: "09AAACA1234A1Z5",
      stateCode: "09",
      address: "Tower B, Cyber City, Sector 62, Noida, UP",
      creditLimit: 200000.0,
      outstandingBalance: 0.0,
    },
    {
      name: "Nexus Retailers Pvt Ltd",
      phone: "9822334455",
      email: "finance@nexusretail.in",
      gstin: "09BBBCB5678B1Z6",
      stateCode: "09",
      address: "Shop 14-16, Commercial Complex, Ghaziabad, UP",
      creditLimit: 100000.0,
      outstandingBalance: 14100.0,
    },
    {
      name: "Greenwood Logistics & Warehousing",
      phone: "9833445566",
      email: "billing@greenwoodlogistics.com",
      gstin: "09CCCGC9988C1Z8",
      stateCode: "09",
      address: "Warehouse Block 4, Transport Nagar, Greater Noida",
      creditLimit: 150000.0,
      outstandingBalance: 31200.0,
    },
    {
      name: "Rajesh Kumar (Retail Walk-in)",
      phone: "9899887766",
      email: "rajesh.k@gmail.com",
      gstin: null,
      stateCode: "09",
      address: "Sector 18, Noida, Uttar Pradesh",
      creditLimit: 0.0,
      outstandingBalance: 0.0,
    },
  ];

  const customerMap = new Map<string, string>();
  for (const c of customerList) {
    let customer = await prisma.customer.findFirst({
      where: { tenantId, phone: c.phone },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId,
          name: c.name,
          phone: c.phone,
          email: c.email,
          gstin: c.gstin,
          stateCode: c.stateCode,
          address: c.address,
          creditLimit: c.creditLimit,
          outstandingBalance: c.outstandingBalance,
        },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { outstandingBalance: c.outstandingBalance },
      });
    }
    customerMap.set(c.name, customer.id);
  }
  console.log(`Pushed customers and client ledger entries.`);

  // 9. Seed Suppliers / Vendors
  const suppliers = [
    {
      name: "Apex Hardware Distributors",
      companyName: "Apex Hardware Ltd",
      phone: "9844556677",
      email: "sales@apexhardware.com",
      gstin: "09CCCC7890C1Z7",
      address: "Industrial Area Phase 1, Kanpur, UP",
      balance: 0.0,
    },
    {
      name: "BlueStar Office Supplies Corp",
      companyName: "BlueStar Paper & Supplies",
      phone: "9855667788",
      email: "supply@bluestar.com",
      gstin: "09DDD7890D1Z9",
      address: "Paper Market, Daryaganj, Delhi - 110002",
      balance: 22400.0,
    },
  ];

  const supplierMap = new Map<string, string>();
  for (const s of suppliers) {
    let supplier = await prisma.supplier.findFirst({
      where: { tenantId, phone: s.phone },
    });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          tenantId,
          name: s.name,
          companyName: s.companyName,
          phone: s.phone,
          email: s.email,
          gstin: s.gstin,
          address: s.address,
          stateCode: "09",
          balance: s.balance,
        },
      });
    }
    supplierMap.set(s.name, supplier.id);
  }

  // 10. Seed Realistic Sales Invoices
  const now = new Date();
  const sampleInvoices = [
    {
      invoiceNumber: "INV-2026-0042",
      customerName: "Apex Horizon Technologies Ltd",
      date: new Date(now.getTime() - 2 * 3600 * 1000), // Today
      paymentMode: "UPI" as const,
      status: "FINALIZED" as const,
      paidAmount: 18400.0,
      balanceAmount: 0.0,
      items: [
        { sku: "CHR-ERGO-BLK", qty: 2, price: 6500.0, gstRate: 18.0 },
        { sku: "PPR-A4-BOX", qty: 4, price: 1350.0, gstRate: 12.0 },
      ],
    },
    {
      invoiceNumber: "INV-2026-0041",
      customerName: "Nexus Retailers Pvt Ltd",
      date: new Date(now.getTime() - 5 * 3600 * 1000), // Today
      paymentMode: "CREDIT" as const,
      status: "FINALIZED" as const,
      paidAmount: 10000.0,
      balanceAmount: 14100.0,
      items: [
        { sku: "CHR-ERGO-GRY", qty: 3, price: 5800.0, gstRate: 18.0 },
        { sku: "MSE-WRL-BLK", qty: 5, price: 899.0, gstRate: 18.0 },
        { sku: "DRL-750W-KIT", qty: 1, price: 2850.0, gstRate: 18.0 },
      ],
    },
    {
      invoiceNumber: "INV-2026-0040",
      customerName: "Rajesh Kumar (Retail Walk-in)",
      date: new Date(now.getTime() - 26 * 3600 * 1000), // Yesterday
      paymentMode: "CASH" as const,
      status: "FINALIZED" as const,
      paidAmount: 3450.0,
      balanceAmount: 0.0,
      items: [
        { sku: "SHIRT-BLU-40", qty: 2, price: 1299.0, gstRate: 5.0 },
        { sku: "MSE-WRL-BLK", qty: 1, price: 899.0, gstRate: 18.0 },
      ],
    },
    {
      invoiceNumber: "INV-2026-0039",
      customerName: "Greenwood Logistics & Warehousing",
      date: new Date(now.getTime() - 72 * 3600 * 1000), // 3 days ago
      paymentMode: "CREDIT" as const,
      status: "FINALIZED" as const,
      paidAmount: 0.0,
      balanceAmount: 31200.0,
      items: [
        { sku: "CHR-ERGO-BLK", qty: 4, price: 6500.0, gstRate: 18.0 },
        { sku: "DRL-750W-KIT", qty: 2, price: 2850.0, gstRate: 18.0 },
      ],
    },
  ];

  for (const inv of sampleInvoices) {
    const existing = await prisma.salesInvoice.findUnique({
      where: { tenantId_invoiceNumber: { tenantId, invoiceNumber: inv.invoiceNumber } },
    });

    if (!existing) {
      let subtotal = 0;
      let taxTotal = 0;

      const preparedItems = inv.items.map((line) => {
        const vInfo = variantMap.get(line.sku)!;
        const lineTaxable = line.qty * line.price;
        const lineTax = (lineTaxable * line.gstRate) / 100;
        const lineTotal = lineTaxable + lineTax;
        subtotal += lineTaxable;
        taxTotal += lineTax;

        return {
          tenantId,
          variantId: vInfo.id,
          productName: vInfo.productName,
          variantName: vInfo.name,
          hsnCode: vInfo.hsn,
          uom: "PCS" as const,
          quantity: line.qty,
          unitPrice: line.price,
          taxableAmount: lineTaxable,
          gstRate: line.gstRate,
          cgstAmount: lineTax / 2,
          sgstAmount: lineTax / 2,
          igstAmount: 0.0,
          totalAmount: lineTotal,
        };
      });

      const grandTotal = Math.round(subtotal + taxTotal);

      await prisma.salesInvoice.create({
        data: {
          tenantId,
          customerId: customerMap.get(inv.customerName),
          customerName: inv.customerName,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.date,
          invoiceType: "B2B_TAX_INVOICE",
          isInterState: false,
          subtotal,
          taxableAmount: subtotal,
          cgstAmount: taxTotal / 2,
          sgstAmount: taxTotal / 2,
          igstAmount: 0.0,
          grandTotal,
          paidAmount: inv.paidAmount,
          balanceAmount: inv.balanceAmount,
          paymentMode: inv.paymentMode,
          status: inv.status,
          createdByUserId: adminUser.id,
          items: {
            create: preparedItems,
          },
        },
      });
    }
  }
  console.log(`Pushed live sales invoices.`);

  // 11. Seed Inward Purchase Bills
  const samplePurchases = [
    {
      invoiceNumber: "BILL-VND-8941",
      supplierName: "Apex Hardware Distributors",
      date: new Date(now.getTime() - 48 * 3600 * 1000),
      grandTotal: 48500.0,
      paidAmount: 48500.0,
      status: "PAID",
    },
    {
      invoiceNumber: "BILL-VND-8940",
      supplierName: "BlueStar Office Supplies Corp",
      date: new Date(now.getTime() - 96 * 3600 * 1000),
      grandTotal: 22400.0,
      paidAmount: 0.0,
      status: "UNPAID",
    },
  ];

  for (const pb of samplePurchases) {
    const existing = await prisma.purchaseInvoice.findUnique({
      where: {
        tenantId_supplierId_invoiceNumber: {
          tenantId,
          supplierId: supplierMap.get(pb.supplierName)!,
          invoiceNumber: pb.invoiceNumber,
        },
      },
    });

    if (!existing) {
      await prisma.purchaseInvoice.create({
        data: {
          tenantId,
          supplierId: supplierMap.get(pb.supplierName)!,
          invoiceNumber: pb.invoiceNumber,
          invoiceDate: pb.date,
          subtotal: pb.grandTotal / 1.18,
          taxTotal: pb.grandTotal - pb.grandTotal / 1.18,
          grandTotal: pb.grandTotal,
          paidAmount: pb.paidAmount,
          paymentStatus: pb.status,
        },
      });
    }
  }
  console.log(`Pushed purchase bills.`);

  // 12. Seed Audit Log for Activity Records
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: adminUser.id,
      action: "ADMIN_WORKSPACE_INITIALIZED",
      entityType: "Tenant",
      entityId: tenantId,
      changesJson: JSON.stringify({
        initializedBy: adminUser.email,
        timestamp: new Date().toISOString(),
        collectionsPopulated: ["users", "tenants", "products", "customers", "invoices", "ledger"],
      }),
    },
  });

  console.log("\n=============================================================");
  console.log("SUCCESS: Complete Admin Workspace Dataset Pushed to MongoDB Atlas!");
  console.log(`Workspace Name: ${tenant.tradeName} (GSTIN: ${tenant.gstin})`);
  console.log(`Admin Sign-in:  ${adminUser.email} / admin123`);
  console.log("=============================================================\n");
}

main()
  .catch((e) => {
    console.error("Error pushing admin dataset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
