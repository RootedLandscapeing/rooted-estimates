"use client";

import {
  getApprovalStatement,
  getDocumentSubtitle,
  getDocumentTitle,
  getFooterStatement
} from "@/lib/quote-config";
import { Customer, Invoice, Job, Quote } from "@/lib/types";
import { formatCurrency, formatDate, toTitleCase } from "@/lib/formatters";
import { getInvoiceStatusLabel } from "@/lib/invoice-helpers";

const logoPath = "/rooted-logo.png";

function getLogoUrl() {
  if (typeof window === "undefined") {
    return logoPath;
  }

  return new URL(logoPath, window.location.origin).toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openDocument(title: string, body: string) {
  if (typeof window === "undefined") {
    return;
  }

  const html = `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            margin: 0;
            padding: 40px;
            color: #1e241d;
            background: #f7f2ea;
            font-family: Georgia, "Times New Roman", serif;
          }
          .sheet {
            max-width: 820px;
            margin: 0 auto;
            padding: 40px;
            background: #fffdfa;
            border: 1px solid #d8c9b6;
          }
          .topbar {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 32px;
          }
          .eyebrow {
            margin: 0 0 8px;
            color: #315c35;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            font: 12px/1.4 "Trebuchet MS", Helvetica, sans-serif;
          }
          .brand {
            display: flex;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 24px;
          }
          .brand img {
            width: 180px;
            height: auto;
            display: block;
          }
          h1, h2, h3, p {
            margin: 0;
          }
          h1 {
            font-size: 34px;
            margin-bottom: 12px;
          }
          .meta, .small {
            color: #5f665d;
            font: 14px/1.6 "Trebuchet MS", Helvetica, sans-serif;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
          }
          .panel {
            padding: 18px;
            border: 1px solid #d8c9b6;
            background: #fff;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            padding: 12px 10px;
            border-bottom: 1px solid #e5d8c8;
            text-align: left;
          }
          th {
            font: 12px/1.4 "Trebuchet MS", Helvetica, sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #5f665d;
          }
          .right {
            text-align: right;
          }
          .total {
            margin-top: 24px;
            display: flex;
            justify-content: flex-end;
          }
          .total-box {
            min-width: 260px;
            padding: 18px;
            background: #edf5ea;
            border: 1px solid #cfe0cb;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 8px;
            font: 14px/1.6 "Trebuchet MS", Helvetica, sans-serif;
          }
          .footer {
            margin-top: 32px;
            color: #5f665d;
            font: 14px/1.6 "Trebuchet MS", Helvetica, sans-serif;
          }
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 28px;
          }
          .signature-box {
            padding-top: 12px;
            border-top: 1px solid #1e241d;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .sheet {
              border: 0;
            }
          }
        </style>
      </head>
      <body>
        ${body}
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!printWindow) {
    window.URL.revokeObjectURL(url);
    return;
  }

  const cleanup = () => {
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  };

  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
    cleanup();
  });
}

export function printQuotePdf(quote: Quote, customer?: Customer) {
  const logoUrl = getLogoUrl();
  const documentTitle = getDocumentTitle(quote.status);
  const subtitle = getDocumentSubtitle(quote.status);
  const approvalStatement = getApprovalStatement(quote.status);
  const footerStatement = getFooterStatement(quote.status);
  const depositLabel = quote.depositRequired
    ? quote.depositType === "percent" && quote.depositPercent
      ? `${quote.depositPercent}% deposit due before scheduling (${formatCurrency(quote.depositAmount)})`
      : `${formatCurrency(quote.depositAmount)} deposit due before scheduling`
    : "No deposit required";
  const lineRows = quote.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td>${item.qty}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td class="right">${formatCurrency(item.amount)}</td>
        </tr>
      `
    )
    .join("");
  const effectiveCustomer = {
    fullName: quote.customerName || customer?.fullName || "Customer",
    address: quote.customerAddress || customer?.address || "",
    phone: quote.customerPhone || customer?.phone || "",
    email: quote.customerEmail || customer?.email || ""
  };
  const customerSignatureDisplay = quote.customerSignature
    ? `${quote.customerSignature}${quote.customerSignedAt ? ` • ${quote.customerSignedAt}` : ""}`
    : "Pending customer approval";
  const rootedSignatureDisplay = quote.rootedSignature
    ? `${quote.rootedSignature}${quote.rootedSignedAt ? ` • ${quote.rootedSignedAt}` : ""}`
    : "Pending Rooted signature";
  const createdLabel = quote.createdAt;
  const approvedLabel = quote.approvedAt ? `Approved: ${quote.approvedAt}` : "";

  openDocument(
    `Quote ${quote.id}`,
    `
      <main class="sheet">
        <section class="brand">
          <img src="${logoUrl}" alt="Rooted Moapa Valley Landscaping logo" />
          <div>
            <p class="eyebrow">Rooted Moapa Valley Landscaping</p>
            <p class="small">${escapeHtml(subtitle)}</p>
          </div>
        </section>
        <section class="topbar">
          <div>
            <p class="eyebrow">${escapeHtml(documentTitle)}</p>
            <h1>${escapeHtml(quote.projectTitle)}</h1>
            <p class="meta">Quote ID: ${escapeHtml(quote.id)}</p>
            <p class="meta">Created: ${escapeHtml(createdLabel)}</p>
            ${approvedLabel ? `<p class="meta">${escapeHtml(approvedLabel)}</p>` : ""}
          </div>
          <div>
            <p class="eyebrow">Customer Info</p>
            <p>${escapeHtml(effectiveCustomer.fullName)}</p>
            <p class="small">${escapeHtml(effectiveCustomer.address)}</p>
            <p class="small">${escapeHtml(effectiveCustomer.phone)}</p>
            <p class="small">${escapeHtml(effectiveCustomer.email)}</p>
          </div>
        </section>

        <section class="grid">
          <div class="panel">
            <p class="eyebrow">Project Title</p>
            <p>${escapeHtml(quote.projectTitle)}</p>
            <p class="small" style="margin-top:8px;">${escapeHtml(quote.scope)}</p>
          </div>
          <div class="panel">
            <p class="eyebrow">Deposit</p>
            <p>${escapeHtml(depositLabel)}</p>
          </div>
        </section>

        <section>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
          </table>
        </section>

        <section class="total">
          <div class="total-box">
            <p class="eyebrow">Quoted Total</p>
            <h2>${formatCurrency(quote.total)}</h2>
            <p class="small" style="margin-top:8px;">${escapeHtml(depositLabel)}</p>
          </div>
        </section>

        <section class="panel" style="margin-top:24px;">
          <p class="eyebrow">Terms</p>
          <ul style="margin:0; padding-left:18px;">
            ${quote.terms
              .map((term) => `<li class="small" style="margin-bottom:6px;">${escapeHtml(term)}</li>`)
              .join("")}
          </ul>
        </section>

        <section class="panel" style="margin-top:24px;">
          <p class="small">${escapeHtml(approvalStatement)}</p>
        </section>

        <section class="signature-grid">
          <div class="signature-box">
            <p class="small">${escapeHtml(customerSignatureDisplay)}</p>
            <p class="eyebrow">Customer Authorization</p>
          </div>
          <div class="signature-box">
            <p class="small">${escapeHtml(rootedSignatureDisplay)}</p>
            <p class="eyebrow">Rooted Signature</p>
          </div>
        </section>

        <section class="footer">
          <p>${escapeHtml(footerStatement)}</p>
        </section>
      </main>
    `
  );
}

