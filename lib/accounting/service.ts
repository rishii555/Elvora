import prisma from "@/lib/db/prisma";
import { Decimal } from "@/lib/finance/decimal";
import { getIndianFinancialYear } from "@/lib/finance/decimal";
import { getNextSequentialNumber } from "@/lib/invoices/service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export class UnbalancedJournalEntryError extends Error {
  constructor(debits: number, credits: number, difference: number) {
    super(
      `Accounting Invariant Violation: Journal entry does not balance! Total Debits: ₹${debits.toFixed(
        2
      )}, Total Credits: ₹${credits.toFixed(2)}, Discrepancy: ₹${difference.toFixed(2)}. Every posted transaction must balance to zero.`
    );
    this.name = "UnbalancedJournalEntryError";
  }
}

export interface JournalLineInput {
  accountCode: string; // e.g. "1010_CASH", "4010_SALES_REVENUE"
  debit: number;
  credit: number;
  description?: string;
}

export interface PostJournalEntryParams {
  tenantId: string;
  entryDate?: Date;
  narration: string;
  referenceType?: string; // "SALES_INVOICE", "PURCHASE_INVOICE", "PAYMENT", "EXPENSE", "MANUAL"
  referenceId?: string;
  lines: JournalLineInput[];
}

export interface SystemAccountDef {
  code: string;
  name: string;
  type: AccountType;
  category: string;
}

export const SYSTEM_CHART_OF_ACCOUNTS: SystemAccountDef[] = [
  // Assets
  { code: "1010_CASH", name: "Cash on Hand", type: "ASSET", category: "Cash & Cash Equivalents" },
  { code: "1020_BANK", name: "Bank Account (Current/UPI)", type: "ASSET", category: "Cash & Cash Equivalents" },
  { code: "1030_ACCOUNTS_RECEIVABLE", name: "Accounts Receivable (Sundry Debtors)", type: "ASSET", category: "Current Assets" },
  { code: "1040_INVENTORY", name: "Merchandise Inventory Asset", type: "ASSET", category: "Current Assets" },
  { code: "1051_INPUT_CGST", name: "Input CGST (ITC Asset)", type: "ASSET", category: "Tax Credit Assets" },
  { code: "1052_INPUT_SGST", name: "Input SGST (ITC Asset)", type: "ASSET", category: "Tax Credit Assets" },
  { code: "1053_INPUT_IGST", name: "Input IGST (ITC Asset)", type: "ASSET", category: "Tax Credit Assets" },

  // Liabilities
  { code: "2010_ACCOUNTS_PAYABLE", name: "Accounts Payable (Sundry Creditors)", type: "LIABILITY", category: "Current Liabilities" },
  { code: "2021_OUTPUT_CGST", name: "Output CGST Payable", type: "LIABILITY", category: "Current Liabilities" },
  { code: "2022_OUTPUT_SGST", name: "Output SGST Payable", type: "LIABILITY", category: "Current Liabilities" },
  { code: "2023_OUTPUT_IGST", name: "Output IGST Payable", type: "LIABILITY", category: "Current Liabilities" },

  // Equity
  { code: "3010_CAPITAL", name: "Owner's Capital", type: "EQUITY", category: "Owner's Equity" },
  { code: "3020_RETAINED_EARNINGS", name: "Retained Earnings", type: "EQUITY", category: "Owner's Equity" },

  // Revenue
  { code: "4010_SALES_REVENUE", name: "Sales Revenue (Goods)", type: "REVENUE", category: "Operating Revenue" },
  { code: "4020_SERVICE_REVENUE", name: "Service & Installation Revenue", type: "REVENUE", category: "Operating Revenue" },
  { code: "4030_DISCOUNTS_RECEIVED", name: "Discounts & Rebates Received", type: "REVENUE", category: "Other Income" },

  // Expenses
  { code: "5010_COGS", name: "Cost of Goods Sold", type: "EXPENSE", category: "Direct Expenses" },
  { code: "5020_FREIGHT", name: "Freight, Shipping & Cartage", type: "EXPENSE", category: "Operating Expenses" },
  { code: "5030_RENT", name: "Rent & Premises", type: "EXPENSE", category: "Operating Expenses" },
  { code: "5040_SALARIES", name: "Salaries & Wages", type: "EXPENSE", category: "Operating Expenses" },
  { code: "5050_UTILITIES", name: "Electricity & Utilities", type: "EXPENSE", category: "Operating Expenses" },
  { code: "5060_ADMIN", name: "General & Administrative", type: "EXPENSE", category: "Operating Expenses" },
  { code: "5070_DISCOUNTS_ALLOWED", name: "Cash Discounts Allowed", type: "EXPENSE", category: "Operating Expenses" },
  { code: "5090_ROUND_OFF", name: "Invoice Round-Off Adjustments", type: "EXPENSE", category: "Other Expenses" },
];

