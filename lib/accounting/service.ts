import prisma, { runInTransaction } from "@/lib/db/prisma";
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

  return await runInTransaction(client, executePost);
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

  const normalizedCategory = (expense.category || "").toUpperCase();
  let accountCode = expenseAccountMapping[expense.category];
  if (!accountCode) {
    if (normalizedCategory.includes("RENT")) accountCode = "5030_RENT";
    else if (normalizedCategory.includes("SALAR") || normalizedCategory.includes("WAGE")) accountCode = "5040_SALARIES";
    else if (normalizedCategory.includes("ELECT") || normalizedCategory.includes("UTIL")) accountCode = "5050_UTILITIES";
    else if (normalizedCategory.includes("FREIGHT") || normalizedCategory.includes("SHIP")) accountCode = "5020_FREIGHT";
    else accountCode = "5060_ADMIN";
  }
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

/**
 * Lists all Chart of Accounts for a tenant with optional filtering.
 */
export async function listLedgerAccounts(
  tenantId: string,
  params?: { type?: AccountType; search?: string },
  client: any = prisma
) {
  await ensureChartOfAccounts(tenantId, client);
  const where: any = { tenantId };
  if (params?.type) where.type = params.type;
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
      { category: { contains: params.search, mode: "insensitive" } },
    ];
  }
  return await client.ledgerAccount.findMany({
    where,
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });
}

/**
 * Creates a new custom account in the Chart of Accounts.
 */
export async function createLedgerAccount(
  tenantId: string,
  data: {
    code: string;
    name: string;
    type: AccountType;
    category?: string;
  },
  client: any = prisma
) {
  const code = data.code.trim().toUpperCase();
  const name = data.name.trim();

  if (!code || code.length < 3) {
    throw new Error("Account code must be at least 3 characters");
  }
  if (!name || name.length < 2) {
    throw new Error("Account name must be at least 2 characters");
  }

  const existing = await client.ledgerAccount.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (existing) {
    throw new Error(`Account code '${code}' already exists`);
  }

  return await client.ledgerAccount.create({
    data: {
      tenantId,
      code,
      name,
      type: data.type,
      category: data.category?.trim() || null,
      isSystem: false,
      balance: 0,
    },
  });
}

/**
 * Updates a ledger account's name or category.
 */
export async function updateLedgerAccount(
  tenantId: string,
  id: string,
  data: { name?: string; category?: string },
  client: any = prisma
) {
  const account = await client.ledgerAccount.findFirst({
    where: { id, tenantId },
  });
  if (!account) {
    throw new CrossTenantAccessDeniedError("Account not found");
  }

  return await client.ledgerAccount.update({
    where: { id },
    data: {
      ...(data.name?.trim() ? { name: data.name.trim() } : {}),
      ...(data.category !== undefined ? { category: data.category?.trim() || null } : {}),
    },
  });
}

/**
 * Deletes a custom ledger account safely with strict integrity checks.
 */
export async function deleteLedgerAccount(
  tenantId: string,
  id: string,
  client: any = prisma
) {
  const account = await client.ledgerAccount.findFirst({
    where: { id, tenantId },
  });
  if (!account) {
    throw new CrossTenantAccessDeniedError("Account not found");
  }
  if (account.isSystem) {
    throw new Error("System accounts cannot be deleted");
  }
  if (Math.abs(account.balance) > 0.001) {
    throw new Error("Cannot delete account with a non-zero balance");
  }

  const [entriesCount, linesCount] = await Promise.all([
    client.ledgerEntry.count({ where: { accountId: id, tenantId } }),
    client.journalLine.count({ where: { accountId: id, tenantId } }),
  ]);

  if (entriesCount > 0 || linesCount > 0) {
    throw new Error("Cannot delete account that has recorded journal transactions. Deactivate or rename instead.");
  }

  return await client.ledgerAccount.delete({
    where: { id },
  });
}

/**
 * Lists journal entries with optional date, type, and pagination filters.
 */
