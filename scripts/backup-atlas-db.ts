import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/db/prisma";

async function backupAtlas() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve(`backups/atlas_pre_cleanup_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`Starting Atlas backup to: ${backupDir}`);

  const rawCollections = await (prisma as any).$runCommandRaw({ listCollections: 1 });
  const collectionNames: string[] = (rawCollections?.cursor?.firstBatch || [])
    .map((c: any) => c.name)
    .filter((n: string) => !n.startsWith("system."));

  const manifest: Record<string, number> = {};

  for (const name of collectionNames) {
    try {
      const result = await (prisma as any).$runCommandRaw({
        find: name,
        filter: {},
        limit: 100000,
      });

      const docs = result?.cursor?.firstBatch || [];
      const filePath = path.join(backupDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf-8");
      manifest[name] = docs.length;
      console.log(`  ✓ Backed up ${name.padEnd(28)}: ${docs.length} docs`);
    } catch (err) {
      console.error(`  ✗ Error backing up ${name}:`, err);
    }
  }

  const manifestPath = path.join(backupDir, "_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\nBackup complete. Total collections backed up: ${Object.keys(manifest).length}`);

  await prisma.$disconnect();
}

backupAtlas().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
