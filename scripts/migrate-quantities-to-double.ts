/**
 * Elvora — Phase 5A Quantity Migration Script
 *
 * Migrates the nine physical quantity fields from Int32/Int64 to Double (BSON Type 1).
 *
 * Security & Isolation Hardening:
 * 1. Explicitly loads '.env.local' — never falls back to '.env', system environment, or remote cluster URLs.
 * 2. Strictly validates target connection string: requires protocol 'mongodb:', host 'localhost' or '127.0.0.1',
 *    port 27017, and database 'elvora_dev'.
 * 3. Rejects 'mongodb+srv:', 'mongodb.net', remote IP addresses, and any database other than 'elvora_dev'.
 * 4. Never logs sensitive credentials; displays sanitized host and database targets only.
 * 5. Defaults to DRY-RUN mode. Only executes migration when '--execute' is explicitly provided.
 * 6. Executes independent decoupled validation queries after each collection migration.
 *
 * Usage:
 *   npx tsx scripts/migrate-quantities-to-double.ts            # Dry-run inspection only
 *   npx tsx scripts/migrate-quantities-to-double.ts --execute  # Execute migration after separate approval
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

export class MigrationSecurityError extends Error {
  readonly code = "MIGRATION_SECURITY_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "MigrationSecurityError";
  }
}

export interface ValidatedDatabaseTarget {
  protocol: string;
  host: string;
  port: number;
  database: string;
  sanitized: string;
}

/**
 * Validates a MongoDB connection string against strict local development rules.
 * Fails closed if any remote, Atlas, or non-elvora_dev parameters are detected.
 */
export function validateLocalDatabaseUrl(rawUrl: string | undefined): ValidatedDatabaseTarget {
  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim() === "") {
    throw new MigrationSecurityError("DATABASE_URL is missing or empty. A local database connection string is required.");
  }

  const trimmed = rawUrl.trim();

  // 1. Strict Protocol Check: Reject mongodb+srv
  if (trimmed.startsWith("mongodb+srv:") || trimmed.toLowerCase().includes("+srv")) {
    throw new MigrationSecurityError(
      "Protocol 'mongodb+srv:' is forbidden. Migration is strictly restricted to local standalone MongoDB ('mongodb:')."
    );
  }

  // 2. Reject MongoDB Atlas domain names
  if (trimmed.toLowerCase().includes("mongodb.net")) {
    throw new MigrationSecurityError(
      "MongoDB Atlas cluster hostname ('mongodb.net') detected. Migration script strictly refuses remote/Atlas databases."
    );
  }

  // 3. Parse URI
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new MigrationSecurityError("DATABASE_URL is a malformed connection URI.");
  }

  if (parsed.protocol !== "mongodb:") {
    throw new MigrationSecurityError(
      `Invalid protocol '${parsed.protocol}'. Only local 'mongodb:' is permitted.`
    );
  }

  // 4. Strict Hostname Check: localhost or 127.0.0.1 only
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new MigrationSecurityError(
      `Host '${hostname}' is rejected. Only 'localhost' or '127.0.0.1' is permitted for migration.`
    );
  }

  // 5. Strict Port Check: default 27017
  const port = parsed.port ? parseInt(parsed.port, 10) : 27017;
  if (port !== 27017) {
    throw new MigrationSecurityError(
      `Port '${port}' is rejected. Only local port 27017 is permitted.`
    );
  }

  // 6. Strict Database Name Check: elvora_dev only
  const pathname = parsed.pathname.replace(/^\//, "");
  const dbName = pathname.split("?")[0].trim();
  if (dbName !== "elvora_dev") {
    throw new MigrationSecurityError(
      `Database '${dbName || "empty"}' is rejected. Only 'elvora_dev' is permitted.`
    );
  }

  return {
    protocol: parsed.protocol,
    host: hostname,
    port,
    database: dbName,
    sanitized: `${parsed.protocol}//${hostname}:${port}/${dbName}`,
  };
}

/**
 * Explicitly loads DATABASE_URL from .env.local.
 * Refuses to proceed if .env.local does not exist or lacks DATABASE_URL.
 */
