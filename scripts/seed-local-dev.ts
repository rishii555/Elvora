/**
 * Elvora — Local Development Database Seed Script
 *
 * STRICT SAFETY RULES:
 * 1. Strictly restricted to local development database: mongodb://localhost:27017/elvora_dev
 * 2. Strictly forbids remote hosts, Atlas clusters, or production URLs.
 * 3. Never writes to or deletes production databases.
 * 4. Idempotent: Can be run repeatedly without duplicating records or corrupting data.
 * 5. Uses standalone MongoDB wire protocol via $runCommandRaw to avoid replica-set transaction requirements.
 *
 * Usage:
 *   npx tsx scripts/seed-local-dev.ts
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/passwords";
import { validateLocalDatabaseUrl } from "./migrate-quantities-to-double";
import { SYSTEM_CHART_OF_ACCOUNTS } from "../lib/accounting/service";

function genObjectId(): string {
  return crypto.randomBytes(12).toString("hex");
}

function loadLocalEnvironment(): string {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envLocalPath)) {
    throw new Error(".env.local file is strictly required for local database operations.");
  }

  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...vals] = trimmed.split("=");
    if (key.trim() === "DATABASE_URL") {
      const url = vals.join("=").trim().replace(/^["']|["']$/g, "");
      process.env.DATABASE_URL = url;
      return url;
    }
  }

  throw new Error("DATABASE_URL not found in .env.local");
}

async function rawInsertOne(prisma: PrismaClient, collection: string, doc: Record<string, any>) {
  await prisma.$runCommandRaw({
    insert: collection,
    documents: [doc],
  });
}

async function rawUpdateOne(
  prisma: PrismaClient,
  collection: string,
  query: Record<string, any>,
  update: Record<string, any>
) {
  await prisma.$runCommandRaw({
    update: collection,
    updates: [
      {
        q: query,
        u: update,
        multi: false,
        upsert: false,
      },
    ],
  });
}

export async function seedLocalDevelopment() {
  const rawUrl = loadLocalEnvironment();
  const target = validateLocalDatabaseUrl(rawUrl);

  console.log("==================================================================");
  console.log("ELVORA — LOCAL DEVELOPMENT DATABASE SEEDING");
  console.log(`TARGET: ${target.sanitized}`);
  console.log("==================================================================");

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: rawUrl,
      },
    },
  });

  try {
    const adminEmail = "admin@elvora.com";
    const adminPasswordPlain = "admin123";
    const passwordHash = await hashPassword(adminPasswordPlain);
    const nowIso = new Date().toISOString();

    // 1. Upsert Admin User
    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    let userId: string;
    if (!adminUser) {
      userId = genObjectId();
      await rawInsertOne(prisma, "users", {
        _id: { $oid: userId },
        email: adminEmail,
        password_hash: passwordHash,
        name: "Elvora Admin",
        phone: "9876543210",
        is_active: true,
        approval_status: "APPROVED",
        created_at: { $date: nowIso },
        updated_at: { $date: nowIso },
      });
      console.log(`[SEED] Created Admin Test User: ${adminEmail} (ID: ${userId})`);
      adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    } else {
      userId = adminUser.id;
      await rawUpdateOne(
        prisma,
        "users",
        { _id: { $oid: userId } },
        {
          $set: {
            name: "Elvora Admin",
            password_hash: passwordHash,
            is_active: true,
            approval_status: "APPROVED",
            updated_at: { $date: nowIso },
          },
        }
      );
      console.log(`[SEED] Updated existing Admin User credentials: ${adminEmail}`);
      adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    }

    if (!adminUser) {
      throw new Error("Failed to create or retrieve admin user");
    }

    // 2. Upsert Initial Tenant
    let tenant = await prisma.tenant.findFirst({
      where: {
        tradeName: "Universal Enterprises",
      },
    });

    let tenantId: string;
    if (!tenant) {
      tenantId = genObjectId();
      await rawInsertOne(prisma, "tenants", {
        _id: { $oid: tenantId },
        trade_name: "Universal Enterprises",
        legal_name: "Universal Enterprises Pvt Ltd",
        gstin: "09AAACU9842F1Z6",
        state_code: "09",
        phone: "9876543210",
        email: adminEmail,
        address: "102 Industrial Area, Sector 62, Noida, Uttar Pradesh",
        allow_negative_stock: false,
        invoice_prefix: "INV-",
        next_invoice_number: 1,
        currency: "INR",
        is_active: true,
        approval_status: "APPROVED",
        created_at: { $date: nowIso },
        updated_at: { $date: nowIso },
      });
      console.log(`[SEED] Created Tenant: Universal Enterprises (ID: ${tenantId})`);
      tenant = await prisma.tenant.findFirst({ where: { tradeName: "Universal Enterprises" } });
    } else {
      tenantId = tenant.id;
      await rawUpdateOne(
        prisma,
        "tenants",
        { _id: { $oid: tenantId } },
        {
          $set: {
            is_active: true,
            approval_status: "APPROVED",
            updated_at: { $date: nowIso },
          },
        }
      );
      console.log(`[SEED] Verified Tenant is APPROVED: ${tenant.tradeName}`);
      tenant = await prisma.tenant.findFirst({ where: { tradeName: "Universal Enterprises" } });
    }

    if (!tenant) {
      throw new Error("Failed to create or retrieve tenant");
    }

    // 3. Ensure OWNER Membership
    let membership = await prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: adminUser.id,
        },
      },
    });

    if (!membership) {
      const memberId = genObjectId();
      await rawInsertOne(prisma, "tenant_members", {
        _id: { $oid: memberId },
        tenant_id: { $oid: tenant.id },
        user_id: { $oid: adminUser.id },
        role: "OWNER",
        is_default: true,
        created_at: { $date: nowIso },
        updated_at: { $date: nowIso },
      });
      console.log(`[SEED] Created OWNER Membership for ${adminEmail} in ${tenant.tradeName}`);
      membership = await prisma.tenantMember.findUnique({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: adminUser.id,
          },
        },
      });
    } else if (membership.role !== "OWNER" || !membership.isDefault) {
      await rawUpdateOne(
        prisma,
        "tenant_members",
        { _id: { $oid: membership.id } },
        {
          $set: {
            role: "OWNER",
            is_default: true,
            updated_at: { $date: nowIso },
          },
        }
      );
      console.log(`[SEED] Verified OWNER role for ${adminEmail}`);
      membership = await prisma.tenantMember.findUnique({
        where: { id: membership.id },
      });
    }

    // 4. Default Primary Inventory Location
    let primaryLocation = await prisma.inventoryLocation.findFirst({
      where: { tenantId: tenant.id, isDefault: true },
    });

    if (!primaryLocation) {
      const locId = genObjectId();
      await rawInsertOne(prisma, "inventory_locations", {
        _id: { $oid: locId },
        tenant_id: { $oid: tenant.id },
        name: "Main Showroom & Warehouse",
        code: "WH-MAIN",
        address: tenant.address || "Main Facility",
        is_default: true,
        is_active: true,
        created_at: { $date: nowIso },
        updated_at: { $date: nowIso },
      });
      console.log(`[SEED] Created Primary Inventory Location: Main Showroom & Warehouse`);
    }

    // 5. Default Standard Chart of Accounts
    let accountsCreated = 0;
    for (const acc of SYSTEM_CHART_OF_ACCOUNTS) {
      const existing = await prisma.ledgerAccount.findUnique({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: acc.code,
          },
        },
      });

      if (!existing) {
        const accId = genObjectId();
        await rawInsertOne(prisma, "ledger_accounts", {
          _id: { $oid: accId },
          tenant_id: { $oid: tenant.id },
          code: acc.code,
          name: acc.name,
          type: acc.type,
          category: acc.category,
          is_system: true,
          balance: 0.0,
          created_at: { $date: nowIso },
          updated_at: { $date: nowIso },
        });
        accountsCreated++;
      }
    }
    if (accountsCreated > 0) {
      console.log(`[SEED] Initialized ${accountsCreated} standard Chart of Accounts ledger accounts`);
    }

    // 6. Default Tax Classifications
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
            tenantId: tenant.id,
            code: tax.code,
          },
        },
      });
      if (!existing) {
        const taxId = genObjectId();
        await rawInsertOne(prisma, "tax_classifications", {
          _id: { $oid: taxId },
          tenant_id: { $oid: tenant.id },
          name: tax.name,
          code: tax.code,
          rate: tax.rate,
          cgst_rate: tax.cgst,
          sgst_rate: tax.sgst,
          igst_rate: tax.igst,
          is_default: tax.isDefault,
          is_active: true,
          created_at: { $date: nowIso },
          updated_at: { $date: nowIso },
        });
        taxesCreated++;
      }
    }
    if (taxesCreated > 0) {
      console.log(`[SEED] Initialized ${taxesCreated} standard tax classifications`);
    }

    // 7. Default Categories
    const defaultCategories = [
      "Sanitaryware & Ceramic Ware",
      "Faucets, Showers & CP Fittings",
      "Pipes, Valves & Drainage",
      "Bathroom Accessories & Mirrors",
      "General Hardware & Tools",
    ];

    let categoriesCreated = 0;
    for (const catName of defaultCategories) {
      const existing = await prisma.category.findFirst({
        where: { tenantId: tenant.id, name: catName },
      });
      if (!existing) {
        const catId = genObjectId();
        await rawInsertOne(prisma, "categories", {
          _id: { $oid: catId },
          tenant_id: { $oid: tenant.id },
          name: catName,
          is_active: true,
          created_at: { $date: nowIso },
          updated_at: { $date: nowIso },
        });
        categoriesCreated++;
      }
    }
    if (categoriesCreated > 0) {
      console.log(`[SEED] Initialized ${categoriesCreated} product categories`);
    }

    console.log("==================================================================");
    console.log("LOCAL SEEDING COMPLETE:");
    console.log(`  User:     ${adminEmail}`);
    console.log(`  Password: ${adminPasswordPlain}`);
    console.log(`  Role:     OWNER`);
    console.log(`  Tenant:   ${tenant.tradeName}`);
    console.log(`  Status:   APPROVED / ACTIVE`);
    console.log("==================================================================");

    return {
      user: adminUser,
      tenant,
      membership,
    };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedLocalDevelopment()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[FATAL SEED ERROR]", err);
      process.exit(1);
    });
}
