import prisma from "@/lib/db/prisma";
import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
  getIndianFinancialYear,
  InvoiceItemCalculationResult,
} from "@/lib/finance/decimal";
import { getNextSequentialNumber } from "@/lib/invoices/service";
import { processStockReceiptFromPurchase, processStockReturn } from "@/lib/inventory/service";
import { CrossTenantReferenceError, CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";
import {
  postPurchaseInvoiceAccounting,
  postSupplierPaymentAccounting,
} from "@/lib/accounting/service";

export interface CreateSupplierParams {
  tenantId: string;
  name: string;
  companyName?: string;
  gstin?: string;
  phone: string;
  email?: string;
  address?: string;
  stateCode?: string; // e.g. "09"
  openingBalance?: number;
}

export interface PurchaseItemInput {
  variantId: string;
  quantity: number;
  unitCost: number;
  discountPercent?: number;
  discountAmount?: number;
  gstRate?: number;
  supplierItemCode?: string;
}

export interface CreatePurchaseInvoiceParams {
  tenantId: string;
  userId: string;
  supplierId: string;
  invoiceNumber: string; // Vendor's bill number
  invoiceDate: Date;
  dueDate?: Date;
  items: PurchaseItemInput[];
  freightAmount?: number;
  additionalDiscount?: number;
  paidAmount?: number;
  paymentMode?: "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE";
  paymentReference?: string;
  notes?: string;
}

export interface RecordSupplierPaymentParams {
  tenantId: string;
  userId: string;
  supplierId: string;
  purchaseInvoiceId?: string; // If null, auto-allocates to oldest outstanding bills
  amount: number;
  paymentDate?: Date;
  paymentMode: "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE";
  referenceNumber?: string;
  notes?: string;
}

export interface CreatePurchaseReturnParams {
  tenantId: string;
  userId: string;
  purchaseInvoiceId: string;
  reason: string;
  items: Array<{
    variantId: string;
    quantity: number;
    unitCost?: number;
  }>;
}

export interface CancelPurchaseInvoiceParams {
  tenantId: string;
  userId: string;
  purchaseInvoiceId: string;
  cancelReason: string;
}

/**
 * Creates a supplier record scoped strictly to the authenticated tenant.
 */
export async function createSupplier(params: CreateSupplierParams, client: any = prisma) {
  const { tenantId, name, companyName, gstin, phone, email, address, stateCode = "09", openingBalance = 0 } = params;

  return await client.supplier.create({
    data: {
      tenantId,
      name: name.trim(),
      companyName: companyName ? companyName.trim() : null,
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      phone: phone.trim(),
      email: email ? email.trim() : null,
      address: address ? address.trim() : null,
      stateCode: stateCode.padStart(2, "0"),
      balance: openingBalance,
    },
  });
}

/**
 * Lists suppliers for a tenant with balance, contact, and search filters.
 */
export async function listSuppliers(
  tenantId: string,
  params: { search?: string; page?: number; limit?: number },
  client: any = prisma
) {
  const { search, page = 1, limit = 50 } = params;
  const where: any = { tenantId };

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { companyName: { contains: s, mode: "insensitive" } },
      { phone: { contains: s, mode: "insensitive" } },
      { gstin: { contains: s, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [totalCount, suppliers] = await Promise.all([
    client.supplier.count({ where }),
    client.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    }),
  ]);

  return {
    suppliers,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

/**
 * Creates and records a purchase invoice:
 * - Prevents duplicate supplier bill numbers for the same vendor.
 * - Computes GST (CGST/SGST vs IGST) based on supplier state.
 * - Atomically increments stock and records purchase movements.
 * - Updates SupplierProductPrice table with latest cost.
 * - Updates supplier's running balance and handles initial payments.
 */
export async function createPurchaseInvoice(
  params: CreatePurchaseInvoiceParams,
  client: any = prisma
) {
  const {
    tenantId,
    userId,
    supplierId,
    invoiceNumber,
    invoiceDate,
    dueDate,
    items,
    freightAmount = 0,
    additionalDiscount = 0,
    paidAmount = 0,
    paymentMode = "BANK_TRANSFER",
    paymentReference,
    notes,
  } = params;

  if (!items || items.length === 0) {
    throw new Error("Purchase invoice must contain at least one line item");
  }

  return await client.$transaction(async (tx: any) => {
    // 1. Validate Supplier & Tenant
    const [supplier, tenant] = await Promise.all([
      tx.supplier.findFirst({ where: { id: supplierId, tenantId } }),
      tx.tenant.findUnique({ where: { id: tenantId } }),
    ]);

    if (!supplier) {
      throw new CrossTenantReferenceError(`Supplier '${supplierId}' not found for tenant`);
    }
    if (!tenant) {
      throw new CrossTenantAccessDeniedError(`Tenant '${tenantId}' not found`);
    }

    // 2. Prevent duplicate vendor bills
    const existing = await tx.purchaseInvoice.findUnique({
      where: {
        tenantId_supplierId_invoiceNumber: {
          tenantId,
          supplierId,
          invoiceNumber: invoiceNumber.trim(),
        },
      },
    });

    if (existing) {
      throw new Error(
        `Duplicate supplier bill: Bill #${invoiceNumber} has already been entered for supplier '${supplier.name}' on ${new Date(existing.invoiceDate).toLocaleDateString()}.`
      );
    }

    // 3. Determine Tax Split (Inter-State vs Intra-State)
    const tenantState = (tenant.stateCode || "09").padStart(2, "0");
    const supplierState = (supplier.stateCode || "09").padStart(2, "0");
    const isInterState = tenantState !== supplierState;

    // 4. Calculate line items
    const processedItems: any[] = [];
    const calculatedItemsForSummary: InvoiceItemCalculationResult[] = [];
    const stockReceiptItems: Array<{
      variantId: string;
      quantity: number;
      purchasePrice: number;
      supplierItemCode?: string;
    }> = [];

    for (const it of items) {
      const variant = await tx.productVariant.findFirst({
        where: { id: it.variantId, tenantId },
        include: { product: true },
      });

      if (!variant) {
        throw new CrossTenantReferenceError(`Variant '${it.variantId}' not found under tenant`);
      }

      const rate = it.gstRate !== undefined ? it.gstRate : variant.gstRate;

      const calc = calculateInvoiceItem({
        quantity: it.quantity,
        unitPrice: it.unitCost,
        discountPercent: it.discountPercent,
        discountAmount: it.discountAmount,
        gstRate: rate,
        isInterState,
      });

      calculatedItemsForSummary.push(calc);

      processedItems.push({
        tenantId,
        variantId: variant.id,
        sku: variant.sku,
        productName: variant.product.name,
        variantName: variant.name,
        quantity: it.quantity,
        unitCost: it.unitCost,
        discountPercent: Number(calc.discountPercent),
        discountAmount: Number(calc.discountAmount),
        taxableAmount: Number(calc.taxableAmount),
        gstRate: Number(calc.gstRate),
        cgstAmount: Number(calc.cgstAmount),
        sgstAmount: Number(calc.sgstAmount),
        igstAmount: Number(calc.igstAmount),
        taxAmount: Number(calc.totalTaxAmount),
        totalAmount: Number(calc.totalAmount),
      });

      stockReceiptItems.push({
        variantId: variant.id,
        quantity: it.quantity,
        purchasePrice: it.unitCost,
        supplierItemCode: it.supplierItemCode,
      });
    }

    // 5. Aggregate summary with freight
    const summary = calculateInvoiceSummary({
      items: calculatedItemsForSummary,
      additionalDiscount,
    });

    const rawTotalWithFreight = Number(summary.grandTotal) + Math.max(0, freightAmount);
    const grandTotal = Math.round(rawTotalWithFreight);
    const roundOff = grandTotal - rawTotalWithFreight;

    const safePaidAmount = Math.min(grandTotal, Math.max(0, paidAmount));
    const balanceAmount = grandTotal - safePaidAmount;
    const paymentStatus = balanceAmount <= 0.01 ? "PAID" : safePaidAmount > 0 ? "PARTIALLY_PAID" : "UNPAID";

    // 6. Create PurchaseInvoice
    const invoice = await tx.purchaseInvoice.create({
      data: {
        tenantId,
        supplierId,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate: dueDate || null,
        isInterState,
        subtotal: Number(summary.subtotal),
        discountAmount: Number(summary.totalDiscount),
        taxableAmount: Number(summary.taxableAmount),
        cgstAmount: Number(summary.cgstTotal),
        sgstAmount: Number(summary.sgstTotal),
        igstAmount: Number(summary.igstTotal),
        taxTotal: Number(summary.totalTax),
        freightAmount,
        roundOff,
        grandTotal,
        paidAmount: safePaidAmount,
        balanceAmount,
        paymentStatus,
        status: "RECEIVED",
        notes: notes ? `${notes} (Entered by user: ${userId})` : `Entered by user: ${userId}`,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: true,
        supplier: true,
      },
    });

    // 7. Update Supplier Outstanding Balance
    if (balanceAmount > 0) {
      await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: { increment: balanceAmount } },
      });
    }

    // 8. If initial payment provided, record Payment and Allocation
    if (safePaidAmount > 0) {
      const fiscalYear = getIndianFinancialYear();
      const paymentNumber = await getNextSequentialNumber(
        tenantId,
        "SUPPLIER_PAYMENT",
        fiscalYear,
        "PAY-",
        tx
      );

      const payment = await tx.payment.create({
        data: {
          tenantId,
          paymentNumber,
          paymentType: "SUPPLIER_PAYMENT",
          paymentDate: invoiceDate,
          supplierId,
          amount: safePaidAmount,
          paymentMode,
          referenceNumber: paymentReference || `Against Bill #${invoiceNumber}`,
          notes: `Initial payment on purchase bill #${invoiceNumber}`,
        },
      });

      await tx.paymentAllocation.create({
        data: {
          tenantId,
          paymentId: payment.id,
          purchaseInvoiceId: invoice.id,
          amount: safePaidAmount,
        },
      });
    }

    // 9. Atomic Stock Receipt & Supplier Product Price Sync
    await processStockReceiptFromPurchase(
      {
        tenantId,
        purchaseInvoiceId: invoice.id,
        supplierId,
        items: stockReceiptItems,
      },
      tx
    );

    // 10. Post double-entry accounting records
    if (tx.ledgerAccount) {
      await postPurchaseInvoiceAccounting(tenantId, invoice, tx);
      if (safePaidAmount > 0) {
        await postSupplierPaymentAccounting(
          tenantId,
          {
            amount: safePaidAmount,
            paymentMode,
            paymentDate: invoiceDate,
            id: invoice.id,
          },
          supplier.name,
          tx
        );
      }
    }

    return invoice;
  });
}

