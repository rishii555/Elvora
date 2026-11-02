/**
 * Dedicated Development Sandbox Tenant Setup for MongoDB Atlas
 *
 * CRITICAL SAFETY RULES:
 * 1. Operates ONLY on the dedicated development tenant ("Elvora Dev Sandbox").
 * 2. Never modifies, updates, or deletes real customer tenants ("NSS", "xyz", "Universal Enterprises").
 * 3. Idempotent and reversible.
 */

import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/passwords";
import { SYSTEM_CHART_OF_ACCOUNTS } from "../lib/accounting/service";

function getDatabaseUrl(): string {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      return trimmed.replace("DATABASE_URL=", "").replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("DATABASE_URL not found in .env.local");
}

export async function setupDevSandboxTenant() {
  const dbUrl = getDatabaseUrl();
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    console.log("==================================================================");
    console.log("SETTING UP DEDICATED DEV SANDBOX TENANT IN MONGODB ATLAS");
    console.log("==================================================================");

    const devEmail = "dev-admin@elvora.com";
    const devPassword = "admin123";
    const passwordHash = await hashPassword(devPassword);

    // 1. Find or create dedicated Dev Sandbox Tenant
    let devTenant = await prisma.tenant.findFirst({
      where: { tradeName: "Elvora Dev Sandbox" },
    });

    if (!devTenant) {
      devTenant = await prisma.tenant.create({
        data: {
          tradeName: "Elvora Dev Sandbox",
          legalName: "Elvora Development Sandbox Tenant",
          gstin: "09AABCE1234F1Z1",
          stateCode: "09",
          phone: "9999999999",
          email: devEmail,
          address: "Local Development Sandbox (Isolated)",
          currency: "INR",
          invoicePrefix: "DEV-",
          nextInvoiceNumber: 1,
          allowNegativeStock: false,
          approvalStatus: "APPROVED",
          isActive: true,
        },
      });
      console.log(`[SANDBOX] Created dedicated development tenant: ${devTenant.tradeName} (ID: ${devTenant.id})`);
    } else {
      console.log(`[SANDBOX] Dedicated development tenant exists: ${devTenant.tradeName} (ID: ${devTenant.id})`);
    }

    // 2. Find or create dedicated dev user
    let devUser = await prisma.user.findUnique({
      where: { email: devEmail },
    });

    if (!devUser) {
      devUser = await prisma.user.create({
        data: {
          email: devEmail,
          passwordHash,
          name: "Elvora Dev Engineer",
          phone: "9999999999",
          approvalStatus: "APPROVED",
          isActive: true,
        },
      });
      console.log(`[SANDBOX] Created dedicated dev user: ${devUser.email} (ID: ${devUser.id})`);
    } else {
      devUser = await prisma.user.update({
        where: { id: devUser.id },
        data: {
          passwordHash,
          approvalStatus: "APPROVED",
          isActive: true,
        },
      });
      console.log(`[SANDBOX] Verified dev user credentials: ${devUser.email}`);
    }

    // 3. Ensure OWNER membership for dev user in Dev Sandbox tenant
    let membership = await prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: devTenant.id,
          userId: devUser.id,
        },
      },
    });

    if (!membership) {
      membership = await prisma.tenantMember.create({
        data: {
          tenantId: devTenant.id,
          userId: devUser.id,
          role: "OWNER",
          isDefault: true,
        },
      });
      console.log(`[SANDBOX] Created OWNER membership for ${devEmail} in ${devTenant.tradeName}`);
    }

    // 4. Default Primary Inventory Location in Dev Sandbox
    let devLocation = await prisma.inventoryLocation.findFirst({
      where: { tenantId: devTenant.id, isDefault: true },
    });

    if (!devLocation) {
      devLocation = await prisma.inventoryLocation.create({
        data: {
          tenantId: devTenant.id,
          name: "Sandbox Warehouse",
          code: "WH-DEV",
          address: "Sandbox Location 1",
          isDefault: true,
          isActive: true,
        },
      });
      console.log(`[SANDBOX] Created Primary Inventory Location: ${devLocation.name}`);
    }

    // 5. Chart of Accounts in Dev Sandbox
    let accountsCreated = 0;
    for (const acc of SYSTEM_CHART_OF_ACCOUNTS) {
      const existing = await prisma.ledgerAccount.findUnique({
        where: {
          tenantId_code: {
            tenantId: devTenant.id,
            code: acc.code,
          },
        },
      });

      if (!existing) {
        await prisma.ledgerAccount.create({
          data: {
            tenantId: devTenant.id,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            category: acc.category,
            isSystem: true,
            balance: 0.0,
          },
        });
        accountsCreated++;
      }
    }
    if (accountsCreated > 0) {
      console.log(`[SANDBOX] Initialized ${accountsCreated} Chart of Accounts in sandbox tenant`);
    }

    // 6. Tax classifications in Dev Sandbox
    const defaultTaxRates = [
      { name: "GST 0% / Nil", code: "GST_0", rate: 0.0, cgst: 0.0, sgst: 0.0, igst: 0.0, isDefault: false },
      { name: "GST 5%", code: "GST_5", rate: 5.0, cgst: 2.5, sgst: 2.5, igst: 5.0, isDefault: false },
      { name: "GST 12%", code: "GST_12", rate: 12.0, cgst: 6.0, sgst: 6.0, igst: 12.0, isDefault: false },
      { name: "GST 18%", code: "GST_18", rate: 18.0, cgst: 9.0, sgst: 9.0, igst: 18.0, isDefault: true },
      { name: "GST 28%", code: "GST_28", rate: 28.0, cgst: 14.0, sgst: 14.0, igst: 28.0, isDefault: false },
      { name: "Exempt", code: "EXEMPT", rate: 0.0, cgst: 0.0, sgst: 0.0, igst: 0.0, isDefault: false },
    ];

    let taxesCreated = 0;
    for (const tax of defaultTaxRates) {
      const existing = await prisma.taxClassification.findUnique({
        where: {
          tenantId_code: {
            tenantId: devTenant.id,
            code: tax.code,
          },
        },
      });
      if (!existing) {
        await prisma.taxClassification.create({
          data: {
            tenantId: devTenant.id,
            name: tax.name,
            code: tax.code,
            rate: tax.rate,
            cgstRate: tax.cgst,
            sgstRate: tax.sgst,
            igstRate: tax.igst,
            isDefault: tax.isDefault,
            isActive: true,
          },
        });
        taxesCreated++;
      }
    }
    if (taxesCreated > 0) {
      console.log(`[SANDBOX] Initialized ${taxesCreated} tax classifications in sandbox tenant`);
    }

    console.log("==================================================================");
    console.log("SANDBOX TENANT READY:");
    console.log(`  Tenant:   ${devTenant.tradeName} (ID: ${devTenant.id})`);
    console.log(`  Dev User: ${devEmail}`);
    console.log(`  Password: ${devPassword}`);
    console.log(`  Status:   APPROVED / ACTIVE`);
    console.log("==================================================================");

    return { devTenant, devUser };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupDevSandboxTenant()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[FATAL ERROR]", err);
      process.exit(1);
    });
}
