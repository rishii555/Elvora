import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MongoDB Atlas database with initial Elvora workspace...");

  const existingUser = await prisma.user.findUnique({
    where: { email: "admin@elvora.com" },
  });

  if (existingUser) {
    console.log("Admin user already exists in database.");
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 12);

  // Use MongoDB transaction to seed initial workspace
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Super Admin User
    const user = await tx.user.create({
      data: {
        name: "Elvora Admin",
        email: "admin@elvora.com",
        passwordHash,
        phone: "9876543210",
      },
    });

    // 2. Create Initial Tenant (Shop)
    const tenant = await tx.tenant.create({
      data: {
        tradeName: "Universal Enterprises",
        legalName: "Universal Enterprises Pvt Ltd",
        gstin: "09AAACU9842F1Z6",
        stateCode: "09",
        phone: "9876543210",
        email: "admin@elvora.com",
        address: "102 Industrial Area, Sector 62, Noida, Uttar Pradesh",
        invoicePrefix: "INV-",
        nextInvoiceNumber: 1,
      },
    });

    // 3. Assign OWNER Membership
    await tx.tenantMember.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "OWNER",
        isDefault: true,
      },
    });

    // 4. Default Ledger Accounts
    const defaultAccounts = [
      { code: "CASH", name: "Cash on Hand", type: "ASSET" as const },
      { code: "BANK", name: "Primary Bank Account", type: "ASSET" as const },
      { code: "ACCOUNTS_RECEIVABLE", name: "Sundry Debtors (Customers)", type: "ASSET" as const },
      { code: "ACCOUNTS_PAYABLE", name: "Sundry Creditors (Suppliers)", type: "LIABILITY" as const },
      { code: "SALES", name: "Sales Account", type: "REVENUE" as const },
      { code: "PURCHASES", name: "Purchase Account", type: "EXPENSE" as const },
      { code: "GST_PAYABLE", name: "GST Output Tax Liability", type: "LIABILITY" as const },
      { code: "GST_INPUT_CREDIT", name: "GST Input Tax Credit (ITC)", type: "ASSET" as const },
    ];

    for (const acc of defaultAccounts) {
      await tx.ledgerAccount.create({
        data: {
          tenantId: tenant.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
        },
      });
    }

    // 5. Default Categories
    const categories = [
      "Office Equipment & Electronics",
      "Office Furniture & Fixtures",
      "Industrial Hardware & Tools",
      "Packaging & Paper Supplies",
      "Professional Services & Consulting",
    ];

    for (const catName of categories) {
      await tx.category.create({
        data: {
          tenantId: tenant.id,
          name: catName,
        },
      });
    }

    // 6. Sample Products
    const chairProduct = await tx.product.create({
      data: {
        tenantId: tenant.id,
        name: "Ergonomic Mesh Office Chair",
        code: "CHR-ERGO-01",
        hsnCode: "9403",
        uom: "PCS",
        minStockAlert: 5,
      },
    });

    await tx.productVariant.create({
      data: {
        tenantId: tenant.id,
        productId: chairProduct.id,
        name: "Charcoal Black",
        sku: "CHR-ERGO-BLK",
        purchasePrice: 4200.0,
        sellingPrice: 6500.0,
        mrp: 7500.0,
        gstRate: 18.0,
        currentStock: 14,
      },
    });

    const paperProduct = await tx.product.create({
      data: {
        tenantId: tenant.id,
        name: "Copier Paper A4 75 GSM",
        code: "PPR-A4-75G",
        hsnCode: "4802",
        uom: "BOX",
        minStockAlert: 10,
      },
    });

    await tx.productVariant.create({
      data: {
        tenantId: tenant.id,
        productId: paperProduct.id,
        name: "Box (5 Reams)",
        sku: "PPR-A4-BOX",
        purchasePrice: 950.0,
        sellingPrice: 1350.0,
        mrp: 1500.0,
        gstRate: 12.0,
        currentStock: 35,
      },
    });

    // 7. Sample Customers
    await tx.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Apex Horizon Technologies Ltd",
        phone: "9811223344",
        gstin: "09AAACA1234A1Z5",
        stateCode: "09",
        creditLimit: 100000.0,
        outstandingBalance: 0.0,
      },
    });

    await tx.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Nexus Retailers Pvt Ltd",
        phone: "9822334455",
        gstin: "09BBBCB5678B1Z6",
        stateCode: "09",
        creditLimit: 50000.0,
        outstandingBalance: 14100.0,
      },
    });

    // 8. Sample Supplier
    await tx.supplier.create({
      data: {
        tenantId: tenant.id,
        name: "Apex Hardware Distributors",
        companyName: "Apex Hardware Ltd",
        phone: "9844556677",
        gstin: "09CCCC7890C1Z7",
        stateCode: "09",
        balance: 0.0,
      },
    });

    return { user, tenant };
  });

  console.log(`Seeding complete! Admin user: ${result.user.email} (Tenant: ${result.tenant.tradeName})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