/**
 * Records a supplier payment and allocates it against outstanding purchase bills.
 */
export async function recordSupplierPayment(
  params: RecordSupplierPaymentParams,
  client: any = prisma
) {
  const {
    tenantId,
    supplierId,
    purchaseInvoiceId,
    amount,
    paymentDate = new Date(),
    paymentMode,
    referenceNumber,
    notes,
  } = params;

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  return await client.$transaction(async (tx: any) => {
    const supplier = await tx.supplier.findFirst({
      where: { id: supplierId, tenantId },
    });

    if (!supplier) {
      throw new CrossTenantReferenceError(`Supplier '${supplierId}' not found for tenant`);
    }

    const fiscalYear = getIndianFinancialYear();
    const paymentNumber = await getNextSequentialNumber(
      tenantId,
      "SUPPLIER_PAYMENT",
      fiscalYear,
      "PAY-",
      tx
    );

    const payment = await tx.payment.create({
      data: {
        tenantId,
        paymentNumber,
        paymentType: "SUPPLIER_PAYMENT",
        paymentDate,
        supplierId,
        amount,
        paymentMode,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
      },
    });

    let remainingAmountToAllocate = amount;

    // Allocate to specific bill or FIFO across outstanding bills
    const targetBills = purchaseInvoiceId
      ? await tx.purchaseInvoice.findMany({
          where: { id: purchaseInvoiceId, tenantId, supplierId },
        })
      : await tx.purchaseInvoice.findMany({
          where: {
            tenantId,
            supplierId,
            status: "RECEIVED",
            balanceAmount: { gt: 0.01 },
          },
          orderBy: { invoiceDate: "asc" },
        });

    for (const bill of targetBills) {
      if (remainingAmountToAllocate <= 0) break;

      const allocation = Math.min(bill.balanceAmount, remainingAmountToAllocate);
      const newBalance = bill.balanceAmount - allocation;
      const newPaid = bill.paidAmount + allocation;
      const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIALLY_PAID";

      await tx.purchaseInvoice.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaid,
          balanceAmount: newBalance,
          paymentStatus: newStatus,
        },
      });

      await tx.paymentAllocation.create({
        data: {
          tenantId,
          paymentId: payment.id,
          purchaseInvoiceId: bill.id,
          amount: allocation,
        },
      });

      remainingAmountToAllocate -= allocation;
    }

    // Decrement supplier outstanding balance
    await tx.supplier.update({
      where: { id: supplierId },
      data: { balance: { decrement: amount } },
    });

    // Post double-entry supplier payment
    if (tx.ledgerAccount) {
      await postSupplierPaymentAccounting(
        tenantId,
        payment,
        supplier.name,
        tx
      );
    }

    return payment;
  });
}

