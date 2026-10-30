import prisma, { runInTransaction } from "@/lib/db/prisma";
import { checkPlanLimit } from "@/lib/billing/service";
import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
  getIndianFinancialYear,
  getStateNameByCode,
  convertNumberToWordsINR,
  InvoiceItemCalculationResult,
} from "@/lib/finance/decimal";
import { processStockDeductionFromSale, processStockReturn } from "@/lib/inventory/service";
import { CrossTenantReferenceError, CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";
import {
  postSalesInvoiceAccounting,
  postCustomerReceiptAccounting,
} from "@/lib/accounting/service";

export interface CreateInvoiceItemInput {
  variantId: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  isTaxInclusive?: boolean;
}

export interface CreateSalesInvoiceParams {
  tenantId: string;
  userId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  customerStateCode?: string; // e.g. "09"
  billingAddress?: string;
  shippingAddress?: string;
  placeOfSupply?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  items: CreateInvoiceItemInput[];
  additionalDiscount?: number;
  paidAmount?: number;
  paymentMode?: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT" | "SPLIT";
  notes?: string;
  status?: "DRAFT" | "FINALIZED";
  idempotencyKey?: string;
}

export interface CancelInvoiceParams {
  tenantId: string;
  invoiceId: string;
  cancelReason: string;
  userId: string;
}

export interface CreditNoteItemInput {
  variantId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateCreditNoteParams {
  tenantId: string;
  invoiceId: string;
  reason: string;
  items: CreditNoteItemInput[];
  userId: string;
}

/**
 * Atomically generates the next sequential invoice number per tenant, financial year, and series type.
 */
export async function getNextSequentialNumber(
  tenantId: string,
  seriesType: string = "TAX_INVOICE",
  fiscalYear: string = getIndianFinancialYear(),
  defaultPrefix: string = "INV-",
  client: any = prisma
): Promise<string> {
  const shortFy = fiscalYear.replace("-", ""); // e.g. "2026-27" -> "202627" or "2627"
  const fyPrefix = `${shortFy.slice(2, 4)}${shortFy.slice(4)}`; // e.g. "2627"

  // Atomically find or create sequence
  let seq = await client.invoiceSequence.findUnique({
    where: {
      tenantId_fiscalYear_seriesType: {
        tenantId,
        fiscalYear,
        seriesType,
      },
    },
  });

  let curNum = 1;

  if (seq) {
    curNum = seq.nextNumber;
    await client.invoiceSequence.update({
      where: { id: seq.id },
      data: { nextNumber: curNum + 1 },
    });
  } else {
    await client.invoiceSequence.create({
      data: {
        tenantId,
        fiscalYear,
        seriesType,
        prefix: defaultPrefix,
        nextNumber: 2,
      },
    });
    curNum = 1;
  }

  const prefix = seq?.prefix || defaultPrefix;
  return `${prefix}${fyPrefix}-${String(curNum).padStart(4, "0")}`;
}

/**
 * Creates, prices, validates, and stores a sales invoice.
 * Supports tax-inclusive & exclusive line items, automatic POS detection,
 * atomic stock deduction on finalization, and idempotency protection against duplicate requests.
 */
export async function createSalesInvoice(
  params: CreateSalesInvoiceParams,
  client: any = prisma
) {
  const {
    tenantId,
    userId,
    customerId,
    customerName,
    customerPhone,
    customerGstin,
    customerStateCode,
    billingAddress,
    shippingAddress,
    placeOfSupply,
    invoiceDate = new Date(),
    dueDate,
    items,
    additionalDiscount = 0,
    paidAmount = 0,
    paymentMode = "CASH",
    notes,
    status = "FINALIZED",
    idempotencyKey,
  } = params;

  if (!items || items.length === 0) {
    throw new Error("Cannot create invoice without line items");
  }

  // 1. Check idempotency if key provided
  if (idempotencyKey) {
    const existing = await client.salesInvoice.findFirst({
      where: { tenantId, idempotencyKey },
      include: { items: true, customer: true },
    });
    if (existing) {
      return { isDuplicate: true, invoice: existing };
    }
  }

  // 1.5. Server-side Commercial Plan Quota & Subscription Status Enforcement
  if (client.subscriptionPlan && client.subscription) {
    await checkPlanLimit(tenantId, "INVOICE_CREATION", client);
  }

  // 2. Fetch tenant profile to inspect GST status and state code
  const tenant = await client.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    throw new CrossTenantAccessDeniedError(`Tenant '${tenantId}' does not exist`);
  }

  const isTenantGstRegistered = Boolean(tenant.gstin && tenant.gstin.trim().length === 15);
  const tenantState = (tenant.stateCode || "09").padStart(2, "0");

  // Determine Customer State Code & Place of Supply
  let effectiveCustomerState = customerStateCode
    ? customerStateCode.padStart(2, "0")
    : tenantState;

  if (customerGstin && customerGstin.trim().length >= 2) {
    effectiveCustomerState = customerGstin.trim().slice(0, 2);
  }

  const isInterState = isTenantGstRegistered && effectiveCustomerState !== tenantState;

  // Determine Document Type & Series
  // If unregistered: Bill of Supply / Retail Bill (Prefix: BOS- or RET-)
  // If registered: B2B Tax Invoice (if customer has GSTIN) or B2C Retail Bill (if B2C)
  const isB2B = Boolean(customerGstin && customerGstin.trim().length === 15);
  const seriesType = isTenantGstRegistered
    ? isB2B
      ? "TAX_INVOICE"
      : "RETAIL_BILL"
    : "BILL_OF_SUPPLY";

  const defaultPrefix = isTenantGstRegistered ? (isB2B ? "INV-" : "RET-") : "BOS-";

  // Execute entire invoice creation & stock deduction inside transaction
  return await runInTransaction(client, async (tx: any) => {
    // Generate sequential number
    const invoiceNumber = await getNextSequentialNumber(
      tenantId,
      seriesType,
      getIndianFinancialYear(invoiceDate),
      defaultPrefix,
      tx
    );

    // Fetch and snapshot line items
    const processedItems: any[] = [];
    const calculatedItemsForSummary: InvoiceItemCalculationResult[] = [];
    const stockDeductionItems: Array<{ variantId: string; quantity: number }> = [];

    for (const itemInput of items) {
      const variant = await tx.productVariant.findFirst({
        where: { id: itemInput.variantId, tenantId },
        include: { product: true },
      });

      if (!variant) {
        throw new CrossTenantReferenceError(
          `Product variant '${itemInput.variantId}' not found for tenant`
        );
      }

      // If tenant is unregistered, statutory GST rate applied is 0%
      const effectiveGstRate = isTenantGstRegistered ? variant.gstRate : 0;

      const calcResult = calculateInvoiceItem({
        quantity: itemInput.quantity,
        unitPrice: itemInput.unitPrice,
        discountPercent: itemInput.discountPercent,
        discountAmount: itemInput.discountAmount,
        gstRate: effectiveGstRate,
        isInterState,
        isTaxInclusive: itemInput.isTaxInclusive,
      });

      calculatedItemsForSummary.push(calcResult);

      processedItems.push({
        tenantId,
        variantId: variant.id,
        sku: variant.sku,
        productName: variant.product.name,
        variantName: variant.name,
        hsnCode: variant.product.hsnCode || (effectiveGstRate > 0 ? "6910" : undefined),
        uom: variant.product.uom,
        quantity: itemInput.quantity,
        unitPrice: Number(calcResult.unitPrice),
        isTaxInclusive: Boolean(itemInput.isTaxInclusive),
        discountPercent: Number(calcResult.discountPercent),
        discountAmount: Number(calcResult.discountAmount),
        taxableAmount: Number(calcResult.taxableAmount),
        gstRate: Number(calcResult.gstRate),
        cgstAmount: Number(calcResult.cgstAmount),
        sgstAmount: Number(calcResult.sgstAmount),
        igstAmount: Number(calcResult.igstAmount),
        totalAmount: Number(calcResult.totalAmount),
      });

      stockDeductionItems.push({
        variantId: variant.id,
        quantity: itemInput.quantity,
      });
    }

    // Summarize totals with rounding
    const summary = calculateInvoiceSummary({
      items: calculatedItemsForSummary,
      additionalDiscount,
    });

    const grandTotal = Number(summary.grandTotal);
    const safePaidAmount = Math.min(grandTotal, Math.max(0, paidAmount));
    const balanceAmount = Math.max(0, grandTotal - safePaidAmount);

    const posLabel = placeOfSupply || `${effectiveCustomerState}-${getStateNameByCode(effectiveCustomerState)}`;

    // Create SalesInvoice
    const invoice = await tx.salesInvoice.create({
      data: {
        tenantId,
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone ? customerPhone.trim() : null,
        customerGstin: customerGstin ? customerGstin.trim().toUpperCase() : null,
        customerState: effectiveCustomerState,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || billingAddress || null,
        placeOfSupply: posLabel,
        invoiceNumber,
        invoiceDate,
        dueDate: dueDate || null,
        invoiceType: isB2B ? "B2B_TAX_INVOICE" : "B2C_RETAIL_BILL",
        isInterState,
        subtotal: Number(summary.subtotal),
        discountAmount: Number(summary.totalDiscount),
        taxableAmount: Number(summary.taxableAmount),
        cgstAmount: Number(summary.cgstTotal),
        sgstAmount: Number(summary.sgstTotal),
        igstAmount: Number(summary.igstTotal),
        roundOff: Number(summary.roundOff),
        grandTotal,
        paidAmount: safePaidAmount,
        balanceAmount,
        paymentMode,
        status,
        idempotencyKey: idempotencyKey || null,
        notes: notes || null,
        createdByUserId: userId,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    // If customer has an account and balance remains, update outstandingBalance
    if (customerId && balanceAmount > 0) {
      await tx.customer.update({
        where: { id: customerId },
        data: { outstandingBalance: { increment: balanceAmount } },
      });
    }

    // If invoice is finalized, atomically deduct stock
    if (status === "FINALIZED") {
      await processStockDeductionFromSale(
        {
          tenantId,
          salesInvoiceId: invoice.id,
          items: stockDeductionItems,
          idempotencyKey: idempotencyKey || invoice.id,
        },
        tx
      );

      // Post balanced double-entry accounting records
      if (tx.ledgerAccount) {
        await postSalesInvoiceAccounting(tenantId, invoice, tx);
      }
    }

    // Increment tenant monthly invoice usage
    if (tx.tenantUsage) {
      try {
        await tx.tenantUsage.upsert({
          where: { tenantId },
          create: { tenantId, monthlyInvoiceCount: 1, lastResetDate: new Date() },
          update: { monthlyInvoiceCount: { increment: 1 } },
        });
      } catch {
        // Non-blocking fallback
      }
    }

    return { isDuplicate: false, invoice };
  });
}

/**
 * Cancels a sales invoice with mandatory audit reason.
 * If the invoice was finalized, restores deducted stock.
 */
export async function cancelSalesInvoice(
  params: CancelInvoiceParams,
  client: any = prisma
) {
  const { tenantId, invoiceId, cancelReason, userId } = params;

  if (!cancelReason || cancelReason.trim().length === 0) {
    throw new Error("A cancellation reason is strictly required.");
  }

  return await runInTransaction(client, async (tx: any) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { items: true },
    });

    if (!invoice) {
      throw new CrossTenantAccessDeniedError(`Invoice '${invoiceId}' not found for tenant`);
    }

    if (invoice.status === "CANCELLED") {
      throw new Error(`Invoice #${invoice.invoiceNumber} has already been cancelled.`);
    }

    // If finalized, return items to inventory
    if (invoice.status === "FINALIZED") {
      const returnItems = invoice.items.map((it: any) => ({
        variantId: it.variantId,
        quantity: it.quantity,
        unitCost: it.unitPrice,
      }));

      await processStockReturn(
        {
          tenantId,
          returnId: invoice.id,
          returnType: "SALES_RETURN",
          items: returnItems,
        },
        tx
      );

      // Revert customer outstanding balance if unpaid balance existed
      if (invoice.customerId && invoice.balanceAmount > 0) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { outstandingBalance: { decrement: invoice.balanceAmount } },
        });
      }
    }

    // Update status to CANCELLED
    const updated = await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "CANCELLED",
        cancelReason: cancelReason.trim(),
        cancelledAt: new Date(),
        notes: invoice.notes
          ? `${invoice.notes}\n[Cancelled by user ${userId}: ${cancelReason.trim()}]`
          : `[Cancelled by user ${userId}: ${cancelReason.trim()}]`,
      },
      include: { items: true, customer: true },
    });

    return updated;
  });
}