/**
 * Ensures all system accounts in the Chart of Accounts exist for the tenant.
 */
export async function ensureChartOfAccounts(tenantId: string, client: any = prisma) {
  const existing = await client.ledgerAccount.findMany({
    where: { tenantId },
    select: { code: true },
  });
  const existingSet = new Set(existing.map((a: any) => a.code));

  for (const def of SYSTEM_CHART_OF_ACCOUNTS) {
    if (!existingSet.has(def.code)) {
      await client.ledgerAccount.create({
        data: {
          tenantId,
          code: def.code,
          name: def.name,
          type: def.type,
          category: def.category,
          isSystem: true,
          balance: 0,
        },
      });
    }
  }

  const allAccounts = await client.ledgerAccount.findMany({
    where: { tenantId },
  });

  const accountMap = new Map<string, any>();
  allAccounts.forEach((acc: any) => accountMap.set(acc.code, acc));
  return accountMap;
}

/**
 * Central posting engine for double-entry journal entries.
 * Strictly verifies debits == credits and provides idempotency.
 */
export async function postJournalEntry(
  params: PostJournalEntryParams,
  client: any = prisma
) {
  const { tenantId, entryDate = new Date(), narration, referenceType, referenceId, lines } = params;

  if (!lines || lines.length < 2) {
    throw new Error("A journal entry requires at least two lines (one debit and one credit)");
  }

  // 1. Idempotency check: prevent duplicate posting for same event
  if (referenceType && referenceId) {
    const existing = await client.journalEntry.findFirst({
      where: {
        tenantId,
        referenceType,
        referenceId,
      },
      include: { lines: { include: { account: true } } },
    });
    if (existing) {
      return { isDuplicate: true, journalEntry: existing };
    }
  }

  // 2. Validate double-entry equality invariant (sum(Dr) === sum(Cr))
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  lines.forEach((l) => {
    totalDebit = totalDebit.plus(new Decimal(l.debit || 0));
    totalCredit = totalCredit.plus(new Decimal(l.credit || 0));
  });

  const diff = totalDebit.minus(totalCredit).abs();
  if (diff.greaterThan(0.01)) {
    throw new UnbalancedJournalEntryError(totalDebit.toNumber(), totalCredit.toNumber(), diff.toNumber());
  }

  const executePost = async (tx: any) => {
    const accountMap = await ensureChartOfAccounts(tenantId, tx);

    const fiscalYear = getIndianFinancialYear(entryDate);
    const entryNumber = await getNextSequentialNumber(
      tenantId,
      "JOURNAL_ENTRY",
      fiscalYear,
      "JRN-",
      tx
    );

    const createdLines: any[] = [];

    for (const l of lines) {
      const acc = accountMap.get(l.accountCode);
      if (!acc) {
        throw new Error(`Chart of accounts code '${l.accountCode}' not found`);
      }

      const dr = Math.round((l.debit || 0) * 100) / 100;
      const cr = Math.round((l.credit || 0) * 100) / 100;

      createdLines.push({
        tenantId,
        accountId: acc.id,
        debit: dr,
        credit: cr,
        description: l.description || narration,
      });

      // Update account running balance
      // Asset & Expense: Dr increases, Cr decreases
      // Liability, Equity & Revenue: Cr increases, Dr decreases
      const isDebitNormal = acc.type === "ASSET" || acc.type === "EXPENSE";
      const delta = isDebitNormal ? dr - cr : cr - dr;

      await tx.ledgerAccount.update({
        where: { id: acc.id },
        data: { balance: { increment: delta } },
      });

      // Create individual ledger entry record for audit
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          accountId: acc.id,
          entryDate,
          description: l.description || narration,
          debit: dr,
          credit: cr,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
        },
      });
    }

    const journal = await tx.journalEntry.create({
      data: {
        tenantId,
        entryNumber,
        entryDate,
        narration,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        lines: {
          create: createdLines,
        },
      },
      include: {
        lines: {
          include: { account: true },
        },
      },
    });

    return { isDuplicate: false, journalEntry: journal };
  };

  if (typeof client.$transaction === "function") {
    return await client.$transaction(executePost);
  } else {
    return await executePost(client);
  }
}

