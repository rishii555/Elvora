import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { hasPermission, TenantRole } from "@/lib/auth/permissions";

export interface InventoryCsvRow {
  productName: string;
  sku: string;
  barcode?: string;
  brand: string;
  category: string;
  model?: string;
  size?: string;
  colorFinish?: string;
  uom: "PCS" | "SET" | "BOX" | "MTR" | "PAIR" | "KG";
  hsnCode?: string;
  gstRate: number;
  purchaseCost?: number;
  sellingPrice: number;
  mrp?: number;
  openingStock: number;
  minStockAlert: number;
}

export const CsvRowSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  brand: z.string().default("Generic"),
  category: z.string().default("General"),
  model: z.string().optional(),
  size: z.string().optional(),
  colorFinish: z.string().optional(),
  uom: z.enum(["PCS", "SET", "BOX", "MTR", "PAIR", "KG", "LTR", "PKT"]).default("PCS"),
  hsnCode: z.string().default("0000"),
  gstRate: z.coerce.number().default(18),
  purchaseCost: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  mrp: z.coerce.number().min(0).default(0),
  openingStock: z.coerce.number().min(0).default(0),
  minStockAlert: z.coerce.number().min(0).default(5),
});

/**
 * Escapes fields for standard CSV and neutralizes CSV / Formula Injection (CWE-1236).
 */
export function escapeCsv(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // Defend against CSV / Formula Injection (CWE-1236)
  // If cell starts with formula trigger (=, +, -, @, \t, \r), prefix with single-quote
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates CSV string for tenant inventory items.
 * Enforces role-based masking on Purchase Cost.
 */
export async function generateInventoryCsv(
  tenantId: string,
  userRole: TenantRole = "OWNER",
  client: any = prisma
): Promise<string> {
  const canViewCost = hasPermission(userRole, "VIEW_PURCHASE_COSTS");

  const variants = await client.productVariant.findMany({
    where: { tenantId, isActive: true },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
        },
      },
    },
    orderBy: { sku: "asc" },
  });

  const headers = [
    "Product Name",
    "SKU",
    "Barcode",
    "Brand",
    "Category",
    "Model",
    "Size",
    "Finish / Color",
    "UOM",
    "HSN Code",
    "GST Rate (%)",
    ...(canViewCost ? ["Purchase Cost (INR)"] : []),
    "Selling Price (INR)",
    "MRP (INR)",
    "Current Stock",
    "Min Stock Alert",
  ];

  const rows = variants.map((v: any) => {
    const row = [
      escapeCsv(v.product.name),
      escapeCsv(v.sku),
      escapeCsv(v.barcode || v.product.barcode || ""),
      escapeCsv(v.product.brand?.name || "Generic"),
      escapeCsv(v.product.category?.name || "General"),
      escapeCsv(v.model || ""),
      escapeCsv(v.size || ""),
      escapeCsv(v.colorFinish || ""),
      escapeCsv(v.product.uom || "PCS"),
      escapeCsv(v.product.hsnCode || "6910"),
      escapeCsv(v.gstRate),
      ...(canViewCost ? [escapeCsv(v.purchasePrice)] : []),
      escapeCsv(v.sellingPrice),
      escapeCsv(v.mrp),
      escapeCsv(v.currentStock),
      escapeCsv(v.product.minStockAlert),
    ];
    return row.join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Parses raw CSV string into structured validated objects.
 */
export function parseInventoryCsv(csvContent: string): {
  success: boolean;
  rows: InventoryCsvRow[];
  errors: string[];
} {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { success: false, rows: [], errors: ["CSV file is empty or missing headers"] };
  }

  // Parse header line
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());

  const getColIdx = (nameVariants: string[]): number => {
    return headers.findIndex((h) =>
      nameVariants.some((variant) => h.includes(variant))
    );
  };

  const nameIdx = getColIdx(["product", "name", "item name", "item"]);
  const skuIdx = getColIdx(["sku", "code", "item code"]);
  const barcodeIdx = getColIdx(["barcode"]);
  const brandIdx = getColIdx(["brand", "make"]);
  const catIdx = getColIdx(["category"]);
  const modelIdx = getColIdx(["model"]);
  const sizeIdx = getColIdx(["size"]);
  const finishIdx = getColIdx(["finish", "color"]);
  const uomIdx = getColIdx(["uom", "unit"]);
  const hsnIdx = getColIdx(["hsn"]);
  const gstIdx = getColIdx(["gst", "tax"]);
  const costIdx = getColIdx(["purchase", "cost"]);
  const priceIdx = getColIdx(["selling", "price", "sale"]);
  const mrpIdx = getColIdx(["mrp"]);
  const stockIdx = getColIdx(["stock", "qty", "opening"]);
  const alertIdx = getColIdx(["min", "alert", "threshold"]);

  if (nameIdx === -1 || skuIdx === -1) {
    return {
      success: false,
      rows: [],
      errors: ["CSV must contain at least 'Product Name' and 'SKU' columns."],
    };
  }

  const rows: InventoryCsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvLine(lines[i]);
    if (!rawCols.length || rawCols.every((c) => !c.trim())) continue;

    const rawObj = {
      productName: rawCols[nameIdx]?.trim() || "",
      sku: rawCols[skuIdx]?.trim() || "",
      barcode: barcodeIdx !== -1 ? rawCols[barcodeIdx]?.trim() : "",
      brand: brandIdx !== -1 && rawCols[brandIdx]?.trim() ? rawCols[brandIdx].trim() : "Generic",
      category: catIdx !== -1 && rawCols[catIdx]?.trim() ? rawCols[catIdx].trim() : "General",
      model: modelIdx !== -1 ? rawCols[modelIdx]?.trim() : "",
      size: sizeIdx !== -1 ? rawCols[sizeIdx]?.trim() : "",
      colorFinish: finishIdx !== -1 ? rawCols[finishIdx]?.trim() : "",
      uom: (uomIdx !== -1 ? rawCols[uomIdx]?.trim().toUpperCase() : "PCS") as any,
      hsnCode: hsnIdx !== -1 && rawCols[hsnIdx]?.trim() ? rawCols[hsnIdx].trim() : "0000",
      gstRate: gstIdx !== -1 && rawCols[gstIdx] ? parseFloat(rawCols[gstIdx]) || 18 : 18,
      purchaseCost: costIdx !== -1 && rawCols[costIdx] ? parseFloat(rawCols[costIdx]) || 0 : 0,
      sellingPrice: priceIdx !== -1 && rawCols[priceIdx] ? parseFloat(rawCols[priceIdx]) || 0 : 0,
      mrp: mrpIdx !== -1 && rawCols[mrpIdx] ? parseFloat(rawCols[mrpIdx]) || 0 : 0,
      openingStock: stockIdx !== -1 && rawCols[stockIdx] ? parseInt(rawCols[stockIdx], 10) || 0 : 0,
      minStockAlert: alertIdx !== -1 && rawCols[alertIdx] ? parseInt(rawCols[alertIdx], 10) || 5 : 5,
    };

    const validation = CsvRowSchema.safeParse(rawObj);
    if (!validation.success) {
      const errMsgs = validation.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      errors.push(`Row ${i + 1} ('${rawObj.productName || "Unknown"}'): ${errMsgs}`);
    } else {
      rows.push(validation.data as InventoryCsvRow);
    }
  }

  return {
    success: errors.length === 0,
    rows,
    errors,
  };
}

