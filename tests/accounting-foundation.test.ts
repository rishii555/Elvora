import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  postJournalEntry,
  postSalesInvoiceAccounting,
  postCustomerReceiptAccounting,
  postPurchaseInvoiceAccounting,
  postExpenseAccounting,
  postSupplierPaymentAccounting,
  postSalesReturnAccounting,
  postPurchaseReturnAccounting,
  getTrialBalance,
  getAccountLedger,
  getReconciliationReport,
  ensureChartOfAccounts,
  UnbalancedJournalEntryError,
} from "@/lib/accounting/service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

describe("Double-Entry Accounting Foundation & Ledger Invariant Suite", () => {
  const TENANT_A = "6633333333333333333333aa";
  const TENANT_B = "6633333333333333333333bb";

  let accountsStore: Map<string, any>;
  let journalEntriesStore: any[];
  let ledgerEntriesStore: any[];
  let customersStore: any[];
  let suppliersStore: any[];
  let sequencesStore: Map<string, any>;
  let mockDb: any;

  beforeEach(() => {
    accountsStore = new Map();
    journalEntriesStore = [];
    ledgerEntriesStore = [];
    customersStore = [];
    suppliersStore = [];
    sequencesStore = new Map();

    mockDb = {
      ledgerAccount: {
        findMany: vi.fn(async ({ where }: any) => {
          const res = Array.from(accountsStore.values()).filter(
            (a) => a.tenantId === where.tenantId
          );
          return res.map((a) => ({
            ...a,
            journalLines: journalEntriesStore
              .filter((j) => j.tenantId === where.tenantId)
              .flatMap((j) => j.lines)
              .filter((l) => l.accountId === a.id),
          }));
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            Array.from(accountsStore.values()).find(
              (a) =>
                a.tenantId === where.tenantId &&
                (!where.code || a.code === where.code) &&
                (!where.id || a.id === where.id)
            ) || null
          );
        }),
        create: vi.fn(async ({ data }: any) => {
          const id = "acc-" + Math.random().toString(36).substring(2, 9);
          const record = { id, ...data };
          accountsStore.set(record.tenantId + ":" + record.code, record);
          return record;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const acc = Array.from(accountsStore.values()).find((a) => a.id === where.id);
          if (!acc) throw new Error("Account not found");
          if (data.balance?.increment !== undefined) {
            acc.balance = (acc.balance || 0) + data.balance.increment;
          }
          return acc;
        }),
      },
      ledgerEntry: {
        create: vi.fn(async ({ data }: any) => {
          const entry = { id: "ent-" + Math.random().toString(36).substring(2, 9), ...data };
          ledgerEntriesStore.push(entry);
          return entry;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return ledgerEntriesStore.filter(
            (e) => e.tenantId === where.tenantId && (!where.accountId || e.accountId === where.accountId)
          );
        }),
      },
      journalEntry: {
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            journalEntriesStore.find(
              (j) =>
                j.tenantId === where.tenantId &&
                j.referenceType === where.referenceType &&
                j.referenceId === where.referenceId
            ) || null
          );
        }),
        create: vi.fn(async ({ data }: any) => {
          const id = "jrn-" + Math.random().toString(36).substring(2, 9);
          const lines = data.lines?.create?.map((l: any, idx: number) => ({
            id: `line-${id}-${idx}`,
            journalId: id,
            ...l,
            account: Array.from(accountsStore.values()).find((a) => a.id === l.accountId),
          })) || [];

          const journal = {
            id,
            tenantId: data.tenantId,
            entryNumber: data.entryNumber,
            entryDate: data.entryDate,
            narration: data.narration,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            lines,
          };
          journalEntriesStore.push(journal);
          return journal;
        }),
      },
      invoiceSequence: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.tenantId_fiscalYear_seriesType) {
            const key = `${where.tenantId_fiscalYear_seriesType.tenantId}_${where.tenantId_fiscalYear_seriesType.fiscalYear}_${where.tenantId_fiscalYear_seriesType.seriesType}`;
            return sequencesStore.get(key) || null;
          }
          return null;
        }),
        create: vi.fn(async ({ data }: any) => {
          const key = `${data.tenantId}_${data.fiscalYear}_${data.seriesType}`;
          const record = { id: "seq-" + key, ...data };
          sequencesStore.set(key, record);
          return record;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const found = Array.from(sequencesStore.values()).find((s) => s.id === where.id);
          if (found) {
            Object.assign(found, data);
            return found;
          }
          return null;
        }),
      },
      customer: {
        findMany: vi.fn(async ({ where }: any) => {
          return customersStore.filter((c) => c.tenantId === where.tenantId);
        }),
      },
      supplier: {
        findMany: vi.fn(async ({ where }: any) => {
          return suppliersStore.filter((s) => s.tenantId === where.tenantId);
        }),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockDb)),
    };
  });

  describe("1. Double-Entry Balance Invariant & Chart of Accounts", () => {
    it("provisions the complete 24 system accounts in the standard Chart of Accounts", async () => {
      const accountMap = await ensureChartOfAccounts(TENANT_A, mockDb);
      expect(accountMap.size).toBe(24);
      expect(accountMap.has("1010_CASH")).toBe(true);
      expect(accountMap.has("1030_ACCOUNTS_RECEIVABLE")).toBe(true);
      expect(accountMap.has("2010_ACCOUNTS_PAYABLE")).toBe(true);
      expect(accountMap.has("4010_SALES_REVENUE")).toBe(true);
      expect(accountMap.has("2021_OUTPUT_CGST")).toBe(true);
      expect(accountMap.has("1051_INPUT_CGST")).toBe(true);
    });

    it("rejects an unbalanced journal entry with UnbalancedJournalEntryError", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      await expect(
        postJournalEntry(
          {
            tenantId: TENANT_A,
            narration: "Unbalanced manual adjustment attempt",
            lines: [
              { accountCode: "1010_CASH", debit: 5000, credit: 0 },
              { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 4500 }, // Discrepancy of 500!
            ],
          },
          mockDb
        )
      ).rejects.toThrow(UnbalancedJournalEntryError);
    });

    it("accepts and posts a perfectly balanced double-entry transaction", async () => {
      const result = await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Initial Capital Injection",
          referenceType: "CAPITAL_INJECTION",
          referenceId: "cap-001",
          lines: [
            { accountCode: "1020_BANK", debit: 100000, credit: 0 },
            { accountCode: "3010_CAPITAL", debit: 0, credit: 100000 },
          ],
        },
        mockDb
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.journalEntry.entryNumber).toBeDefined();

      const bankAcc = Array.from(accountsStore.values()).find((a) => a.code === "1020_BANK");
      const capitalAcc = Array.from(accountsStore.values()).find((a) => a.code === "3010_CAPITAL");

      expect(bankAcc?.balance).toBe(100000); // Asset debited -> increases
      expect(capitalAcc?.balance).toBe(100000); // Equity credited -> increases
    });

    it("guarantees idempotency on duplicate reference submissions without re-posting", async () => {
      const entry1 = await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Deposit check",
          referenceType: "BANK_DEPOSIT",
          referenceId: "dep-101",
          lines: [
            { accountCode: "1020_BANK", debit: 25000, credit: 0 },
            { accountCode: "1010_CASH", debit: 0, credit: 25000 },
          ],
        },
        mockDb
      );
      expect(entry1.isDuplicate).toBe(false);

      // Re-submit identical reference
      const entry2 = await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Deposit check (Retry)",
          referenceType: "BANK_DEPOSIT",
          referenceId: "dep-101",
          lines: [
            { accountCode: "1020_BANK", debit: 25000, credit: 0 },
            { accountCode: "1010_CASH", debit: 0, credit: 25000 },
          ],
        },
        mockDb
      );

      expect(entry2.isDuplicate).toBe(true);
      expect(entry2.journalEntry.id).toBe(entry1.journalEntry.id);
      expect(mockDb.journalEntry.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("2. Statutory Distinction: Sales Turnover vs. GST Liabilities vs. Cash", () => {
    it("posts credit invoice: debits AR, credits Net Sales Turnover and Output GST liabilities", async () => {
      // B2B Intra-state credit sale of ₹10,000 + 18% GST (9% CGST + 9% SGST) = ₹11,800
      const invoice = {
        id: "inv-gst-001",
        invoiceNumber: "INV-2627-001",
        customerName: "Apex Bath Luxury",
        grandTotal: 11800,
        taxableAmount: 10000,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        paidAmount: 0,
        balanceAmount: 11800,
        roundOff: 0,
        invoiceDate: new Date(),
        paymentMode: "CREDIT",
      };

      const result = await postSalesInvoiceAccounting(TENANT_A, invoice, mockDb);
      expect(result.isDuplicate).toBe(false);

      const lines = result.journalEntry.lines;
      const drAR = lines.find((l: any) => l.account.code === "1030_ACCOUNTS_RECEIVABLE");
      const crSales = lines.find((l: any) => l.account.code === "4010_SALES_REVENUE");
      const crCgst = lines.find((l: any) => l.account.code === "2021_OUTPUT_CGST");
      const crSgst = lines.find((l: any) => l.account.code === "2022_OUTPUT_SGST");

      // Statutory Verification:
      expect(drAR?.debit).toBe(11800);
      expect(crSales?.credit).toBe(10000); // Only taxable portion is revenue, NOT ₹11,800!
      expect(crCgst?.credit).toBe(900); // Output CGST is a balance-sheet liability to Govt
      expect(crSgst?.credit).toBe(900); // Output SGST is a balance-sheet liability to Govt

      // Check account balances
      const arAcc = Array.from(accountsStore.values()).find((a) => a.code === "1030_ACCOUNTS_RECEIVABLE");
      const revAcc = Array.from(accountsStore.values()).find((a) => a.code === "4010_SALES_REVENUE");
      const cgstAcc = Array.from(accountsStore.values()).find((a) => a.code === "2021_OUTPUT_CGST");

      expect(arAcc?.balance).toBe(11800);
      expect(revAcc?.balance).toBe(10000);
      expect(cgstAcc?.balance).toBe(900);
    });

    it("posts inter-state invoice with IGST and fractional round-off balance", async () => {
      // Inter-state sale: ₹4,550 + 18% IGST = 4550 + 819 = ₹5,369.30, rounded to ₹5,369.00 (-₹0.30 round-off)
      const invoice = {
        id: "inv-gst-002",
        invoiceNumber: "INV-2627-002",
        customerName: "Out-of-state Resorts",
        grandTotal: 5369,
        taxableAmount: 4550,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 819.3,
        paidAmount: 5369,
        balanceAmount: 0,
        roundOff: -0.3,
        invoiceDate: new Date(),
        paymentMode: "UPI",
      };

      const result = await postSalesInvoiceAccounting(TENANT_A, invoice, mockDb);
      const lines = result.journalEntry.lines;

      const drCash = lines.find((l: any) => l.account.code === "1010_CASH");
      const crSales = lines.find((l: any) => l.account.code === "4010_SALES_REVENUE");
      const crIgst = lines.find((l: any) => l.account.code === "2023_OUTPUT_IGST");
      const drRoundOff = lines.find((l: any) => l.account.code === "5090_ROUND_OFF");

      expect(drCash?.debit).toBe(5369);
      expect(crSales?.credit).toBe(4550);
      expect(crIgst?.credit).toBe(819.3);
      expect(drRoundOff?.debit).toBe(0.3); // Debit round-off expense for negative discount
    });

    it("customer receipt knocks off Accounts Receivable without altering Sales Revenue", async () => {
      // 1. Post initial credit invoice: ₹11,800
      await postSalesInvoiceAccounting(
        TENANT_A,
        {
          id: "inv-gst-001",
          invoiceNumber: "INV-2627-001",
          customerName: "Apex Bath Luxury",
          grandTotal: 11800,
          taxableAmount: 10000,
          cgstAmount: 900,
          sgstAmount: 900,
          igstAmount: 0,
          paidAmount: 0,
          balanceAmount: 11800,
          roundOff: 0,
          invoiceDate: new Date(),
          paymentMode: "CREDIT",
        },
        mockDb
      );

      // 2. Customer pays ₹5,000 via Bank transfer
      const payment = {
        id: "pay-cst-001",
        paymentNumber: "RCT-2627-001",
        amount: 5000,
        paymentMode: "BANK_TRANSFER",
        paymentDate: new Date(),
      };

      const result = await postCustomerReceiptAccounting(TENANT_A, payment, "Apex Bath Luxury", mockDb);
      const lines = result.journalEntry.lines;

      const drBank = lines.find((l: any) => l.account.code === "1020_BANK");
      const crAR = lines.find((l: any) => l.account.code === "1030_ACCOUNTS_RECEIVABLE");

      expect(drBank?.debit).toBe(5000);
      expect(crAR?.credit).toBe(5000);

      // Verify that NO line touched 4010_SALES_REVENUE
      const revenueTouched = lines.some((l: any) => l.account.code === "4010_SALES_REVENUE");
      expect(revenueTouched).toBe(false);

      // AR balance should be reduced from 11800 to 6800
      const arAcc = Array.from(accountsStore.values()).find((a) => a.code === "1030_ACCOUNTS_RECEIVABLE");
      expect(arAcc?.balance).toBe(6800);
    });
  });

  describe("3. Purchase Accounting & Input Tax Credit (ITC Asset)", () => {
    it("debits Inventory Asset and ITC Credit Asset, credits Accounts Payable", async () => {
      // Purchase bill: ₹50,000 + 18% GST (CGST 4500, SGST 4500) + ₹1,000 Freight = ₹60,000
      const purchase = {
        id: "pur-001",
        invoiceNumber: "JQR-9901",
        taxableAmount: 50000,
        cgstAmount: 4500,
        sgstAmount: 4500,
        igstAmount: 0,
        freightAmount: 1000,
        grandTotal: 60000,
        roundOff: 0,
        invoiceDate: new Date(),
        supplier: { name: "Jaquar & Co" },
      };

      const result = await postPurchaseInvoiceAccounting(TENANT_A, purchase, mockDb);
      const lines = result.journalEntry.lines;

      const drInv = lines.find((l: any) => l.account.code === "1040_INVENTORY");
      const drItcCgst = lines.find((l: any) => l.account.code === "1051_INPUT_CGST");
      const drItcSgst = lines.find((l: any) => l.account.code === "1052_INPUT_SGST");
      const drFreight = lines.find((l: any) => l.account.code === "5020_FREIGHT");
      const crAP = lines.find((l: any) => l.account.code === "2010_ACCOUNTS_PAYABLE");

      expect(drInv?.debit).toBe(50000);
      expect(drItcCgst?.debit).toBe(4500); // ITC Asset to offset against future tax liability
      expect(drItcSgst?.debit).toBe(4500);
      expect(drFreight?.debit).toBe(1000);
      expect(crAP?.credit).toBe(60000);

      const apAcc = Array.from(accountsStore.values()).find((a) => a.code === "2010_ACCOUNTS_PAYABLE");
      expect(apAcc?.balance).toBe(60000);
    });

    it("supplier payment debits Accounts Payable and credits Bank/Cash", async () => {
      // 1. Post initial purchase invoice: ₹60,000
      await postPurchaseInvoiceAccounting(
        TENANT_A,
        {
          id: "pur-001",
          invoiceNumber: "JQR-9901",
          taxableAmount: 50000,
          cgstAmount: 4500,
          sgstAmount: 4500,
          igstAmount: 0,
          freightAmount: 1000,
          grandTotal: 60000,
          roundOff: 0,
          invoiceDate: new Date(),
          supplier: { name: "Jaquar & Co" },
        },
        mockDb
      );

      // 2. Pay ₹20,000 to vendor
      const payment = {
        id: "sup-pay-01",
        paymentNumber: "PAY-2627-001",
        amount: 20000,
        paymentMode: "BANK_TRANSFER",
        paymentDate: new Date(),
      };

      await postSupplierPaymentAccounting(TENANT_A, payment, "Jaquar & Co", mockDb);

      const apAcc = Array.from(accountsStore.values()).find((a) => a.code === "2010_ACCOUNTS_PAYABLE");
      // AP was 60,000; paid 20,000 -> remaining 40,000
      expect(apAcc?.balance).toBe(40000);
    });
  });

  describe("4. Operating Expenses & Returns", () => {
    it("posts operating expense to respective category and disburses from Cash/Bank", async () => {
      const expense = {
        id: "exp-001",
        expenseNumber: "EXP-2627-0001",
        category: "RENT",
        payee: "Shree Krishna Complex Landlord",
        amount: 25000,
        paymentMode: "BANK_TRANSFER",
        expenseDate: new Date(),
      };

      const result = await postExpenseAccounting(TENANT_A, expense, mockDb);
      const lines = result.journalEntry.lines;

      const drRent = lines.find((l: any) => l.account.code === "5030_RENT");
      const crBank = lines.find((l: any) => l.account.code === "1020_BANK");

      expect(drRent?.debit).toBe(25000);
      expect(crBank?.credit).toBe(25000);

      const rentAcc = Array.from(accountsStore.values()).find((a) => a.code === "5030_RENT");
      expect(rentAcc?.balance).toBe(25000);
    });

    it("reverses revenue and tax liabilities on Sales Return / Credit Note", async () => {
      const creditNote = {
        id: "cn-001",
        creditNoteNumber: "CRN-2627-001",
        invoiceNumber: "INV-2627-001",
        taxableAmount: 2000,
        cgstAmount: 180,
        sgstAmount: 180,
        igstAmount: 0,
        totalAmount: 2360,
        createdAt: new Date(),
      };

      const result = await postSalesReturnAccounting(TENANT_A, creditNote, mockDb);
      const lines = result.journalEntry.lines;

      const drRevReversal = lines.find((l: any) => l.account.code === "4010_SALES_REVENUE");
      const drCgstReversal = lines.find((l: any) => l.account.code === "2021_OUTPUT_CGST");
      const crAR = lines.find((l: any) => l.account.code === "1030_ACCOUNTS_RECEIVABLE");

      expect(drRevReversal?.debit).toBe(2000);
      expect(drCgstReversal?.debit).toBe(180);
      expect(crAR?.credit).toBe(2360);
    });

    it("posts Purchase Return / Debit Note reducing vendor liability", async () => {
      const debitNote = {
        id: "dn-001",
        debitNoteNumber: "DRN-2627-001",
        taxableAmount: 5000,
        cgstAmount: 450,
        sgstAmount: 450,
        igstAmount: 0,
        totalAmount: 5900,
        createdAt: new Date(),
      };

      const result = await postPurchaseReturnAccounting(TENANT_A, debitNote, mockDb);
      const lines = result.journalEntry.lines;

      const drAP = lines.find((l: any) => l.account.code === "2010_ACCOUNTS_PAYABLE");
      const crInv = lines.find((l: any) => l.account.code === "1040_INVENTORY");
      const crCgstItc = lines.find((l: any) => l.account.code === "1051_INPUT_CGST");

      expect(drAP?.debit).toBe(5900);
      expect(crInv?.credit).toBe(5000);
      expect(crCgstItc?.credit).toBe(450);
    });
  });

  describe("5. Financial Reporting & Ledger Reconciliation", () => {
    async function seedActivity() {
      // 1. Initial capital
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Capital",
          lines: [
            { accountCode: "1020_BANK", debit: 100000, credit: 0 },
            { accountCode: "3010_CAPITAL", debit: 0, credit: 100000 },
          ],
        },
        mockDb
      );
      // 2. Credit Sale of 11800 (10000 sales + 900 CGST + 900 SGST)
      await postSalesInvoiceAccounting(
        TENANT_A,
        {
          id: "inv-gst-001",
          invoiceNumber: "INV-2627-001",
          customerName: "Apex Bath Luxury",
          grandTotal: 11800,
          taxableAmount: 10000,
          cgstAmount: 900,
          sgstAmount: 900,
          igstAmount: 0,
          paidAmount: 0,
          balanceAmount: 11800,
          roundOff: 0,
          invoiceDate: new Date(),
          paymentMode: "CREDIT",
        },
        mockDb
      );
      // 3. Customer payment 5000
      await postCustomerReceiptAccounting(
        TENANT_A,
        {
          id: "pay-cst-001",
          paymentNumber: "RCT-2627-001",
          amount: 5000,
          paymentMode: "BANK_TRANSFER",
          paymentDate: new Date(),
        },
        "Apex Bath Luxury",
        mockDb
      );
      // 4. Credit note return 2360 (2000 rev + 180 cgst + 180 sgst)
      await postSalesReturnAccounting(
        TENANT_A,
        {
          id: "cn-001",
          creditNoteNumber: "CRN-2627-001",
          invoiceNumber: "INV-2627-001",
          taxableAmount: 2000,
          cgstAmount: 180,
          sgstAmount: 180,
          igstAmount: 0,
          totalAmount: 2360,
          createdAt: new Date(),
        },
        mockDb
      );
      // 5. Purchase bill 60000 (50000 inv + 4500 cgst + 4500 sgst + 1000 freight)
      await postPurchaseInvoiceAccounting(
        TENANT_A,
        {
          id: "pur-001",
          invoiceNumber: "JQR-9901",
          taxableAmount: 50000,
          cgstAmount: 4500,
          sgstAmount: 4500,
          igstAmount: 0,
          freightAmount: 1000,
          grandTotal: 60000,
          roundOff: 0,
          invoiceDate: new Date(),
          supplier: { name: "Jaquar & Co" },
        },
        mockDb
      );
      // 6. Supplier payment 20000
      await postSupplierPaymentAccounting(
        TENANT_A,
        {
          id: "sup-pay-01",
          paymentNumber: "PAY-2627-001",
          amount: 20000,
          paymentMode: "BANK_TRANSFER",
          paymentDate: new Date(),
        },
        "Jaquar & Co",
        mockDb
      );
      // 7. Debit note return 5900 (5000 inv + 450 cgst + 450 sgst)
      await postPurchaseReturnAccounting(
        TENANT_A,
        {
          id: "dn-001",
          debitNoteNumber: "DRN-2627-001",
          taxableAmount: 5000,
          cgstAmount: 450,
          sgstAmount: 450,
          igstAmount: 0,
          totalAmount: 5900,
          createdAt: new Date(),
        },
        mockDb
      );
    }

    it("generates a balanced Trial Balance where total debits strictly equal total credits", async () => {
      await seedActivity();
      const tb = await getTrialBalance(TENANT_A, new Date(), mockDb);

      expect(tb.isBalanced).toBe(true);
      expect(tb.difference).toBeLessThan(0.01);
      expect(tb.totalDebits).toBeGreaterThan(0);
      expect(tb.totalDebits).toEqual(tb.totalCredits);
    });

    it("fetches chronological account ledger statement with accurate running balance", async () => {
      await seedActivity();
      const ledgerResult = await getAccountLedger(TENANT_A, "1030_ACCOUNTS_RECEIVABLE", undefined, mockDb);

      expect(ledgerResult.account.code).toBe("1030_ACCOUNTS_RECEIVABLE");
      expect(ledgerResult.ledger.length).toBeGreaterThan(0);

      // Verify running balance continuity:
      // Entry 1: Sale of 11800 -> balance 11800
      // Entry 2: Payment receipt 5000 -> balance 6800
      // Entry 3: Credit Note return 2360 -> balance 4440
      const lastEntry = ledgerResult.ledger[ledgerResult.ledger.length - 1];
      expect(lastEntry.balanceAfter).toBe(4440);
    });

    it("verifies reconciliation between General Ledger and Customer/Supplier Subledgers", async () => {
      await seedActivity();

      // Set subledger balances to match the GL balances
      customersStore.push({
        id: "cst-01",
        tenantId: TENANT_A,
        name: "Apex Bath Luxury",
        outstandingBalance: 4440,
      });

      suppliersStore.push({
        id: "sup-01",
        tenantId: TENANT_A,
        name: "Jaquar & Co",
        balance: 34100, // 60,000 - 20,000 paid - 5,900 return = 34,100
      });

      const report = await getReconciliationReport(TENANT_A, mockDb);

      expect(report.isTrialBalanceBalanced).toBe(true);
      expect(report.subledgerReconciliation.accountsReceivable.isReconciled).toBe(true);
      expect(report.subledgerReconciliation.accountsReceivable.difference).toBe(0);

      expect(report.subledgerReconciliation.accountsPayable.isReconciled).toBe(true);
      expect(report.subledgerReconciliation.accountsPayable.difference).toBe(0);
    });
  });

  describe("6. Strict Multi-Tenant Ledger Isolation", () => {
    it("prevents Tenant B from reading Tenant A's account ledger", async () => {
      // Account exists in Tenant A, but Tenant B tries to query it
      await expect(
        getAccountLedger(TENANT_B, "1030_ACCOUNTS_RECEIVABLE", undefined, mockDb)
      ).rejects.toThrow(CrossTenantAccessDeniedError);
    });

    it("ensures Tenant A and Tenant B maintain completely segregated independent ledgers", async () => {
      await ensureChartOfAccounts(TENANT_B, mockDb);

      // Post Tenant B initial transaction
      await postJournalEntry(
        {
          tenantId: TENANT_B,
          narration: "Shop B Initial Capital",
          referenceType: "CAPITAL_INJECTION",
          referenceId: "cap-b-01",
          lines: [
            { accountCode: "1010_CASH", debit: 50000, credit: 0 },
            { accountCode: "3010_CAPITAL", debit: 0, credit: 50000 },
          ],
        },
        mockDb
      );

      const tbA = await getTrialBalance(TENANT_A, new Date(), mockDb);
      const tbB = await getTrialBalance(TENANT_B, new Date(), mockDb);

      expect(tbA.isBalanced).toBe(true);
      expect(tbB.isBalanced).toBe(true);

      const cashA = tbA.accounts.find((a: any) => a.code === "1010_CASH");
      const cashB = tbB.accounts.find((a: any) => a.code === "1010_CASH");

      // Tenant B's cash must not leak into Tenant A
      expect(cashB?.netDebit).toBe(50000);
      expect(cashA?.netDebit).not.toBe(50000);
    });
  });
});