/**
 * Posts accounting entries for a finalized sales invoice.
 * Segregates Cash vs Accounts Receivable, Sales Turnover, and Output GST Liabilities.
 */
export async function postSalesInvoiceAccounting(
  tenantId: string,
  invoice: any,
  client: any = prisma
) {
  const isPaid = invoice.paidAmount >= invoice.grandTotal;
  const isPartiallyPaid = invoice.paidAmount > 0 && invoice.paidAmount < invoice.grandTotal;
  const isCashOrUpi = invoice.paymentMode === "CASH" || invoice.paymentMode === "UPI";
  const cashAccountCode = isCashOrUpi ? "1010_CASH" : "1020_BANK";

  const lines: JournalLineInput[] = [];

  // 1. Debits: Cash received and/or Accounts Receivable
  if (isPaid) {
    lines.push({
      accountCode: cashAccountCode,
      debit: invoice.grandTotal,
      credit: 0,
      description: `Immediate counter settlement (${invoice.paymentMode}) for #${invoice.invoiceNumber}`,
    });
  } else if (isPartiallyPaid) {
    lines.push({
      accountCode: cashAccountCode,
      debit: invoice.paidAmount,
      credit: 0,
      description: `Counter receipt (${invoice.paymentMode}) for #${invoice.invoiceNumber}`,
    });
    lines.push({
      accountCode: "1030_ACCOUNTS_RECEIVABLE",
      debit: invoice.balanceAmount,
      credit: 0,
      description: `Credit balance due from ${invoice.customerName} for #${invoice.invoiceNumber}`,
    });
  } else {
    lines.push({
      accountCode: "1030_ACCOUNTS_RECEIVABLE",
      debit: invoice.grandTotal,
      credit: 0,
      description: `Receivable from ${invoice.customerName} for #${invoice.invoiceNumber}`,
    });
  }

  // 2. Credits: Sales Turnover (Taxable Amount)
  lines.push({
    accountCode: "4010_SALES_REVENUE",
    debit: 0,
    credit: invoice.taxableAmount,
    description: `Net sales revenue from #${invoice.invoiceNumber}`,
  });

  // 3. Credits: Output GST Liabilities
  if (invoice.cgstAmount > 0) {
    lines.push({
      accountCode: "2021_OUTPUT_CGST",
      debit: 0,
      credit: invoice.cgstAmount,
      description: `Output CGST collected on #${invoice.invoiceNumber}`,
    });
  }
  if (invoice.sgstAmount > 0) {
    lines.push({
      accountCode: "2022_OUTPUT_SGST",
      debit: 0,
      credit: invoice.sgstAmount,
      description: `Output SGST collected on #${invoice.invoiceNumber}`,
    });
  }
  if (invoice.igstAmount > 0) {
    lines.push({
      accountCode: "2023_OUTPUT_IGST",
      debit: 0,
      credit: invoice.igstAmount,
      description: `Output IGST collected on #${invoice.invoiceNumber}`,
    });
  }

  // 4. Round-off adjustment line
  if (invoice.roundOff && Math.abs(invoice.roundOff) > 0.001) {
    if (invoice.roundOff > 0) {
      // Rounded up: extra income/credit
      lines.push({
        accountCode: "5090_ROUND_OFF",
        debit: 0,
        credit: Math.abs(invoice.roundOff),
        description: `Round-off adjustment on #${invoice.invoiceNumber}`,
      });
    } else {
      // Rounded down: expense/debit
      lines.push({
        accountCode: "5090_ROUND_OFF",
        debit: Math.abs(invoice.roundOff),
        credit: 0,
        description: `Round-off adjustment on #${invoice.invoiceNumber}`,
      });
    }
  }

  return await postJournalEntry(
    {
      tenantId,
      entryDate: invoice.invoiceDate,
      narration: `Sales Invoice #${invoice.invoiceNumber} to ${invoice.customerName}`,
      referenceType: "SALES_INVOICE",
      referenceId: invoice.id,
      lines,
    },
    client
  );
}