/**
 * Creates a purchase return and issues a Debit Note (DRN-) against the vendor.
 * Decrements stock via RETURN_OUT and adjusts vendor balance.
 */
export async function createPurchaseReturn(
  params: CreatePurchaseReturnParams,
  client: any = prisma
) {
  const { tenantId, userId, purchaseInvoiceId, reason, items } = params;

  if (!items || items.length === 0) {
    throw new Error("Must select at least one item to return");
  }

  return await client.$transaction(async (tx: any) => {
    const invoice = await tx.purchaseInvoice.findFirst({
      where: { id: purchaseInvoiceId, tenantId },
      include: { items: true, supplier: true },
    });

    if (!invoice) {
      throw new CrossTenantAccessDeniedError(`Purchase bill '${purchaseInvoiceId}' not found`);
    }

    const fiscalYear = getIndianFinancialYear();
    const debitNoteNumber = await getNextSequentialNumber(
      tenantId,
      "DEBIT_NOTE",
      fiscalYear,
      "DBN-",
      tx
    );

    let subtotal = 0;
    let taxTotal = 0;
    const returnItems: any[] = [];
    const stockItems: any[] = [];

    for (const it of items) {
      const originalLine = invoice.items.find((l: any) => l.variantId === it.variantId);
      const unitCost = it.unitCost || originalLine?.unitCost || 0;
      const gstRate = originalLine?.gstRate || 0;

      const calc = calculateInvoiceItem({
        quantity: it.quantity,
        unitPrice: unitCost,
        gstRate,
        isInterState: invoice.isInterState,
      });

      subtotal += Number(calc.taxableAmount);
      taxTotal += Number(calc.totalTaxAmount);

      returnItems.push({
        tenantId,
        variantId: it.variantId,
        quantity: it.quantity,
        unitCost,
        taxAmount: Number(calc.totalTaxAmount),
        totalAmount: Number(calc.totalAmount),
      });

      stockItems.push({
        variantId: it.variantId,
        quantity: it.quantity,
        unitCost,
      });
    }

    const grandTotal = Math.round(subtotal + taxTotal);

    // 1. Create PurchaseReturn
    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        tenantId,
        returnNumber: debitNoteNumber,
        purchaseInvoiceId: invoice.id,
        supplierId: invoice.supplierId,
        reason,
        subtotal,
        taxTotal,
        grandTotal,
        items: {
          create: returnItems,
        },
      },
    });

    // 2. Create Debit Note record
    const debitNote = await tx.creditDebitNote.create({
      data: {
        tenantId,
        originalPurchaseInvoiceId: invoice.id,
        noteType: "DEBIT_NOTE",
        noteNumber: debitNoteNumber,
        amount: grandTotal,
        reason,
        createdByUserId: userId,
      },
    });

    // 3. Deduct stock (RETURN_OUT)
    await processStockReturn(
      {
        tenantId,
        returnId: debitNote.id,
        returnType: "PURCHASE_RETURN",
        items: stockItems,
      },
      tx
    );

    // 4. Adjust bill balance and supplier balance
    const updatedBillBalance = Math.max(0, invoice.balanceAmount - grandTotal);
    await tx.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        balanceAmount: updatedBillBalance,
        paymentStatus: updatedBillBalance <= 0.01 ? "PAID" : invoice.paymentStatus,
      },
    });

    await tx.supplier.update({
      where: { id: invoice.supplierId },
      data: { balance: { decrement: grandTotal } },
    });

    return { purchaseReturn, debitNote };
  });
}

