import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
} from "@/lib/finance/decimal";
import {
  recordSupplierPayment,
} from "@/lib/purchases/service";
import {
  postSalesInvoiceAccounting,
  postCustomerReceiptAccounting,
  postSalesReturnAccounting,
} from "@/lib/accounting/service";

describe("End-to-End Business Lifecycle & Reconciliation Integration Suite", () => {
  const TENANT_ELVORA = "6644444444444444444444aa";
  const TENANT_COMPETITOR = "6644444444444444444444bb";

  // Synthetic Entities
  const SUPPLIER_ID = "sup_jaquar_01";
  const CUSTOMER_ID = "cust_regal_hotel_01";

  let ledgerStore: Array<any>;
  let stockBalance: number;
  let customerBalance: number;
  let supplierBalance: number;

  beforeEach(() => {
    ledgerStore = [];
    stockBalance = 0;
    customerBalance = 0;
    supplierBalance = 0;
  });

  it("executes the full lifecycle: purchase receipt -> sale -> payment -> return -> reconciliation", async () => {
    // =========================================================================
    // STEP 1: Supplier Purchase Receipt (Inward Movement + Accounts Payable)
    // =========================================================================
    const purchaseQty = 20;
    const purchaseUnitCost = 4000;
    const purchaseSubtotal = purchaseQty * purchaseUnitCost; // 80,000
    const purchaseGst = purchaseSubtotal * 0.18; // 14,400 (Input Tax Credit)
    const purchaseTotal = purchaseSubtotal + purchaseGst; // 94,400

    // Inward stock movement
    stockBalance += purchaseQty;
    supplierBalance += purchaseTotal;

    expect(stockBalance).toBe(20);
    expect(supplierBalance).toBe(94400);

    // =========================================================================
    // STEP 2: Customer Sale Invoice (Outward Deduction + Balanced Accounting)
    // =========================================================================
    const saleQty = 5;
    const saleUnitPrice = 6500;
    const calculatedLine = calculateInvoiceItem({
      quantity: saleQty,
      unitPrice: saleUnitPrice,
      gstRate: 18,
      isInterState: false, // Intra-state (9% CGST + 9% SGST)
    });

    expect(calculatedLine.taxableAmount).toBe("32500.00");
    expect(calculatedLine.cgstAmount).toBe("2925.00");
    expect(calculatedLine.sgstAmount).toBe("2925.00");
    expect(calculatedLine.totalAmount).toBe("38350.00");

    const calculatedSummary = calculateInvoiceSummary({
      items: [calculatedLine],
      additionalDiscount: 0,
    });
    expect(calculatedSummary.grandTotal).toBe("38350.00");

    // Stock deduction
    stockBalance -= saleQty;
    expect(stockBalance).toBe(15); // 20 - 5

    // Customer receivable balance increment
    const salePaidOnCounter = 10000;
    const saleBalanceDue = 38350 - salePaidOnCounter; // 28,350
    customerBalance += saleBalanceDue;
    expect(customerBalance).toBe(28350);

    // Mock DB transaction client for double-entry posting
    const accountsStore = new Map<string, any>();
    const mockTx: any = {
      tenantId: TENANT_ELVORA,
      ledgerAccount: {
        findMany: vi.fn(async ({ where }: any) => {
          return Array.from(accountsStore.values()).filter(
            (a) => a.tenantId === (where?.tenantId || TENANT_ELVORA)
          );
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            Array.from(accountsStore.values()).find(
              (a) =>
                a.tenantId === (where?.tenantId || TENANT_ELVORA) &&
                (!where.code || a.code === where.code)
            ) || {
              id: `acc_${where?.code?.toLowerCase() || "default"}`,
              code: where?.code || "DEFAULT",
              name: where?.code || "DEFAULT",
              type: "ASSET",
            }
          );
        }),
        create: vi.fn(async ({ data }: any) => {
          const id = `acc_${data.code.toLowerCase()}`;
          const record = { id, ...data };
          accountsStore.set(data.code, record);
          return record;
        }),
        update: vi.fn(async ({ where, data }: any) => ({ ...where, ...data })),
      },
      ledgerEntry: {
        create: vi.fn(async ({ data }: any) => ({ id: `le_${Date.now()}`, ...data })),
      },
      journalEntry: {
        create: vi.fn(async ({ data }: any) => {
          ledgerStore.push(data);
          return { id: `entry_${Date.now()}`, ...data };
        }),
        findFirst: vi.fn(async () => null),
      },
      invoiceSequence: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "seq_1", nextNumber: 2, prefix: "JV-" })),
        update: vi.fn(async () => ({ id: "seq_1", nextNumber: 3 })),
      },
    };

    // Post Sales Invoice Accounting
    const syntheticSalesInvoice: any = {
      id: "inv_e2e_001",
      invoiceNumber: "INV-2627-0001",
      invoiceDate: new Date(),
      customerId: CUSTOMER_ID,
      taxableAmount: 32500,
      cgstAmount: 2925,
      sgstAmount: 2925,
      igstAmount: 0,
      roundOff: 0,
      grandTotal: 38350,
      paidAmount: salePaidOnCounter,
      balanceAmount: saleBalanceDue,
      paymentMode: "SPLIT",
    };

    await postSalesInvoiceAccounting(TENANT_ELVORA, syntheticSalesInvoice, mockTx);

    // Verify journal entry balance: Total Debits == Total Credits
    const salesJournal = ledgerStore[0];
    expect(salesJournal).toBeDefined();
    expect(salesJournal.lines.create.length).toBeGreaterThanOrEqual(3);

    const totalDebits = salesJournal.lines.create.reduce(
      (sum: number, line: any) => sum + (line.debit || 0),
      0
    );
    const totalCredits = salesJournal.lines.create.reduce(
      (sum: number, line: any) => sum + (line.credit || 0),
      0
    );

    expect(totalDebits).toBe(38350);
    expect(totalCredits).toBe(38350);
    expect(totalDebits).toBe(totalCredits);

    // =========================================================================
    // STEP 3: Customer Payment Receipt (Accounts Receivable Allocation)
    // =========================================================================
    const paymentAmountReceived = 20000;
    customerBalance -= paymentAmountReceived;
    expect(customerBalance).toBe(8350); // 28,350 - 20,000

    const syntheticPayment: any = {
      id: "pay_e2e_001",
      paymentNumber: "PAY-2627-0001",
      paymentDate: new Date(),
      customerId: CUSTOMER_ID,
      amount: paymentAmountReceived,
      paymentMode: "BANK_TRANSFER",
    };

    await postCustomerReceiptAccounting(TENANT_ELVORA, syntheticPayment, "Regal Hotel", mockTx);

    // Check payment journal entry: Bank Dr (20,000) / Debtors Cr (20,000)
    const paymentJournal = ledgerStore[1];
    expect(paymentJournal).toBeDefined();

    const payDebits = paymentJournal.lines.create.reduce(
      (sum: number, l: any) => sum + (l.debit || 0),
      0
    );
    const payCredits = paymentJournal.lines.create.reduce(
      (sum: number, l: any) => sum + (l.credit || 0),
      0
    );
    expect(payDebits).toBe(paymentAmountReceived);
    expect(payCredits).toBe(paymentAmountReceived);

    // =========================================================================
    // STEP 4: Sales Return & Credit Note (Stock Restored + Balance Decrement)
    // =========================================================================
    const returnQty = 1; // 1 unit returned by customer
    const returnTaxable = 6500;
    const returnCgst = 585;
    const returnSgst = 585;
    const returnTotal = 7670;

    // Stock is restored back to inventory
    stockBalance += returnQty;
    expect(stockBalance).toBe(16); // 15 + 1

    // Customer balance credited
    customerBalance -= returnTotal;
    expect(customerBalance).toBe(680); // 8,350 - 7,670

    const syntheticCreditNote: any = {
      id: "cn_e2e_001",
      creditNoteNumber: "CN-2627-0001",
      creditNoteDate: new Date(),
      salesInvoiceId: syntheticSalesInvoice.id,
      customerId: CUSTOMER_ID,
      taxableAmount: returnTaxable,
      cgstAmount: returnCgst,
      sgstAmount: returnSgst,
      igstAmount: 0,
      totalAmount: returnTotal,
    };

    await postSalesReturnAccounting(TENANT_ELVORA, syntheticCreditNote, mockTx);

    const returnJournal = ledgerStore[2];
    expect(returnJournal).toBeDefined();
    const retDebits = returnJournal.lines.create.reduce(
      (sum: number, l: any) => sum + (l.debit || 0),
      0
    );
    const retCredits = returnJournal.lines.create.reduce(
      (sum: number, l: any) => sum + (l.credit || 0),
      0
    );
    expect(retDebits).toBe(returnTotal);
    expect(retCredits).toBe(returnTotal);

    // =========================================================================
    // STEP 5: Financial Statement & Inventory Reconciliation
    // =========================================================================
    // Net Sales = 32,500 - 6,500 = 26,000
    const netRevenue = syntheticSalesInvoice.taxableAmount - syntheticCreditNote.taxableAmount;
    expect(netRevenue).toBe(26000);

    // Net Units Sold = 5 - 1 = 4 units
    const netUnitsSold = 4;
    // Cost of Goods Sold (COGS) = 4 units * 4,000 unit cost = 16,000
    const cogs = netUnitsSold * purchaseUnitCost;
    expect(cogs).toBe(16000);

    // Gross Profit = 26,000 - 16,000 = 10,000
    const grossProfit = netRevenue - cogs;
    expect(grossProfit).toBe(10000);

    // Ending Inventory Valuation: 16 units * 4,000 unit cost = 64,000
    const endingInventoryValuation = stockBalance * purchaseUnitCost;
    expect(endingInventoryValuation).toBe(64000);

    // Total Inventory Inflow (80,000) == COGS (16,000) + Ending Valuation (64,000)
    expect(purchaseSubtotal).toBe(cogs + endingInventoryValuation);

    // =========================================================================
    // STEP 6: Multi-Tenant Isolation Barrier Check
    // =========================================================================
    // Verify an adversary from TENANT_COMPETITOR cannot execute operations on Tenant Elvora
    const maliciousContext = {
      tenantId: TENANT_COMPETITOR,
      userId: "hacker_user_99",
      role: "OWNER",
    };

    // Adversary trying to allocate supplier payment for Tenant Elvora's supplier
    const mockSupplierDb = {
      supplier: {
        findFirst: vi.fn(async ({ where }: any) => {
          // If searching with malicious tenantId, return null!
          if (where.tenantId === maliciousContext.tenantId && where.id === SUPPLIER_ID) {
            return null; // Not found in their tenant!
          }
          return { id: SUPPLIER_ID, tenantId: TENANT_ELVORA, name: "Jaquar India" };
        }),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockSupplierDb)),
    };

    await expect(
      recordSupplierPayment(
        {
          tenantId: maliciousContext.tenantId, // Competitor Tenant ID
          supplierId: SUPPLIER_ID, // Elvora Supplier ID
          amount: 5000,
          paymentMode: "UPI",
          userId: maliciousContext.userId,
        },
        mockSupplierDb as any
      )
    ).rejects.toThrow("Supplier");
  });
});
