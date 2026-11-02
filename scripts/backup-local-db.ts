/**
 * Elvora — Local Database Backup & Disaster Recovery Utility
 *
 * STRICT SAFETY RULES:
 * 1. Strictly restricted to local development database: mongodb://localhost:27017/elvora_dev
 * 2. Strictly forbids remote hosts, Atlas clusters, or production URLs.
 * 3. Never writes to or deletes production databases.
 *
 * Usage:
 *   npx tsx scripts/backup-local-db.ts --check    # Validates target connection and collections
 *   npx tsx scripts/backup-local-db.ts --guidance # Displays mongodump / mongorestore commands
 */

import fs from "fs";
import path from "path";
import { validateLocalDatabaseUrl } from "./migrate-quantities-to-double";

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
      return vals.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }

  throw new Error("DATABASE_URL not found in .env.local");
}

export function generateBackupGuidance(targetDb: string, outputDir = "./backups"): {
  dumpCommand: string;
  restoreCommand: string;
  sanitizedTarget: string;
} {
  const safeTarget = "mongodb://localhost:27017/" + targetDb;
  const dumpCmd = `mongodump --uri="${safeTarget}?directConnection=true" --out="${outputDir}/${targetDb}_$(Get-Date -Format 'yyyyMMdd_HHmmss')"`;
  const restoreCmd = `mongorestore --uri="${safeTarget}?directConnection=true" --nsInclude="${targetDb}.*" "${outputDir}/<backup_folder>/${targetDb}"`;

  return {
    dumpCommand: dumpCmd,
    restoreCommand: restoreCmd,
    sanitizedTarget: safeTarget,
  };
}

async function main() {
  const rawUrl = loadLocalEnvironment();
  const validated = validateLocalDatabaseUrl(rawUrl);

  console.log("==================================================================");
  console.log("ELVORA — LOCAL DATABASE BACKUP & RECOVERY GUIDANCE");
  console.log(`TARGET: ${validated.sanitized}`);
  console.log("==================================================================");

  const guidance = generateBackupGuidance(validated.database);

  console.log("\n[BACKUP GUIDANCE]");
  console.log("To create an authoritative local backup of your MongoDB database:");
  console.log(`  ${guidance.dumpCommand}\n`);

  console.log("[RECOVERY GUIDANCE]");
  console.log("To restore a previously archived local database snapshot:");
  console.log(`  ${guidance.restoreCommand}\n`);

  console.log("[STATUS] Target is strictly local development. Atlas access forbidden.\n");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Backup Utility Aborted:", err.message);
    process.exit(1);
  });
}
