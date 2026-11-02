import { Decimal } from "@/lib/finance/decimal";
import { UnitOfMeasure } from "@prisma/client";

export const DISCRETE_UOMS: ReadonlySet<UnitOfMeasure> = new Set<UnitOfMeasure>([
  "PCS",
  "SET",
  "PAIR",
  "BOX",
]);

export const CONTINUOUS_UOMS: ReadonlySet<UnitOfMeasure> = new Set<UnitOfMeasure>([
  "KG",
  "MTR",
]);

export const MAX_CONTINUOUS_DECIMALS = 3;
export const MAX_DISCRETE_DECIMALS = 0;

export class QuantityValidationError extends Error {
  code: string = "QUANTITY_VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "QuantityValidationError";
  }
}

export class QuantityPrecisionError extends QuantityValidationError {
  override code: string = "QUANTITY_PRECISION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "QuantityPrecisionError";
  }
}

export class UOMMismatchError extends QuantityValidationError {
  override code: string = "UOM_MISMATCH_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "UOMMismatchError";
  }
}

export interface ValidateQuantityOptions {
  allowZero?: boolean;
  maxDecimalPlaces?: number;
}

/**
 * Validates and converts an input quantity to an exact Decimal instance based on UOM rules.
 *
 * Rules:
 * - Rejects null, undefined, empty strings, NaN, Infinity, -Infinity.
 * - Rejects negative values (and zero unless allowZero = true).
 * - Discrete units (PCS, SET, PAIR, BOX): must be positive integers (0 decimal places).
 * - Continuous units (KG, MTR): must have at most 3 decimal places.
 * - NEVER silently rounds or truncates; strictly throws QuantityPrecisionError on excess precision.
 */
export function parseAndValidateQuantity(
  raw: number | string | Decimal,
  uom: UnitOfMeasure | string,
  options?: ValidateQuantityOptions
): Decimal {
  if (raw === null || raw === undefined) {
    throw new QuantityValidationError("Quantity is required and cannot be null or undefined");
  }

  if (typeof raw === "string" && raw.trim() === "") {
    throw new QuantityValidationError("Quantity string cannot be empty");
  }

  let dec: Decimal;
  try {
    dec = raw instanceof Decimal ? raw : new Decimal(raw);
  } catch (err: any) {
    throw new QuantityValidationError(`Invalid quantity value '${raw}': ${err.message}`);
  }

  if (dec.isNaN()) {
    throw new QuantityValidationError(`Quantity '${raw}' is NaN`);
  }

  if (!dec.isFinite()) {
    throw new QuantityValidationError(`Quantity '${raw}' must be a finite number`);
  }

  const allowZero = options?.allowZero ?? false;
  if (allowZero) {
    if (dec.isNegative()) {
      throw new QuantityValidationError(`Quantity must be greater than or equal to zero, received: ${dec.toString()}`);
    }
  } else {
    if (!dec.isPositive() || dec.isZero()) {
      throw new QuantityValidationError(`Quantity must be strictly positive (> 0), received: ${dec.toString()}`);
    }
  }

  const uomUpper = String(uom).toUpperCase() as UnitOfMeasure;

  if (DISCRETE_UOMS.has(uomUpper)) {
    if (!dec.isInteger() || dec.decimalPlaces() > 0) {
      throw new QuantityPrecisionError(
        `Unit of measure '${uomUpper}' requires a whole number. Received fractional quantity: ${dec.toString()}`
      );
    }
  } else if (CONTINUOUS_UOMS.has(uomUpper)) {
    const maxDecimals = options?.maxDecimalPlaces ?? MAX_CONTINUOUS_DECIMALS;
    if (dec.decimalPlaces() > maxDecimals) {
      throw new QuantityPrecisionError(
        `Unit of measure '${uomUpper}' supports at most ${maxDecimals} decimal places. Received: ${dec.toString()} (${dec.decimalPlaces()} decimals). Silently rounding or truncating is prohibited.`
      );
    }
  } else {
    // If an unknown UOM is passed, default to strict discrete enforcement
    if (!dec.isInteger() || dec.decimalPlaces() > 0) {
      throw new QuantityPrecisionError(
        `Unrecognized UOM '${uom}'. Fractional quantities are only allowed for KG and MTR. Received: ${dec.toString()}`
      );
    }
  }

  return dec;
}

export interface RawLineItemForConsolidation {
  variantId: string;
  quantity: number | string | Decimal;
  uom: UnitOfMeasure | string;
  [key: string]: any;
}

export interface ConsolidatedVariantStockItem {
  variantId: string;
  uom: UnitOfMeasure;
  totalQuantity: Decimal;
  totalQuantityNumber: number;
}

/**
 * Consolidates duplicate variantId line items using arbitrary-precision Decimal arithmetic.
 *
 * Requirements:
 * - All items for the same variant must have matching UOMs (throws UOMMismatchError otherwise).
 * - Every item quantity is strictly validated according to UOM rules prior to consolidation.
 * - Accumulation uses Decimal.plus() to prevent IEEE 754 float drift.
 * - Converts to JS number (.toNumber()) only at the Prisma query boundary.
 */
export function consolidateVariantQuantities<T extends RawLineItemForConsolidation>(
  items: T[],
  options?: ValidateQuantityOptions
): ConsolidatedVariantStockItem[] {
  const map = new Map<string, { uom: UnitOfMeasure; total: Decimal }>();

  for (const item of items) {
    if (!item.variantId) {
      throw new QuantityValidationError("Variant ID is required for inventory consolidation");
    }

    const uom = String(item.uom).toUpperCase() as UnitOfMeasure;
    const validatedQty = parseAndValidateQuantity(item.quantity, uom, options);

    const existing = map.get(item.variantId);
    if (existing) {
      if (existing.uom !== uom) {
        throw new UOMMismatchError(
          `Conflicting UOM for variant '${item.variantId}': already registered with '${existing.uom}', encountered '${uom}'`
        );
      }
      existing.total = existing.total.plus(validatedQty);
    } else {
      map.set(item.variantId, {
        uom,
        total: validatedQty,
      });
    }
  }

  const results: ConsolidatedVariantStockItem[] = [];
  for (const [variantId, record] of map.entries()) {
    results.push({
      variantId,
      uom: record.uom,
      totalQuantity: record.total,
      totalQuantityNumber: record.total.toNumber(),
    });
  }

  return results;
}

/**
 * Safely converts an exact Decimal quantity to a Prisma-compatible JavaScript Float (number).
 */
export function toPrismaQuantity(dec: Decimal): number {
  if (!dec.isFinite()) {
    throw new QuantityValidationError(`Cannot convert non-finite Decimal '${dec.toString()}' to Prisma Float`);
  }
  return dec.toNumber();
}

/**
 * Formats a quantity for UI display according to UOM formatting rules.
 * Whole discrete units formatted without decimals (e.g. "5").
 * Continuous units formatted with up to 3 decimals without trailing zeros unless specified.
 */
export function formatQuantity(
  raw: number | string | Decimal,
  uom: UnitOfMeasure | string
): string {
  const dec = parseAndValidateQuantity(raw, uom, { allowZero: true });
  const uomUpper = String(uom).toUpperCase() as UnitOfMeasure;

  if (DISCRETE_UOMS.has(uomUpper)) {
    return dec.toFixed(0);
  }

  // For continuous, display exact decimal without losing significant fractional digits
  const dp = dec.decimalPlaces();
  if (dp === 0) {
    return dec.toFixed(0);
  }
  return dec.toFixed(Math.min(dp, MAX_CONTINUOUS_DECIMALS));
}