/**
 * Posts accounting entries for a customer receipt.
 * Strictly separates realized cash collection from new revenue!
 */
export async function postCustomerReceiptAccounting(
  tenantId: string,
  payment: any,
  customerName: string,
  client: any = prisma
) {
  const isCash = payment.paymentMode === "CASH";
  const cashAccountCode = isCash ? "1010_CASH" : "1020_BANK";

  const lines: JournalLineInput[] = [
    {
      accountCode: cashAccountCode,
      debit: payment.amount,
      credit: 0,
      description: `Cash/Bank received from ${customerName} (${payment.paymentMode})`,
    },
    {
      accountCode: "1030_ACCOUNTS_RECEIVABLE",
      debit: 0,
      credit: payment.amount,
      description: `Reduction of accounts receivable from ${customerName}`,
    },
  ];

  return await postJournalEntry(
    {
      tenantId,
      entryDate: payment.paymentDate,
      narration: `Customer payment receipt #${payment.paymentNumber} from ${customerName}`,
      referenceType: "CUSTOMER_PAYMENT",
      referenceId: payment.id,
      lines,
    },
    client
  );
}

/**
 * Posts accounting entries for a purchase invoice.
 * Records Inventory Asset / COGS, Input Tax Credit (ITC Asset), Freight, and Accounts Payable.
 */
export async function postPurchaseInvoiceAccounting(
  tenantId: string,
  purchase: any,
  client: any = prisma
) {
  const lines: JournalLineInput[] = [];

  // 1. Debits: Inventory Asset (Taxable Amount)
  lines.push({
    accountCode: "1040_INVENTORY",
    debit: purchase.taxableAmount,
    credit: 0,
    description: `Inventory received on bill #${purchase.invoiceNumber}`,
  });

  // 2. Debits: Input Tax Credit (ITC) Assets
  if (purchase.cgstAmount > 0) {
    lines.push({
      accountCode: "1051_INPUT_CGST",
      debit: purchase.cgstAmount,
      credit: 0,
      description: `Input CGST credit on bill #${purchase.invoiceNumber}`,
    });
  }
  if (purchase.sgstAmount > 0) {
    lines.push({
      accountCode: "1052_INPUT_SGST",
      debit: purchase.sgstAmount,
      credit: 0,
      description: `Input SGST credit on bill #${purchase.invoiceNumber}`,
    });
  }
  if (purchase.igstAmount > 0) {
    lines.push({
      accountCode: "1053_INPUT_IGST",
      debit: purchase.igstAmount,
      credit: 0,
      description: `Input IGST credit on bill #${purchase.invoiceNumber}`,
    });
  }

  // 3. Debits: Freight & Shipping
  if (purchase.freightAmount > 0) {
    lines.push({
      accountCode: "5020_FREIGHT",
      debit: purchase.freightAmount,
      credit: 0,
      description: `Inward freight charges on bill #${purchase.invoiceNumber}`,
    });
  }

  // 4. Credits: Accounts Payable (Total amount due to vendor)
  lines.push({
    accountCode: "2010_ACCOUNTS_PAYABLE",
    debit: 0,
    credit: purchase.grandTotal,
    description: `Payable to vendor for bill #${purchase.invoiceNumber}`,
  });

  // 5. Round-off adjustment
  if (purchase.roundOff && Math.abs(purchase.roundOff) > 0.001) {
    if (purchase.roundOff > 0) {
      lines.push({
        accountCode: "5090_ROUND_OFF",
        debit: Math.abs(purchase.roundOff),
        credit: 0,
        description: `Round-off adjustment on bill #${purchase.invoiceNumber}`,
      });
    } else {
      lines.push({
        accountCode: "5090_ROUND_OFF",
        debit: 0,
        credit: Math.abs(purchase.roundOff),
        description: `Round-off adjustment on bill #${purchase.invoiceNumber}`,
      });
    }
  }

  return await postJournalEntry(
    {
      tenantId,
      entryDate: purchase.invoiceDate,
      narration: `Purchase Bill #${purchase.invoiceNumber} from ${purchase.supplier?.name || "Vendor"}`,
      referenceType: "PURCHASE_INVOICE",
      referenceId: purchase.id,
      lines,
    },
    client
  );
}

