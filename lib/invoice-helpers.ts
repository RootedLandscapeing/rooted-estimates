import { DEFAULT_INVOICE_NOTES, DEFAULT_PAYMENT_INSTRUCTIONS } from "@/lib/invoice-config";
import { Invoice, InvoiceLineItem, InvoiceStatus, Quote } from "@/lib/types";

function startOfToday() {
  return new Date(new Date().toISOString().slice(0, 10));
}

export function deriveInvoiceStatus(
  amountPaid: number,
  total: number,
  dueAt?: string,
  currentStatus?: InvoiceStatus
): InvoiceStatus {
  if (currentStatus === "void") {
    return "void";
  }

  const balanceDue = Math.max(total - amountPaid, 0);
  if (amountPaid >= total && total > 0) {
    return "paid";
  }

  if (amountPaid > 0 && amountPaid < total) {
    return "partially_paid";
  }

  if (dueAt) {
    const dueDate = new Date(dueAt);
    if (!Number.isNaN(dueDate.getTime()) && dueDate < startOfToday() && balanceDue > 0) {
      return "overdue";
    }
  }

  return currentStatus === "draft" ? "draft" : "issued";
}

export function getInvoiceStatusLabel(status: InvoiceStatus) {
  switch (status) {
    case "partially_paid":
      return "Partially Paid";
    case "paid":
      return "Paid";
    case "overdue":
      return "Overdue";
    case "void":
      return "Void";
    case "draft":
      return "Draft";
    case "issued":
    default:
      return "Issued";
  }
}

export function normalizeInvoiceLineItems(
  invoice: Partial<Invoice>,
  relatedQuote?: Quote
): InvoiceLineItem[] {
  if (invoice.lineItems?.length) {
    return invoice.lineItems.map((item) => ({
      ...item,
      amount: item.amount ?? item.qty * item.unitPrice
    }));
  }

  if (relatedQuote?.items?.length) {
    return relatedQuote.items.map((item) => ({
      id: item.id,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      amount: item.amount
    }));
  }

  if (invoice.amount && (invoice as { description?: string }).description) {
    return [
      {
        id: "legacy-line-1",
        description: (invoice as { description?: string }).description ?? "Service",
        qty: 1,
        unitPrice: invoice.amount,
        amount: invoice.amount
      }
    ];
  }

  if (invoice.amount) {
    return [
      {
        id: "legacy-line-1",
        description: "Completed Service",
        qty: 1,
        unitPrice: invoice.amount,
        amount: invoice.amount
      }
    ];
  }

  return [];
}

export function normalizeInvoice(invoice: Partial<Invoice>, relatedQuote?: Quote): Invoice {
  const lineItems = normalizeInvoiceLineItems(invoice, relatedQuote);
  const subtotal =
    invoice.subtotal ?? lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const taxAmount = invoice.taxAmount ?? 0;
  const total = invoice.total ?? subtotal + taxAmount;
  const amountPaid = invoice.amountPaid ?? 0;
  const balanceDue = invoice.balanceDue ?? Math.max(total - amountPaid, 0);
  const status = deriveInvoiceStatus(amountPaid, total, invoice.dueAt ?? invoice.dueDate, invoice.status);

  return {
    id: invoice.id ?? "invoice-missing-id",
    customerId: invoice.customerId ?? relatedQuote?.customerId ?? "",
    relatedQuoteId: invoice.relatedQuoteId ?? invoice.quoteId,
    relatedWorkAuthorizationId:
      invoice.relatedWorkAuthorizationId ??
      (relatedQuote?.status === "approved" || relatedQuote?.status === "completed"
        ? relatedQuote.id
        : undefined),
    createdAt: invoice.createdAt ?? invoice.issueDate ?? new Date().toISOString().slice(0, 10),
    issuedAt: invoice.issuedAt ?? invoice.issueDate ?? new Date().toISOString().slice(0, 10),
    dueAt:
      invoice.dueAt ??
      invoice.dueDate ??
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
    status,
    customerName: invoice.customerName ?? relatedQuote?.customerName ?? "",
    billingAddress: invoice.billingAddress ?? relatedQuote?.customerAddress ?? "",
    serviceAddress:
      invoice.serviceAddress ?? relatedQuote?.customerAddress ?? invoice.billingAddress ?? "",
    customerPhone: invoice.customerPhone ?? relatedQuote?.customerPhone ?? "",
    customerEmail: invoice.customerEmail ?? relatedQuote?.customerEmail ?? "",
    projectTitle: invoice.projectTitle ?? relatedQuote?.projectTitle ?? "Completed Service",
    jobDate: invoice.jobDate ?? relatedQuote?.completedAt ?? relatedQuote?.approvedAt,
    lineItems,
    subtotal,
    taxAmount,
    total,
    amountPaid,
    balanceDue,
    paymentMethodNotes: invoice.paymentMethodNotes ?? "",
    notes: invoice.notes ?? DEFAULT_INVOICE_NOTES,
    paymentInstructions:
      invoice.paymentInstructions?.length ? invoice.paymentInstructions : DEFAULT_PAYMENT_INSTRUCTIONS,
    jobId: invoice.jobId,
    quoteId: invoice.quoteId ?? invoice.relatedQuoteId ?? "",
    issueDate: invoice.issueDate ?? invoice.issuedAt ?? new Date().toISOString().slice(0, 10),
    dueDate:
      invoice.dueDate ??
      invoice.dueAt ??
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
    amount: invoice.amount ?? total,
    paymentNotes: invoice.paymentNotes ?? ""
  };
}
