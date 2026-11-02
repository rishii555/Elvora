import { z } from "zod";

/**
 * Validates individual custom attribute values.
 * Allows strictly:
 * - String values: max 200 characters
 * - Numeric values: finite numbers only (rejects NaN, Infinity, -Infinity)
 * - Boolean values: true / false
 * Rejects:
 * - Arrays, objects, null, undefined, NaN, Infinity
 */
export const CustomAttributeValueSchema = z.union([
  z.string().max(200, "Attribute string value cannot exceed 200 characters"),
  z.number().refine((n) => Number.isFinite(n), {
    message: "Attribute numeric value must be finite (cannot be NaN or Infinity)",
  }),
  z.boolean(),
]);

/**
 * Strict schema for dynamic product and variant custom attributes.
 * Enforces server-side data integrity:
 * - Maximum 25 attributes
 * - Key length: 1 to 50 characters
 * - Values: String (<=200 chars), finite number, or boolean
 */
export const CustomAttributesSchema = z
  .record(
    z
      .string()
      .min(1, "Attribute key cannot be empty")
      .max(50, "Attribute key cannot exceed 50 characters"),
    CustomAttributeValueSchema
  )
  .refine((obj) => Object.keys(obj).length <= 25, {
    message: "Maximum of 25 custom attributes allowed",
  });

export type CustomAttributes = z.infer<typeof CustomAttributesSchema>;