/**
 * Posts accounting entries for an operating expense.
 */
export async function postExpenseAccounting(
  tenantId: string,
  expense: any,
  client: any = prisma
) {
  const expenseAccountMapping: Record<string, string> = {
    RENT: "5030_RENT",
    SALARIES: "5040_SALARIES",
    ELECTRICITY: "5050_UTILITIES",
    UTILITIES: "5050_UTILITIES",
    OFFICE_SUPPLIES: "5060_ADMIN",
    MARKETING: "5060_ADMIN",
    MAINTENANCE: "5060_ADMIN",
  };

  const accountCode = expenseAccountMapping[expense.category] || "5060_ADMIN";
  const cashAccountCode = expense.paymentMode === "CASH" ? "1010_CASH" : "1020_BANK";

  const lines: JournalLineInput[] = [
    {
      accountCode,
      debit: expense.amount,
      credit: 0,
      description: `Expense (${expense.category}) paid to ${expense.payee}`,
    },
    {
      accountCode: cashAccountCode,
      debit: 0,
      credit: expense.amount,
      description: `Disbursement via ${expense.paymentMode}`,
    },
  ];

  return await postJournalEntry(
    {
      tenantId,
      entryDate: expense.expenseDate,
      narration: `Expense #${expense.expenseNumber}: ${expense.category} to ${expense.payee}`,
      referenceType: "EXPENSE",
      referenceId: expense.id,
      lines,
    },
    client
  );
}

/**
 * Posts accounting entries for a supplier payment.
 * Debits Accounts Payable (liability reduction), credits Cash or Bank.
 */
export async function postSupplierPaymentAccounting(
  tenantId: string,
  payment: any,
  supplierName: string,
  client: any = prisma
) {
  const isCash = payment.paymentMode === "CASH";
  const cashAccountCode = isCash ? "1010_CASH" : "1020_BANK";

  const lines: JournalLineInput[] = [
    {
      accountCode: "2010_ACCOUNTS_PAYABLE",
      debit: payment.amount,
      credit: 0,
      description: `Payment to supplier ${supplierName} (${payment.paymentMode})`,
    },
    {
      accountCode: cashAccountCode,
      debit: 0,
      credit: payment.amount,
      description: `Disbursement to ${supplierName} via ${payment.paymentMode}`,
    },
  ];

  return await postJournalEntry(
    {
      tenantId,
      entryDate: payment.paymentDate || new Date(),
      narration: `Supplier payment #${payment.paymentNumber || payment.id} to ${supplierName}`,
      referenceType: "SUPPLIER_PAYMENT",
      referenceId: payment.id,
      lines,
    },
    client
  );
}

/**
 * Posts accounting entries for a Sales Return / Credit Note.
 * Reverses revenue & output GST liability; credits Accounts Receivable.
 */
