import prisma from "@/lib/db/prisma";
import {
  IndustryTemplate,
  TEMPLATE_REGISTRY,
  normalizeBusinessType,
} from "./definitions";

export interface ProvisionTenantTemplateParams {
  tenantId: string;
  businessType: string;
  db?: any;
  options?: {
    overwriteConfig?: boolean;
    createDefaultLocation?: boolean;
    enableWarehouses?: boolean;
    warehouseName?: string;
    customCategories?: string[];
    activeAttributes?: string[];
    invoiceSettings?: Record<string, any>;
    dashboardCards?: string[];
    onboardingStep?: number;
    onboardingCompleted?: boolean;
    onboardingDraft?: any;
  };
}

export interface ProvisionTenantTemplateResult {
  tenantConfig: any;
  template: IndustryTemplate;
  categoriesCreated: string[];
  existingCategoriesCount: number;
  defaultLocationCreated: boolean;
  warehouseLocationCreated?: boolean;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  config?: any;
  template?: IndustryTemplate | null;
}

/**
 * Resolves an IndustryTemplate by businessType string.
 * Supports exact canonical IDs ("sanitaryware", "fmcg", etc.)
 * as well as fuzzy sector names.
 */
export function resolveTemplate(businessType?: string | null): IndustryTemplate | null {
  const normalizedId = normalizeBusinessType(businessType);
  if (!normalizedId) return null;
  return TEMPLATE_REGISTRY[normalizedId] || null;
}

/**
 * Retrieves an IndustryTemplate or throws a descriptive error.
 */
export function getTemplateOrThrow(businessType?: string | null): IndustryTemplate {
  const template = resolveTemplate(businessType);
  if (!template) {
    const validKeys = Object.keys(TEMPLATE_REGISTRY).join(", ");
    throw new Error(
      `Invalid or unsupported businessType: '${businessType}'. Valid templates are: ${validKeys}`
    );
  }
  return template;
}

/**
 * Lists all registered industry templates.
 */
export function getAllTemplates(): IndustryTemplate[] {
  return Object.values(TEMPLATE_REGISTRY);
}

/**
 * Fetches the TenantConfig for a given tenant.
 */
export function getTenantConfig(tenantId: string, db?: any) {
  const client = db || prisma;
  return client.tenantConfig.findUnique({
    where: { tenantId },
  });
}

/**
 * Ensures a single-location tenant has a default shop counter location.
 * Implements Section 5 of Phase 2 architecture:
 * - Every new tenant should have a default Main Shop location.
 * - Multi-location/warehouse UI remains disabled (enableWarehouses: false).
 * - Existing ProductVariant.currentStock remains the operational stock source.
 * - Idempotent: Does not create duplicates if a default location already exists.
 */
export async function provisionDefaultLocation(tenantId: string, db?: any) {
  const client = db || prisma;

  // Check if any location already exists for this tenant
  const existingDefault = await client.inventoryLocation.findFirst({
    where: { tenantId, isDefault: true },
  });

  if (existingDefault) {
    return { location: existingDefault, created: false };
  }

  const existingAny = await client.inventoryLocation.findFirst({
    where: { tenantId },
  });

  if (existingAny) {
    return { location: existingAny, created: false };
  }

  // Create default Main Store Counter location
  const newLocation = await client.inventoryLocation.create({
    data: {
      tenantId,
      name: "Main Store Counter",
      code: "MAIN",
      isDefault: true,
      isActive: true,
    },
  });

  return { location: newLocation, created: true };
}

/**
 * Provisions an industry template for a tenant.
 * Requirements:
 * - Tenant-scoped operations only.
 * - Idempotent category provisioning (no duplicates).
 * - Safe TenantConfig creation (preserves owner custom settings unless overwrite requested).
 * - Multi-location/warehouses strictly disabled by default (enableWarehouses: false).
 * - Default Main Shop location provisioned.
 */