/**
 * Parses a single CSV line honoring quotes.
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Imports validated CSV rows into tenant database, handling brands, categories, products,
 * variants, and opening stock movements atomically.
 */
export async function importInventoryRows(
  tenantId: string,
  rows: InventoryCsvRow[],
  client: any = prisma
): Promise<{
  importedCount: number;
  updatedCount: number;
  errors: string[];
}> {
  let importedCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      await client.$transaction(async (tx: any) => {
        // 1. Resolve or create Brand
        let brand = await tx.brand.findFirst({
          where: { tenantId, name: row.brand },
        });
        if (!brand) {
          brand = await tx.brand.create({
            data: { tenantId, name: row.brand },
          });
        }

        // 2. Resolve or create Category
        let category = await tx.category.findFirst({
          where: { tenantId, name: row.category },
        });
        if (!category) {
          category = await tx.category.create({
            data: { tenantId, name: row.category },
          });
        }

        // 3. Resolve or create Product
        let product = await tx.product.findFirst({
          where: { tenantId, code: row.sku },
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              tenantId,
              name: row.productName,
              code: row.sku,
              barcode: row.barcode || null,
              brandId: brand.id,
              categoryId: category.id,
              hsnCode: row.hsnCode,
              uom: row.uom,
              minStockAlert: row.minStockAlert,
            },
          });
        }

        // 4. Resolve or create Variant
        let variant = await tx.productVariant.findFirst({
          where: { tenantId, sku: row.sku },
        });

        if (variant) {
          // Update existing variant
          variant = await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              name: row.model || row.productName,
              barcode: row.barcode || variant.barcode,
              model: row.model || variant.model,
              size: row.size || variant.size,
              colorFinish: row.colorFinish || variant.colorFinish,
              purchasePrice: row.purchaseCost ?? variant.purchasePrice,
              sellingPrice: row.sellingPrice,
              mrp: row.mrp || variant.mrp,
              gstRate: row.gstRate,
            },
          });
          updatedCount++;
        } else {
          // Create new variant
          variant = await tx.productVariant.create({
            data: {
              tenantId,
              productId: product.id,
              name: row.model ? `${row.productName} - ${row.model}` : "Standard",
              sku: row.sku,
              barcode: row.barcode || null,
              model: row.model || null,
              size: row.size || null,
              colorFinish: row.colorFinish || null,
              purchasePrice: row.purchaseCost || 0,
              sellingPrice: row.sellingPrice,
              mrp: row.mrp || 0,
              gstRate: row.gstRate,
              currentStock: row.openingStock,
            },
          });

          // 5. If opening stock > 0, log audit movement
          if (row.openingStock > 0) {
            await tx.stockMovement.create({
              data: {
                tenantId,
                variantId: variant.id,
                type: "ADJUSTMENT_IN",
                quantity: row.openingStock,
                unitCost: row.purchaseCost || 0,
                balanceAfter: row.openingStock,
                referenceType: "INITIAL_SETUP",
                reason: "OPENING_STOCK",
                notes: "Initial inventory setup from CSV import",
              },
            });
          }
          importedCount++;
        }
      });
    } catch (err: any) {
      errors.push(`SKU '${row.sku}': ${err.message}`);
    }
  }

  return { importedCount, updatedCount, errors };
}
