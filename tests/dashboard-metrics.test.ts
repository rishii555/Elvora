import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateTenantDashboardMetrics, getDateRangeBounds } from "../lib/dashboard/metrics";
import { prisma } from "../lib/db/prisma";

describe("Dashboard Metrics Calculation & Tenant Isolation", () => {
  const fixedNow = new Date("2026-10-29T12:00:00.000Z");

  beforeEach(() => {
    vi.spyOn(prisma.productVariant as any, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.creditDebitNote as any, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.purchaseInvoice as any, "findMany").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates accurate date range boundaries for various presets", () => {
    const r7d = getDateRangeBounds("7d", fixedNow);
    expect(r7d.label).toBe("Last 7 Days");
    expect(r7d.startDate.getDate()).toBe(23); // 29 - 6 = 23

    const rMonth = getDateRangeBounds("this_month", fixedNow);
    expect(rMonth.label).toBe("This Month");
    expect(rMonth.startDate.getDate()).toBe(1);

    const r30d = getDateRangeBounds("30d", fixedNow);
    expect(r30d.label).toBe("Last 30 Days");
  });

  it("proves that two different shops receive completely isolated dashboard figures", async () => {
    const shopA_Id = "tenant-shop-alpha";
    const shopB_Id = "tenant-shop-beta";

    vi.spyOn(prisma.salesInvoice as any, "findMany").mockImplementation(((args: any) => {
      if (args?.where?.tenantId === shopA_Id) {
        return Promise.resolve([
          {
            id: "inv-a1",
            tenantId: shopA_Id,
            invoiceNumber: "INV-A-001",
            customerName: "Shop A Customer",
            invoiceDate: fixedNow,
            grandTotal: "15000.00",
            taxableAmount: "12711.86",
            paidAmount: "10000.00",
            balanceAmount: "5000.00",
            status: "FINALIZED",
            paymentMode: "UPI",
            items: [],
          },
        ]);
      }

      if (args?.where?.tenantId === shopB_Id) {
        return Promise.resolve([
          {
            id: "inv-b1",
            tenantId: shopB_Id,
            invoiceNumber: "INV-B-999",
            customerName: "Shop B Client",
            invoiceDate: fixedNow,
            grandTotal: "98000.00",
            taxableAmount: "83050.85",
            paidAmount: "98000.00",
            balanceAmount: "0.00",
            status: "FINALIZED",
            paymentMode: "BANK_TRANSFER",
            items: [],
          },
        ]);
      }

      return Promise.resolve([]);
    }) as any);

    const metricsA = await calculateTenantDashboardMetrics(shopA_Id, "30d", fixedNow);
    const metricsB = await calculateTenantDashboardMetrics(shopB_Id, "30d", fixedNow);

    // Verify Shop A received ONLY Shop A metrics
    expect(metricsA.tenantId).toBe(shopA_Id);
    expect(metricsA.summary.todaySales).toBe(15000);
    expect(metricsA.summary.outstandingReceivables).toBe(5000);
    expect(metricsA.recentInvoices[0]?.invoiceNumber).toBe("INV-A-001");

    // Verify Shop B received ONLY Shop B metrics
    expect(metricsB.tenantId).toBe(shopB_Id);
    expect(metricsB.summary.todaySales).toBe(98000);
    expect(metricsB.summary.outstandingReceivables).toBe(0);
    expect(metricsB.recentInvoices[0]?.invoiceNumber).toBe("INV-B-999");

    // Proves cross-tenant data isolation: Shop A never receives Shop B's numbers or invoices
    expect(metricsA.summary.todaySales).not.toBe(metricsB.summary.todaySales);
    expect(metricsA.recentInvoices[0]?.invoiceNumber).not.toBe(metricsB.recentInvoices[0]?.invoiceNumber);
  });

  it("strictly excludes CANCELLED invoices from sales totals and invoice counts", async () => {
    const shopId = "tenant-shop-gamma";

    vi.spyOn(prisma.salesInvoice as any, "findMany").mockImplementation(((args: any) => {
      // Confirm query specifically demanded status: { not: "CANCELLED" }
      expect(args?.where?.status).toEqual({ not: "CANCELLED" });

      return Promise.resolve([
        {
          id: "inv-valid",
          tenantId: shopId,
          invoiceNumber: "INV-VALID-01",
          customerName: "Customer 1",
          invoiceDate: fixedNow,
          grandTotal: "5000.00",
          taxableAmount: "4237.29",
          paidAmount: "5000.00",
          balanceAmount: "0.00",
          status: "FINALIZED",
          paymentMode: "CASH",
          items: [],
        },
      ]);
    }) as any);

    const metrics = await calculateTenantDashboardMetrics(shopId, "30d", fixedNow);
    expect(metrics.summary.todaySales).toBe(5000);
    expect(metrics.summary.invoiceCount).toBe(1);
  });

  it("flags incomplete cost data when variant purchase prices are missing or zero", async () => {
    const shopId = "tenant-shop-delta";

    vi.spyOn(prisma.salesInvoice as any, "findMany").mockImplementation((() => {
      return Promise.resolve([
        {
          id: "inv-cost-test",
          tenantId: shopId,
          invoiceNumber: "INV-01",
          customerName: "Customer X",
          invoiceDate: fixedNow,
          grandTotal: "1000.00",
          taxableAmount: "1000.00",
          paidAmount: "1000.00",
          balanceAmount: "0.00",
          status: "FINALIZED",
          paymentMode: "CASH",
          items: [
            {
              quantity: 2,
              variant: { purchasePrice: "0.00" }, // missing cost
            },
          ],
        },
      ]);
    }) as any);

    const metrics = await calculateTenantDashboardMetrics(shopId, "30d", fixedNow);
    expect(metrics.summary.hasIncompleteCostData).toBe(true);
    expect(metrics.summary.missingCostItemCount).toBe(1);
  });
});
