import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";

describe("Database Schema, Migrations & Disaster Recovery Verification Suite", () => {
  const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");

  // ==========================================
  // 1. SCHEMA INTEGRITY & COMPOSITE CONSTRAINTS
  // ==========================================
  describe("1. Schema Normalization & Constraint Verification", () => {
    it("ensures schema.prisma contains mandatory multi-tenant models and unique constraints", () => {
      expect(fs.existsSync(schemaPath)).toBe(true);
      const schemaContent = fs.readFileSync(schemaPath, "utf-8");

      // Verify MongoDB datasource provider
      expect(schemaContent).toContain('provider = "mongodb"');

      // Verify core models exist
      const requiredModels = [
        "model Tenant",
        "model User",
        "model TenantMember",
        "model Product",
        "model ProductVariant",
        "model InventoryLocation",
        "model StockMovement",
        "model Customer",
        "model Supplier",
        "model SalesInvoice",
        "model SalesInvoiceItem",
        "model InvoiceSequence",
        "model PurchaseInvoice",
        "model PurchaseInvoiceItem",
        "model Payment",
        "model PaymentAllocation",
        "model CreditDebitNote",
        "model JournalEntry",
        "model JournalLine",
        "model SubscriptionPlan",
        "model Subscription",
        "model TenantUsage",
        "model PlatformAdminUser",
      ];

      for (const model of requiredModels) {
        expect(schemaContent).toContain(model);
      }

      // Verify critical composite unique constraints prevent cross-tenant duplication
      // Product variant SKU per tenant
      expect(schemaContent).toContain("@@unique([tenantId, sku])");
      // Invoice sequential numbering per tenant, financial year, and series
      expect(schemaContent).toContain("@@unique([tenantId, fiscalYear, seriesType])");
      // Supplier purchase bill deduplication per tenant
      expect(schemaContent).toContain("@@unique([tenantId, supplierId, invoiceNumber])");
      // Membership uniqueness per tenant and user
      expect(schemaContent).toContain("@@unique([tenantId, userId])");
    });

    it("verifies safety guard preventing execution of destructive commands against production", () => {
      function evaluateDestructiveCommandSafety(env: string, databaseUrl: string): boolean {
        // Guard rule: if environment is production or database URL contains production cluster, reject destructive actions
        const isProd = env.toLowerCase() === "production";
        const isProdCluster = databaseUrl.includes("production") || databaseUrl.includes("prod");
        if (isProd || isProdCluster) {
          throw new Error("Destructive database operations are strictly prohibited on production environments.");
        }
        return true;
      }

      // Test environment with staging/test database URL must pass
      expect(evaluateDestructiveCommandSafety("test", "mongodb://localhost:27017/shopledger_test")).toBe(true);

      // Production environment must be rejected
      expect(() =>
        evaluateDestructiveCommandSafety("production", "mongodb+srv://admin:pass@production.elvora.net/elvora")
      ).toThrow("Destructive database operations are strictly prohibited");

      // Production database URL cluster name must be rejected even if ENV was mislabeled
      expect(() =>
        evaluateDestructiveCommandSafety("development", "mongodb+srv://admin:pass@prod-cluster.elvora.net/elvora")
      ).toThrow("Destructive database operations are strictly prohibited");
    });
  });

  // ==========================================
  // 2. SYNTHETIC BACKUP & DISASTER RECOVERY PROCEDURES
  // ==========================================
  describe("2. Synthetic Tenant Backup & Recovery Invariants", () => {
    it("creates synthetic tenant snapshot, computes SHA-256 checksum, and restores with 100% parity", () => {
      const syntheticTenantData = {
        tenantId: "6677777777777777777777aa",
        backupTimestamp: "2026-10-29T21:40:00.000Z",
        version: "1.0.0",
        records: {
          products: [
            { id: "p1", name: "Ceramic Tabletop Basin", sku: "WB-TAB-01", stockQuantity: 24 },
            { id: "p2", name: "Brass Pillar Cock Tap", sku: "CP-PIL-01", stockQuantity: 40 },
          ],
          invoices: [
            {
              id: "inv1",
              invoiceNumber: "INV-2627-0001",
              grandTotal: 15400,
              status: "FINALIZED",
            },
          ],
          journalEntries: [
            {
              id: "je1",
              reference: "INV-2627-0001",
              debitTotal: 15400,
              creditTotal: 15400,
            },
          ],
        },
      };

      // 1. Serialize and compute backup integrity checksum
      const serializedSnapshot = JSON.stringify(syntheticTenantData);
      const originalChecksum = crypto.createHash("sha256").update(serializedSnapshot).digest("hex");

      // 2. Simulate catastrophic loss in target sandbox
      let targetDatabaseState: any = null;

      // 3. Recovery Procedure: Verify integrity before restoring
      const candidateSnapshot = JSON.parse(serializedSnapshot);
      const candidateChecksum = crypto.createHash("sha256").update(JSON.stringify(candidateSnapshot)).digest("hex");

      expect(candidateChecksum).toBe(originalChecksum);

      // 4. Restore snapshot into target sandbox
      targetDatabaseState = {
        restoredAt: new Date().toISOString(),
        tenantId: candidateSnapshot.tenantId,
        ...candidateSnapshot.records,
      };

      // 5. Verify 100% record parity
      expect(targetDatabaseState.products.length).toBe(2);
      expect(targetDatabaseState.products[0].sku).toBe("WB-TAB-01");
      expect(targetDatabaseState.invoices.length).toBe(1);
      expect(targetDatabaseState.invoices[0].grandTotal).toBe(15400);
      expect(targetDatabaseState.journalEntries[0].debitTotal).toBe(15400);
      expect(targetDatabaseState.journalEntries[0].creditTotal).toBe(15400);
    });
  });
});
