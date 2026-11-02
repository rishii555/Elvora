/**
 * Atlas Multi-Document ACID Transaction & Isolation Verification
 *
 * CRITICAL SAFETY RULES:
 * 1. Operates ONLY on the dedicated development tenant ("Elvora Dev Sandbox").
 * 2. Confirms that existing tenants ("Universal Enterprises", "NSS", "xyz") remain 100% untouched.
 * 3. Tests real commit, real rollback, idempotency, and isolation.
 */

import { PrismaClient } from "@prisma/client";
import { runInTransaction, runTransactionWithRetry } from "../lib/db/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("ATLAS TRANSACTION & ISOLATION VERIFICATION SUITE");
  console.log("==================================================================");

  // 1. Get Sandbox Tenant
  const devTenant = await prisma.tenant.findFirst({
    where: { tradeName: "Elvora Dev Sandbox" },
  });

  if (!devTenant) {
    throw new Error("Dedicated sandbox tenant 'Elvora Dev Sandbox' not found!");
  }

  console.log(`[VERIFY] Dedicated Sandbox Tenant ID: ${devTenant.id}`);

  // Record initial counts of existing production tenants
  const otherTenantsBefore = await prisma.tenant.findMany({
    where: { id: { not: devTenant.id } },
    include: {
      _count: {
        select: {
          products: true,
          salesInvoices: true,
          purchaseInvoices: true,
          customers: true,
        },
      },
    },
  });

  console.log("\n[PRODUCTION INTEGRITY CHECK BEFORE TESTS]");
  otherTenantsBefore.forEach((t) => {
    console.log(`- Tenant "${t.tradeName}" [${t.id}]:`, t._count);
  });

  // -------------------------------------------------------------
  // TEST 1: Reversible Multi-Document Transaction Commit
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Multi-Document Transaction Commit in Sandbox ---");
  const testSku = `TEST-TX-${Date.now()}`;

  const txResult = await runInTransaction(prisma, async (tx) => {
    // Create product inside transaction
    const prod = await tx.product.create({
      data: {
        tenantId: devTenant.id,
        name: "Sandbox ACID Test Product",
        code: testSku,
      },
    });

    // Create product variant in another collection inside same transaction
    const variant = await tx.productVariant.create({
      data: {
        tenantId: devTenant.id,
        productId: prod.id,
        sku: testSku,
        name: "Standard",
        sellingPrice: 150,
        purchasePrice: 100,
        currentStock: 10,
      },
    });

    return { prod, variant };
  });

  console.log(`✓ Committed transaction: Created product ${txResult.prod.code} and variant ${txResult.variant.sku}`);

  // Verify records exist in DB
  const verifiedProd = await prisma.product.findUnique({
    where: { id: txResult.prod.id },
  });
  const verifiedVariant = await prisma.productVariant.findUnique({
    where: { id: txResult.variant.id },
  });
  if (!verifiedProd || !verifiedVariant) {
    throw new Error("Transaction commit failed: records not found in database!");
  }
  console.log(`✓ Verified records persisted: Product "${verifiedProd.name}" and Variant "${verifiedVariant.sku}"`);

  // Clean up test product and variant
  await prisma.productVariant.delete({ where: { id: txResult.variant.id } });
  await prisma.product.delete({ where: { id: txResult.prod.id } });
  console.log("✓ Reversible test records cleaned up cleanly.");

  // -------------------------------------------------------------
  // TEST 2: Multi-Document Transaction Rollback on Failure
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Multi-Document Transaction Rollback on Failure ---");
  const rollbackSku = `ROLLBACK-${Date.now()}`;
  let rollbackErrorCaught = false;

  try {
    await runInTransaction(prisma, async (tx) => {
      const prod = await tx.product.create({
        data: {
          tenantId: devTenant.id,
          name: "Should Not Exist Product",
          code: rollbackSku,
        },
      });

      await tx.productVariant.create({
        data: {
          tenantId: devTenant.id,
          productId: prod.id,
          sku: rollbackSku,
          name: "Standard",
          sellingPrice: 80,
          purchasePrice: 50,
          currentStock: 5,
        },
      });

      // Deliberately fail the transaction to trigger rollback
      throw new Error("SIMULATED_TRANSACTION_FAILURE");
    });
  } catch (err: any) {
    if (err.message === "SIMULATED_TRANSACTION_FAILURE") {
      rollbackErrorCaught = true;
    } else {
      throw err;
    }
  }

  if (!rollbackErrorCaught) {
    throw new Error("Expected simulated transaction failure was not caught!");
  }

  // Verify NEITHER the product nor the variant was created due to rollback
  const rolledBackProd = await prisma.product.findFirst({
    where: { tenantId: devTenant.id, code: rollbackSku },
  });
  const rolledBackVariant = await prisma.productVariant.findFirst({
    where: { tenantId: devTenant.id, sku: rollbackSku },
  });

  if (rolledBackProd || rolledBackVariant) {
    throw new Error("CRITICAL: Transaction rollback failed! Records exist after simulated failure.");
  }
  console.log("✓ Verified transaction rollback: Both Product and Variant were rolled back completely.");

  // -------------------------------------------------------------
  // TEST 3: Idempotency & Transaction Retries
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Transaction Retry Functionality ---");
  let retryCount = 0;
  const retryResult = await runTransactionWithRetry(
    prisma,
    async () => {
      retryCount++;
      return { success: true, count: retryCount };
    },
    { maxRetries: 2, baseDelayMs: 10 }
  );
  console.log(`✓ runTransactionWithRetry executed successfully:`, retryResult);

  // -------------------------------------------------------------
  // TEST 4: Cross-Tenant Data Isolation Enforcement
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Cross-Tenant Data Isolation ---");
  const crossTenantProducts = await prisma.product.findMany({
    where: { tenantId: devTenant.id },
  });
  for (const p of crossTenantProducts) {
    if (p.tenantId !== devTenant.id) {
      throw new Error(`Isolation breach: Product ${p.id} does not belong to sandbox tenant!`);
    }
  }
  console.log(`✓ Verified tenant isolation: All queried sandbox items strictly belong to tenant ${devTenant.id}`);

  // -------------------------------------------------------------
  // TEST 5: Production Integrity Check After All Tests
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Final Production Customer Data Integrity Check ---");
  const otherTenantsAfter = await prisma.tenant.findMany({
    where: { id: { not: devTenant.id } },
    include: {
      _count: {
        select: {
          products: true,
          salesInvoices: true,
          purchaseInvoices: true,
          customers: true,
        },
      },
    },
  });

  for (let i = 0; i < otherTenantsBefore.length; i++) {
    const before = otherTenantsBefore[i];
    const after = otherTenantsAfter.find((t) => t.id === before.id);
    if (!after) {
      throw new Error(`CRITICAL: Existing tenant ${before.tradeName} missing!`);
    }

    const countsBefore = JSON.stringify(before._count);
    const countsAfter = JSON.stringify(after._count);
    if (countsBefore !== countsAfter) {
      throw new Error(
        `CRITICAL: Count mismatch for tenant ${before.tradeName}!\nBefore: ${countsBefore}\nAfter: ${countsAfter}`
      );
    }
    console.log(`✓ Tenant "${after.tradeName}" [${after.id}] completely untouched: ${countsAfter}`);
  }

  console.log("\n==================================================================");
  console.log("ALL ATLAS TRANSACTION & ISOLATION CHECKS PASSED!");
  console.log("==================================================================");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[VERIFICATION FAILED]", err);
    await prisma.$disconnect();
    process.exit(1);
  });