export async function listJournalEntries(
  tenantId: string,
  params?: {
    startDate?: Date;
    endDate?: Date;
    referenceType?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
  client: any = prisma
) {
  const { startDate, endDate, referenceType, search, page = 1, limit = 50 } = params || {};
  const where: any = { tenantId };

  if (startDate || endDate) {
    where.entryDate = {};
    if (startDate) where.entryDate.gte = startDate;
    if (endDate) where.entryDate.lte = endDate;
  }
  if (referenceType && referenceType !== "ALL") {
    where.referenceType = referenceType;
  }
  if (search) {
    where.OR = [
      { entryNumber: { contains: search, mode: "insensitive" } },
      { narration: { contains: search, mode: "insensitive" } },
      { referenceId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    client.journalEntry.count({ where }),
    client.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items,
  };
}

/**
 * Creates a manual journal voucher.
 */
export async function createManualJournalEntry(
  tenantId: string,
  params: {
    entryDate?: Date;
    narration: string;
    referenceId?: string;
    lines: JournalLineInput[];
  },
  client: any = prisma
) {
  if (!params.narration || params.narration.trim().length === 0) {
    throw new Error("Narration is required for manual journal entries");
  }
  return await postJournalEntry(
    {
      tenantId,
      entryDate: params.entryDate || new Date(),
      narration: params.narration.trim(),
      referenceType: "MANUAL",
      referenceId: params.referenceId?.trim() || undefined,
      lines: params.lines,
    },
    client
  );
}

/**
 * Reverses an existing journal voucher with a fully balanced contra reversal.
 */
export async function reverseJournalEntry(
  tenantId: string,
  journalId: string,
  reversalDate: Date = new Date(),
  reason?: string,
  client: any = prisma
) {
  const journal = await client.journalEntry.findFirst({
    where: { id: journalId, tenantId },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  if (!journal) {
    throw new CrossTenantAccessDeniedError("Journal entry not found");
  }

  if (journal.referenceType === "REVERSAL") {
    throw new Error("Cannot reverse an existing reversal entry");
  }

  const existingReversal = await client.journalEntry.findFirst({
    where: {
      tenantId,
      referenceType: "REVERSAL",
      referenceId: journal.id,
    },
  });

  if (existingReversal) {
    throw new Error(`This journal entry has already been reversed by voucher #${existingReversal.entryNumber}`);
  }

  const reversingLines: JournalLineInput[] = journal.lines.map((l: any) => ({
    accountCode: l.account.code,
    debit: l.credit,
    credit: l.debit,
    description: `Reversal: ${l.description || journal.narration}`,
  }));

  const reversalNarration = `Reversal of ${journal.entryNumber}${reason ? `: ${reason}` : ` (${journal.narration})`}`;

  return await postJournalEntry(
    {
      tenantId,
      entryDate: reversalDate,
      narration: reversalNarration,
      referenceType: "REVERSAL",
      referenceId: journal.id,
      lines: reversingLines,
    },
    client
  );
}

/**
 * Records a Contra voucher for cash-bank or bank-bank transfers.
 */
export async function postCashBankTransfer(
  tenantId: string,
  params: {
    fromAccountCode: string;
    toAccountCode: string;
    amount: number;
    date?: Date;
    narration?: string;
    referenceNumber?: string;
  },
  client: any = prisma
) {
  const { fromAccountCode, toAccountCode, amount, date = new Date(), narration, referenceNumber } = params;

  if (amount <= 0) {
    throw new Error("Transfer amount must be strictly greater than zero");
  }
  if (fromAccountCode === toAccountCode) {
    throw new Error("Source and destination accounts must be different");
  }

  await ensureChartOfAccounts(tenantId, client);

  const [fromAcc, toAcc] = await Promise.all([
    client.ledgerAccount.findFirst({ where: { tenantId, code: fromAccountCode } }),
    client.ledgerAccount.findFirst({ where: { tenantId, code: toAccountCode } }),
  ]);

  if (!fromAcc) throw new Error(`Source account '${fromAccountCode}' not found`);
  if (!toAcc) throw new Error(`Destination account '${toAccountCode}' not found`);

  const desc = narration?.trim() || `Contra transfer from ${fromAcc.name} to ${toAcc.name}`;

  return await postJournalEntry(
    {
      tenantId,
      entryDate: date,
      narration: `Contra Transfer: ₹${amount.toFixed(2)} [${fromAcc.code} -> ${toAcc.code}] - ${desc}`,
      referenceType: "CONTRA",
      referenceId: referenceNumber?.trim() || undefined,
      lines: [
        {
          accountCode: toAccountCode,
          debit: amount,
          credit: 0,
          description: `Deposit to ${toAcc.name}`,
        },
        {
          accountCode: fromAccountCode,
          debit: 0,
          credit: amount,
          description: `Withdrawal from ${fromAcc.name}`,
        },
      ],
    },
    client
  );
}

/**
 * Generates the Profit & Loss Statement (Income Statement) for a date range.
 */
export async function getProfitAndLossStatement(
  tenantId: string,
  params?: { startDate?: Date; endDate?: Date },
  client: any = prisma
) {
  await ensureChartOfAccounts(tenantId, client);

  const now = new Date();
  const fiscalYear = getIndianFinancialYear(now);
  const startYear = parseInt(fiscalYear.split("-")[0], 10);
  const defaultStart = new Date(startYear, 3, 1, 0, 0, 0, 0); // April 1
  const startDate = params?.startDate || defaultStart;
  const endDate = params?.endDate || now;

  const accounts = await client.ledgerAccount.findMany({
    where: {
      tenantId,
      type: { in: ["REVENUE", "EXPENSE"] },
    },
    include: {
      journalLines: {
        where: {
          journal: {
            entryDate: { gte: startDate, lte: endDate },
          },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  const revenueAccounts: any[] = [];
  const cogsAccounts: any[] = [];
  const expenseAccounts: any[] = [];

  let totalOperatingRevenue = new Decimal(0);
  let totalOtherIncome = new Decimal(0);
  let totalCOGS = new Decimal(0);
  let totalOperatingExpenses = new Decimal(0);
  let totalOtherExpenses = new Decimal(0);

  accounts.forEach((acc: any) => {
    let dr = new Decimal(0);
    let cr = new Decimal(0);
    acc.journalLines.forEach((jl: any) => {
      dr = dr.plus(jl.debit);
      cr = cr.plus(jl.credit);
    });

    if (acc.type === "REVENUE") {
      const net = cr.minus(dr).toNumber();
      const isOther = acc.code === "4030_DISCOUNTS_RECEIVED" || acc.category?.toLowerCase().includes("other");
      if (isOther) {
        totalOtherIncome = totalOtherIncome.plus(net);
      } else {
        totalOperatingRevenue = totalOperatingRevenue.plus(net);
      }
      revenueAccounts.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        category: acc.category || "Operating Revenue",
        isOther,
        amount: net,
      });
    } else {
      // EXPENSE
      const net = dr.minus(cr).toNumber();
      const isCOGS = acc.code === "5010_COGS" || acc.category?.toLowerCase().includes("direct");
      const isOther = acc.code === "5090_ROUND_OFF" || acc.category?.toLowerCase().includes("other");

      if (isCOGS) {
        totalCOGS = totalCOGS.plus(net);
        cogsAccounts.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          category: acc.category || "Direct Expenses",
          amount: net,
        });
      } else {
        if (isOther) {
          totalOtherExpenses = totalOtherExpenses.plus(net);
        } else {
          totalOperatingExpenses = totalOperatingExpenses.plus(net);
        }
        expenseAccounts.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          category: acc.category || "Operating Expenses",
          isOther,
          amount: net,
        });
      }
    }
  });

  const totalRevenue = totalOperatingRevenue.plus(totalOtherIncome);
  const grossProfit = totalRevenue.minus(totalCOGS);
  const totalAllExpenses = totalCOGS.plus(totalOperatingExpenses).plus(totalOtherExpenses);
  const netProfit = totalRevenue.minus(totalAllExpenses);
  const operatingProfit = grossProfit.minus(totalOperatingExpenses);

  const grossMargin = totalRevenue.greaterThan(0)
    ? grossProfit.dividedBy(totalRevenue).times(100).toDecimalPlaces(2).toNumber()
    : 0;
  const netMargin = totalRevenue.greaterThan(0)
    ? netProfit.dividedBy(totalRevenue).times(100).toDecimalPlaces(2).toNumber()
    : 0;

  return {
    period: { startDate, endDate },
    revenue: {
      operatingRevenue: totalOperatingRevenue.toNumber(),
      otherIncome: totalOtherIncome.toNumber(),
      totalRevenue: totalRevenue.toNumber(),
      accounts: revenueAccounts,
    },
    costOfGoodsSold: {
      totalCOGS: totalCOGS.toNumber(),
      accounts: cogsAccounts,
    },
    grossProfit: grossProfit.toNumber(),
    grossMarginPercent: grossMargin,
    operatingExpenses: {
      totalOperatingExpenses: totalOperatingExpenses.toNumber(),
      otherExpenses: totalOtherExpenses.toNumber(),
      totalExpenses: totalOperatingExpenses.plus(totalOtherExpenses).toNumber(),
      accounts: expenseAccounts,
    },
    operatingProfit: operatingProfit.toNumber(),
    totalExpenses: totalAllExpenses.toNumber(),
    netProfit: netProfit.toNumber(),
    netMarginPercent: netMargin,
  };
}

/**
 * Generates the Balance Sheet report as of a specific date.
 */
export async function getBalanceSheet(
  tenantId: string,
  asOfDate: Date = new Date(),
  client: any = prisma
) {
  await ensureChartOfAccounts(tenantId, client);

  const accounts = await client.ledgerAccount.findMany({
    where: { tenantId },
    include: {
      journalLines: {
        where: {
          journal: {
            entryDate: { lte: asOfDate },
          },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  const assetAccounts: any[] = [];
  const liabilityAccounts: any[] = [];
  const equityAccounts: any[] = [];

  let totalAssets = new Decimal(0);
  let totalLiabilities = new Decimal(0);
  let totalEquityAccounts = new Decimal(0);

  let cumulativeRevenue = new Decimal(0);
  let cumulativeExpenses = new Decimal(0);

  accounts.forEach((acc: any) => {
    let dr = new Decimal(0);
    let cr = new Decimal(0);
    acc.journalLines.forEach((jl: any) => {
      dr = dr.plus(jl.debit);
      cr = cr.plus(jl.credit);
    });

    if (acc.type === "ASSET") {
      const net = dr.minus(cr).toNumber();
      totalAssets = totalAssets.plus(net);
      assetAccounts.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        category: acc.category || "Current Assets",
        amount: net,
      });
    } else if (acc.type === "LIABILITY") {
      const net = cr.minus(dr).toNumber();
      totalLiabilities = totalLiabilities.plus(net);
      liabilityAccounts.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        category: acc.category || "Current Liabilities",
        amount: net,
      });
    } else if (acc.type === "EQUITY") {
      const net = cr.minus(dr).toNumber();
      totalEquityAccounts = totalEquityAccounts.plus(net);
      equityAccounts.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        category: acc.category || "Owner's Equity",
        amount: net,
      });
    } else if (acc.type === "REVENUE") {
      cumulativeRevenue = cumulativeRevenue.plus(cr.minus(dr));
    } else if (acc.type === "EXPENSE") {
      cumulativeExpenses = cumulativeExpenses.plus(dr.minus(cr));
    }
  });

  // Current earnings = Cumulative Revenue - Cumulative Expenses
  const currentEarnings = cumulativeRevenue.minus(cumulativeExpenses);
  const totalEquity = totalEquityAccounts.plus(currentEarnings);
  const totalLiabilitiesAndEquity = totalLiabilities.plus(totalEquity);

  const difference = totalAssets.minus(totalLiabilitiesAndEquity).abs().toNumber();
  const isBalanced = difference < 0.05;

  return {
    asOfDate,
    assets: {
      total: totalAssets.toNumber(),
      accounts: assetAccounts,
    },
    liabilities: {
      total: totalLiabilities.toNumber(),
      accounts: liabilityAccounts,
    },
    equity: {
      equityAccountsTotal: totalEquityAccounts.toNumber(),
      currentEarnings: currentEarnings.toNumber(),
      total: totalEquity.toNumber(),
      accounts: equityAccounts,
    },
    totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toNumber(),
    difference,
    isBalanced,
  };
}

/**
 * Generates the Cash & Bank Book statement.
 */
export async function getCashAndBankBook(
  tenantId: string,
  params?: { startDate?: Date; endDate?: Date },
  client: any = prisma
) {
  await ensureChartOfAccounts(tenantId, client);
  const now = new Date();
  const startDate = params?.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = params?.endDate || now;

  const accounts = await client.ledgerAccount.findMany({
    where: {
      tenantId,
      OR: [
        { code: { in: ["1010_CASH", "1020_BANK"] } },
        { category: "Cash & Cash Equivalents" },
      ],
    },
    include: {
      entries: {
        where: {
          entryDate: { lte: endDate },
        },
        orderBy: { entryDate: "asc" },
      },
    },
  });

  const accountSummaries = accounts.map((acc: any) => {
    let opening = new Decimal(0);
    let periodDebits = new Decimal(0);
    let periodCredits = new Decimal(0);
    const periodTransactions: any[] = [];

    acc.entries.forEach((e: any) => {
      const eDate = new Date(e.entryDate);
      if (eDate < startDate) {
        opening = opening.plus(e.debit).minus(e.credit);
      } else {
        periodDebits = periodDebits.plus(e.debit);
        periodCredits = periodCredits.plus(e.credit);
        periodTransactions.push({
          id: e.id,
          entryDate: e.entryDate,
          description: e.description,
          debit: e.debit,
          credit: e.credit,
          referenceType: e.referenceType,
          referenceId: e.referenceId,
        });
      }
    });

    const closing = opening.plus(periodDebits).minus(periodCredits);

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      category: acc.category,
      openingBalance: opening.toNumber(),
      totalReceipts: periodDebits.toNumber(),
      totalPayments: periodCredits.toNumber(),
      closingBalance: closing.toNumber(),
      transactions: periodTransactions,
    };
  });

  const totalCashOnHand = accountSummaries
    .filter((a: any) => a.code.includes("CASH"))
    .reduce((s: number, a: any) => s + a.closingBalance, 0);

  const totalBankBalance = accountSummaries
    .filter((a: any) => a.code.includes("BANK"))
    .reduce((s: number, a: any) => s + a.closingBalance, 0);

  return {
    period: { startDate, endDate },
    totalCashOnHand,
    totalBankBalance,
    totalLiquidFunds: totalCashOnHand + totalBankBalance,
    accounts: accountSummaries,
  };
}