export function printInvoicePdf(
  invoice: Invoice,
  quote?: Quote,
  customer?: Customer,
  job?: Job
) {
  const logoUrl = getLogoUrl();
  const relatedReference = invoice.relatedWorkAuthorizationId
    ? `Work Authorization ID: ${invoice.relatedWorkAuthorizationId}`
    : invoice.relatedQuoteId
      ? `Related Quote ID: ${invoice.relatedQuoteId}`
      : "";
  const serviceAddress = invoice.serviceAddress || invoice.billingAddress;
  const lineRows = invoice.lineItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(toTitleCase(item.description))}</td>
          <td>${item.qty}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td class="right">${formatCurrency(item.amount)}</td>
        </tr>
      `
    )
    .join("");
  const amountPaidDisplay = invoice.amountPaid > 0
    ? `
      <div class="total-line">
        <span>Amount Paid</span>
        <strong>${formatCurrency(invoice.amountPaid)}</strong>
      </div>
    `
    : "";
  const taxDisplay = invoice.taxAmount > 0
    ? `
      <div class="total-line">
        <span>Tax</span>
        <strong>${formatCurrency(invoice.taxAmount)}</strong>
      </div>
    `
    : "";

  openDocument(
    `Invoice ${invoice.id}`,
    `
      <main class="sheet">
        <section class="brand">
          <img src="${logoUrl}" alt="Rooted Moapa Valley Landscaping logo" />
          <div>
            <p class="eyebrow">Rooted Moapa Valley Landscaping</p>
            <p class="small">Invoice for completed landscaping services.</p>
          </div>
        </section>
        <section class="topbar">
          <div>
            <p class="eyebrow">Invoice</p>
            <h1>${escapeHtml(
              toTitleCase(invoice.projectTitle || quote?.projectTitle || "Completed Job")
            )}</h1>
            <p class="meta">Invoice ID: ${escapeHtml(invoice.id)}</p>
            <p class="meta">Issued: ${escapeHtml(formatDate(invoice.issuedAt || invoice.issueDate))}</p>
            <p class="meta">Due: ${escapeHtml(formatDate(invoice.dueAt || invoice.dueDate))}</p>
            <p class="meta">Status: ${escapeHtml(getInvoiceStatusLabel(invoice.status))}</p>
            ${relatedReference ? `<p class="meta">${escapeHtml(relatedReference)}</p>` : ""}
          </div>
          <div>
            <p class="eyebrow">Bill To</p>
            <p>${escapeHtml(invoice.customerName || customer?.fullName || "Customer")}</p>
            <p class="small">${escapeHtml(invoice.billingAddress || customer?.address || "")}</p>
            <p class="small">${escapeHtml(invoice.customerPhone || customer?.phone || "")}</p>
            <p class="small">${escapeHtml(invoice.customerEmail || customer?.email || "")}</p>
          </div>
        </section>

        <section class="grid">
          <div class="panel">
            <p class="eyebrow">Service Address</p>
            <p>${escapeHtml(serviceAddress)}</p>
          </div>
          <div class="panel">
            <p class="eyebrow">Project / Job Title</p>
            <p>${escapeHtml(toTitleCase(invoice.projectTitle || job?.title || quote?.projectTitle || "Completed Service"))}</p>
            <p class="small">${escapeHtml(invoice.jobDate ? `Job Date: ${formatDate(invoice.jobDate)}` : "")}</p>
          </div>
        </section>

        <section>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
          </table>
        </section>

        <section class="total">
          <div class="total-box">
            <div class="total-line">
              <span>Subtotal</span>
              <strong>${formatCurrency(invoice.subtotal)}</strong>
            </div>
            ${taxDisplay}
            <div class="total-line">
              <span>Total</span>
              <strong>${formatCurrency(invoice.total)}</strong>
            </div>
            ${amountPaidDisplay}
            <div class="total-line">
              <span>Balance Due</span>
              <strong>${formatCurrency(invoice.balanceDue)}</strong>
            </div>
          </div>
        </section>

        <section class="panel" style="margin-top:24px;">
          <p class="eyebrow">Payment Instructions</p>
          <ul style="margin:0; padding-left:18px;">
            ${invoice.paymentInstructions
              .map((instruction) => `<li class="small" style="margin-bottom:6px;">${escapeHtml(instruction)}</li>`)
              .join("")}
          </ul>
          ${
            invoice.paymentMethodNotes
              ? `<p class="small" style="margin-top:12px;">${escapeHtml(invoice.paymentMethodNotes)}</p>`
              : ""
          }
        </section>

        <section class="footer">
          <p>${escapeHtml(invoice.notes)}</p>
        </section>
      </main>
    `
  );
}