export async function postSalesReturnAccounting(
  tenantId: string,
  creditNote: any,
  client: any = prisma
) {
  const lines: JournalLineInput[] = [];

  // 1. Debits: Sales Revenue reversal
  lines.push({
    accountCode: "4010_SALES_REVENUE",
    debit: creditNote.taxableAmount,
    credit: 0,
    description: `Sales revenue reversal for Credit Note #${creditNote.creditNoteNumber}`,
  });

  // 2. Debits: Output GST liability reversal
  if (creditNote.cgstAmount > 0) {
    lines.push({
      accountCode: "2021_OUTPUT_CGST",
      debit: creditNote.cgstAmount,
      credit: 0,
      description: `Output CGST reversal for CN #${creditNote.creditNoteNumber}`,
    });
  }
  if (creditNote.sgstAmount > 0) {
    lines.push({
      accountCode: "2022_OUTPUT_SGST",
      debit: creditNote.sgstAmount,
      credit: 0,
      description: `Output SGST reversal for CN #${creditNote.creditNoteNumber}`,
    });
  }
  if (creditNote.igstAmount > 0) {
    lines.push({
      accountCode: "2023_OUTPUT_IGST",
      debit: creditNote.igstAmount,
      credit: 0,
      description: `Output IGST reversal for CN #${creditNote.creditNoteNumber}`,
    });
  }

  // 3. Credits: Accounts Receivable
  lines.push({
    accountCode: "1030_ACCOUNTS_RECEIVABLE",
    debit: 0,
    credit: creditNote.totalAmount,
    description: `Credit issued to customer for CN #${creditNote.creditNoteNumber}`,
  });

  return await postJournalEntry(
    {
      tenantId,
      entryDate: creditNote.createdAt || new Date(),
      narration: `Credit Note #${creditNote.creditNoteNumber}`,
      referenceType: "CREDIT_NOTE",
      referenceId: creditNote.id,
      lines,
    },
    client
  );
}

/**
 * Posts accounting entries for a Purchase Return / Debit Note.
 * Debits Accounts Payable, credits Inventory Asset and Input Tax Credit (ITC Asset).
 */
export async function postPurchaseReturnAccounting(
  tenantId: string,
  debitNote: any,
  client: any = prisma
) {
  const lines: JournalLineInput[] = [];

  // 1. Debits: Accounts Payable reduction
  lines.push({
    accountCode: "2010_ACCOUNTS_PAYABLE",
    debit: debitNote.totalAmount,
    credit: 0,
    description: `Debit Note #${debitNote.debitNoteNumber} issued to supplier`,
  });

  // 2. Credits: Inventory Asset
  lines.push({
    accountCode: "1040_INVENTORY",
    debit: 0,
    credit: debitNote.taxableAmount,
    description: `Inventory returned under Debit Note #${debitNote.debitNoteNumber}`,
  });

  // 3. Credits: Input GST reversal
  if (debitNote.cgstAmount > 0) {
    lines.push({
      accountCode: "1051_INPUT_CGST",
      debit: 0,
      credit: debitNote.cgstAmount,
      description: `Input CGST reversal for DN #${debitNote.debitNoteNumber}`,
    });
  }
  if (debitNote.sgstAmount > 0) {
    lines.push({
      accountCode: "1052_INPUT_SGST",
      debit: 0,
      credit: debitNote.sgstAmount,
      description: `Input SGST reversal for DN #${debitNote.debitNoteNumber}`,
    });
  }
  if (debitNote.igstAmount > 0) {
    lines.push({
      accountCode: "1053_INPUT_IGST",
      debit: 0,
      credit: debitNote.igstAmount,
      description: `Input IGST reversal for DN #${debitNote.debitNoteNumber}`,
    });
  }

  return await postJournalEntry(
    {
      tenantId,
      entryDate: debitNote.createdAt || new Date(),
      narration: `Debit Note #${debitNote.debitNoteNumber}`,
      referenceType: "DEBIT_NOTE",
      referenceId: debitNote.id,
      lines,
    },
    client
  );
}

/**
 * Generates the standard Trial Balance report verifying that total debits equal total credits.
 */
