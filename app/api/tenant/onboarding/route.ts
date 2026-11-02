import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import {
  getOnboardingState,
  saveOnboardingDraft,
  provisionTenantTemplate,
  getTemplateOrThrow,
} from "@/lib/templates/service";

const saveDraftSchema = z.object({
  action: z.literal("save_draft"),
  step: z.number().int().min(1).max(8),
  businessType: z.string().optional(),
  draftData: z.record(z.any()),
});

const completeOnboardingSchema = z.object({
  action: z.literal("complete").optional(),
  businessType: z.string().min(2, "Business template selection is required"),
  // Step 2 details
  tradeName: z.string().min(2, "Business name must be at least 2 characters"),
  legalName: z.string().optional(),
  gstin: z.string().optional().nullable().or(z.literal("")),
  stateCode: z.string().length(2, "Valid 2-digit state code required").optional(),
  phone: z.string().min(10, "Valid phone number required").optional(),
  email: z.string().email("Valid email required").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  // Step 3 & 4 details
  enableWarehouses: z.boolean().default(false),
  warehouseName: z.string().optional(),
  allowNegativeStock: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  activeAttributes: z.array(z.string()).optional(),
  // Step 5 details
  invoicePrefix: z.string().min(1).max(10).optional(),
  printFormat: z.enum(["A4", "THERMAL_3INCH"]).optional(),
  showHsn: z.boolean().optional(),
  showDiscount: z.boolean().optional(),
  showBarcode: z.boolean().optional(),
  bankDetails: z.string().optional(),
  upiId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);

    if (context.tenantId === "demo-tenant-id") {
      return NextResponse.json({
        success: true,
        onboardingStep: 1,
        onboardingCompleted: true,
        tenant: {
          id: "demo-tenant-id",
          tradeName: "Universal Enterprises (Demo)",
        },
      });
    }

    const state = await getOnboardingState(context.tenantId, prisma);

    return NextResponse.json({
      success: true,
      ...state,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load onboarding state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const body = await req.json();

    // Check if this is a draft save request
    if (body.action === "save_draft") {
      const draft = saveDraftSchema.parse(body);
      await saveOnboardingDraft({
        tenantId: context.tenantId,
        step: draft.step,
        draftData: draft.draftData,
        businessType: draft.businessType,
        db: prisma,
      });

      return NextResponse.json({
        success: true,
        message: `Step ${draft.step} progress saved successfully`,
        step: draft.step,
      });
    }

    // Otherwise, execute Step 8 Finalization & Tenant Configuration
    const validated = completeOnboardingSchema.parse(body);

    // Validate that the business template exists
    const template = getTemplateOrThrow(validated.businessType);

    // 1. Update Tenant core profile
    await prisma.tenant.update({
      where: { id: context.tenantId },
      data: {
        tradeName: validated.tradeName,
        legalName: validated.legalName || validated.tradeName,
        gstin: validated.gstin?.trim() ? validated.gstin.trim().toUpperCase() : null,
        stateCode: validated.stateCode || "09",
        phone: validated.phone || undefined,
        email: validated.email?.trim() || undefined,
        address: validated.address?.trim() || null,
        invoicePrefix: validated.invoicePrefix?.trim() || "INV-",
        allowNegativeStock: validated.allowNegativeStock ?? false,
      },
    });

    // 2. Prepare custom invoice settings
    const invoiceSettings = {
      ...template.defaultInvoiceSettings,
      printFormat: validated.printFormat || template.defaultInvoiceSettings.printFormat,
      showHsn: validated.showHsn ?? template.defaultInvoiceSettings.showHsn,
      showDiscount: validated.showDiscount ?? template.defaultInvoiceSettings.showDiscount,
      showBarcode: validated.showBarcode ?? template.defaultInvoiceSettings.showBarcode,
      bankDetails: validated.bankDetails || undefined,
      upiId: validated.upiId || undefined,
    };

    // 3. Provision Template, Locations, Categories and Configuration
    const provisionResult = await provisionTenantTemplate({
      tenantId: context.tenantId,
      businessType: template.id,
      db: prisma,
      options: {
        overwriteConfig: true,
        enableWarehouses: validated.enableWarehouses,
        warehouseName: validated.warehouseName,
        customCategories: validated.categories,
        activeAttributes: validated.activeAttributes,
        invoiceSettings,
        onboardingCompleted: true,
        onboardingStep: 8,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully configured ${template.name} workspace!`,
      config: provisionResult.tenantConfig,
      template: provisionResult.template,
      categoriesCreated: provisionResult.categoriesCreated,
      defaultLocationCreated: provisionResult.defaultLocationCreated,
      warehouseLocationCreated: provisionResult.warehouseLocationCreated,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to process onboarding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