/**
 * Creates a Credit Note for an invoice return and updates inventory.
 */
export async function createCreditNoteForInvoice(
  params: CreateCreditNoteParams,
  client: any = prisma
) {
  const { tenantId, invoiceId, reason, items, userId } = params;

  return await runInTransaction(client, async (tx: any) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { items: true },
    });

    if (!invoice) {
      throw new CrossTenantAccessDeniedError(`Invoice '${invoiceId}' not found`);
    }

    const fiscalYear = getIndianFinancialYear();
    const creditNoteNumber = await getNextSequentialNumber(
      tenantId,
      "CREDIT_NOTE",
      fiscalYear,
      "CRN-",
      tx
    );

    let subtotal = 0;
    let taxTotal = 0;
    const returnItems: any[] = [];
    const stockItems: any[] = [];

    for (const item of items) {
      const originalLine = invoice.items.find((l: any) => l.variantId === item.variantId);
      const unitPrice = item.unitPrice || originalLine?.unitPrice || 0;
      const gstRate = originalLine?.gstRate || 0;

      const calc = calculateInvoiceItem({
        quantity: item.quantity,
        unitPrice,
        gstRate,
        isInterState: invoice.isInterState,
      });

      subtotal += Number(calc.taxableAmount);
      taxTotal += Number(calc.totalTaxAmount);

      returnItems.push({
        tenantId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        taxAmount: Number(calc.totalTaxAmount),
        totalAmount: Number(calc.totalAmount),
      });

      stockItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        unitCost: unitPrice,
      });
    }

    const grandTotal = Math.round(subtotal + taxTotal);

    // Create SalesReturn record
    const salesReturn = await tx.salesReturn.create({
      data: {
        tenantId,
        returnNumber: creditNoteNumber,
        originalInvoiceId: invoice.id,
        customerId: invoice.customerId,
        reason,
        subtotal,
        taxTotal,
        grandTotal,
        items: {
          create: returnItems,
        },
      },
    });

    // Create CreditDebitNote record
    const creditNote = await tx.creditDebitNote.create({
      data: {
        tenantId,
        originalInvoiceId: invoice.id,
        noteType: "CREDIT_NOTE",
        noteNumber: creditNoteNumber,
        amount: grandTotal,
        reason,
        createdByUserId: userId,
      },
    });

    // Put items back into stock
    await processStockReturn(
      {
        tenantId,
        returnId: creditNote.id,
        returnType: "SALES_RETURN",
        items: stockItems,
      },
      tx
    );

    return { creditNote, salesReturn };
  });
}