export async function provisionTenantTemplate({
  tenantId,
  businessType,
  db,
  options = {},
}: ProvisionTenantTemplateParams): Promise<ProvisionTenantTemplateResult> {
  const client = db || prisma;
  const template = getTemplateOrThrow(businessType);

  // 1. Check existing TenantConfig
  const existingConfig = await client.tenantConfig.findUnique({
    where: { tenantId },
  });

  let tenantConfig: any;

  if (existingConfig && !options.overwriteConfig) {
    // Preserve owner-customized settings
    tenantConfig = existingConfig;
  } else {
    // Construct default or customized config from template & options
    const activeAttributes = options.activeAttributes || template.attributes.map((attr) => attr.key);
    const invoiceSettingsJson = JSON.stringify(options.invoiceSettings || template.defaultInvoiceSettings);
    const dashboardCardsJson = JSON.stringify(options.dashboardCards || template.defaultDashboardCards);
    const enableWarehouses = Boolean(options.enableWarehouses);

    const configData = {
      tenantId,
      businessType: template.id,
      version: 1,
      enablePos: template.featureFlags.enablePos,
      enableWarehouses,
      enableSerialImei: template.featureFlags.enableSerialImei,
      enableMatrixVariant: template.featureFlags.enableMatrixVariant,
      enableCreditLimit: template.featureFlags.enableCreditLimit,
      activeAttributes,
      invoiceSettingsJson,
      dashboardCardsJson,
      onboardingStep: options.onboardingStep ?? (options.onboardingCompleted ? 8 : 1),
      onboardingCompleted: options.onboardingCompleted ?? false,
      onboardingDraftJson: options.onboardingDraft ? JSON.stringify(options.onboardingDraft) : null,
    };

    if (existingConfig && options.overwriteConfig) {
      tenantConfig = await client.tenantConfig.update({
        where: { tenantId },
        data: configData,
      });
    } else {
      tenantConfig = await client.tenantConfig.create({
        data: configData,
      });
    }
  }

  // 2. Provision template categories idempotently
  const existingCategories = await client.category.findMany({
    where: { tenantId },
    select: { name: true },
  });

  const existingNameSet = new Set(
    existingCategories.map((c: { name: string }) => c.name.trim().toLowerCase())
  );

  const categoriesCreated: string[] = [];
  const targetCategories = options.customCategories && options.customCategories.length > 0
    ? options.customCategories.map((name) => ({ name, code: null }))
    : template.categories;

  for (const catDef of targetCategories) {
    if (!existingNameSet.has(catDef.name.trim().toLowerCase())) {
      await client.category.create({
        data: {
          tenantId,
          name: catDef.name,
          code: ("code" in catDef ? catDef.code : null) || null,
        },
      });
      categoriesCreated.push(catDef.name);
      existingNameSet.add(catDef.name.trim().toLowerCase());
    }
  }

  // 3. Provision Default Main Shop Location (Section 5)
  let defaultLocationCreated = false;
  if (options.createDefaultLocation !== false) {
    const locResult = await provisionDefaultLocation(tenantId, client);
    defaultLocationCreated = locResult.created;
  }

  // 4. Optional Warehouse Provisioning (when owner explicitly enables warehouse)
  let warehouseLocationCreated = false;
  if (options.enableWarehouses) {
    const warehouseName = options.warehouseName?.trim() || "Main Warehouse";
    const existingWarehouse = await client.inventoryLocation.findFirst({
      where: { tenantId, name: warehouseName },
    });
    if (!existingWarehouse) {
      await client.inventoryLocation.create({
        data: {
          tenantId,
          name: warehouseName,
          code: "WH-01",
          isDefault: false,
          isActive: true,
        },
      });
      warehouseLocationCreated = true;
    }
  }

  return {
    tenantConfig,
    template,
    categoriesCreated,
    existingCategoriesCount: existingCategories.length,
    defaultLocationCreated,
    warehouseLocationCreated,
  };
}

/**
 * Validates a tenant's template configuration.
 */
export async function validateTenantTemplateConfig(
  tenantId: string,
  db?: any
): Promise<TemplateValidationResult> {
  const client = db || prisma;
  const errors: string[] = [];

  const config = await client.tenantConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    return {
      valid: false,
      errors: [`No TenantConfig found for tenantId '${tenantId}'`],
    };
  }

  const template = resolveTemplate(config.businessType);
  if (!template) {
    errors.push(`Configured businessType '${config.businessType}' does not match any valid template.`);
  }

  if (typeof config.enableWarehouses !== "boolean") {
    errors.push("Invalid enableWarehouses flag.");
  }

  if (!Array.isArray(config.activeAttributes)) {
    errors.push("Invalid activeAttributes: expected array of string keys.");
  }

  return {
    valid: errors.length === 0,
    errors,
    config,
    template,
  };
}

/**
 * Saves draft onboarding progress so users can leave and resume seamlessly.
 */
export async function saveOnboardingDraft({
  tenantId,
  step,
  draftData,
  businessType,
  db,
}: {
  tenantId: string;
  step: number;
  draftData: any;
  businessType?: string;
  db?: any;
}) {
  const client = db || prisma;
  const existingConfig = await client.tenantConfig.findUnique({
    where: { tenantId },
  });

  const bType = businessType || existingConfig?.businessType || "general";
  const draftJson = JSON.stringify(draftData);

  if (existingConfig) {
    return await client.tenantConfig.update({
      where: { tenantId },
      data: {
        businessType: bType,
        onboardingStep: step,
        onboardingDraftJson: draftJson,
      },
    });
  }

  return await client.tenantConfig.create({
    data: {
      tenantId,
      businessType: bType,
      version: 1,
      enablePos: true,
      enableWarehouses: false,
      enableSerialImei: false,
      enableMatrixVariant: false,
      enableCreditLimit: false,
      activeAttributes: [],
      onboardingStep: step,
      onboardingCompleted: false,
      onboardingDraftJson: draftJson,
    },
  });
}

/**
 * Retrieves the complete onboarding state for a tenant:
 * current profile, config, draft progress, locations, categories, and all available templates.
 */
export async function getOnboardingState(tenantId: string, db?: any) {
  const client = db || prisma;

  const [tenant, config, locations, categories] = await Promise.all([
    client.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        tradeName: true,
        legalName: true,
        gstin: true,
        stateCode: true,
        phone: true,
        email: true,
        address: true,
        invoicePrefix: true,
        currency: true,
      },
    }),
    client.tenantConfig.findUnique({
      where: { tenantId },
    }),
    client.inventoryLocation.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true, isDefault: true, isActive: true },
    }),
    client.category.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true },
    }),
  ]);

  let draft: any = null;
  if (config?.onboardingDraftJson) {
    try {
      draft = JSON.parse(config.onboardingDraftJson);
    } catch {
      draft = null;
    }
  }

  return {
    tenant,
    config,
    locations,
    categories,
    draft,
    onboardingStep: config?.onboardingStep || 1,
    onboardingCompleted: Boolean(config?.onboardingCompleted),
    templates: getAllTemplates(),
  };
}