export function loadLocalEnvironment(envFilePath?: string): { databaseUrl: string; filePath: string } {
  const targetPath = envFilePath || path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(targetPath)) {
    throw new MigrationSecurityError(
      `Required local environment file '${targetPath}' does not exist. Migration script refuses to fall back to .env or remote clusters.`
    );
  }

  const content = fs.readFileSync(targetPath, "utf-8");
  let databaseUrl: string | undefined;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();

    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    if (key === "DATABASE_URL") {
      databaseUrl = val;
      break;
    }
  }

  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new MigrationSecurityError(`'DATABASE_URL' not defined in '${targetPath}'.`);
  }

  return { databaseUrl, filePath: targetPath };
}

export interface FieldMigrationConfig {
  modelName: string;
  collection: string;
  field: string;
  defaultValue: number;
}

export const QUANTITY_FIELDS: FieldMigrationConfig[] = [
  { modelName: "ProductVariant", collection: "product_variants", field: "current_stock", defaultValue: 0 },
  { modelName: "StockMovement", collection: "stock_movements", field: "quantity", defaultValue: 0 },
  { modelName: "StockMovement", collection: "stock_movements", field: "balance_after", defaultValue: 0 },
  { modelName: "SalesInvoiceItem", collection: "sales_invoice_items", field: "quantity", defaultValue: 1 },
  { modelName: "PurchaseInvoiceItem", collection: "purchase_invoice_items", field: "quantity", defaultValue: 1 },
  { modelName: "SalesReturnItem", collection: "sales_return_items", field: "quantity", defaultValue: 1 },
  { modelName: "PurchaseReturnItem", collection: "purchase_return_items", field: "quantity", defaultValue: 1 },
  { modelName: "LocationStock", collection: "location_stocks", field: "stock", defaultValue: 0 },
  { modelName: "Product", collection: "products", field: "min_stock_alert", defaultValue: 5 },
];

export interface FieldInspectionReport {
  modelName: string;
  collection: string;
  field: string;
  totalDocuments: number;
  typeDistribution: Record<string, number>;
  nullOrMissingCount: number;
  negativeCount: number;
  outOfRangeCount: number;
  requiresMigrationCount: number;
}

export async function inspectField(client: any, config: FieldMigrationConfig): Promise<FieldInspectionReport> {
  const typeResult: any = await client.$runCommandRaw({
    aggregate: config.collection,
    pipeline: [
      {
        $project: {
          fieldType: { $type: `$${config.field}` },
        },
      },
      {
        $group: {
          _id: "$fieldType",
          count: { $sum: 1 },
        },
      },
    ],
    cursor: {},
  });

  const batches = typeResult.cursor?.firstBatch || [];
  const typeDistribution: Record<string, number> = {};
  let totalDocs = 0;
  let nullOrMissing = 0;

  for (const b of batches) {
    typeDistribution[b._id || "missing"] = b.count;
    totalDocs += b.count;
    if (b._id === "null" || b._id === "missing") {
      nullOrMissing += b.count;
    }
  }

  const negResult: any = await client.$runCommandRaw({
    count: config.collection,
    query: {
      [config.field]: { $lt: 0 },
    },
  });
  const negativeCount = negResult.n || 0;

  const rangeResult: any = await client.$runCommandRaw({
    count: config.collection,
    query: {
      $or: [
        { [config.field]: { $gt: 2147483647 } },
        { [config.field]: { $lt: -2147483648 } },
      ],
    },
  });
  const outOfRangeCount = rangeResult.n || 0;

  const nonDoubleCount = Object.entries(typeDistribution)
    .filter(([type]) => type !== "double")
    .reduce((sum, [, count]) => sum + count, 0);

  return {
    modelName: config.modelName,
    collection: config.collection,
    field: config.field,
    totalDocuments: totalDocs,
    typeDistribution,
    nullOrMissingCount: nullOrMissing,
    negativeCount,
    outOfRangeCount,
    requiresMigrationCount: nonDoubleCount,
  };
}