/**
 * Searches and lists sales invoices with multi-criteria filters.
 */
export async function listSalesInvoices(
  tenantId: string,
  params: {
    search?: string;
    status?: "ALL" | "DRAFT" | "FINALIZED" | "CANCELLED";
    invoiceType?: "ALL" | "B2B_TAX_INVOICE" | "B2C_RETAIL_BILL";
    paymentStatus?: "ALL" | "PAID" | "PARTIAL" | "UNPAID";
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
    page?: number;
    limit?: number;
  },
  client: any = prisma
) {
  const {
    search,
    status = "ALL",
    invoiceType = "ALL",
    paymentStatus = "ALL",
    startDate,
    endDate,
    customerId,
    page = 1,
    limit = 20,
  } = params;

  const where: any = { tenantId };

  if (status !== "ALL") where.status = status;
  if (invoiceType !== "ALL") where.invoiceType = invoiceType;
  if (customerId) where.customerId = customerId;

  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) where.invoiceDate.gte = startDate;
    if (endDate) where.invoiceDate.lte = endDate;
  }

  if (paymentStatus === "PAID") {
    where.balanceAmount = { lte: 0.01 };
  } else if (paymentStatus === "UNPAID") {
    where.paidAmount = { lte: 0.01 };
  } else if (paymentStatus === "PARTIAL") {
    where.paidAmount = { gt: 0.01 };
    where.balanceAmount = { gt: 0.01 };
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { invoiceNumber: { contains: s, mode: "insensitive" } },
      { customerName: { contains: s, mode: "insensitive" } },
      { customerPhone: { contains: s, mode: "insensitive" } },
      { customerGstin: { contains: s, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [totalCount, invoices] = await Promise.all([
    client.salesInvoice.count({ where }),
    client.salesInvoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { invoiceDate: "desc" },
      include: {
        items: true,
        customer: true,
      },
    }),
  ]);

  return {
    invoices,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

/**
 * Retrieves a single complete invoice with tenant profile for print/PDF generation.
 */
export async function getInvoicePrintDetails(
  tenantId: string,
  invoiceId: string,
  client: any = prisma
) {
  const [invoice, tenant] = await Promise.all([
    client.salesInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: true,
        customer: true,
        creditDebitNotes: true,
      },
    }),
    client.tenant.findUnique({
      where: { id: tenantId },
    }),
  ]);

  if (!invoice) {
    throw new CrossTenantAccessDeniedError(`Invoice '${invoiceId}' not found for tenant`);
  }

  // Increment print count
  await client.salesInvoice.update({
    where: { id: invoice.id },
    data: { printCount: { increment: 1 } },
  });

  const printCopyType =
    invoice.printCount === 0
      ? "ORIGINAL FOR RECIPIENT"
      : invoice.printCount === 1
      ? "DUPLICATE FOR TRANSPORTER"
      : "TRIPLICATE / SUPPLIER COPY";

  const amountInWords = convertNumberToWordsINR(invoice.grandTotal);

  return {
    invoice,
    tenant,
    printCopyType,
    amountInWords,
  };
}

