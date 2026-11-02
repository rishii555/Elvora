import { describe, it, expect, beforeEach } from "vitest";
import {
  provisionTenantTemplate,
  saveOnboardingDraft,
  getOnboardingState,
} from "@/lib/templates/service";

describe("Phase 3: Smart Registration & Onboarding Wizard Suite", () => {
  let tenantConfigsStore: Map<string, any>;
  let categoriesStore: any[];
  let inventoryLocationsStore: any[];
  let tenantsStore: Map<string, any>;

  const TENANT_A = "tenant_onboarding_001";
  const TENANT_B = "tenant_onboarding_002";

  let mockDb: any;

  beforeEach(() => {
    tenantConfigsStore = new Map();
    categoriesStore = [];
    inventoryLocationsStore = [];
    tenantsStore = new Map();

    // Seed default tenant records
    tenantsStore.set(TENANT_A, {
      id: TENANT_A,
      tradeName: "Apex Luxury Showroom",
      legalName: "Apex Luxury Interiors Pvt Ltd",
      gstin: "09AAACA9999F1Z1",
      stateCode: "09",
      phone: "9876543210",
      email: "billing@apexinteriors.com",
      address: "102 Ring Road, Noida",
      invoicePrefix: "INV-",
      approvalStatus: "PENDING",
    });

    tenantsStore.set(TENANT_B, {
      id: TENANT_B,
      tradeName: "Metro Fresh FMCG Mart",
      legalName: "Metro Retailers Ltd",
      gstin: "07AAACM1234F1Z9",
      stateCode: "07",
      phone: "9811122233",
      email: "accounts@metrofresh.com",
      address: "Shop 4, South Ex, New Delhi",
      invoicePrefix: "RET-",
      approvalStatus: "APPROVED",
    });

    mockDb = {
      tenant: {
        findUnique: async ({ where }: any) => {
          return tenantsStore.get(where.id) || null;
        },
        update: async ({ where, data }: any) => {
          const existing = tenantsStore.get(where.id);
          if (!existing) throw new Error("Tenant not found");
          const updated = { ...existing, ...data };
          tenantsStore.set(where.id, updated);
          return updated;
        },
      },
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
              if (where.name && loc.name !== where.name) return false;
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
    };
  });

  // =========================================================================
  // 1. Smart Registration With Industry Template Assignment
  // =========================================================================
  describe("1. Registration & Initial Template Provisioning", () => {
    it("provisions chosen Sanitaryware industry template during registration", async () => {
      const result = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "Sanitaryware, Tiles & Bath Fittings",
        db: mockDb,
      });

      expect(result.template.id).toBe("sanitaryware");
      expect(result.tenantConfig.businessType).toBe("sanitaryware");
      expect(result.tenantConfig.enablePos).toBe(true);
      expect(result.tenantConfig.enableWarehouses).toBe(false); // strictly false by default

      // Default Main Shop Counter location is created
      expect(result.defaultLocationCreated).toBe(true);
      const locations = await mockDb.inventoryLocation.findMany({ where: { tenantId: TENANT_A } });
      expect(locations.length).toBe(1);
      expect(locations[0].name).toBe("Main Store Counter");
      expect(locations[0].isDefault).toBe(true);

      // Sanitaryware categories seeded
      const categories = await mockDb.category.findMany({ where: { tenantId: TENANT_A } });
      const catNames = categories.map((c: any) => c.name);
      expect(catNames).toContain("Ceramic Sanitaryware");
      expect(catNames).toContain("Faucets & CP Taps");
      expect(catNames).not.toContain("Packaged Foods & Snacks");
    });

    it("provisions FMCG template when registering grocery business", async () => {
      const result = await provisionTenantTemplate({
        tenantId: TENANT_B,
        businessType: "Retail Store / Supermarket",
        db: mockDb,
      });

      expect(result.template.id).toBe("fmcg");
      expect(result.tenantConfig.businessType).toBe("fmcg");
      expect(result.tenantConfig.enableWarehouses).toBe(false);

      const categories = await mockDb.category.findMany({ where: { tenantId: TENANT_B } });
      const catNames = categories.map((c: any) => c.name);
      expect(catNames).toContain("Packaged Foods & Snacks");
      expect(catNames).not.toContain("Ceramic Sanitaryware");
    });
  });

  // =========================================================================
  // 2. Incomplete Onboarding Draft Saving & Resumption
  // =========================================================================
  describe("2. Onboarding Progress Draft Saving & Resumption", () => {
    it("saves draft progress at step 3 and allows resumption", async () => {
      const draftData = {
        selectedTemplateId: "electronics",
        tradeName: "Gizmo World",
        enableWarehouses: false,
        activeAttributes: ["brand", "model", "imeiSerial"],
      };

      const savedDraft = await saveOnboardingDraft({
        tenantId: TENANT_A,
        step: 3,
        businessType: "electronics",
        draftData,
        db: mockDb,
      });

      expect(savedDraft.onboardingStep).toBe(3);
      expect(savedDraft.onboardingCompleted).toBe(false);

      // Verify resumption
      const state = await getOnboardingState(TENANT_A, mockDb);
      expect(state.onboardingStep).toBe(3);
      expect(state.onboardingCompleted).toBe(false);
      expect(state.draft.tradeName).toBe("Gizmo World");
      expect(state.draft.selectedTemplateId).toBe("electronics");
      expect(state.draft.activeAttributes).toContain("imeiSerial");
    });

    it("updates draft progress as user advances to step 5", async () => {
      await saveOnboardingDraft({
        tenantId: TENANT_A,
        step: 2,
        draftData: { step2Completed: true },
        db: mockDb,
      });

      await saveOnboardingDraft({
        tenantId: TENANT_A,
        step: 5,
        draftData: { step5Completed: true, invoicePrefix: "GIZMO-" },
        db: mockDb,
      });

      const state = await getOnboardingState(TENANT_A, mockDb);
      expect(state.onboardingStep).toBe(5);
      expect(state.draft.invoicePrefix).toBe("GIZMO-");
    });
  });

  // =========================================================================
  // 3. Step 8: Finalizing Onboarding & Warehouse Options
  // =========================================================================
  describe("3. Step 8: Finalize Onboarding & Storage Configuration", () => {
    it("finalizes onboarding with warehouse DISABLED by default", async () => {
      const result = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
        options: {
          overwriteConfig: true,
          enableWarehouses: false,
          onboardingCompleted: true,
          onboardingStep: 8,
        },
      });

      expect(result.tenantConfig.enableWarehouses).toBe(false);
      expect(result.tenantConfig.onboardingCompleted).toBe(true);
      expect(result.tenantConfig.onboardingStep).toBe(8);

      const locations = await mockDb.inventoryLocation.findMany({ where: { tenantId: TENANT_A } });
      // Single shop counter only
      expect(locations.length).toBe(1);
      expect(locations[0].name).toBe("Main Store Counter");
    });

    it("finalizes onboarding with warehouse ENABLED when owner explicitly chooses", async () => {
      const result = await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
        options: {
          overwriteConfig: true,
          enableWarehouses: true,
          warehouseName: "Central Godown Sector 62",
          onboardingCompleted: true,
          onboardingStep: 8,
        },
      });

      expect(result.tenantConfig.enableWarehouses).toBe(true);
      expect(result.warehouseLocationCreated).toBe(true);

      const locations = await mockDb.inventoryLocation.findMany({ where: { tenantId: TENANT_A } });
      expect(locations.length).toBe(2);

      const locationNames = locations.map((l: any) => l.name);
      expect(locationNames).toContain("Main Store Counter");
      expect(locationNames).toContain("Central Godown Sector 62");
    });

    it("allows custom category selection without forcing unwanted defaults", async () => {
      const customCategories = [
        "Designer Washbasins",
        "Sensor Faucets",
        "Concealed Flush Tanks",
      ];

      await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
        options: {
          overwriteConfig: true,
          customCategories,
          onboardingCompleted: true,
        },
      });

      const categories = await mockDb.category.findMany({ where: { tenantId: TENANT_A } });
      const names = categories.map((c: any) => c.name);

      expect(names).toEqual(expect.arrayContaining(customCategories));
    });
  });

  // =========================================================================
  // 4. Strict Multi-Tenant Isolation
  // =========================================================================
  describe("4. Multi-Tenant Onboarding Isolation", () => {
    it("ensures Tenant A's draft and locations are completely isolated from Tenant B", async () => {
      // Tenant A configures Sanitaryware with Godown
      await provisionTenantTemplate({
        tenantId: TENANT_A,
        businessType: "sanitaryware",
        db: mockDb,
        options: {
          enableWarehouses: true,
          warehouseName: "Tenant A Godown",
          onboardingCompleted: true,
        },
      });

      // Tenant B configures FMCG without warehouses
      await provisionTenantTemplate({
        tenantId: TENANT_B,
        businessType: "fmcg",
        db: mockDb,
        options: {
          enableWarehouses: false,
          onboardingCompleted: true,
        },
      });

      const stateA = await getOnboardingState(TENANT_A, mockDb);
      const stateB = await getOnboardingState(TENANT_B, mockDb);

      expect(stateA.config.enableWarehouses).toBe(true);
      expect(stateA.locations.length).toBe(2);

      expect(stateB.config.enableWarehouses).toBe(false);
      expect(stateB.locations.length).toBe(1);

      const namesA = stateA.locations.map((l: any) => l.name);
      const namesB = stateB.locations.map((l: any) => l.name);

      expect(namesA).toContain("Tenant A Godown");
      expect(namesB).not.toContain("Tenant A Godown");
    });
  });
});
