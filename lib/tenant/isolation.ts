export class CrossTenantAccessDeniedError extends Error {
  constructor(message = "Access Denied: Attempted cross-tenant data access") {
    super(message);
    this.name = "CrossTenantAccessDeniedError";
  }
}

export class CrossTenantReferenceError extends Error {
  constructor(message = "Security Violation: Cannot reference or attach entities belonging to another tenant") {
    super(message);
    this.name = "CrossTenantReferenceError";
  }
}

/**
 * Validates that an entity belongs strictly to the authorized tenant.
 * Throws CrossTenantReferenceError if the entity does not exist or belongs to a different tenant.
 */
export async function validateEntityOwnership(
  prismaClient: any,
  tenantId: string,
  modelName: "customer" | "supplier" | "product" | "productVariant",
  entityId: string
): Promise<void> {
  if (!entityId) return;

  const entity = await prismaClient[modelName].findFirst({
    where: {
      id: entityId,
      tenantId,
    },
    select: { id: true, tenantId: true },
  });

  if (!entity) {
    throw new CrossTenantReferenceError(
      `Cross-tenant violation: ${modelName} ID '${entityId}' does not belong to authorized tenant '${tenantId}'`
    );
  }
}

/**
 * Validates multiple line-item references (e.g. variants) before invoice creation.
 */
export async function validateVariantOwnershipBatch(
  prismaClient: any,
  tenantId: string,
  variantIds: string[]
): Promise<void> {
  if (!variantIds.length) return;

  const variants = await prismaClient.productVariant.findMany({
    where: {
      id: { in: variantIds },
      tenantId,
    },
    select: { id: true },
  });

  if (variants.length !== variantIds.length) {
    throw new CrossTenantReferenceError(
      `Security violation: One or more product variants do not belong to tenant '${tenantId}'`
    );
  }
}

/**
 * Centralized tenant-scoped update helper.
 * Enforces tenant ownership before performing any record modification.
 */
export async function scopedUpdate(
  prismaClient: any,
  modelName: string,
  tenantId: string,
  id: string,
  data: any
): Promise<any> {
  const existing = await prismaClient[modelName].findFirst({
    where: { id, tenantId },
    select: { id: true },
  });

  if (!existing) {
    throw new CrossTenantAccessDeniedError(
      `Cannot modify ${modelName} '${id}': Record not found under tenant '${tenantId}'`
    );
  }

  return prismaClient[modelName].update({
    where: { id },
    data,
  });
}

/**
 * Centralized tenant-scoped delete helper.
 * Enforces tenant ownership before performing any record deletion.
 */
export async function scopedDelete(
  prismaClient: any,
  modelName: string,
  tenantId: string,
  id: string
): Promise<any> {
  const existing = await prismaClient[modelName].findFirst({
    where: { id, tenantId },
    select: { id: true },
  });

  if (!existing) {
    throw new CrossTenantAccessDeniedError(
      `Cannot delete ${modelName} '${id}': Record not found under tenant '${tenantId}'`
    );
  }

  return prismaClient[modelName].delete({
    where: { id },
  });
}

export interface CreateInvoiceLineItemInput {
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

export interface CreateTenantInvoiceInput {
  tenantId: string;
  userId: string;
  customerId?: string;
  customerName: string;
  invoiceNumber: string;
  items: CreateInvoiceLineItemInput[];
  paidAmount: number;
  paymentMode: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT";
}

/**
 * Creates an invoice within an atomic transaction.
 * Strictly verifies all referenced entities (customer, product variants) belong to tenantId.
 * If any entity belongs to another tenant, the transaction aborts with zero side effects.
 */
export async function createTenantScopedInvoice(
  prismaClient: any,
  input: CreateTenantInvoiceInput
): Promise<any> {
  const { tenantId, userId, customerId, customerName, invoiceNumber, items, paidAmount, paymentMode } = input;

  return prismaClient.$transaction(async (tx: any) => {
    // 1. Validate customer ownership if customerId provided
    if (customerId) {
      await validateEntityOwnership(tx, tenantId, "customer", customerId);
    }

    // 2. Validate ALL variant ownerships - abort if even one belongs to another tenant
    const variantIds = items.map((i) => i.variantId);
    await validateVariantOwnershipBatch(tx, tenantId, variantIds);

    // 3. Calculate financial totals
    let subtotal = 0;
    let taxTotal = 0;

    const preparedItems = items.map((line) => {
      const taxable = line.quantity * line.unitPrice;
      const tax = (taxable * line.gstRate) / 100;
      subtotal += taxable;
      taxTotal += tax;

      return {
        tenantId,
        variantId: line.variantId,
        productName: line.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxableAmount: taxable,
        gstRate: line.gstRate,
        cgstAmount: tax / 2,
        sgstAmount: tax / 2,
        igstAmount: 0,
        totalAmount: taxable + tax,
      };
    });

    const grandTotal = Math.round(subtotal + taxTotal);
    const balanceAmount = Math.max(0, grandTotal - paidAmount);

    // 4. Create the Sales Invoice
    const invoice = await tx.salesInvoice.create({
      data: {
        tenantId,
        customerId: customerId || null,
        customerName,
        invoiceNumber,
        subtotal,
        taxableAmount: subtotal,
        cgstAmount: taxTotal / 2,
        sgstAmount: taxTotal / 2,
        igstAmount: 0,
        grandTotal,
        paidAmount,
        balanceAmount,
        paymentMode,
        status: "FINALIZED",
        createdByUserId: userId,
        items: {
          create: preparedItems,
        },
      },
    });

    // 5. Decrement Stock and Record Stock Movements
    for (const line of items) {
      const variant = await tx.productVariant.findFirst({
        where: { id: line.variantId, tenantId },
        select: { id: true, currentStock: true, purchasePrice: true },
      });

      const newBalance = (variant?.currentStock || 0) - line.quantity;

      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { currentStock: newBalance },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          variantId: line.variantId,
          type: "SALE",
          quantity: -line.quantity,
          unitCost: variant?.purchasePrice || 0,
          balanceAfter: newBalance,
          referenceType: "SALES_INVOICE",
          referenceId: invoice.id,
        },
      });
    }

    return invoice;
  });
}

/**
 * Sanitizes administrative audit log payloads, stripping sensitive fields.
 */
export function sanitizeAuditData(data: Record<string, any>): string {
  const sensitiveKeys = [
    "password",
    "passwordHash",
    "token",
    "secret",
    "jwt",
    "cookie",
    "card",
    "cardNumber",
    "cvv",
    "auth",
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      sanitized[key] = JSON.parse(sanitizeAuditData(val));
    } else {
      sanitized[key] = val;
    }
  }

  return JSON.stringify(sanitized);
}