export async function getTrialBalance(
  tenantId: string,
  asOfDate: Date = new Date(),
  client: any = prisma
) {
  await ensureChartOfAccounts(tenantId, client);

  const accounts = await client.ledgerAccount.findMany({
    where: { tenantId },
    orderBy: { code: "asc" },
    include: {
      journalLines: {
        where: {
          journal: {
            entryDate: { lte: asOfDate },
          },
        },
      },
    },
  });

  let totalDebits = new Decimal(0);
  let totalCredits = new Decimal(0);

  const rows = accounts.map((acc: any) => {
    let accDr = new Decimal(0);
    let accCr = new Decimal(0);

    acc.journalLines.forEach((jl: any) => {
      accDr = accDr.plus(jl.debit);
      accCr = accCr.plus(jl.credit);
    });

    totalDebits = totalDebits.plus(accDr);
    totalCredits = totalCredits.plus(accCr);

    const isDebitNormal = acc.type === "ASSET" || acc.type === "EXPENSE";
    let netDebit = 0;
    let netCredit = 0;

    if (isDebitNormal) {
      const net = accDr.minus(accCr).toNumber();
      if (net >= 0) netDebit = net;
      else netCredit = Math.abs(net);
    } else {
      const net = accCr.minus(accDr).toNumber();
      if (net >= 0) netCredit = net;
      else netDebit = Math.abs(net);
    }

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      category: acc.category,
      totalDebit: accDr.toNumber(),
      totalCredit: accCr.toNumber(),
      netDebit,
      netCredit,
    };
  });

  const isBalanced = totalDebits.minus(totalCredits).abs().lessThan(0.01);

  return {
    asOfDate,
    isBalanced,
    totalDebits: totalDebits.toNumber(),
    totalCredits: totalCredits.toNumber(),
    difference: totalDebits.minus(totalCredits).abs().toNumber(),
    accounts: rows,
  };
}

/**
 * Generates account ledger statement showing chronological entries and running balance.
 */
export async function getAccountLedger(
  tenantId: string,
  accountCode: string,
  dateRange?: { start?: Date; end?: Date },
  client: any = prisma
) {
  const account = await client.ledgerAccount.findFirst({
    where: { tenantId, code: accountCode },
  });

  if (!account) {
    throw new CrossTenantAccessDeniedError(`Account '${accountCode}' not found`);
  }

  const where: any = {
    tenantId,
    accountId: account.id,
  };

  if (dateRange?.start || dateRange?.end) {
    where.entryDate = {};
    if (dateRange.start) where.entryDate.gte = dateRange.start;
    if (dateRange.end) where.entryDate.lte = dateRange.end;
  }

  const entries = await client.ledgerEntry.findMany({
    where,
    orderBy: { entryDate: "asc" },
  });

  const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
  let running = 0;

  const ledger = entries.map((e: any) => {
    if (isDebitNormal) {
      running += e.debit - e.credit;
    } else {
      running += e.credit - e.debit;
    }
    return {
      id: e.id,
      date: e.entryDate,
      description: e.description,
      debit: e.debit,
      credit: e.credit,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      balanceAfter: Math.round(running * 100) / 100,
    };
  });

  return {
    account,
    currentBalance: account.balance,
    ledger,
  };
}

/**
 * Reconciles the general ledger against sub-ledgers (Customer Receivables and Supplier Payables).
 */
export async function getReconciliationReport(tenantId: string, client: any = prisma) {
  const [tb, customers, suppliers] = await Promise.all([
    getTrialBalance(tenantId, new Date(), client),
    client.customer.findMany({ where: { tenantId } }),
    client.supplier.findMany({ where: { tenantId } }),
  ]);

  const arAccount = tb.accounts.find((a: any) => a.code === "1030_ACCOUNTS_RECEIVABLE");
  const apAccount = tb.accounts.find((a: any) => a.code === "2010_ACCOUNTS_PAYABLE");

  const totalCustomerReceivables = customers.reduce(
    (sum: number, c: any) => sum + (c.outstandingBalance || 0),
    0
  );
  const totalSupplierPayables = suppliers.reduce(
    (sum: number, s: any) => sum + (s.balance || 0),
    0
  );

  const arLedgerBalance = arAccount?.netDebit || 0;
  const apLedgerBalance = apAccount?.netCredit || 0;

  return {
    isTrialBalanceBalanced: tb.isBalanced,
    trialBalanceDifference: tb.difference,
    subledgerReconciliation: {
      accountsReceivable: {
        glAccountBalance: arLedgerBalance,
        customerSubledgerTotal: totalCustomerReceivables,
        difference: Math.abs(arLedgerBalance - totalCustomerReceivables),
        isReconciled: Math.abs(arLedgerBalance - totalCustomerReceivables) < 1.0,
      },
      accountsPayable: {
        glAccountBalance: apLedgerBalance,
        supplierSubledgerTotal: totalSupplierPayables,
        difference: Math.abs(apLedgerBalance - totalSupplierPayables),
        isReconciled: Math.abs(apLedgerBalance - totalSupplierPayables) < 1.0,
      },
    },
  };
}