export interface RecordCustomerPaymentParams {
  tenantId: string;
  invoiceId: string;
  amount: number;
  paymentMode: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
  paymentDate?: Date;
  referenceNumber?: string;
  notes?: string;
}

/**
 * Records a customer payment against an unpaid or partially paid sales invoice.
 * Updates invoice paid and balance amounts, decrements customer outstanding balance,
 * and posts Cash Dr / Accounts Receivable Cr journal entries to general ledger.
 */
export async function recordCustomerPayment(
  params: RecordCustomerPaymentParams,
  client: any = prisma
) {
  const {
    tenantId,
    invoiceId,
    amount,
    paymentMode,
    paymentDate = new Date(),
    referenceNumber,
    notes,
  } = params;

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  const runPayment = async (tx: any) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new CrossTenantAccessDeniedError(`Invoice '${invoiceId}' not found for tenant`);
    }

    if (invoice.balanceAmount <= 0.001) {
      throw new Error(`Invoice #${invoice.invoiceNumber} is already fully paid.`);
    }

    const appliedAmount = Math.min(amount, invoice.balanceAmount);
    const newPaidAmount = invoice.paidAmount + appliedAmount;
    const newBalanceAmount = invoice.grandTotal - newPaidAmount;

    const fiscalYear = getIndianFinancialYear(paymentDate);
    const paymentNumber = await getNextSequentialNumber(
      tenantId,
      "CUSTOMER_PAYMENT",
      fiscalYear,
      "RCT-",
      tx
    );

    const payment = await tx.payment.create({
      data: {
        tenantId,
        paymentNumber,
        paymentType: "CUSTOMER_RECEIPT",
        paymentDate,
        customerId: invoice.customerId || null,
        amount: appliedAmount,
        paymentMode,
        referenceNumber: referenceNumber || null,
        notes: notes || `Receipt against invoice #${invoice.invoiceNumber}`,
      },
    });

    await tx.paymentAllocation.create({
      data: {
        tenantId,
        paymentId: payment.id,
        salesInvoiceId: invoice.id,
        amount: appliedAmount,
      },
    });

    await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: Math.max(0, newBalanceAmount),
      },
    });

    if (invoice.customerId) {
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { outstandingBalance: { decrement: appliedAmount } },
      });
    }

    if (tx.ledgerAccount) {
      await postCustomerReceiptAccounting(
        tenantId,
        payment,
        invoice.customerName,
        tx
      );
    }

    return {
      payment,
      appliedAmount,
      remainingInvoiceBalance: Math.max(0, newBalanceAmount),
    };
  };

  return await runInTransaction(client, runPayment);
}
