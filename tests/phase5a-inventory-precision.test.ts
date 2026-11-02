import { describe, it, expect, vi } from "vitest";
import { Decimal } from "@/lib/finance/decimal";
import {
  parseAndValidateQuantity,
  consolidateVariantQuantities,
  formatQuantity,
  toPrismaQuantity,
  QuantityValidationError,
  QuantityPrecisionError,
  UOMMismatchError,
} from "@/lib/inventory/precision";
import {
  isTransientTransactionError,
  isAmbiguousCommitError,
  runTransactionWithRetry,
  AmbiguousTransactionCommitError,
  DatabaseTransactionUnavailableError,
} from "@/lib/db/prisma";
import {
  processStockDeductionFromSale,
  InsufficientStockError,
} from "@/lib/inventory/service";

describe("Phase 5A: Inventory Operations & Precision Suite", () => {
  // =========================================================================
  // 1. UOM-Specific Quantity Parsing and Validation
  // =========================================================================
  describe("1. UOM Quantity Validation & Precision", () => {
    it("should accept valid positive whole quantities for discrete UOMs (PCS, SET, PAIR, BOX)", () => {
      for (const uom of ["PCS", "SET", "PAIR", "BOX"]) {
        const qty = parseAndValidateQuantity(5, uom);
        expect(qty.toNumber()).toBe(5);
        expect(qty.isInteger()).toBe(true);
      }
    });

    it("should reject fractional quantities for discrete UOMs with QuantityPrecisionError", () => {
      for (const uom of ["PCS", "SET", "PAIR", "BOX"]) {
        expect(() => parseAndValidateQuantity(5.5, uom)).toThrow(QuantityPrecisionError);
        expect(() => parseAndValidateQuantity("10.001", uom)).toThrow(QuantityPrecisionError);
        expect(() => parseAndValidateQuantity("0.5", uom)).toThrow(QuantityPrecisionError);
      }
    });

    it("should accept fractional quantities up to 3 decimal places for continuous UOMs (KG, MTR)", () => {
      const kg1 = parseAndValidateQuantity("12.5", "KG");
      expect(kg1.toNumber()).toBe(12.5);

      const kg2 = parseAndValidateQuantity(0.125, "KG");
      expect(kg2.toNumber()).toBe(0.125);

      const mtr1 = parseAndValidateQuantity("100.789", "MTR");
      expect(mtr1.toNumber()).toBe(100.789);
    });

    it("should reject continuous UOM quantities with more than 3 decimal places without silent truncation", () => {
      expect(() => parseAndValidateQuantity("10.1234", "KG")).toThrow(QuantityPrecisionError);
      expect(() => parseAndValidateQuantity(5.0001, "MTR")).toThrow(QuantityPrecisionError);
      expect(() => parseAndValidateQuantity("0.12345", "KG")).toThrow(QuantityPrecisionError);
    });

    it("should reject negative quantities, zero (unless allowZero), NaN, and non-finite values", () => {
      expect(() => parseAndValidateQuantity(-5, "PCS")).toThrow(QuantityValidationError);
      expect(() => parseAndValidateQuantity(0, "KG")).toThrow(QuantityValidationError);
      expect(() => parseAndValidateQuantity("NaN", "KG")).toThrow(QuantityValidationError);
      expect(() => parseAndValidateQuantity(Infinity, "MTR")).toThrow(QuantityValidationError);
      expect(() => parseAndValidateQuantity("", "PCS")).toThrow(QuantityValidationError);
      expect(() => parseAndValidateQuantity(null as any, "PCS")).toThrow(QuantityValidationError);

      // Should accept zero when explicitly allowed
      const zeroQty = parseAndValidateQuantity(0, "KG", { allowZero: true });
      expect(zeroQty.toNumber()).toBe(0);
    });
  });

  // =========================================================================
  // 2. Decimal.js SKU Consolidation
  // =========================================================================
  describe("2. Decimal.js SKU Consolidation", () => {
    it("should consolidate duplicate variant IDs using arbitrary-precision arithmetic without float drift", () => {
      const items = [
        { variantId: "var_1", quantity: 0.1, uom: "KG" },
        { variantId: "var_2", quantity: 5, uom: "PCS" },
        { variantId: "var_1", quantity: 0.2, uom: "KG" },
        { variantId: "var_2", quantity: 3, uom: "PCS" },
      ];

      const consolidated = consolidateVariantQuantities(items);
      expect(consolidated).toHaveLength(2);

      const var1 = consolidated.find((c) => c.variantId === "var_1");
      const var2 = consolidated.find((c) => c.variantId === "var_2");

      // In IEEE 754, 0.1 + 0.2 = 0.30000000000000004. Decimal.js guarantees exact 0.3
      expect(var1?.totalQuantity.toString()).toBe("0.3");
      expect(var1?.totalQuantityNumber).toBe(0.3);
      expect(var1?.uom).toBe("KG");

      expect(var2?.totalQuantity.toString()).toBe("8");
      expect(var2?.totalQuantityNumber).toBe(8);
      expect(var2?.uom).toBe("PCS");
    });

    it("should throw UOMMismatchError if duplicate line items have conflicting UOMs", () => {
      const conflictingItems = [
        { variantId: "var_conflict", quantity: 10, uom: "PCS" },
        { variantId: "var_conflict", quantity: 2.5, uom: "KG" },
      ];

      expect(() => consolidateVariantQuantities(conflictingItems)).toThrow(UOMMismatchError);
    });

    it("should convert to JavaScript number via toPrismaQuantity only at the boundary", () => {
      const dec = new Decimal("15.750");
      const num = toPrismaQuantity(dec);
      expect(num).toBe(15.75);
      expect(typeof num).toBe("number");
    });
  });

  // =========================================================================
  // 3. UI Formatting Helper
  // =========================================================================
  describe("3. UI Formatting Helper", () => {
    it("should format discrete quantities without decimal places", () => {
      expect(formatQuantity(10, "PCS")).toBe("10");
      expect(formatQuantity(5, "BOX")).toBe("5");
    });

    it("should format continuous quantities preserving significant fractional digits up to 3", () => {
      expect(formatQuantity("10.5", "KG")).toBe("10.5");
      expect(formatQuantity("10.125", "MTR")).toBe("10.125");
      expect(formatQuantity(10, "KG")).toBe("10");
    });
  });

  // =========================================================================
  // 4. Transaction Retry & Error Classification
  // =========================================================================
  describe("4. Transaction Retry Classification & Idempotency", () => {
    it("should classify WriteConflict and TransientTransactionError as retryable transient errors", () => {
      // Prisma P2034
      expect(isTransientTransactionError({ code: "P2034" })).toBe(true);

      // MongoDB code 112 (WriteConflict)
      expect(isTransientTransactionError({ code: 112 })).toBe(true);

      // MongoDB code 251 (NoSuchTransaction)
      expect(isTransientTransactionError({ code: 251 })).toBe(true);

      // Driver label
      const errorWithLabel = {
        hasErrorLabel: (label: string) => label === "TransientTransactionError",
      };
      expect(isTransientTransactionError(errorWithLabel)).toBe(true);

      // Message inspection
      expect(isTransientTransactionError(new Error("WriteConflict in transaction"))).toBe(true);
    });

    it("should recognize UnknownTransactionCommitResult as ambiguous commit", () => {
      const ambiguousError = {
        hasErrorLabel: (label: string) => label === "UnknownTransactionCommitResult",
      };
      expect(isAmbiguousCommitError(ambiguousError)).toBe(true);
      expect(isAmbiguousCommitError(new Error("UnknownTransactionCommitResult encountered"))).toBe(true);
    });

    it("should reject non-transient errors (validation, syntax, schema errors) from retry", () => {
      expect(isTransientTransactionError(new Error("Validation failed"))).toBe(false);
      expect(isTransientTransactionError({ code: "P2002" })).toBe(false); // Unique constraint violation
      expect(isTransientTransactionError(null)).toBe(false);
    });

    it("should abort on UnknownTransactionCommitResult if no idempotency key is present", async () => {
      const mockClient = {
        $transaction: vi.fn(async () => {
          const err = new Error("Commit timeout");
          (err as any).hasErrorLabel = (label: string) => label === "UnknownTransactionCommitResult";
          throw err;
        }),
      };

      await expect(
        runTransactionWithRetry(mockClient, async () => "write", { idempotencyKey: "" })
      ).rejects.toThrow(AmbiguousTransactionCommitError);
    });

    it("should retry transient WriteConflict and succeed when subsequent attempt passes", async () => {
      let attempts = 0;
      const mockClient = {
        $transaction: vi.fn(async (cb) => {
          attempts++;
          if (attempts === 1) {
            const err = new Error("WriteConflict");
            (err as any).code = "P2034";
            throw err;
          }
          return await cb({});
        }),
      };

      const result = await runTransactionWithRetry(
        mockClient,
        async () => "successful_write",
        { maxRetries: 3, baseDelayMs: 5 }
      );

      expect(result).toBe("successful_write");
      expect(attempts).toBe(2);
    });

    it("should fail closed and rethrow DatabaseTransactionUnavailableError on standalone MongoDB without retrying", async () => {
      const mockClient = {
        $transaction: vi.fn(async () => {
          throw new DatabaseTransactionUnavailableError();
        }),
      };

      const callback = vi.fn();
      await expect(
        runTransactionWithRetry(mockClient, callback)
      ).rejects.toThrow(DatabaseTransactionUnavailableError);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Atomic Stock Operations & Insufficient Stock Protection
  // =========================================================================
  describe("5. Atomic Conditional Stock Operations Simulation", () => {
    it("should enforce negative stock policy atomically when currentStock is insufficient", async () => {
      const mockTx = {
        tenant: {
          findUnique: vi.fn(async () => ({ id: "tenant_1", allowNegativeStock: false })),
        },
        productVariant: {
          findMany: vi.fn(async () => [
            {
              id: "var_1",
              tenantId: "tenant_1",
              currentStock: 2,
              product: { uom: "KG" },
            },
          ]),
          updateMany: vi.fn(async () => ({ count: 0 })), // Atomic gte filter matched 0 records!
          findUnique: vi.fn(async () => ({ id: "var_1", currentStock: 2, purchasePrice: 100 })),
        },
        stockMovement: {
          findMany: vi.fn(async () => []),
          create: vi.fn(),
        },
      };

      const mockClient = {
        $transaction: vi.fn(async (cb) => await cb(mockTx)),
        stockMovement: {
          findMany: vi.fn(async () => []),
        },
      };

      await expect(
        processStockDeductionFromSale(
          {
            tenantId: "tenant_1",
            salesInvoiceId: "inv_1",
            items: [{ variantId: "var_1", quantity: 5, uom: "KG" }],
          },
          mockClient
        )
      ).rejects.toThrow(InsufficientStockError);

      // Verify atomic conditional query included currentStock: { gte: 5 }
      expect(mockTx.productVariant.updateMany).toHaveBeenCalledWith({
        where: {
          id: "var_1",
          tenantId: "tenant_1",
          currentStock: { gte: 5 },
        },
        data: {
          currentStock: { decrement: 5 },
        },
      });
    });

    it("should return idempotently without duplicate deduction when reference has already been processed", async () => {
      const mockExistingMovement = {
        id: "mov_existing",
        referenceId: "inv_idempotent",
        type: "SALE",
      };

      const mockClient = {
        stockMovement: {
          findMany: vi.fn(async () => [mockExistingMovement]),
        },
        $transaction: vi.fn(),
      };

      const result = await processStockDeductionFromSale(
        {
          tenantId: "tenant_1",
          salesInvoiceId: "inv_idempotent",
          items: [{ variantId: "var_1", quantity: 2, uom: "PCS" }],
        },
        mockClient
      );

      expect(result.idempotent).toBe(true);
      expect(result.movements).toEqual([mockExistingMovement]);
      expect(mockClient.$transaction).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. Rollback & BSON Compatibility Validation
  // =========================================================================
  describe("6. Rollback Safety & BSON Incompatibility", () => {
    it("should demonstrate that older Int-based schema throws when encountering Double in MongoDB", () => {
      // Simulation of Prisma Query Engine deserialization error
      const simulatePrismaIntRead = (bsonType: string) => {
        if (bsonType === "double" || bsonType === "decimal") {
          throw new Error("Inconsistent column data: Expected an integer, found a double.");
        }
        return 10;
      };

      expect(simulatePrismaIntRead("int32")).toBe(10);
      expect(() => simulatePrismaIntRead("double")).toThrow(
        "Inconsistent column data: Expected an integer, found a double."
      );
    });

    it("should verify that downward migration to Int must be prohibited if fractional values exist", () => {
      const documents = [
        { id: "1", current_stock: 10.0 },
        { id: "2", current_stock: 5.25 }, // Fractional!
      ];

      const hasFractional = documents.some((doc) => doc.current_stock % 1 !== 0);
      expect(hasFractional).toBe(true);

      const canSafelyRollbackToDatabaseInt = !hasFractional;
      expect(canSafelyRollbackToDatabaseInt).toBe(false);
    });
  });
});
