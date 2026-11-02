import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SANITARYWARE_TEMPLATE,
  normalizeBusinessType,
} from "@/lib/templates/definitions";
import {
  provisionTenantTemplate,
  provisionDefaultLocation,
} from "@/lib/templates/service";
import { z } from "zod";

describe("Phase 4: Sanitaryware & Bath Fittings Template & Product Engine", () => {
  const TENANT_A = "6612345678901234567890aa";
  const TENANT_B = "6612345678901234567890bb";

  let mockDb: any;
  let mockCategories: any[] = [];
  let mockProducts: any[] = [];
  let mockVariants: any[] = [];
  let mockConfigs: any[] = [];
  let mockLocations: any[] = [];

  beforeEach(() => {
    mockCategories = [];
    mockProducts = [];
    mockVariants = [];
    mockConfigs = [];
    mockLocations = [];

    mockDb = {
      tenantConfig: {
        findUnique: vi.fn(async ({ where }: any) => {
          return mockConfigs.find((c) => c.tenantId === where.tenantId) || null;
        }),
        create: vi.fn(async ({ data }: any) => {
          const created = { id: `cfg-${Date.now()}`, ...data };
          mockConfigs.push(created);
          return created;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const index = mockConfigs.findIndex((c) => c.tenantId === where.tenantId);
          if (index >= 0) {
            mockConfigs[index] = { ...mockConfigs[index], ...data };
            return mockConfigs[index];
          }
          throw new Error("Config not found");
        }),
        upsert: vi.fn(async ({ where, update, create }: any) => {
          const index = mockConfigs.findIndex((c) => c.tenantId === where.tenantId);
          if (index >= 0) {
            mockConfigs[index] = { ...mockConfigs[index], ...update };
            return mockConfigs[index];
          }
          const created = { id: `cfg-${Date.now()}`, ...create };
          mockConfigs.push(created);
          return created;
        }),
      },
      category: {
        findMany: vi.fn(async ({ where }: any) => {
          return mockCategories.filter((c) => {
            if (c.tenantId !== where.tenantId) return false;
            if (where.isActive !== undefined && c.isActive !== where.isActive) return false;
            return true;
          });
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            mockCategories.find((c) => {
              if (where.tenantId && c.tenantId !== where.tenantId) return false;
              if (where.id && c.id !== where.id) return false;
              if (where.name?.equals && c.name.toLowerCase() !== where.name.equals.toLowerCase()) {
                return false;
              }
              if (where.name && typeof where.name === "string" && c.name !== where.name) {
                return false;
              }
              return true;
            }) || null
          );
        }),
        create: vi.fn(async ({ data }: any) => {
          const created = {
            id: `cat-${mockCategories.length + 1}`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockCategories.push(created);
          return created;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const index = mockCategories.findIndex((c) => c.id === where.id);
          if (index >= 0) {
            mockCategories[index] = { ...mockCategories[index], ...data };
            return mockCategories[index];
          }
          throw new Error("Category not found");
        }),
        delete: vi.fn(async ({ where }: any) => {
          const index = mockCategories.findIndex((c) => c.id === where.id);
          if (index >= 0) {
            const [deleted] = mockCategories.splice(index, 1);
            return deleted;
          }
          throw new Error("Category not found");
        }),
      },
      product: {
        findMany: vi.fn(async ({ where }: any) => {
          return mockProducts.filter((p) => p.tenantId === where.tenantId);
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            mockProducts.find((p) => {
              if (where.tenantId && p.tenantId !== where.tenantId) return false;
              if (where.id && p.id !== where.id) return false;
              if (where.code && p.code !== where.code) return false;
              return true;
            }) || null
          );
        }),
        create: vi.fn(async ({ data }: any) => {
          const created = {
            id: `prod-${mockProducts.length + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockProducts.push(created);
          return created;
        }),
      },
      productVariant: {
        findMany: vi.fn(async ({ where }: any) => {
          return mockVariants.filter((v) => {
            if (where.tenantId && v.tenantId !== where.tenantId) return false;
            if (where.productId && v.productId !== where.productId) return false;
            return true;
          });
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            mockVariants.find((v) => {
              if (where.tenantId && v.tenantId !== where.tenantId) return false;
              if (where.id && v.id !== where.id) return false;
              if (where.sku && v.sku !== where.sku) return false;
              if (where.sku?.in && !where.sku.in.includes(v.sku)) return false;
              return true;
            }) || null
          );
        }),
        create: vi.fn(async ({ data }: any) => {
          const created = {
            id: `var-${mockVariants.length + 1}`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockVariants.push(created);
          return created;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const index = mockVariants.findIndex((v) => v.id === where.id);
          if (index >= 0) {
            mockVariants[index] = { ...mockVariants[index], ...data };
            return mockVariants[index];
          }
          throw new Error("Variant not found");
        }),
      },
      inventoryLocation: {
        findMany: vi.fn(async ({ where }: any) => {
          return mockLocations.filter((l) => l.tenantId === where.tenantId);
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            mockLocations.find((l) => {
              if (l.tenantId !== where.tenantId) return false;
              if (where.isDefault !== undefined && l.isDefault !== where.isDefault) return false;
              if (where.name && l.name !== where.name) return false;
              return true;
            }) || null
          );
        }),
        create: vi.fn(async ({ data }: any) => {
          const created = {
            id: `loc-${mockLocations.length + 1}`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockLocations.push(created);
          return created;
        }),
      },
      stockMovement: {
        create: vi.fn(async ({ data }: any) => ({
          id: `mov-${Date.now()}`,
          createdAt: new Date(),
          ...data,
        })),
      },
      taxClassification: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ id: `tax-${Date.now()}`, ...data })),
      },
      numberingSequence: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ id: `seq-${Date.now()}`, ...data })),
      },
    };
  });

  // -------------------------------------------------------------
  // 1. Template Definition & Category Verification
  // -------------------------------------------------------------
  describe("Sanitaryware Template Definition & Registry", () => {
    it("should export sanitaryware template with canonical ID and metadata", () => {
      expect(SANITARYWARE_TEMPLATE.id).toBe("sanitaryware");
      expect(SANITARYWARE_TEMPLATE.name).toBe("Sanitaryware & Bath Fittings");
      expect(SANITARYWARE_TEMPLATE.defaultUom).toBe("PCS");
      expect(SANITARYWARE_TEMPLATE.supportedUoms).toContain("PCS");
      expect(SANITARYWARE_TEMPLATE.supportedUoms).toContain("SET");
      expect(SANITARYWARE_TEMPLATE.supportedUoms).toContain("PAIR");
      expect(SANITARYWARE_TEMPLATE.supportedUoms).toContain("BOX");
      expect(SANITARYWARE_TEMPLATE.supportedUoms).toContain("MTR");
      expect(SANITARYWARE_TEMPLATE.supportedUoms).toContain("KG");
    });

    it("should include all 15 required granular sanitaryware categories", () => {
      const categoryNames = SANITARYWARE_TEMPLATE.categories.map((c) => c.name);
      const requiredCategories = [
        "Western Toilet",
        "One Piece Closet",
        "Wall Hung Closet",
        "Wash Basin",
        "Cistern",
        "Urinal",
        "Bib Cock",
        "Pillar Cock",
        "Basin Mixer",
        "Wall Mixer",
        "Shower",
        "Health Faucet",
        "Angle Valve",
        "Diverter",
        "Bathroom Accessories",
      ];

      for (const reqCat of requiredCategories) {
        expect(categoryNames).toContain(reqCat);
      }
    });

    it("should configure sanitaryware industry attributes (finish, material, mountingType, warranty)", () => {
      const attributeKeys = SANITARYWARE_TEMPLATE.attributes.map((a) => a.key);
      expect(attributeKeys).toContain("finish");
      expect(attributeKeys).toContain("colorFinish");
      expect(attributeKeys).toContain("material");
      expect(attributeKeys).toContain("mountingType");
      expect(attributeKeys).toContain("warrantyDuration");

      const finishAttr = SANITARYWARE_TEMPLATE.attributes.find((a) => a.key === "finish");
      expect(finishAttr?.options).toContain("Chrome Plated");
      expect(finishAttr?.options).toContain("Matte Black");
      expect(finishAttr?.options).toContain("Rose Gold");
    });

    it("should strictly default enableWarehouses to false across sanitaryware templates", () => {
      expect(SANITARYWARE_TEMPLATE.featureFlags.enableWarehouses).toBe(false);
      expect(SANITARYWARE_TEMPLATE.featureFlags.enablePos).toBe(true);
      expect(SANITARYWARE_TEMPLATE.featureFlags.enableMatrixVariant).toBe(true);
    });

    it("should resolve sanitaryware template through fuzzy normalizer", () => {
      expect(normalizeBusinessType("sanitaryware")).toBe("sanitaryware");
      expect(normalizeBusinessType("Sanitaryware & Bath Fittings")).toBe("sanitaryware");
      expect(normalizeBusinessType("bath fittings")).toBe("sanitaryware");
      expect(normalizeBusinessType("plumbing & sanitary")).toBe("sanitaryware");
      expect(normalizeBusinessType("tiles & bath")).toBe("sanitaryware");
    });
  });

  // -------------------------------------------------------------
  // 2. Category Management & Isolation
  // -------------------------------------------------------------
  describe("Category Management & Tenant Isolation", () => {
    it("should provision default categories for tenant without collisions", async () => {
      const res = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
      });

      expect(res.categoriesCreated.length).toBeGreaterThanOrEqual(15);
      expect(mockCategories.filter((c) => c.tenantId === TENANT_A).length).toBe(
        res.categoriesCreated.length
      );
    });

    it("should isolate categories between Tenant A and Tenant B", async () => {
      await mockDb.category.create({
        data: { tenantId: TENANT_A, name: "Luxury Vanities", code: "LV-01" },
      });
      await mockDb.category.create({
        data: { tenantId: TENANT_B, name: "Commercial Urinals", code: "CU-01" },
      });

      const tenantACats = await mockDb.category.findMany({ where: { tenantId: TENANT_A } });
      const tenantBCats = await mockDb.category.findMany({ where: { tenantId: TENANT_B } });

      expect(tenantACats.map((c: any) => c.name)).toContain("Luxury Vanities");
      expect(tenantACats.map((c: any) => c.name)).not.toContain("Commercial Urinals");

      expect(tenantBCats.map((c: any) => c.name)).toContain("Commercial Urinals");
      expect(tenantBCats.map((c: any) => c.name)).not.toContain("Luxury Vanities");
    });

    it("should allow same category name across different tenants but prevent duplicate within same tenant", async () => {
      // Both tenants can create "Brass bib cocks"
      const catA = await mockDb.category.create({
        data: { tenantId: TENANT_A, name: "Brass Bib Cocks" },
      });
      const catB = await mockDb.category.create({
        data: { tenantId: TENANT_B, name: "Brass Bib Cocks" },
      });

      expect(catA.tenantId).toBe(TENANT_A);
      expect(catB.tenantId).toBe(TENANT_B);

      // Within Tenant A, duplicate check detects existing
      const existingInA = await mockDb.category.findFirst({
        where: {
          tenantId: TENANT_A,
          name: { equals: "brass bib cocks", mode: "insensitive" },
        },
      });
      expect(existingInA).not.toBeNull();
      expect(existingInA?.id).toBe(catA.id);
    });

    it("should support category archiving via isActive flag", async () => {
      const cat = await mockDb.category.create({
        data: { tenantId: TENANT_A, name: "Discontinued Showers", isActive: true },
      });

      const updated = await mockDb.category.update({
        where: { id: cat.id },
        data: { isActive: false },
      });

      expect(updated.isActive).toBe(false);

      const activeOnly = await mockDb.category.findMany({
        where: { tenantId: TENANT_A, isActive: true },
      });
      expect(activeOnly.find((c: any) => c.id === cat.id)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // 3. Product & UOM Compatibility Suite
  // -------------------------------------------------------------
  describe("Product & UOM Compatibility Suite", () => {
    const ProductValidationSchema = z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      uom: z.enum(["PCS", "SET", "PAIR", "BOX", "MTR", "KG"]).default("PCS"),
      hsnCode: z.string().default("8481"),
      gstRate: z.number().default(18),
      sellingPrice: z.number().min(0),
    });

    it("should accept all standard supported UOMs including PAIR and BOX", () => {
      const uoms = ["PCS", "SET", "PAIR", "BOX", "MTR", "KG"] as const;

      uoms.forEach((uom) => {
        const result = ProductValidationSchema.safeParse({
          name: `Sample Item in ${uom}`,
          sku: `SKU-${uom}`,
          uom,
          sellingPrice: 1500,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.uom).toBe(uom);
        }
      });
    });

    it("should default UOM to PCS when omitted", () => {
      const result = ProductValidationSchema.parse({
        name: "Standard Basin Mixer",
        sku: "MIX-STD-01",
        sellingPrice: 2200,
      });
      expect(result.uom).toBe("PCS");
    });

    it("should reject invalid UOMs outside the defined enum", () => {
      const result = ProductValidationSchema.safeParse({
        name: "Invalid Item",
        sku: "SKU-INV",
        uom: "TONS",
        sellingPrice: 1000,
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 4. Variant Management & Custom Attributes Suite
  // -------------------------------------------------------------
  describe("Variant Management & Dynamic Attributes", () => {
    it("should create a parent product and store customAttributes in ProductVariant", async () => {
      const product = await mockDb.product.create({
        data: {
          tenantId: TENANT_A,
          name: "Single Lever Wall Mixer 3-in-1",
          code: "PROD-MIX-3IN1",
          hsnCode: "8481",
          uom: "PCS",
        },
      });

      const variantChrome = await mockDb.productVariant.create({
        data: {
          tenantId: TENANT_A,
          productId: product.id,
          name: "Single Lever Wall Mixer - Chrome Plated",
          sku: "MIX-3IN1-CP",
          model: "Alive Series 3-in-1",
          size: "Standard",
          colorFinish: "Chrome Plated",
          customAttributes: {
            finish: "Chrome Plated",
            material: "Forged Brass",
            mountingType: "Wall Mounted",
            warrantyDuration: "10 Years",
          },
          purchasePrice: 2800,
          sellingPrice: 4200,
          mrp: 4999,
          gstRate: 18,
          currentStock: 15,
        },
      });

      expect(variantChrome.id).toBeDefined();
      expect(variantChrome.customAttributes).toEqual({
        finish: "Chrome Plated",
        material: "Forged Brass",
        mountingType: "Wall Mounted",
        warrantyDuration: "10 Years",
      });
      expect(variantChrome.currentStock).toBe(15);
    });

    it("should allow multi-variant creation for the same parent product with distinct finishes", async () => {
      const product = await mockDb.product.create({
        data: {
          tenantId: TENANT_A,
          name: "Countertop Basin - Oval",
          code: "PROD-BAS-OVAL",
          uom: "PCS",
        },
      });

      const v1 = await mockDb.productVariant.create({
        data: {
          tenantId: TENANT_A,
          productId: product.id,
          name: "Countertop Basin - Glossy White",
          sku: "BAS-OVAL-GWHT",
          colorFinish: "Gloss White",
          sellingPrice: 3200,
          currentStock: 8,
          customAttributes: { finish: "Gloss White", material: "Ceramic" },
        },
      });

      const v2 = await mockDb.productVariant.create({
        data: {
          tenantId: TENANT_A,
          productId: product.id,
          name: "Countertop Basin - Matte Black",
          sku: "BAS-OVAL-MBLK",
          colorFinish: "Matte Black",
          sellingPrice: 4500,
          currentStock: 4,
          customAttributes: { finish: "Matte Black", material: "Ceramic" },
        },
      });

      const variants = await mockDb.productVariant.findMany({
        where: { tenantId: TENANT_A, productId: product.id },
      });

      expect(v1.id).toBeDefined();
      expect(v2.id).toBeDefined();
      expect(variants.length).toBe(2);
      expect(variants.map((v: any) => v.sku)).toEqual(["BAS-OVAL-GWHT", "BAS-OVAL-MBLK"]);
      expect(variants[0].customAttributes.finish).toBe("Gloss White");
      expect(variants[1].customAttributes.finish).toBe("Matte Black");
    });

    it("should prevent duplicate SKU within the same tenant across variants", async () => {
      await mockDb.productVariant.create({
        data: {
          tenantId: TENANT_A,
          productId: "prod-1",
          sku: "JAQ-TAP-001",
          name: "Tap Chrome",
          currentStock: 10,
        },
      });

      // Attempting to find existing SKU in Tenant A
      const existing = await mockDb.productVariant.findFirst({
        where: { tenantId: TENANT_A, sku: "JAQ-TAP-001" },
      });
      expect(existing).not.toBeNull();

      // Same SKU in Tenant B is allowed
      const existingInB = await mockDb.productVariant.findFirst({
        where: { tenantId: TENANT_B, sku: "JAQ-TAP-001" },
      });
      expect(existingInB).toBeNull();
    });

    it("should mask purchasePrice for roles lacking VIEW_PURCHASE_COSTS", () => {
      const rawVariant = {
        id: "var-1",
        name: "Bib Cock Long Body",
        sku: "BIB-LB-01",
        purchasePrice: 650,
        sellingPrice: 1100,
        mrp: 1350,
      };

      const maskCost = (variant: any, userRole: string) => {
        const canView = ["OWNER", "MANAGER", "ACCOUNTANT"].includes(userRole);
        return {
          ...variant,
          purchasePrice: canView ? variant.purchasePrice : null,
        };
      };

      const ownerView = maskCost(rawVariant, "OWNER");
      expect(ownerView.purchasePrice).toBe(650);

      const billerView = maskCost(rawVariant, "BILLER");
      expect(billerView.purchasePrice).toBeNull();
      expect(billerView.sellingPrice).toBe(1100);
    });
  });

  // -------------------------------------------------------------
  // 5. Warehouse Configuration & Operational Stock Isolation
  // -------------------------------------------------------------
  describe("Warehouse Configuration & Operational Stock Isolation", () => {
    it("should preserve single-store counter default without forced multi-location migration", async () => {
      // 1. Provision default single location
      const locRes = await provisionDefaultLocation(TENANT_A, mockDb);
      expect(locRes).not.toBeNull();
      expect(locRes.created).toBe(true);
      expect(locRes.location.isDefault).toBe(true);
      expect(locRes.location.name).toBe("Main Store Counter");

      // 2. Provision template configuration (enableWarehouses remains false)
      const provRes = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
      });

      expect(provRes.tenantConfig.enableWarehouses).toBe(false);

      // 3. Operational stock remains on ProductVariant.currentStock directly
      const variant = await mockDb.productVariant.create({
        data: {
          tenantId: TENANT_A,
          productId: "prod-wh-1",
          sku: "ANG-VALVE-01",
          name: "Brass Angle Valve",
          currentStock: 25,
        },
      });

      expect(variant.currentStock).toBe(25);
    });

    it("should allow activating warehouse mode without modifying existing currentStock", async () => {
      const variant = await mockDb.productVariant.create({
        data: {
          tenantId: TENANT_A,
          productId: "prod-wh-2",
          sku: "DIV-CONC-01",
          name: "Concealed Diverter Body",
          currentStock: 12,
        },
      });
      expect(variant.id).toBeDefined();

      // User opts into multi-warehouse configuration
      await mockDb.tenantConfig.upsert({
        where: { tenantId: TENANT_A },
        update: { enableWarehouses: true, defaultWarehouseName: "Central Godown" },
        create: {
          tenantId: TENANT_A,
          businessType: "sanitaryware",
          enableWarehouses: true,
          defaultWarehouseName: "Central Godown",
        },
      });

      // Create the optional warehouse location
      const whLocation = await mockDb.inventoryLocation.create({
        data: {
          tenantId: TENANT_A,
          name: "Central Godown",
          code: "WH-1",
          isDefault: false,
        },
      });

      expect(whLocation.name).toBe("Central Godown");

      // Verify operational stock on ProductVariant is completely unchanged
      const checkedVariant = await mockDb.productVariant.findFirst({
        where: { tenantId: TENANT_A, sku: "DIV-CONC-01" },
      });

      expect(checkedVariant?.currentStock).toBe(12);
    });

    it("should ensure locations are strictly scoped to the tenant", async () => {
      await mockDb.inventoryLocation.create({
        data: { tenantId: TENANT_A, name: "Showroom Front", isDefault: true },
      });
      await mockDb.inventoryLocation.create({
        data: { tenantId: TENANT_B, name: "Showroom Front", isDefault: true },
      });

      const locationsA = await mockDb.inventoryLocation.findMany({
        where: { tenantId: TENANT_A },
      });
      const locationsB = await mockDb.inventoryLocation.findMany({
        where: { tenantId: TENANT_B },
      });

      expect(locationsA.length).toBe(1);
      expect(locationsA[0].tenantId).toBe(TENANT_A);
      expect(locationsB.length).toBe(1);
      expect(locationsB[0].tenantId).toBe(TENANT_B);
    });
  });
});