/**
 * Controlled cancellation of a purchase bill without deleting historical financial records.
 * Reverses received stock (RETURN_OUT) and reverts supplier balance.
 */
export async function cancelPurchaseInvoice(
  params: CancelPurchaseInvoiceParams,
  client: any = prisma
) {
  const { tenantId, userId, purchaseInvoiceId, cancelReason } = params;

  if (!cancelReason || cancelReason.trim().length === 0) {
    throw new Error("A cancellation reason is required");
  }

  return await client.$transaction(async (tx: any) => {
    const invoice = await tx.purchaseInvoice.findFirst({
      where: { id: purchaseInvoiceId, tenantId },
      include: { items: true, supplier: true },
    });

    if (!invoice) {
      throw new CrossTenantAccessDeniedError(`Purchase bill '${purchaseInvoiceId}' not found`);
    }

    if (invoice.status === "CANCELLED") {
      throw new Error(`Purchase invoice #${invoice.invoiceNumber} is already cancelled`);
    }

    // Revert received stock
    const returnItems = invoice.items.map((it: any) => ({
      variantId: it.variantId,
      quantity: it.quantity,
      unitCost: it.unitCost,
    }));

    await processStockReturn(
      {
        tenantId,
        returnId: invoice.id,
        returnType: "PURCHASE_RETURN",
        items: returnItems,
      },
      tx
    );

    // Revert supplier balance if unpaid balance existed
    if (invoice.balanceAmount > 0) {
      await tx.supplier.update({
        where: { id: invoice.supplierId },
        data: { balance: { decrement: invoice.balanceAmount } },
      });
    }

    // Update status to CANCELLED
    const cancelled = await tx.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "CANCELLED",
        cancelReason: cancelReason.trim(),
        cancelledAt: new Date(),
        balanceAmount: 0,
        notes: invoice.notes
          ? `${invoice.notes}\n[Cancelled by user ${userId}: ${cancelReason.trim()}]`
          : `[Cancelled by user ${userId}: ${cancelReason.trim()}]`,
      },
      include: { items: true, supplier: true },
    });

    return cancelled;
  });
}

