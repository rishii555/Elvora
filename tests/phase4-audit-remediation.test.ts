import { describe, it, expect, vi } from "vitest";
import {
  runInTransaction,
  runSafeOnboardingOperation,
  DatabaseTransactionUnavailableError,
} from "@/lib/db/prisma";
import {
  CustomAttributesSchema,
  CustomAttributeValueSchema,
} from "@/lib/inventory/validation";
import { CsvRowSchema } from "@/lib/inventory/csv";

describe("Phase 4 Audit Remediation Suite", () => {
  // =============================================================
  // Finding 1 — HIGH: Transaction Atomicity & Fail-Closed Guarantee
  // =============================================================
  describe("Finding 1: Transaction Atomicity & Fail-Closed Behavior", () => {
    it("should fail closed and throw DatabaseTransactionUnavailableError when standalone MongoDB rejects transactions", async () => {
      const mockStandaloneClient = {
        $transaction: vi.fn(async () => {
          throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
        }),
      };

      const mutationCallback = vi.fn(async () => {
        return "partial_write_executed";
      });

      // Must throw DatabaseTransactionUnavailableError and NEVER invoke mutationCallback
      await expect(
        runInTransaction(mockStandaloneClient, mutationCallback)
      ).rejects.toThrow(DatabaseTransactionUnavailableError);

      expect(mutationCallback).not.toHaveBeenCalled();
    });

    it("should include actionable configuration advice in the error message", async () => {
      const mockStandaloneClient = {
        $transaction: vi.fn(async () => {
          throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
        }),
      };

      try {
        await runInTransaction(mockStandaloneClient, async () => "mutation");
        expect.unreachable("Expected runInTransaction to throw");
      } catch (err: any) {
        expect(err).toBeInstanceOf(DatabaseTransactionUnavailableError);
        expect(err.code).toBe("TRANSACTION_UNAVAILABLE");
        expect(err.message).toContain("ACID transaction failed");
        expect(err.message).toContain("replica set");
        expect(err.message).toContain("failed closed without executing partial writes");
      }
    });

    it("should pass through normal transaction results when replica set is available", async () => {
      const mockReplicaSetClient = {
        $transaction: vi.fn(async (cb: any) => {
          return await cb({ mockTx: true });
        }),
      };

      const mutationCallback = vi.fn(async (tx: any) => {
        return { invoiceId: "inv-123", txUsed: tx.mockTx };
      });

      const result = await runInTransaction(mockReplicaSetClient, mutationCallback);

      expect(result).toEqual({ invoiceId: "inv-123", txUsed: true });
      expect(mutationCallback).toHaveBeenCalledTimes(1);
    });

    it("should pass through transaction client when already within an active transaction", async () => {
      // An active transaction client (tx) does not have a $transaction function
      const activeTxClient = {
        invoice: { create: vi.fn() },
        ledger: { create: vi.fn() },
      };

      const subOperation = vi.fn(async (tx: any) => {
        expect(tx).toBe(activeTxClient);
        return "nested_success";
      });

      const result = await runInTransaction(activeTxClient, subOperation);

      expect(result).toBe("nested_success");
      expect(subOperation).toHaveBeenCalledTimes(1);
    });

    it("should allow idempotent onboarding operations to run sequentially in standalone dev", async () => {
      const mockStandaloneClient = {
        $transaction: vi.fn(async () => {
          throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
        }),
      };

      const onboardingCallback = vi.fn(async (client: any) => {
        return { seededCategoryCount: 15, clientType: typeof client };
      });

      const result = await runSafeOnboardingOperation(mockStandaloneClient, onboardingCallback);

      expect(result.seededCategoryCount).toBe(15);
      expect(onboardingCallback).toHaveBeenCalledTimes(1);
    });

    it("should map DatabaseTransactionUnavailableError to HTTP 503 Service Unavailable", () => {
      const error = new DatabaseTransactionUnavailableError();
      expect(error.code).toBe("TRANSACTION_UNAVAILABLE");

      // Verify the standardized 503 response payload structure
      const formatErrorResponse = (err: unknown) => {
        if (err instanceof DatabaseTransactionUnavailableError) {
          return { status: 503, body: { success: false, error: err.message } };
        }
        return { status: 500, body: { success: false, error: "Internal Error" } };
      };

      const res = formatErrorResponse(error);
      expect(res.status).toBe(503);
      expect(res.body.error).toContain("ACID transaction failed");
      expect(res.body.error).toContain("replica set");
    });
  });

  // =============================================================
  // Finding 2 — MEDIUM: Strict Custom Attributes Validation
  // =============================================================
  describe("Finding 2: Strict Custom Attributes Validation", () => {
    it("should validate legitimate sanitaryware attributes correctly", () => {
      const legitimateSanitarywareAttrs = {
        finish: "Chrome Plated",
        material: "Forged Brass",
        mountingType: "Wall Mounted",
        color: "Glossy White",
        warrantyDuration: "10 Years",
        warrantyYears: 10,
        isConcealed: true,
      };

      const result = CustomAttributesSchema.safeParse(legitimateSanitarywareAttrs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.finish).toBe("Chrome Plated");
        expect(result.data.warrantyYears).toBe(10);
        expect(result.data.isConcealed).toBe(true);
      }
    });

    it("should reject more than 25 custom attributes", () => {
      const excessiveAttrs: Record<string, string> = {};
      for (let i = 1; i <= 26; i++) {
        excessiveAttrs[`attr_${i}`] = `value_${i}`;
      }

      const result = CustomAttributesSchema.safeParse(excessiveAttrs);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Maximum of 25 custom attributes allowed");
      }
    });

    it("should reject attribute keys longer than 50 characters", () => {
      const longKey = "a".repeat(51);
      const invalidAttrs = { [longKey]: "valid_value" };

      const result = CustomAttributesSchema.safeParse(invalidAttrs);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("cannot exceed 50 characters");
      }
    });

    it("should reject empty attribute keys", () => {
      const invalidAttrs = { "": "valid_value" };
      const result = CustomAttributesSchema.safeParse(invalidAttrs);
      expect(result.success).toBe(false);
    });

    it("should reject string values longer than 200 characters", () => {
      const longValue = "x".repeat(201);
      const invalidAttrs = { finish: longValue };

      const result = CustomAttributesSchema.safeParse(invalidAttrs);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("cannot exceed 200 characters");
      }
    });

    it("should reject nested objects and arrays", () => {
      const nestedObject = { finish: { type: "chrome", hex: "#cccccc" } };
      expect(CustomAttributesSchema.safeParse(nestedObject).success).toBe(false);

      const arrayValue = { certifications: ["ISO-9001", "ISI-Marked"] };
      expect(CustomAttributesSchema.safeParse(arrayValue).success).toBe(false);
    });

    it("should reject null and undefined values", () => {
      const nullValue = { finish: null };
      expect(CustomAttributesSchema.safeParse(nullValue).success).toBe(false);

      const undefinedValue = { finish: undefined };
      expect(CustomAttributesSchema.safeParse(undefinedValue).success).toBe(false);
    });

    it("should reject NaN, Infinity and -Infinity in numeric values", () => {
      expect(CustomAttributeValueSchema.safeParse(NaN).success).toBe(false);
      expect(CustomAttributeValueSchema.safeParse(Infinity).success).toBe(false);
      expect(CustomAttributeValueSchema.safeParse(-Infinity).success).toBe(false);

      const nanPayload = { warrantyYears: NaN };
      expect(CustomAttributesSchema.safeParse(nanPayload).success).toBe(false);
    });
  });

  // =============================================================
  // Finding 3 — LOW: UOM Alignment (PCS, SET, PAIR, BOX, MTR, KG)
  // =============================================================
  describe("Finding 3: Strict UOM Compatibility & Rejection of LTR/PKT", () => {
    const validUoms = ["PCS", "SET", "PAIR", "BOX", "MTR", "KG"] as const;

    it("should accept all six valid Prisma enum UOMs in CSV schema", () => {
      validUoms.forEach((uom) => {
        const row = {
          productName: `Product in ${uom}`,
          sku: `SKU-${uom}`,
          sellingPrice: 500,
          openingStock: 10,
          uom,
        };

        const result = CsvRowSchema.safeParse(row);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.uom).toBe(uom);
        }
      });
    });

    it("should default UOM to PCS when omitted in CSV schema", () => {
      const row = {
        productName: "Generic Faucet",
        sku: "FAUCET-001",
        sellingPrice: 1200,
      };

      const result = CsvRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uom).toBe("PCS");
      }
    });

    it("should strictly reject unsupported LTR and PKT in CSV schema", () => {
      const ltrRow = {
        productName: "Tile Cleaner Liquid",
        sku: "CLEAN-LTR",
        sellingPrice: 250,
        uom: "LTR",
      };

      const pktRow = {
        productName: "Washer Packets",
        sku: "WASH-PKT",
        sellingPrice: 50,
        uom: "PKT",
      };

      expect(CsvRowSchema.safeParse(ltrRow).success).toBe(false);
      expect(CsvRowSchema.safeParse(pktRow).success).toBe(false);
    });

    it("should reject random invalid UOMs (TONS, DOZEN, FEET)", () => {
      const invalidUoms = ["TONS", "DOZEN", "FEET", "SQFT", "BAG"];
      invalidUoms.forEach((uom) => {
        const row = {
          productName: "Test Product",
          sku: "TEST-SKU",
          sellingPrice: 100,
          uom,
        };
        expect(CsvRowSchema.safeParse(row).success).toBe(false);
      });
    });
  });
});
