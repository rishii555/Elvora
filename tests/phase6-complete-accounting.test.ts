import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ensureChartOfAccounts,
  listLedgerAccounts,
  createLedgerAccount,
  updateLedgerAccount,
  deleteLedgerAccount,
  postJournalEntry,
  listJournalEntries,
  createManualJournalEntry,
  reverseJournalEntry,
  postCashBankTransfer,
  postSalesInvoiceAccounting,
  postCustomerReceiptAccounting,
  postPurchaseInvoiceAccounting,
  postExpenseAccounting,
  postSupplierPaymentAccounting,
  postSalesReturnAccounting,
  postPurchaseReturnAccounting,
  getProfitAndLossStatement,
  getBalanceSheet,
  getTrialBalance,
  getAccountLedger,
  getCashAndBankBook,
  getReconciliationReport,
  UnbalancedJournalEntryError,
} from "@/lib/accounting/service";
import { CrossTenantAccessDeniedError } from "@/lib/tenant/isolation";

describe("Phase 6: Complete Accounting & Financial Management Suite", () => {
  const TENANT_A = "6644444444444444444444aa";
  const TENANT_B = "6644444444444444444444bb";

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
          let res = Array.from(accountsStore.values()).filter(
            (a) => a.tenantId === where.tenantId
          );
          if (where.type) {
            if (typeof where.type === "object" && where.type.in) {
              res = res.filter((a) => where.type.in.includes(a.type));
            } else {
              res = res.filter((a) => a.type === where.type);
            }
          }
          if (where.OR) {
            // Cash/Bank filter or search
            res = res.filter((a) => {
              return where.OR.some((cond: any) => {
                if (cond.code?.in) return cond.code.in.includes(a.code);
                if (cond.category) return a.category === cond.category;
                return true;
              });
            });
          }
          return res.map((a) => ({
            ...a,
            entries: ledgerEntriesStore.filter(
              (e) => e.tenantId === where.tenantId && e.accountId === a.id
            ),
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
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.tenantId_code) {
            return (
              Array.from(accountsStore.values()).find(
                (a) =>
                  a.tenantId === where.tenantId_code.tenantId &&
                  a.code === where.tenantId_code.code
              ) || null
            );
          }
          if (where.id) {
            return Array.from(accountsStore.values()).find((a) => a.id === where.id) || null;
          }
          return null;
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
          if (data.name !== undefined) acc.name = data.name;
          if (data.category !== undefined) acc.category = data.category;
          return acc;
        }),
        delete: vi.fn(async ({ where }: any) => {
          const acc = Array.from(accountsStore.values()).find((a) => a.id === where.id);
          if (acc) {
            accountsStore.delete(acc.tenantId + ":" + acc.code);
            return acc;
          }
          throw new Error("Account not found");
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
        count: vi.fn(async ({ where }: any) => {
          return ledgerEntriesStore.filter(
            (e) => e.tenantId === where.tenantId && (!where.accountId || e.accountId === where.accountId)
          ).length;
        }),
      },
      journalEntry: {
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            journalEntriesStore.find((j) => {
              if (where.id && j.id !== where.id) return false;
              if (where.tenantId && j.tenantId !== where.tenantId) return false;
              if (where.referenceType && j.referenceType !== where.referenceType) return false;
              if (where.referenceId && j.referenceId !== where.referenceId) return false;
              return true;
            }) || null
          );
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return journalEntriesStore.filter((j) => j.tenantId === where.tenantId);
        }),
        count: vi.fn(async ({ where }: any) => {
          return journalEntriesStore.filter((j) => j.tenantId === where.tenantId).length;
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
      journalLine: {
        count: vi.fn(async ({ where }: any) => {
          return journalEntriesStore
            .filter((j) => j.tenantId === where.tenantId)
            .flatMap((j) => j.lines)
            .filter((l) => l.accountId === where.accountId).length;
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

  // ==========================================
  // SECTION 1: CHART OF ACCOUNTS (COA)
  // ==========================================
  describe("1. Chart of Accounts (COA) Lifecycle & Protection Guards", () => {
    it("initializes 24 standard Indian ERP accounts for a new tenant", async () => {
      const coaMap = await ensureChartOfAccounts(TENANT_A, mockDb);
      expect(coaMap.size).toBe(24);
      expect(coaMap.has("1010_CASH")).toBe(true);
      expect(coaMap.has("1020_BANK")).toBe(true);
      expect(coaMap.has("1030_ACCOUNTS_RECEIVABLE")).toBe(true);
      expect(coaMap.has("2010_ACCOUNTS_PAYABLE")).toBe(true);
      expect(coaMap.has("4010_SALES_REVENUE")).toBe(true);
      expect(coaMap.has("5010_COGS")).toBe(true);
    });

    it("creates a custom account with uppercase code and valid type", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      const customAcc = await createLedgerAccount(
        TENANT_A,
        {
          code: "5080_MARKETING",
          name: "Advertising & Marketing",
          type: "EXPENSE",
          category: "Operating Expenses",
        },
        mockDb
      );

      expect(customAcc.code).toBe("5080_MARKETING");
      expect(customAcc.isSystem).toBe(false);
      expect(customAcc.balance).toBe(0);

      const accounts = await listLedgerAccounts(TENANT_A, undefined, mockDb);
      expect(accounts.find((a: any) => a.code === "5080_MARKETING")).toBeDefined();
    });

    it("rejects duplicate account code for the same tenant", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      await expect(
        createLedgerAccount(
          TENANT_A,
          {
            code: "1010_CASH",
            name: "Duplicate Cash",
            type: "ASSET",
          },
          mockDb
        )
      ).rejects.toThrow("Account code '1010_CASH' already exists");
    });

    it("prevents deleting a system account", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      const cashAcc = await mockDb.ledgerAccount.findFirst({
        where: { tenantId: TENANT_A, code: "1010_CASH" },
      });

      await expect(deleteLedgerAccount(TENANT_A, cashAcc.id, mockDb)).rejects.toThrow(
        "System accounts cannot be deleted"
      );
    });

    it("prevents deleting a custom account with non-zero balance", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      const custom = await createLedgerAccount(
        TENANT_A,
        {
          code: "1060_PETTY_CASH",
          name: "Petty Cash Drawer",
          type: "ASSET",
        },
        mockDb
      );

      // Simulate non-zero balance
      custom.balance = 500;

      await expect(deleteLedgerAccount(TENANT_A, custom.id, mockDb)).rejects.toThrow(
        "Cannot delete account with a non-zero balance"
      );
    });

    it("allows safely deleting an unused custom account with zero balance", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      const custom = await createLedgerAccount(
        TENANT_A,
        {
          code: "5099_UNUSED_TEST",
          name: "Unused Test Expense",
          type: "EXPENSE",
        },
        mockDb
      );

      const deleted = await deleteLedgerAccount(TENANT_A, custom.id, mockDb);
      expect(deleted.id).toBe(custom.id);

      const check = await mockDb.ledgerAccount.findFirst({
        where: { tenantId: TENANT_A, id: custom.id },
      });
      expect(check).toBeNull();
    });

    it("updates account name and category without modifying account code", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      const custom = await createLedgerAccount(
        TENANT_A,
        {
          code: "5045_BONUSES",
          name: "Staff Bonuses",
          type: "EXPENSE",
          category: "Personnel",
        },
        mockDb
      );

      const updated = await updateLedgerAccount(
        TENANT_A,
        custom.id,
        { name: "Annual Performance Bonuses", category: "Operating Expenses" },
        mockDb
      );

      expect(updated.name).toBe("Annual Performance Bonuses");
      expect(updated.category).toBe("Operating Expenses");
      expect(updated.code).toBe("5045_BONUSES"); // Unchanged
    });
  });

  // ==========================================
  // SECTION 2: DOUBLE-ENTRY ENGINE INVARIANTS
  // ==========================================
  describe("2. Double-Entry Posting Engine & Mathematical Invariants", () => {
    it("posts a balanced journal voucher and increments correct normal balances", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const result = await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Owner capital contribution via bank",
          referenceType: "CAPITAL_INFUSION",
          lines: [
            { accountCode: "1020_BANK", debit: 50000, credit: 0 },
            { accountCode: "3010_CAPITAL", debit: 0, credit: 50000 },
          ],
        },
        mockDb
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.journalEntry.entryNumber).toContain("JRN-");

      const bankAcc = await mockDb.ledgerAccount.findFirst({
        where: { tenantId: TENANT_A, code: "1020_BANK" },
      });
      const capAcc = await mockDb.ledgerAccount.findFirst({
        where: { tenantId: TENANT_A, code: "3010_CAPITAL" },
      });

      // Asset: Dr increases balance
      expect(bankAcc.balance).toBe(50000);
      // Equity: Cr increases balance
      expect(capAcc.balance).toBe(50000);
    });

    it("rejects an unbalanced journal voucher with UnbalancedJournalEntryError", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      await expect(
        postJournalEntry(
          {
            tenantId: TENANT_A,
            narration: "Unbalanced voucher",
            lines: [
              { accountCode: "1010_CASH", debit: 1000, credit: 0 },
              { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 900 }, // 100 discrepancy!
            ],
          },
          mockDb
        )
      ).rejects.toThrow(UnbalancedJournalEntryError);
    });

    it("prevents duplicate posting using referenceType and referenceId idempotency", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const params = {
        tenantId: TENANT_A,
        narration: "Vendor Bill #999",
        referenceType: "PURCHASE_BILL",
        referenceId: "bill-999",
        lines: [
          { accountCode: "1040_INVENTORY", debit: 10000, credit: 0 },
          { accountCode: "2010_ACCOUNTS_PAYABLE", debit: 0, credit: 10000 },
        ],
      };

      const first = await postJournalEntry(params, mockDb);
      expect(first.isDuplicate).toBe(false);

      const second = await postJournalEntry(params, mockDb);
      expect(second.isDuplicate).toBe(true);
    });
  });

  // ==========================================
  // SECTION 3: MANUAL JOURNALS & REVERSALS
  // ==========================================
  describe("3. Manual Journal Vouchers & Void/Reversals", () => {
    it("creates a manual journal voucher with custom line descriptions", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const result = await createManualJournalEntry(
        TENANT_A,
        {
          narration: "Office stationery purchase paid in cash",
          lines: [
            { accountCode: "5060_ADMIN", debit: 1200, credit: 0, description: "Printer paper and pens" },
            { accountCode: "1010_CASH", debit: 0, credit: 1200, description: "Cash payment" },
          ],
        },
        mockDb
      );

      expect(result.journalEntry.referenceType).toBe("MANUAL");
      expect(result.journalEntry.lines).toHaveLength(2);

      const listed = await listJournalEntries(TENANT_A, undefined, mockDb);
      expect(listed.items.length).toBeGreaterThanOrEqual(1);

      const adminExp = await mockDb.ledgerAccount.findFirst({
        where: { tenantId: TENANT_A, code: "5060_ADMIN" },
      });
      expect(adminExp.balance).toBe(1200);
    });

    it("reverses a journal voucher, restoring exact account balances", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const posted = await createManualJournalEntry(
        TENANT_A,
        {
          narration: "Advance payment to landlord",
          lines: [
            { accountCode: "5030_RENT", debit: 25000, credit: 0 },
            { accountCode: "1020_BANK", debit: 0, credit: 25000 },
          ],
        },
        mockDb
      );

      const rentBefore = (await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "5030_RENT" } })).balance;
      const bankBefore = (await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1020_BANK" } })).balance;

      expect(rentBefore).toBe(25000);
      expect(bankBefore).toBe(-25000);

      // Execute reversal
      const reversal = await reverseJournalEntry(
        TENANT_A,
        posted.journalEntry.id,
        new Date(),
        "Rent paid from personal account by mistake",
        mockDb
      );

      expect(reversal.journalEntry.referenceType).toBe("REVERSAL");

      const rentAfter = (await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "5030_RENT" } })).balance;
      const bankAfter = (await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1020_BANK" } })).balance;

      // Perfectly counterbalanced back to 0!
      expect(rentAfter).toBe(0);
      expect(bankAfter).toBe(0);
    });

    it("prevents double reversal of the same voucher", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const posted = await createManualJournalEntry(
        TENANT_A,
        {
          narration: "Trial voucher",
          lines: [
            { accountCode: "5050_UTILITIES", debit: 1500, credit: 0 },
            { accountCode: "1010_CASH", debit: 0, credit: 1500 },
          ],
        },
        mockDb
      );

      await reverseJournalEntry(TENANT_A, posted.journalEntry.id, new Date(), "Reversal 1", mockDb);

      // Second reversal must fail
      await expect(
        reverseJournalEntry(TENANT_A, posted.journalEntry.id, new Date(), "Reversal 2", mockDb)
      ).rejects.toThrow("already been reversed");
    });
  });

  // ==========================================
  // SECTION 4: CASH & BANK MANAGEMENT (CONTRA)
  // ==========================================
  describe("4. Cash & Bank Management & Contra Transfers", () => {
    it("posts a contra transfer from Cash to Bank", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      // Initial cash injection
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Initial cash on hand",
          lines: [
            { accountCode: "1010_CASH", debit: 20000, credit: 0 },
            { accountCode: "3010_CAPITAL", debit: 0, credit: 20000 },
          ],
        },
        mockDb
      );

      // Contra: Deposit 15,000 cash into Bank
      const transfer = await postCashBankTransfer(
        TENANT_A,
        {
          fromAccountCode: "1010_CASH",
          toAccountCode: "1020_BANK",
          amount: 15000,
          narration: "Deposit cash takings into HDFC Bank",
        },
        mockDb
      );

      expect(transfer.journalEntry.referenceType).toBe("CONTRA");

      const cashAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1010_CASH" } });
      const bankAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1020_BANK" } });

      // Cash decreased: 20000 - 15000 = 5000
      expect(cashAcc.balance).toBe(5000);
      // Bank increased: 15000
      expect(bankAcc.balance).toBe(15000);
    });

    it("rejects contra transfer with zero or negative amount", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      await expect(
        postCashBankTransfer(
          TENANT_A,
          {
            fromAccountCode: "1010_CASH",
            toAccountCode: "1020_BANK",
            amount: 0,
          },
          mockDb
        )
      ).rejects.toThrow("strictly greater than zero");
    });

    it("rejects contra transfer where from and to accounts are identical", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      await expect(
        postCashBankTransfer(
          TENANT_A,
          {
            fromAccountCode: "1010_CASH",
            toAccountCode: "1010_CASH",
            amount: 1000,
          },
          mockDb
        )
      ).rejects.toThrow("Source and destination accounts must be different");
    });

    it("generates Cash & Bank statement with opening, receipts, payments, and closing balances", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      const book = await getCashAndBankBook(TENANT_A, undefined, mockDb);
      expect(book.accounts.length).toBeGreaterThanOrEqual(2);
      expect(book.totalLiquidFunds).toBeDefined();
    });
  });

  // ==========================================
  // SECTION 5: AUTOMATED BUSINESS POSTINGS
  // ==========================================
  describe("5. Automated Transaction Posting & Khata Synchronization", () => {
    it("posts sales invoice with split GST and updates Accounts Receivable", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const invoice = {
        id: "inv-gst-01",
        invoiceNumber: "INV-2026-0001",
        invoiceDate: new Date(),
        paidAmount: 0, // Unpaid credit sale
        grandTotal: 11800,
        taxableAmount: 10000,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        isInterState: false,
        paymentMode: "CREDIT",
        customer: { name: "Ramesh Sharma" },
      };

      const result = await postSalesInvoiceAccounting(TENANT_A, invoice, mockDb);
      expect(result.isDuplicate).toBe(false);

      const arAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1030_ACCOUNTS_RECEIVABLE" } });
      const revAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "4010_SALES_REVENUE" } });
      const cgstAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "2021_OUTPUT_CGST" } });
      const sgstAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "2022_OUTPUT_SGST" } });

      expect(arAcc.balance).toBe(11800);
      expect(revAcc.balance).toBe(10000);
      expect(cgstAcc.balance).toBe(900);
      expect(sgstAcc.balance).toBe(900);
    });

    it("posts customer receipt knocking off Accounts Receivable", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      // Initial credit sale of ₹11,800
      await postSalesInvoiceAccounting(
        TENANT_A,
        {
          id: "inv-01",
          invoiceNumber: "INV-001",
          invoiceDate: new Date(),
          paidAmount: 0,
          grandTotal: 11800,
          taxableAmount: 10000,
          cgstAmount: 900,
          sgstAmount: 900,
          igstAmount: 0,
          isInterState: false,
          paymentMode: "CREDIT",
          customer: { name: "Ramesh Sharma" },
        },
        mockDb
      );

      // Customer pays ₹11,800 via Bank/UPI
      await postCustomerReceiptAccounting(
        TENANT_A,
        {
          receiptNumber: "RCT-001",
          amount: 11800,
          paymentMode: "UPI",
        },
        "Ramesh Sharma",
        mockDb
      );

      const bankAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1020_BANK" } });
      const arAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1030_ACCOUNTS_RECEIVABLE" } });

      expect(bankAcc.balance).toBe(11800);
      expect(arAcc.balance).toBe(0); // Fully settled from 11,800 down to 0!
    });

    it("posts sales return (credit note) reversing revenue and output GST", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const creditNote = {
        id: "cn-001",
        creditNoteNumber: "CRN-2026-0001",
        taxableAmount: 2000,
        cgstAmount: 180,
        sgstAmount: 180,
        igstAmount: 0,
        totalAmount: 2360,
      };

      await postSalesReturnAccounting(TENANT_A, creditNote, mockDb);

      const revAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "4010_SALES_REVENUE" } });
      const cgstAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "2021_OUTPUT_CGST" } });

      // Revenue and GST were debited (reduced)
      expect(revAcc.balance).toBe(-2000);
      expect(cgstAcc.balance).toBe(-180);
    });

    it("posts purchase return (debit note) reducing Accounts Payable and reversing Input GST", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const debitNote = {
        id: "dn-001",
        debitNoteNumber: "DBN-2026-0001",
        taxableAmount: 5000,
        cgstAmount: 450,
        sgstAmount: 450,
        igstAmount: 0,
        totalAmount: 5900,
      };

      await postPurchaseReturnAccounting(TENANT_A, debitNote, mockDb);

      const apAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "2010_ACCOUNTS_PAYABLE" } });
      const invAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1040_INVENTORY" } });
      const itcAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1051_INPUT_CGST" } });

      expect(apAcc.balance).toBe(-5900); // AP reduced
      expect(invAcc.balance).toBe(-5000); // Inventory returned out
      expect(itcAcc.balance).toBe(-450);  // ITC reversed
    });

    it("posts purchase invoice and supplier payment accounting entries", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const purchaseBill = {
        id: "pb-01",
        billNumber: "PB-2026-0001",
        grandTotal: 11800,
        taxableAmount: 10000,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        supplier: { name: "ABC Ceramics" },
      };

      await postPurchaseInvoiceAccounting(TENANT_A, purchaseBill, mockDb);

      const apAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "2010_ACCOUNTS_PAYABLE" } });
      const invAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "1040_INVENTORY" } });

      expect(apAcc.balance).toBe(11800);
      expect(invAcc.balance).toBe(10000);

      // Settle supplier payment
      await postSupplierPaymentAccounting(
        TENANT_A,
        {
          paymentNumber: "PAY-001",
          amount: 11800,
          paymentMode: "BANK_TRANSFER",
        },
        "ABC Ceramics",
        mockDb
      );

      const apAfter = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "2010_ACCOUNTS_PAYABLE" } });
      expect(apAfter.balance).toBe(0);
    });

    it("posts expense accounting entry", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      const expense = {
        id: "exp-01",
        expenseNumber: "EXP-001",
        category: "Rent & Premises",
        amount: 15000,
        paymentMode: "BANK_TRANSFER",
        payee: "Landlord",
      };

      await postExpenseAccounting(TENANT_A, expense, mockDb);

      const rentAcc = await mockDb.ledgerAccount.findFirst({ where: { tenantId: TENANT_A, code: "5030_RENT" } });
      expect(rentAcc.balance).toBe(15000);
    });
  });

  // ==========================================
  // SECTION 6: FINANCIAL STATEMENTS & INVARIANTS
  // ==========================================
  describe("6. Complete Financial Statements & Invariant Guarantees", () => {
    it("maintains perfect Trial Balance equality (Debits === Credits)", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      // Post multiple realistic transactions
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Owner Capital",
          lines: [
            { accountCode: "1020_BANK", debit: 100000, credit: 0 },
            { accountCode: "3010_CAPITAL", debit: 0, credit: 100000 },
          ],
        },
        mockDb
      );

      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Purchased Merchandise",
          lines: [
            { accountCode: "1040_INVENTORY", debit: 40000, credit: 0 },
            { accountCode: "1020_BANK", debit: 0, credit: 40000 },
          ],
        },
        mockDb
      );

      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Sold goods for Cash",
          lines: [
            { accountCode: "1010_CASH", debit: 30000, credit: 0 },
            { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 30000 },
          ],
        },
        mockDb
      );

      const tb = await getTrialBalance(TENANT_A, new Date(), mockDb);

      expect(tb.isBalanced).toBe(true);
      expect(tb.difference).toBe(0);
      expect(tb.totalDebits).toBe(170000);
      expect(tb.totalCredits).toBe(170000);
    });

    it("calculates Profit & Loss: Gross Profit = Revenue - COGS, Net Profit = Revenue - Total Expenses", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      // 1. Sales Revenue: ₹50,000
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Sales revenue",
          lines: [
            { accountCode: "1010_CASH", debit: 50000, credit: 0 },
            { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 50000 },
          ],
        },
        mockDb
      );

      // 2. COGS: ₹20,000
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Cost of goods sold",
          lines: [
            { accountCode: "5010_COGS", debit: 20000, credit: 0 },
            { accountCode: "1040_INVENTORY", debit: 0, credit: 20000 },
          ],
        },
        mockDb
      );

      // 3. Rent & Salaries: ₹10,000 + ₹5,000 = ₹15,000
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Rent & Salaries",
          lines: [
            { accountCode: "5030_RENT", debit: 10000, credit: 0 },
            { accountCode: "5040_SALARIES", debit: 5000, credit: 0 },
            { accountCode: "1020_BANK", debit: 0, credit: 15000 },
          ],
        },
        mockDb
      );

      const pl = await getProfitAndLossStatement(TENANT_A, undefined, mockDb);

      expect(pl.revenue.totalRevenue).toBe(50000);
      expect(pl.costOfGoodsSold.totalCOGS).toBe(20000);
      // Gross Profit: 50000 - 20000 = 30000
      expect(pl.grossProfit).toBe(30000);
      // Operating Expenses: 10000 + 5000 = 15000
      expect(pl.operatingExpenses.totalOperatingExpenses).toBe(15000);
      // Net Profit: 30000 - 15000 = 15000
      expect(pl.netProfit).toBe(15000);
    });

    it("verifies Balance Sheet Invariant: Total Assets === Total Liabilities + Total Equity", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);

      // 1. Capital infusion: ₹1,00,000
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

      // 2. Buy inventory on credit: ₹30,000
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Inventory credit",
          lines: [
            { accountCode: "1040_INVENTORY", debit: 30000, credit: 0 },
            { accountCode: "2010_ACCOUNTS_PAYABLE", debit: 0, credit: 30000 },
          ],
        },
        mockDb
      );

      // 3. Sell some inventory (Cost ₹10,000, Sold for ₹18,000 cash)
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Sale",
          lines: [
            { accountCode: "1010_CASH", debit: 18000, credit: 0 },
            { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 18000 },
          ],
        },
        mockDb
      );
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "COGS",
          lines: [
            { accountCode: "5010_COGS", debit: 10000, credit: 0 },
            { accountCode: "1040_INVENTORY", debit: 0, credit: 10000 },
          ],
        },
        mockDb
      );

      const bs = await getBalanceSheet(TENANT_A, new Date(), mockDb);

      // Total Assets: Bank (100k) + Cash (18k) + Inventory (30k - 10k = 20k) = 138,000
      expect(bs.assets.total).toBe(138000);

      // Liabilities: AP = 30,000
      expect(bs.liabilities.total).toBe(30000);

      // Equity accounts: Capital = 100,000
      expect(bs.equity.equityAccountsTotal).toBe(100000);

      // Current earnings: Revenue (18k) - COGS (10k) = 8,000
      expect(bs.equity.currentEarnings).toBe(8000);

      // Total Equity + Earnings = 108,000
      expect(bs.equity.total).toBe(108000);

      // Total Liabilities + Equity = 30,000 + 108,000 = 138,000
      expect(bs.totalLiabilitiesAndEquity).toBe(138000);

      // PERFECT BALANCE!
      expect(bs.isBalanced).toBe(true);
      expect(bs.difference).toBe(0);
    });

    it("generates Subledger Reconciliation comparing GL against customer/supplier subledgers", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      const recon = await getReconciliationReport(TENANT_A, mockDb);
      expect(recon.subledgerReconciliation.accountsReceivable).toBeDefined();
      expect(recon.subledgerReconciliation.accountsPayable).toBeDefined();
    });
  });

  // ==========================================
  // SECTION 7: MULTI-TENANT ISOLATION
  // ==========================================
  describe("7. Strict Multi-Tenant Isolation Across Accounting Modules", () => {
    it("prevents Tenant B from viewing Tenant A's account ledger", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      await ensureChartOfAccounts(TENANT_B, mockDb);

      // Post transaction in Tenant A
      await postJournalEntry(
        {
          tenantId: TENANT_A,
          narration: "Confidential salary",
          lines: [
            { accountCode: "5040_SALARIES", debit: 75000, credit: 0 },
            { accountCode: "1020_BANK", debit: 0, credit: 75000 },
          ],
        },
        mockDb
      );

      // Tenant B queries same account code
      const tenantBLedger = await getAccountLedger(TENANT_B, "5040_SALARIES", undefined, mockDb);

      // Tenant B sees zero entries and zero balance
      expect(tenantBLedger.ledger).toHaveLength(0);
      expect(tenantBLedger.currentBalance).toBe(0);
    });

    it("blocks Tenant B from reversing Tenant A's journal voucher", async () => {
      await ensureChartOfAccounts(TENANT_A, mockDb);
      await ensureChartOfAccounts(TENANT_B, mockDb);

      const journalA = await createManualJournalEntry(
        TENANT_A,
        {
          narration: "Tenant A Voucher",
          lines: [
            { accountCode: "1010_CASH", debit: 5000, credit: 0 },
            { accountCode: "4010_SALES_REVENUE", debit: 0, credit: 5000 },
          ],
        },
        mockDb
      );

      // Tenant B attempts to reverse Tenant A's voucher
      await expect(
        reverseJournalEntry(TENANT_B, journalA.journalEntry.id, new Date(), "Adversarial reversal", mockDb)
      ).rejects.toThrow(CrossTenantAccessDeniedError);
    });
  });
});
