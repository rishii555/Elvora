import { describe, it, expect, beforeEach } from "vitest";
import {
  IndustryTemplateId,
  TEMPLATE_REGISTRY,
  SANITARYWARE_TEMPLATE,
  FMCG_TEMPLATE,
  ELECTRONICS_TEMPLATE,
  APPAREL_TEMPLATE,
  HARDWARE_TEMPLATE,
  WHOLESALE_TEMPLATE,
  MANUFACTURING_TEMPLATE,
  normalizeBusinessType,
} from "@/lib/templates/definitions";
import {
  resolveTemplate,
  getTemplateOrThrow,
  getAllTemplates,
  provisionTenantTemplate,
  provisionDefaultLocation,
  validateTenantTemplateConfig,
  getTenantConfig,
} from "@/lib/templates/service";

describe("Phase 2: Template Engine Registry & Schema Foundation Suite", () => {
  // In-memory mock database store for clean isolated testing
  let tenantConfigsStore: Map<string, any>;
  let categoriesStore: any[];
  let inventoryLocationsStore: any[];
  let variantsStore: any[];

  const TENANT_A = "tenant_test_a_001";
  const TENANT_B = "tenant_test_b_002";

  let mockDb: any;

  beforeEach(() => {
    tenantConfigsStore = new Map();
    categoriesStore = [];
    inventoryLocationsStore = [];
    variantsStore = [];

    mockDb = {
      tenantConfig: {
        findUnique: async ({ where }: any) => {
          return tenantConfigsStore.get(where.tenantId) || null;
        },
        create: async ({ data }: any) => {
          const record = { id: `cfg_${Date.now()}_${Math.random()}`, ...data };
          tenantConfigsStore.set(data.tenantId, record);
          return record;
        },
        update: async ({ where, data }: any) => {
          const existing = tenantConfigsStore.get(where.tenantId);
          if (!existing) throw new Error("TenantConfig not found");
          const updated = { ...existing, ...data };
          tenantConfigsStore.set(where.tenantId, updated);
          return updated;
        },
      },
      category: {
        findMany: async ({ where }: any) => {
          return categoriesStore.filter((c) => c.tenantId === where.tenantId);
        },
        create: async ({ data }: any) => {
          const record = { id: `cat_${Date.now()}_${Math.random()}`, ...data };
          categoriesStore.push(record);
          return record;
        },
      },
      inventoryLocation: {
        findFirst: async ({ where }: any) => {
          return (
            inventoryLocationsStore.find((loc) => {
              if (loc.tenantId !== where.tenantId) return false;
              if (where.isDefault !== undefined && loc.isDefault !== where.isDefault) return false;
              return true;
            }) || null
          );
        },
        findMany: async ({ where }: any) => {
          return inventoryLocationsStore.filter((loc) => loc.tenantId === where.tenantId);
        },
        create: async ({ data }: any) => {
          const record = { id: `loc_${Date.now()}_${Math.random()}`, ...data };
          inventoryLocationsStore.push(record);
          return record;
        },
      },
      productVariant: {
        create: async ({ data }: any) => {
          const record = { id: `var_${Date.now()}`, ...data };
          variantsStore.push(record);
          return record;
        },
        findUnique: async ({ where }: any) => {
          return variantsStore.find((v) => v.id === where.id) || null;
        },
      },
    };
  });

  // =========================================================================
  // 1. All Seven Template Definitions Verification
  // =========================================================================
  describe("1. All Seven Industry Template Definitions", () => {
    const EXPECTED_TEMPLATE_IDS: IndustryTemplateId[] = [
      "sanitaryware",
      "fmcg",
      "electronics",
      "apparel",
      "hardware",
      "wholesale",
      "manufacturing",
    ];

    it("registers all seven distinct industry templates in TEMPLATE_REGISTRY", () => {
      const allTemplates = getAllTemplates();
      expect(allTemplates.length).toBe(7);

      const registeredIds = Object.keys(TEMPLATE_REGISTRY);
      for (const id of EXPECTED_TEMPLATE_IDS) {
        expect(registeredIds).toContain(id);
        const template = TEMPLATE_REGISTRY[id];
        expect(template.id).toBe(id);
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.categories.length).toBeGreaterThanOrEqual(4);
        expect(template.attributes.length).toBeGreaterThanOrEqual(3);
        expect(template.supportedUoms.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("enforces universal SaaS rule: every template has enableWarehouses = false by default", () => {
      for (const template of getAllTemplates()) {
        expect(template.featureFlags.enableWarehouses).toBe(false);
      }
    });

    it("verifies Sanitaryware & Bath Fittings definition adheres strictly to bathroom specs with NO tile calculations", () => {
      expect(SANITARYWARE_TEMPLATE.id).toBe("sanitaryware");
      expect(SANITARYWARE_TEMPLATE.name).toBe("Sanitaryware & Bath Fittings");
      expect(SANITARYWARE_TEMPLATE.defaultUom).toBe("PCS");

      const catNames = SANITARYWARE_TEMPLATE.categories.map((c) => c.name);
      expect(catNames).toContain("Ceramic Sanitaryware");
      expect(catNames).toContain("Faucets & CP Taps");
      expect(catNames).toContain("Showers & Diverters");

      // Verify NO tile-specific logic or Sq.Ft formulas exist
      const allCategoriesText = JSON.stringify(SANITARYWARE_TEMPLATE.categories);
      expect(allCategoriesText.toLowerCase()).not.toContain("sq.ft");
      expect(allCategoriesText.toLowerCase()).not.toContain("square feet");
      expect(allCategoriesText.toLowerCase()).not.toContain("pieces per box");
      expect(allCategoriesText.toLowerCase()).not.toContain("vitrified tiles");

      const attrKeys = SANITARYWARE_TEMPLATE.attributes.map((a) => a.key);
      expect(attrKeys).toContain("brand");
      expect(attrKeys).toContain("model");
      expect(attrKeys).toContain("size");
      expect(attrKeys).toContain("colorFinish");
      expect(attrKeys).not.toContain("sqftCoverage");
    });

    it("verifies Grocery & FMCG template configures batch-expiry and thermal print", () => {
      expect(FMCG_TEMPLATE.featureFlags.enableBatchExpiry).toBe(true);
      expect(FMCG_TEMPLATE.featureFlags.enablePos).toBe(true);
      expect(FMCG_TEMPLATE.defaultInvoiceSettings.printFormat).toBe("THERMAL_3INCH");
      expect(FMCG_TEMPLATE.defaultInvoiceSettings.showBatchExpiry).toBe(true);

      const attrKeys = FMCG_TEMPLATE.attributes.map((a) => a.key);
      expect(attrKeys).toContain("batchNumber");
      expect(attrKeys).toContain("expiryDate");
      expect(attrKeys).toContain("netWeight");
    });

    it("verifies Electronics & Mobiles template configures IMEI and serial tracking", () => {
      expect(ELECTRONICS_TEMPLATE.featureFlags.enableSerialImei).toBe(true);
      expect(ELECTRONICS_TEMPLATE.defaultInvoiceSettings.showSerialImei).toBe(true);

      const attrKeys = ELECTRONICS_TEMPLATE.attributes.map((a) => a.key);
      expect(attrKeys).toContain("imeiSerial");
      expect(attrKeys).toContain("warrantyMonths");
    });

    it("verifies Clothing & Apparel template configures 2D variant matrix (Size x Color)", () => {
      expect(APPAREL_TEMPLATE.featureFlags.enableMatrixVariant).toBe(true);

      const sizeAttr = APPAREL_TEMPLATE.attributes.find((a) => a.key === "size");
      const colorAttr = APPAREL_TEMPLATE.attributes.find((a) => a.key === "color");
      expect(sizeAttr?.isVariantDimension).toBe(true);
      expect(colorAttr?.isVariantDimension).toBe(true);
    });

    it("verifies Hardware & Tools template configures mixed UOMs and contractor credit", () => {
      expect(HARDWARE_TEMPLATE.featureFlags.enableCreditLimit).toBe(true);
      expect(HARDWARE_TEMPLATE.supportedUoms).toContain("KG");
      expect(HARDWARE_TEMPLATE.supportedUoms).toContain("MTR");
      expect(HARDWARE_TEMPLATE.supportedUoms).toContain("PCS");
    });

    it("verifies Wholesale & B2B template defaults to BOX UOM and disables counter POS", () => {
      expect(WHOLESALE_TEMPLATE.defaultUom).toBe("BOX");
      expect(WHOLESALE_TEMPLATE.featureFlags.enablePos).toBe(false);
      expect(WHOLESALE_TEMPLATE.featureFlags.enableWholesalePricing).toBe(true);
    });

    it("verifies Manufacturing template enables BOM and batch tracking", () => {
      expect(MANUFACTURING_TEMPLATE.featureFlags.enableBomManufacturing).toBe(true);
      expect(MANUFACTURING_TEMPLATE.featureFlags.enableBatchExpiry).toBe(true);

      const catNames = MANUFACTURING_TEMPLATE.categories.map((c) => c.name);
      expect(catNames).toContain("Raw Materials");
      expect(catNames).toContain("Work in Progress (WIP)");
      expect(catNames).toContain("Finished Goods");
    });
  });

  // =========================================================================
  // 2. Template Lookup, Normalization & Error Handling
  // =========================================================================
  describe("2. Template Lookup and Fuzzy Normalization", () => {
    it("resolves canonical template IDs directly", () => {
      expect(normalizeBusinessType("sanitaryware")).toBe("sanitaryware");
      expect(resolveTemplate("sanitaryware")?.id).toBe("sanitaryware");
      expect(resolveTemplate("fmcg")?.id).toBe("fmcg");
      expect(resolveTemplate("electronics")?.id).toBe("electronics");
      expect(resolveTemplate("apparel")?.id).toBe("apparel");
      expect(resolveTemplate("hardware")?.id).toBe("hardware");
      expect(resolveTemplate("wholesale")?.id).toBe("wholesale");
      expect(resolveTemplate("manufacturing")?.id).toBe("manufacturing");
    });

    it("resolves fuzzy user-entered trade sectors cleanly", () => {
      expect(resolveTemplate("Sanitaryware, Tiles & Bath Fittings")?.id).toBe("sanitaryware");
      expect(resolveTemplate("Retail Store / Supermarket")?.id).toBe("fmcg");
      expect(resolveTemplate("Electronics, Hardware & Gadgets")?.id).toBe("electronics");
      expect(resolveTemplate("Apparel, Footwear & Fashion")?.id).toBe("apparel");
      expect(resolveTemplate("Hardware, Sanitary & Building Materials")?.id).toBe("hardware");
      expect(resolveTemplate("Wholesale & Distribution")?.id).toBe("wholesale");
      expect(resolveTemplate("Manufacturing & Industrial Supplies")?.id).toBe("manufacturing");
    });

    it("returns null for unrecognized or empty business types without throwing", () => {
      expect(resolveTemplate(null)).toBeNull();
      expect(resolveTemplate("")).toBeNull();
      expect(resolveTemplate("unknown_cryptocurrency_mining")).toBeNull();
    });

    it("throws a descriptive error in getTemplateOrThrow for invalid inputs", () => {
      expect(() => getTemplateOrThrow("invalid_trade_type")).toThrow(
        /Invalid or unsupported businessType/
      );
    });
  });

  // =========================================================================
  // 3. Default TenantConfig Creation
  // =========================================================================
  describe("3. TenantConfig Creation & Validation", () => {
    it("provisions a valid TenantConfig adhering to template feature flags", async () => {
      const result = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "electronics",
        db: mockDb,
      });

      expect(result.tenantConfig.tenantId).toBe(TENANT_A);
      expect(result.tenantConfig.businessType).toBe("electronics");
      expect(result.tenantConfig.version).toBe(1);
      expect(result.tenantConfig.enablePos).toBe(true);
      expect(result.tenantConfig.enableWarehouses).toBe(false);
      expect(result.tenantConfig.enableSerialImei).toBe(true);
      expect(result.tenantConfig.enableMatrixVariant).toBe(true);

      // Verify activeAttributes array
      expect(result.tenantConfig.activeAttributes).toContain("imeiSerial");
      expect(result.tenantConfig.activeAttributes).toContain("warrantyMonths");

      // Verify JSON settings parse successfully
      const invoiceSettings = JSON.parse(result.tenantConfig.invoiceSettingsJson);
      expect(invoiceSettings.showSerialImei).toBe(true);
      expect(invoiceSettings.printFormat).toBe("A4");

      const dashboardCards = JSON.parse(result.tenantConfig.dashboardCardsJson);
      expect(dashboardCards).toContain("serial_warranty_tracking");
    });

    it("validates existing tenant config successfully", async () => {
      await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
      });

      const validation = await validateTenantTemplateConfig(TENANT_A, mockDb);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.template?.id).toBe("sanitaryware");
    });

    it("detects missing TenantConfig during validation", async () => {
      const validation = await validateTenantTemplateConfig("non_existent_tenant", mockDb);
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain("No TenantConfig found");
    });
  });

  // =========================================================================
  // 4. Idempotent Category Provisioning
  // =========================================================================
  describe("4. Idempotent Category Provisioning", () => {
    it("creates categories on initial provisioning and skips duplicates on repeated calls", async () => {
      // First call
      const firstRun = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
      });

      expect(firstRun.categoriesCreated.length).toBe(SANITARYWARE_TEMPLATE.categories.length);
      const initialTotal = categoriesStore.filter((c) => c.tenantId === TENANT_A).length;
      expect(initialTotal).toBe(SANITARYWARE_TEMPLATE.categories.length);

      // Second call (repeated / re-run)
      const secondRun = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
      });

      expect(secondRun.categoriesCreated.length).toBe(0);
      const secondTotal = categoriesStore.filter((c) => c.tenantId === TENANT_A).length;
      expect(secondTotal).toBe(initialTotal);
    });

    it("creates only missing categories when partial categories already exist", async () => {
      // Pre-seed one category
      await mockDb.category.create({
        data: {
          tenantId: TENANT_A,
          name: "Ceramic Sanitaryware",
        },
      });

      const run = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
      });

      // Should create all EXCEPT the pre-existing "Ceramic Sanitaryware"
      expect(run.categoriesCreated).not.toContain("Ceramic Sanitaryware");
      expect(run.categoriesCreated.length).toBe(SANITARYWARE_TEMPLATE.categories.length - 1);
    });
  });

  // =========================================================================
  // 5. Tenant Isolation
  // =========================================================================
  describe("5. Strict Tenant Isolation", () => {
    it("isolates config and categories between different tenants", async () => {
      // Provision Tenant A as FMCG
      await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "fmcg",
        db: mockDb,
      });

      // Provision Tenant B as Wholesale
      await provisionTenantTemplate({
        tenantId: TENANT_B,
        businessType: "wholesale",
        db: mockDb,
      });

      const configA = await getTenantConfig(TENANT_A, mockDb);
      const configB = await getTenantConfig(TENANT_B, mockDb);

      expect(configA.businessType).toBe("fmcg");
      expect(configA.enablePos).toBe(true);

      expect(configB.businessType).toBe("wholesale");
      expect(configB.enablePos).toBe(false);

      const categoriesA = await mockDb.category.findMany({ where: { tenantId: TENANT_A } });
      const categoriesB = await mockDb.category.findMany({ where: { tenantId: TENANT_B } });

      const namesA = categoriesA.map((c: any) => c.name);
      const namesB = categoriesB.map((c: any) => c.name);

      expect(namesA).toContain("Packaged Foods & Snacks");
      expect(namesA).not.toContain("Bulk Commodities & Goods");

      expect(namesB).toContain("Bulk Commodities & Goods");
      expect(namesB).not.toContain("Packaged Foods & Snacks");
    });
  });

  // =========================================================================
  // 6. Default Warehouse Architecture
  // =========================================================================
  describe("6. Default Warehouse Architecture & Operational Stock", () => {
    it("provisions a default Main Store Counter location without enabling multi-location", async () => {
      const result = await provisionDefaultLocation(TENANT_A, mockDb);

      expect(result.created).toBe(true);
      expect(result.location.name).toBe("Main Store Counter");
      expect(result.location.isDefault).toBe(true);
      expect(result.location.tenantId).toBe(TENANT_A);

      // Verify second call is idempotent
      const secondResult = await provisionDefaultLocation(TENANT_A, mockDb);
      expect(secondResult.created).toBe(false);
      expect(secondResult.location.name).toBe("Main Store Counter");

      const totalLocations = await mockDb.inventoryLocation.findMany({ where: { tenantId: TENANT_A } });
      expect(totalLocations.length).toBe(1);
    });

    it("verifies warehouse UI and multi-location flags remain disabled by default", async () => {
      const result = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "hardware",
        db: mockDb,
      });

      expect(result.tenantConfig.enableWarehouses).toBe(false);
      expect(result.defaultLocationCreated).toBe(true);
    });
  });

  // =========================================================================
  // 7. Existing Tenant Compatibility
  // =========================================================================
  describe("7. Backward Compatibility for Existing Tenants", () => {
    it("does not overwrite existing custom settings unless overwriteConfig is explicitly true", async () => {
      // Tenant already has custom config
      await mockDb.tenantConfig.create({
        data: {
          tenantId: TENANT_A,
          businessType: "apparel",
          version: 1,
          enablePos: false, // Owner intentionally turned off POS
          enableWarehouses: false,
          enableSerialImei: false,
          enableMatrixVariant: true,
          enableCreditLimit: true,
          activeAttributes: ["custom_field_1"],
          invoiceSettingsJson: JSON.stringify({ customHeader: "Hello" }),
          dashboardCardsJson: JSON.stringify(["custom_card"]),
        },
      });

      // Run provision without overwrite
      const runWithoutOverwrite = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "apparel",
        db: mockDb,
        options: { overwriteConfig: false },
      });

      // Must preserve owner's custom setting
      expect(runWithoutOverwrite.tenantConfig.enablePos).toBe(false);
      expect(runWithoutOverwrite.tenantConfig.activeAttributes).toEqual(["custom_field_1"]);

      // Run provision WITH overwrite
      const runWithOverwrite = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "apparel",
        db: mockDb,
        options: { overwriteConfig: true },
      });

      // Now reset to apparel template defaults
      expect(runWithOverwrite.tenantConfig.enablePos).toBe(true);
      expect(runWithOverwrite.tenantConfig.activeAttributes).toContain("size");
      expect(runWithOverwrite.tenantConfig.activeAttributes).toContain("color");
    });

    it("supports ProductVariant with backward-compatible customAttributes", async () => {
      // Existing variant fields: model, size, colorFinish
      // New field: customAttributes (Json?)
      const variant = await mockDb.productVariant.create({
        data: {
          tenantId: TENANT_A,
          productId: "prod_001",
          sku: "ELEC-SAM-S24",
          model: "S24 Ultra",
          size: "6.8 inch",
          colorFinish: "Titanium Gray",
          customAttributes: {
            imei: "354890123456789",
            ramStorage: "12GB/512GB",
            warrantyMonths: 24,
          },
          currentStock: 15,
        },
      });

      expect(variant.model).toBe("S24 Ultra");
      expect(variant.size).toBe("6.8 inch");
      expect(variant.colorFinish).toBe("Titanium Gray");
      expect(variant.customAttributes.imei).toBe("354890123456789");
      expect(variant.customAttributes.warrantyMonths).toBe(24);
      expect(variant.currentStock).toBe(15);
    });
  });
});