export async function migrateField(client: any, config: FieldMigrationConfig): Promise<{ updatedCount: number; valid: boolean }> {
  const updateResult: any = await client.$runCommandRaw({
    update: config.collection,
    updates: [
      {
        q: {},
        u: [
          {
            $set: {
              [config.field]: {
                $toDouble: { $ifNull: [`$${config.field}`, config.defaultValue] },
              },
            },
          },
        ],
        multi: true,
      },
    ],
  });

  const updatedCount = updateResult.nModified || 0;

  const validationResult: any = await client.$runCommandRaw({
    count: config.collection,
    query: {
      [config.field]: { $not: { $type: "double" } },
    },
  });

  const remainingNonDouble = validationResult.n || 0;

  return {
    updatedCount,
    valid: remainingNonDouble === 0,
  };
}

export async function runMigrationWorkflow(options?: {
  envFilePath?: string;
  isExecute?: boolean;
  clientFactory?: (url: string) => any;
}) {
  const isExecute = options?.isExecute ?? process.argv.includes("--execute");

  // 1. Explicit Environment Loading
  const { databaseUrl, filePath } = loadLocalEnvironment(options?.envFilePath);

  // 2. Strict Database URL Validation before connecting
  const target = validateLocalDatabaseUrl(databaseUrl);

  console.log("==================================================================");
  console.log("ELVORA — PHASE 5A QUANTITY MIGRATION AUDIT & EXECUTION");
  console.log(`CONFIG: ${filePath}`);
  console.log(`TARGET: ${target.sanitized}`);
  console.log(`MODE:   ${isExecute ? "🚨 EXECUTE (LIVE MIGRATION)" : "🛡️ DRY-RUN (INSPECTION ONLY)"}`);
  console.log("==================================================================\n");

  // 3. Safe client instantiation
  const prisma = options?.clientFactory
    ? options.clientFactory(databaseUrl)
    : new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });

  try {
    const reports: FieldInspectionReport[] = [];

    for (const config of QUANTITY_FIELDS) {
      const report = await inspectField(prisma, config);
      reports.push(report);

      console.log(`Collection: ${config.collection}.${config.field} (${config.modelName})`);
      console.log(`  Total Documents:        ${report.totalDocuments}`);
      console.log(`  Type Distribution:      ${JSON.stringify(report.typeDistribution)}`);
      console.log(`  Null or Missing:        ${report.nullOrMissingCount}`);
      console.log(`  Negative Values:        ${report.negativeCount}`);
      console.log(`  Out of Range (Int32):   ${report.outOfRangeCount}`);
      console.log(`  Requires Migration:     ${report.requiresMigrationCount}`);
      console.log("------------------------------------------------------------------");
    }

    const totalToMigrate = reports.reduce((sum, r) => sum + r.requiresMigrationCount, 0);
    console.log(`\nTotal fields evaluated: 9`);
    console.log(`Total non-double documents across all collections: ${totalToMigrate}`);

    if (!isExecute) {
      console.log("\n[DRY-RUN COMPLETE] Zero database modifications were performed.");
      console.log("To execute this migration after taking a backup and obtaining approval, run:");
      console.log("  npx tsx scripts/migrate-quantities-to-double.ts --execute\n");
      return { success: true, isExecute: false, reports, totalToMigrate };
    }

    console.log("\n🚨 EXECUTING LIVE MIGRATION PIPELINES...\n");

    let allValid = true;
    for (const config of QUANTITY_FIELDS) {
      process.stdout.write(`Migrating ${config.collection}.${config.field}... `);
      const result = await migrateField(prisma, config);
      if (result.valid) {
        console.log(`DONE. Modified ${result.updatedCount} documents. Validation: PASS (0 non-double).`);
      } else {
        console.log(`FAILED validation! Non-double records remain.`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log("\n✅ ALL NINE FIELDS SUCCESSFULLY MIGRATED TO BSON DOUBLE AND VERIFIED.");
      return { success: true, isExecute: true, reports, totalToMigrate };
    } else {
      console.error("\n❌ MIGRATION ENCOUNTERED VALIDATION FAILURES ON ONE OR MORE FIELDS.");
      throw new Error("Validation failure during migration.");
    }
  } finally {
    if (typeof prisma.$disconnect === "function") {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  runMigrationWorkflow().catch((err) => {
    console.error("\n❌ Execution aborted:", err.message);
    process.exit(1);
  });
}
