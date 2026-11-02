import prisma from "@/lib/db/prisma";
import { resolveAnalyticsDateRange, AnalyticsFilterOptions } from "@/lib/analytics/service";

export type ExportReportType =
  | "SALES_SUMMARY"
  | "PURCHASE_SUMMARY"
  | "PROFITABILITY"
  | "EXPENSES"
  | "INVENTORY_VALUATION"
  | "STOCK_MOVEMENT"
  | "LOW_STOCK"
  | "CUSTOMER_OUTSTANDING"
  | "SUPPLIER_OUTSTANDING"
  | "CASH_FLOW"
  | "GENERAL_LEDGER"
  | "TRIAL_BALANCE"
  | "BALANCE_SHEET";

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function buildExcelXml(
  headers: string[],
  rows: any[][],
  metadata?: { title: string; period?: string; tenantName?: string }
): string {
  const escapeXml = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:Bold="1" ss:Size="14" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Meta">
   <Font ss:Italic="1" ss:Color="#64748B"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Report">
  <Table>`;

  if (metadata?.title) {
    xml += `\n   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">${escapeXml(metadata.title)}</Data></Cell></Row>`;
    if (metadata.tenantName) xml += `\n   <Row><Cell ss:StyleID="Meta"><Data ss:Type="String">Organization: ${escapeXml(metadata.tenantName)}</Data></Cell></Row>`;
    if (metadata.period) xml += `\n   <Row><Cell ss:StyleID="Meta"><Data ss:Type="String">Period: ${escapeXml(metadata.period)}</Data></Cell></Row>`;
    xml += `\n   <Row><Cell ss:StyleID="Meta"><Data ss:Type="String">Generated: ${new Date().toISOString()}</Data></Cell></Row>`;
    xml += `\n   <Row/>`;
  }

  // Header row
  xml += `\n   <Row>`;
  headers.forEach((h) => {
    xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += `</Row>`;

  // Data rows
  rows.forEach((row) => {
    xml += `\n   <Row>`;
    row.forEach((cell) => {
      const isNum = typeof cell === "number" || (!isNaN(Number(cell)) && cell !== "" && typeof cell !== "boolean");
      const type = isNum ? "Number" : "String";
      xml += `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
    });
    xml += `</Row>`;
  });

  xml += `\n  </Table>\n </Worksheet>\n</Workbook>`;
  return xml;
}

export function buildPrintableHtml(
  headers: string[],
  rows: any[][],
  metadata?: { title: string; period?: string; tenantName?: string }
): string {
  const escapeHtml = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(metadata?.title || "Elvora Report")}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 12px; }
    .header { margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 12px; }
    .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
    .meta { font-size: 12px; color: #64748b; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f8fafc; color: #334155; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: right; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">${escapeHtml(metadata?.title || "ELVORA ENTERPRISE FINANCIAL REPORT")}</h1>
    ${metadata?.tenantName ? `<div class="meta"><strong>Entity:</strong> ${escapeHtml(metadata.tenantName)}</div>` : ""}
    ${metadata?.period ? `<div class="meta"><strong>Period:</strong> ${escapeHtml(metadata.period)}</div>` : ""}
    <div class="meta"><strong>Generated:</strong> ${new Date().toLocaleString("en-IN")}</div>
  </div>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>
  <div class="footer">Generated by Elvora Multi-Tenant SaaS ERP &bull; Strictly Confidential</div>
</body>
</html>`;
}

function buildCSV(headers: string[], rows: any[][], metadata?: { title: string; period?: string; tenantName?: string }): string {
  const lines: string[] = [];

  // Metadata headers
  if (metadata?.title) {
    lines.push(`"ELVORA ENTERPRISE ERP - ${metadata.title.toUpperCase()}"`);
    if (metadata.tenantName) lines.push(`"Organization: ${metadata.tenantName}"`);
    if (metadata.period) lines.push(`"Period: ${metadata.period}"`);
    lines.push(`"Generated At: ${new Date().toISOString()}"`);
    lines.push('""'); // Empty line
  }

  // Column Headers
  lines.push(headers.map(escapeCSV).join(","));

  // Rows
  rows.forEach((row) => {
    lines.push(row.map(escapeCSV).join(","));
  });

  return lines.join("\r\n");
}

export async function generateReportCSV(
  tenantId: string,
  reportType: ExportReportType,
  options: AnalyticsFilterOptions = {},
  client: any = prisma
): Promise<{ filename: string; content: string; contentType: string }> {
  const { current } = resolveAnalyticsDateRange(options);
  const periodStr = `${current.start.toISOString().split("T")[0]} to ${current.end.toISOString().split("T")[0]}`;

  const tenant = await client.tenant.findUnique({
    where: { id: tenantId },
    select: { tradeName: true, legalName: true },
  }).catch(() => null);
  const tenantName =
    (tenant as any)?.tradeName ||
    (tenant as any)?.legalName ||
    (tenant as any)?.name ||
    "Elvora Business";

  switch (reportType) {
    case "SALES_SUMMARY": {
      const invoices = await client.salesInvoice.findMany({
        where: {
          tenantId,
          status: { not: "CANCELLED" },
          invoiceDate: { gte: current.start, lte: current.end },
        },
        include: { customer: true },
        orderBy: { invoiceDate: "desc" },
      });

      const headers = [
        "Invoice Number",
        "Date",
        "Customer Name",
        "Taxable Amount (₹)",
        "CGST (₹)",
        "SGST (₹)",
        "IGST (₹)",
        "Grand Total (₹)",
        "Paid Amount (₹)",
        "Balance Due (₹)",
        "Payment Mode",
        "Status",
      ];

      const rows = invoices.map((inv: any) => [
        inv.invoiceNumber,
        new Date(inv.invoiceDate).toISOString().split("T")[0],
        inv.customerName || inv.customer?.name || "Counter Customer",
        inv.taxableAmount.toFixed(2),
        inv.cgstAmount.toFixed(2),
        inv.sgstAmount.toFixed(2),
        inv.igstAmount.toFixed(2),
        inv.grandTotal.toFixed(2),
        inv.paidAmount.toFixed(2),
        inv.balanceAmount.toFixed(2),
        inv.paymentMode,
        inv.status,
      ]);

      const content = buildCSV(headers, rows, {
        title: "Sales Invoices Summary",
        period: periodStr,
        tenantName,
      });

      return {
        filename: `sales_summary_${current.start.toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }

    case "PURCHASE_SUMMARY": {
      const bills = await client.purchaseInvoice.findMany({
        where: {
          tenantId,
          status: { not: "CANCELLED" },
          invoiceDate: { gte: current.start, lte: current.end },
        },
        include: { supplier: true },
        orderBy: { invoiceDate: "desc" },
      });

      const headers = [
        "Bill Number",
        "Bill Date",
        "Supplier Name",
        "Taxable (₹)",
        "Tax Total (₹)",
        "Grand Total (₹)",
        "Paid Amount (₹)",
        "Balance Due (₹)",
        "Payment Status",
      ];

      const rows = bills.map((b: any) => [
        b.invoiceNumber,
        new Date(b.invoiceDate).toISOString().split("T")[0],
        b.supplier?.name || "Vendor",
        b.taxableAmount.toFixed(2),
        b.taxTotal.toFixed(2),
        b.grandTotal.toFixed(2),
        b.paidAmount.toFixed(2),
        b.balanceAmount.toFixed(2),
        b.paymentStatus,
      ]);

      const content = buildCSV(headers, rows, {
        title: "Purchase Bills Summary",
        period: periodStr,
        tenantName,
      });

      return {
        filename: `purchase_summary_${current.start.toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }

    case "EXPENSES": {
      const expenses = await client.expense.findMany({
        where: {
          tenantId,
          expenseDate: { gte: current.start, lte: current.end },
        },
        orderBy: { expenseDate: "desc" },
      });

      const headers = [
        "Voucher #",
        "Expense Date",
        "Category",
        "Payee",
        "Amount (₹)",
        "Tax Amount (₹)",
        "Payment Mode",
        "Payment Ref",
        "Description",
      ];

      const rows = expenses.map((e: any) => [
        e.expenseNumber,
        new Date(e.expenseDate).toISOString().split("T")[0],
        e.category,
        e.payee,
        e.amount.toFixed(2),
        e.taxAmount.toFixed(2),
        e.paymentMode,
        e.paymentRef || "",
        e.description || "",
      ]);

      const content = buildCSV(headers, rows, {
        title: "Expense Register",
        period: periodStr,
        tenantName,
      });

      return {
        filename: `expenses_${current.start.toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }

    case "INVENTORY_VALUATION": {
      const variants = await client.productVariant.findMany({
        where: { tenantId, isActive: true },
        include: { product: { include: { category: true } } },
        orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
      });

      const headers = [
        "SKU",
        "Product Name",
        "Variant Name",
        "Category",
        "UOM",
        "Current Physical Stock",
        "Purchase Cost (₹)",
        "Selling Price (₹)",
        "Valuation at Cost (₹)",
        "Valuation at Retail (₹)",
      ];

      const rows = variants.map((v: any) => {
        const stock = v.currentStock || 0;
        const cost = v.purchasePrice || 0;
        const price = v.sellingPrice || 0;
        return [
          v.sku,
          v.product?.name || "",
          v.name,
          v.product?.category?.name || "General",
          v.product?.uom || "PCS",
          stock,
          cost.toFixed(2),
          price.toFixed(2),
          (stock * cost).toFixed(2),
          (stock * price).toFixed(2),
        ];
      });

      const content = buildCSV(headers, rows, {
        title: "Inventory Stock Valuation Report",
        period: `As of ${new Date().toISOString().split("T")[0]}`,
        tenantName,
      });

      return {
        filename: `inventory_valuation_${new Date().toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }

    case "LOW_STOCK": {
      const variants = await client.productVariant.findMany({
        where: { tenantId, isActive: true },
        include: { product: true },
        orderBy: { currentStock: "asc" },
      });

      const lowItems = variants.filter((v: any) => {
        const alert = v.product?.minStockAlert ?? 5;
        return (v.currentStock || 0) <= alert;
      });

      const headers = [
        "SKU",
        "Product Name",
        "Variant",
        "Current Stock",
        "Minimum Alert Threshold",
        "Shortfall",
        "Status",
      ];

      const rows = lowItems.map((v: any) => {
        const cur = v.currentStock || 0;
        const alert = v.product?.minStockAlert ?? 5;
        return [
          v.sku,
          v.product?.name || "",
          v.name,
          cur,
          alert,
          Math.max(0, alert - cur),
          cur <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        ];
      });

      const content = buildCSV(headers, rows, {
        title: "Low Stock & Reorder Notice",
        period: `As of ${new Date().toISOString().split("T")[0]}`,
        tenantName,
      });

      return {
        filename: `low_stock_report_${new Date().toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }

    case "STOCK_MOVEMENT": {
      const movements = await client.stockMovement.findMany({
        where: {
          tenantId,
          createdAt: { gte: current.start, lte: current.end },
        },
        include: { variant: { include: { product: true } }, location: true },
        orderBy: { createdAt: "desc" },
      });

      const headers = [
        "Date",
        "Movement Type",
        "SKU",
        "Product Name",
        "Warehouse / Location",
        "Quantity",
        "Unit Cost (₹)",
        "Balance After",
        "Reference",
        "Notes",
      ];

      const rows = movements.map((m: any) => [
        new Date(m.createdAt).toISOString().split("T")[0],
        m.type,
        m.variant?.sku || "",
        m.variant?.product?.name || "",
        m.location?.name || "Main",
        m.quantity,
        (m.unitCost || 0).toFixed(2),
        m.balanceAfter,
        m.referenceType || "",
        m.notes || "",
      ]);

      const content = buildCSV(headers, rows, {
        title: "Stock Movement Audit Trail",
        period: periodStr,
        tenantName,
      });

      return {
        filename: `stock_movements_${current.start.toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }

    case "CUSTOMER_OUTSTANDING": {
      const customers = await client.customer.findMany({
        where: { tenantId },
        orderBy: { outstandingBalance: "desc" },
      });

      const headers = [
        "Customer Name",
        "Phone",
        "GSTIN",
        "Credit Limit (₹)",
        "Outstanding Balance (₹)",
        "Overdue Status",
      ];

      const rows = customers.map((c: any) => [
        c.name,
        c.phone,
        c.gstin || "",
        (c.creditLimit || 0).toFixed(2),
        (c.outstandingBalance || 0).toFixed(2),
        (c.outstandingBalance || 0) > 0 ? "OVERDUE" : "SETTLED",
      ]);

      const content = buildCSV(headers, rows, {
        title: "Customer Outstanding Receivables Khata",
        period: `As of ${new Date().toISOString().split("T")[0]}`,
        tenantName,
      });

      return {
        filename: `customer_outstanding_${new Date().toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }

    case "SUPPLIER_OUTSTANDING": {
      const suppliers = await client.supplier.findMany({
        where: { tenantId },
        orderBy: { balance: "desc" },
      });

      const headers = [
        "Supplier / Vendor Name",
        "Phone",
        "GSTIN",
        "Company Name",
        "Outstanding Payable (₹)",
      ];

      const rows = suppliers.map((s: any) => [
        s.name,
        s.phone,
        s.gstin || "",
        s.companyName || "",
        (s.balance || 0).toFixed(2),
      ]);

      const content = buildCSV(headers, rows, {
        title: "Supplier Outstanding Payables Khata",
        period: `As of ${new Date().toISOString().split("T")[0]}`,
        tenantName,
      });

      return {
        filename: `supplier_outstanding_${new Date().toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }

    case "PROFITABILITY":
    case "CASH_FLOW":
    case "GENERAL_LEDGER":
    case "TRIAL_BALANCE":
    case "BALANCE_SHEET":
    default: {
      // General ledger / trial balance CSV export
      const accounts = await client.ledgerAccount.findMany({
        where: { tenantId },
        orderBy: [{ type: "asc" }, { code: "asc" }],
      });

      const headers = [
        "Account Code",
        "Account Name",
        "Type",
        "Category",
        "Current Balance (₹)",
        "System Account",
      ];

      const rows = accounts.map((a: any) => [
        a.code,
        a.name,
        a.type,
        a.category || "",
        (a.balance || 0).toFixed(2),
        a.isSystem ? "YES" : "NO",
      ]);

      const content = buildCSV(headers, rows, {
        title: `${reportType.replace(/_/g, " ")} Export`,
        period: periodStr,
        tenantName,
      });

      return {
        filename: `${reportType.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`,
        content,
        contentType: "text/csv; charset=utf-8",
      };
    }
  }
}

export type ExportFormat = "CSV" | "EXCEL" | "PDF";

/**
 * Universal multi-format export generator supporting CSV, Excel (SpreadsheetML), and PDF-printable HTML.
 */
export async function generateReportExport(
  tenantId: string,
  reportType: ExportReportType,
  options: AnalyticsFilterOptions = {},
  format: ExportFormat = "CSV",
  client: any = prisma
): Promise<{ filename: string; content: string; contentType: string }> {
  const csvResult = await generateReportCSV(tenantId, reportType, options, client);
  const baseFilename = csvResult.filename.replace(/\.csv$/, "");

  if (format === "CSV") {
    return csvResult;
  }

  // Parse lines back into headers, metadata, rows
  const lines = csvResult.content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const dataLines: string[][] = [];
  const meta: { title?: string; period?: string; tenantName?: string } = {};

  for (const line of lines) {
    if (line.startsWith('"ELVORA ENTERPRISE ERP - ')) {
      meta.title = line.replace(/^"ELVORA ENTERPRISE ERP - /, "").replace(/"$/, "");
      continue;
    }
    if (line.startsWith('"Organization: ')) {
      meta.tenantName = line.replace(/^"Organization: /, "").replace(/"$/, "");
      continue;
    }
    if (line.startsWith('"Period: ')) {
      meta.period = line.replace(/^"Period: /, "").replace(/"$/, "");
      continue;
    }
    if (line.startsWith('"Generated At: ')) {
      continue;
    }

    // Split CSV cells considering quotes
    const cells: string[] = [];
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      cells.push(val);
      if (regex.lastIndex >= line.length) break;
    }
    if (cells.length > 0) {
      dataLines.push(cells);
    }
  }

  const headers = dataLines.length > 0 ? dataLines[0] : [];
  const rows = dataLines.slice(1);

  if (format === "EXCEL") {
    const xml = buildExcelXml(headers, rows, {
      title: meta.title || reportType,
      period: meta.period,
      tenantName: meta.tenantName,
    });
    return {
      filename: `${baseFilename}.xls`,
      content: xml,
      contentType: "application/vnd.ms-excel; charset=utf-8",
    };
  }

  if (format === "PDF") {
    const html = buildPrintableHtml(headers, rows, {
      title: meta.title || reportType,
      period: meta.period,
      tenantName: meta.tenantName,
    });
    return {
      filename: `${baseFilename}.html`,
      content: html,
      contentType: "text/html; charset=utf-8",
    };
  }

  return csvResult;
}