/**
 * Generates comprehensive chronological statement of account for a supplier.
 */
export async function getSupplierStatement(
  tenantId: string,
  supplierId: string,
  client: any = prisma
) {
  const [supplier, purchases, payments, returns] = await Promise.all([
    client.supplier.findFirst({
      where: { id: supplierId, tenantId },
    }),
    client.purchaseInvoice.findMany({
      where: { supplierId, tenantId, status: "RECEIVED" },
      orderBy: { invoiceDate: "asc" },
      include: { items: true },
    }),
    client.payment.findMany({
      where: { supplierId, tenantId, paymentType: "SUPPLIER_PAYMENT" },
      orderBy: { paymentDate: "asc" },
    }),
    client.purchaseReturn.findMany({
      where: { supplierId, tenantId },
      orderBy: { returnDate: "asc" },
    }),
  ]);

  if (!supplier) {
    throw new CrossTenantAccessDeniedError(`Supplier '${supplierId}' not found`);
  }

  // Merge and sort chronological ledger
  const entries: any[] = [];

  purchases.forEach((p: any) => {
    entries.push({
      date: p.invoiceDate,
      type: "PURCHASE_INVOICE",
      reference: p.invoiceNumber,
      description: `Purchase Bill #${p.invoiceNumber} (${p.items.length} items)`,
      credit: p.grandTotal, // Vendor balance increases
      debit: 0,
    });
  });

  payments.forEach((pay: any) => {
    entries.push({
      date: pay.paymentDate,
      type: "PAYMENT",
      reference: pay.paymentNumber,
      description: `Payment via ${pay.paymentMode}${pay.referenceNumber ? ` (${pay.referenceNumber})` : ""}`,
      credit: 0,
      debit: pay.amount, // Vendor balance decreases
    });
  });

  returns.forEach((r: any) => {
    entries.push({
      date: r.returnDate,
      type: "DEBIT_NOTE",
      reference: r.returnNumber,
      description: `Debit Note #${r.returnNumber} (${r.reason})`,
      credit: 0,
      debit: r.grandTotal, // Vendor balance decreases
    });
  });

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const ledger = entries.map((e) => {
    runningBalance += e.credit - e.debit;
    return {
      ...e,
      balanceAfter: runningBalance,
    };
  });

  return {
    supplier,
    currentBalance: supplier.balance,
    ledger,
    totalPurchases: purchases.reduce((sum: number, p: any) => sum + p.grandTotal, 0),
    totalPayments: payments.reduce((sum: number, pay: any) => sum + pay.amount, 0),
    totalDebitNotes: returns.reduce((sum: number, r: any) => sum + r.grandTotal, 0),
  };
}

/**
 * Searches and paginates purchase invoices.
 */
export async function listPurchaseInvoices(
  tenantId: string,
  params: {
    supplierId?: string;
    search?: string;
    paymentStatus?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
  client: any = prisma
) {
  const { supplierId, search, paymentStatus, status, page = 1, limit = 20 } = params;
  const where: any = { tenantId };

  if (supplierId) where.supplierId = supplierId;
  if (paymentStatus && paymentStatus !== "ALL") where.paymentStatus = paymentStatus;
  if (status && status !== "ALL") where.status = status;

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { invoiceNumber: { contains: s, mode: "insensitive" } },
      { supplier: { name: { contains: s, mode: "insensitive" } } },
      { supplier: { companyName: { contains: s, mode: "insensitive" } } },
    ];
  }

  const skip = (page - 1) * limit;

  const [totalCount, invoices] = await Promise.all([
    client.purchaseInvoice.count({ where }),
    client.purchaseInvoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { invoiceDate: "desc" },
      include: {
        supplier: true,
        items: true,
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
