import { formatINR } from "@/lib/utils/format";
import { convertNumberToWordsINR, getStateNameByCode } from "@/lib/finance/decimal";

export interface InvoicePrintData {
  invoice: any;
  tenant: any;
  printCopyType: string;
  amountInWords?: string;
}

/**
 * Generates print-ready HTML for standard A4 GST Tax Invoice / Bill of Supply.
 */
export function generateA4InvoiceHtml(data: InvoicePrintData): string {
  const { invoice, tenant, printCopyType } = data;
  const isGstRegistered = Boolean(tenant.gstin && tenant.gstin.trim().length === 15);
  const documentTitle = isGstRegistered ? "TAX INVOICE" : "BILL OF SUPPLY";
  const amountInWords = data.amountInWords || convertNumberToWordsINR(invoice.grandTotal);
  const isInterState = Boolean(invoice.isInterState);

  const tenantStateName = getStateNameByCode(tenant.stateCode || "09");
  const customerStateName = getStateNameByCode(invoice.customerState || "09");

  const itemsHtml = invoice.items
    .map((item: any, idx: number) => {
      const taxColumns = isGstRegistered
        ? isInterState
          ? `<td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${item.gstRate}%</td>
             <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${formatINR(item.igstAmount)}</td>`
          : `<td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${item.gstRate / 2}%</td>
             <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${formatINR(item.cgstAmount)}</td>
             <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${item.gstRate / 2}%</td>
             <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${formatINR(item.sgstAmount)}</td>`
        : "";

      return `
        <tr>
          <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${idx + 1}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">
            <strong>${item.productName}</strong>
            ${item.variantName && item.variantName !== "Standard" ? `<br/><span style="font-size: 10px; color: #64748b;">${item.variantName}</span>` : ""}
            ${item.sku ? `<span style="font-size: 10px; color: #2563eb; font-family: monospace;"> [${item.sku}]</span>` : ""}
          </td>
          <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-family: monospace;">${item.hsnCode || "-"}</td>
          <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${item.quantity} ${item.uom}</td>
          <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${formatINR(item.unitPrice)}</td>
          <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${item.discountAmount > 0 ? formatINR(item.discountAmount) : "-"}</td>
          <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">${formatINR(item.taxableAmount)}</td>
          ${taxColumns}
          <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${formatINR(item.totalAmount)}</td>
        </tr>
      `;
    })
    .join("");

  const taxHeaders = isGstRegistered
    ? isInterState
      ? `<th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">IGST %</th>
         <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">IGST Amt</th>`
      : `<th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">CGST %</th>
         <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">CGST Amt</th>
         <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">SGST %</th>
         <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">SGST Amt</th>`
    : "";

  const colSpanCount = isGstRegistered ? (isInterState ? 7 : 9) : 7;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${documentTitle} - ${invoice.invoiceNumber}</title>
  <style>
    @media print {
      @page { size: A4; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #0f172a;
      line-height: 1.4;
      margin: 0;
      padding: 16px;
      background: #fff;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      padding: 24px;
    }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 8px;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="invoice-card">
    <!-- Top Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
          ${tenant.tradeName || tenant.legalName}
        </h1>
        ${tenant.tradeName && tenant.legalName !== tenant.tradeName ? `<div style="font-size: 11px; color: #64748b;">(Legal: ${tenant.legalName})</div>` : ""}
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">
          ${tenant.address || ""}<br/>
          State: <strong>${tenantStateName} (${tenant.stateCode || "09"})</strong><br/>
          Phone: ${tenant.phone || ""} ${tenant.email ? `• Email: ${tenant.email}` : ""}
        </div>
        ${isGstRegistered ? `<div style="margin-top: 4px; font-size: 12px; font-weight: bold; color: #0f172a;">GSTIN: <span style="font-family: monospace;">${tenant.gstin}</span></div>` : `<div style="margin-top: 4px; font-size: 10px; color: #64748b; font-style: italic;">Composition / Unregistered Dealer under GST</div>`}
      </div>

      <div style="text-align: right;">
        <div style="font-size: 16px; font-weight: 900; color: #1e40af; letter-spacing: 0.5px;">${documentTitle}</div>
        <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 2px;">${printCopyType}</div>
        <div style="margin-top: 8px; font-size: 12px;">
          Invoice No: <strong style="font-family: monospace; font-size: 13px;">${invoice.invoiceNumber}</strong><br/>
          Date: <strong>${new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong><br/>
          ${invoice.dueDate ? `Due Date: <strong>${new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong><br/>` : ""}
          Place of Supply: <strong>${invoice.placeOfSupply || `${invoice.customerState}-${customerStateName}`}</strong>
        </div>
      </div>
    </div>

    <!-- Bill To / Ship To -->
    <div style="display: flex; gap: 16px; margin-top: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
      <div style="flex: 1;">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b;">Bill To (Buyer):</div>
        <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;">${invoice.customerName}</div>
        ${invoice.customerPhone ? `<div style="font-size: 11px; color: #475569;">Phone: ${invoice.customerPhone}</div>` : ""}
        ${invoice.billingAddress ? `<div style="font-size: 11px; color: #475569;">${invoice.billingAddress}</div>` : ""}
        <div style="font-size: 11px; color: #475569;">State: ${customerStateName} (${invoice.customerState})</div>
        ${invoice.customerGstin ? `<div style="font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 2px;">GSTIN: <span style="font-family: monospace;">${invoice.customerGstin}</span></div>` : ""}
      </div>

      <div style="flex: 1; border-left: 1px solid #f1f5f9; padding-left: 16px;">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b;">Shipping / Delivery Address:</div>
        <div style="font-size: 11px; color: #334155; margin-top: 2px;">
          ${invoice.shippingAddress || invoice.billingAddress || "Same as billing address"}
        </div>
        <div style="margin-top: 8px; font-size: 11px;">
          Payment Mode: <strong style="text-transform: uppercase;">${invoice.paymentMode}</strong> •
          Status: <strong style="color: ${invoice.status === 'CANCELLED' ? '#e11d48' : '#059669'};">${invoice.status}</strong>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div style="margin-top: 16px;">
      <table style="font-size: 11px;">
        <thead>
          <tr style="background: #f8fafc; font-weight: 700; color: #334155;">
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; width: 28px;">#</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Item Description</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; width: 55px;">HSN</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; width: 60px;">Qty</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 70px;">Rate</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 55px;">Disc</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 75px;">Taxable</th>
            ${taxHeaders}
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 85px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <!-- Subtotal / Summary Rows -->
          <tr>
            <td colspan="${colSpanCount}" style="padding: 6px; text-align: right; font-weight: bold; border: 1px solid #cbd5e1;">
              Taxable Amount:
            </td>
            <td style="padding: 6px; text-align: right; font-weight: bold; border: 1px solid #cbd5e1;">
              ${formatINR(invoice.taxableAmount)}
            </td>
          </tr>

          ${isGstRegistered && !isInterState ? `
          <tr>
            <td colspan="${colSpanCount}" style="padding: 5px; text-align: right; border: 1px solid #cbd5e1; color: #475569;">
              Central GST (CGST Total):
            </td>
            <td style="padding: 5px; text-align: right; border: 1px solid #cbd5e1;">
              ${formatINR(invoice.cgstAmount)}
            </td>
          </tr>
          <tr>
            <td colspan="${colSpanCount}" style="padding: 5px; text-align: right; border: 1px solid #cbd5e1; color: #475569;">
              State GST (SGST Total):
            </td>
            <td style="padding: 5px; text-align: right; border: 1px solid #cbd5e1;">
              ${formatINR(invoice.sgstAmount)}
            </td>
          </tr>
          ` : ""}

          ${isGstRegistered && isInterState ? `
          <tr>
            <td colspan="${colSpanCount}" style="padding: 5px; text-align: right; border: 1px solid #cbd5e1; color: #475569;">
              Integrated GST (IGST Total):
            </td>
            <td style="padding: 5px; text-align: right; border: 1px solid #cbd5e1;">
              ${formatINR(invoice.igstAmount)}
            </td>
          </tr>
          ` : ""}

          ${invoice.roundOff !== 0 ? `
          <tr>
            <td colspan="${colSpanCount}" style="padding: 5px; text-align: right; border: 1px solid #cbd5e1; color: #64748b;">
              Round Off:
            </td>
            <td style="padding: 5px; text-align: right; border: 1px solid #cbd5e1;">
              ${invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}
            </td>
          </tr>
          ` : ""}

          <tr style="background: #f1f5f9; font-size: 13px;">
            <td colspan="${colSpanCount}" style="padding: 8px; text-align: right; font-weight: 800; border: 1px solid #cbd5e1;">
              Grand Total:
            </td>
            <td style="padding: 8px; text-align: right; font-weight: 900; color: #1e3a8a; border: 1px solid #cbd5e1;">
              ${formatINR(invoice.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Amount in words & Payment Details -->
    <div style="margin-top: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
      <div style="font-size: 11px;">
        Amount in Words: <strong>${amountInWords}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; border-top: 1px dashed #cbd5e1; pt-1;">
        <span>Paid Amount: <strong>${formatINR(invoice.paidAmount)}</strong> (${invoice.paymentMode})</span>
        <span>Balance Due: <strong style="color: ${invoice.balanceAmount > 0 ? '#b91c1c' : '#15803d'};">${formatINR(invoice.balanceAmount)}</strong></span>
      </div>
    </div>

    ${tenant.bankName ? `
    <div style="margin-top: 8px; font-size: 10px; color: #334155; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; background: #fff;">
      <strong>Bank Details for NEFT/RTGS:</strong> Bank: <strong>${tenant.bankName}</strong> | A/C: <strong>${tenant.bankAccountNumber || "-"}</strong> | IFSC: <strong>${tenant.bankIfsc || "-"}</strong> ${tenant.bankBranch ? `| Branch: ${tenant.bankBranch}` : ""}
    </div>` : ""}

    <!-- Terms & Signatures -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; padding-top: 16px;">
      <div style="font-size: 10px; color: #64748b; max-width: 420px;">
        <strong>Terms & Conditions:</strong><br/>
        1. Goods once sold will be accepted back only in original packed condition.<br/>
        2. Breakage, leakage, or transit damages must be reported within 24 hours of delivery.<br/>
        3. Disputes are subject to local judicial jurisdiction.
      </div>

      <div style="text-align: center; width: 200px;">
        <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin-bottom: 40px;">
          For ${tenant.tradeName || tenant.legalName}
        </div>
        <div style="border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 10px; color: #475569;">
          Authorized Signatory
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates compact 80mm / 3-inch thermal POS receipt HTML.
 */
export function generateThermalReceiptHtml(data: InvoicePrintData): string {
  const { invoice, tenant } = data;
  const isGstRegistered = Boolean(tenant.gstin);

  const itemsHtml = invoice.items
    .map(
      (item: any) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>${item.productName.slice(0, 20)}</span>
        <span>${formatINR(item.totalAmount)}</span>
      </div>
      <div style="font-size: 10px; color: #555; margin-bottom: 4px;">
        ${item.quantity} x ${formatINR(item.unitPrice)} ${item.discountAmount > 0 ? `(-${formatINR(item.discountAmount)})` : ""}
      </div>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt - ${invoice.invoiceNumber}</title>
  <style>
    @media print {
      @page { size: 80mm auto; margin: 2mm; }
    }
    body {
      width: 76mm;
      margin: 0 auto;
      font-family: monospace;
      font-size: 11px;
      color: #000;
      line-height: 1.3;
      padding: 4px;
    }
  </style>
</head>
<body onload="window.print()">
  <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px;">
    <strong style="font-size: 14px;">${tenant.tradeName || tenant.legalName}</strong><br/>
    ${tenant.phone ? `Tel: ${tenant.phone}<br/>` : ""}
    ${isGstRegistered ? `GSTIN: ${tenant.gstin}<br/>` : ""}
    <strong>${isGstRegistered ? "TAX INVOICE" : "RETAIL RECEIPT"}</strong>
  </div>

  <div style="margin: 6px 0; font-size: 10px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
    Inv: ${invoice.invoiceNumber}<br/>
    Date: ${new Date(invoice.invoiceDate).toLocaleString()}<br/>
    Customer: ${invoice.customerName}
  </div>

  <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
    ${itemsHtml}
  </div>

  <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; font-size: 11px;">
    <div style="display: flex; justify-content: space-between;">
      <span>Taxable:</span>
      <span>${formatINR(invoice.taxableAmount)}</span>
    </div>
    ${isGstRegistered ? `
    <div style="display: flex; justify-content: space-between;">
      <span>Total Tax:</span>
      <span>${formatINR(invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount)}</span>
    </div>` : ""}
    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 4px;">
      <span>TOTAL:</span>
      <span>${formatINR(invoice.grandTotal)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
      <span>Paid (${invoice.paymentMode}):</span>
      <span>${formatINR(invoice.paidAmount)}</span>
    </div>
    ${invoice.balanceAmount > 0 ? `
    <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold;">
      <span>Balance Due:</span>
      <span>${formatINR(invoice.balanceAmount)}</span>
    </div>` : ""}
  </div>

  <div style="text-align: center; font-size: 10px; margin-top: 8px;">
    Thank You! Visit Again.<br/>
    Powered by Elvora
  </div>
</body>
</html>
  `;
}
