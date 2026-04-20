"use client";

import { defaultData } from "@/lib/mock-data";
import { normalizeAvailability } from "@/lib/availability";
import { deriveInvoiceStatus, normalizeInvoice } from "@/lib/invoice-helpers";
import { DEFAULT_QUOTE_TERMS, canApproveQuote } from "@/lib/quote-config";
import {
  AppData,
  AppNotification,
  Customer,
  EstimateRequest,
  Expense,
  Invoice,
  Job,
  Payment,
  Quote,
  QuoteStatus,
  QuoteLineItem,
  Task,
  TaskPriority,
  TaskStatus,
  TimeCategory,
  TimeEntry
} from "@/lib/types";

const STORAGE_KEY = "rooted-estimates-data";
const TIME_ENTRY_RESET_KEY = "rooted-time-entry-reset-2026-04-20";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeData(raw: Partial<AppData>): AppData {
  return {
    availability: normalizeAvailability(raw.availability),
    customers: (raw.customers ?? defaultData.customers).map((customer) => ({
      ...customer,
      lifecycle: customer.lifecycle ?? "lead"
    })),
    estimateRequests: raw.estimateRequests ?? defaultData.estimateRequests,
    notifications: raw.notifications ?? defaultData.notifications,
    tasks: (raw.tasks ?? defaultData.tasks).map((task) => ({
      ...task,
      description: task.description ?? "",
      dueDate: task.dueDate ?? new Date().toISOString().slice(0, 10),
      status: task.status ?? "to_do",
      priority: task.priority ?? "normal",
      createdAt: task.createdAt ?? new Date().toISOString().slice(0, 10)
    })),
    timeEntries: (raw.timeEntries ?? defaultData.timeEntries).map((entry) => ({
      ...entry,
      entryDate: entry.entryDate ?? new Date().toISOString().slice(0, 10),
      note: entry.note ?? "",
      minutes: entry.minutes ?? 0,
      isRunning: entry.isRunning ?? false,
      createdAt: entry.createdAt ?? new Date().toISOString().slice(0, 10)
    })),
    quotes: (raw.quotes ?? defaultData.quotes).map((quote) => {
      const legacyQuote = quote as Quote & {
        title?: string;
        contractorSignature?: string;
        lineItems?: Array<{
          id: string;
          label?: string;
          description?: string;
          quantity?: number;
          qty?: number;
          unitPrice?: number;
          amount?: number;
        }>;
      };

      const fallbackItems = Array.isArray(legacyQuote.lineItems)
        ? legacyQuote.lineItems.map((item) => ({
            id: item.id,
            description: item.label ?? item.description ?? "",
            qty: item.quantity ?? item.qty ?? 1,
            unitPrice: item.unitPrice ?? 0,
            amount:
              item.amount ?? (item.quantity ?? item.qty ?? 1) * (item.unitPrice ?? 0)
          }))
        : defaultData.quotes[0]?.items ?? [];

      const items = Array.isArray(quote.items) && quote.items.length ? quote.items : fallbackItems;
      const normalizedTotal =
        quote.total ??
        items.reduce((sum, item) => sum + (item.amount ?? item.qty * item.unitPrice), 0);

      return {
        ...quote,
        customerName: quote.customerName ?? "",
        customerAddress: quote.customerAddress ?? "",
        customerPhone: quote.customerPhone ?? "",
        customerEmail: quote.customerEmail ?? "",
        projectTitle: quote.projectTitle ?? legacyQuote.title ?? "",
        scope: quote.scope ?? "",
        items,
        total: normalizedTotal,
        depositType: quote.depositType ?? (quote.depositRequired ? "fixed" : "none"),
        depositAmount: quote.depositAmount ?? 0,
        depositPercent: quote.depositPercent ?? 0,
        depositRequired: quote.depositRequired ?? false,
        terms: quote.terms?.length ? quote.terms : DEFAULT_QUOTE_TERMS,
        customerSignature: quote.customerSignature ?? "",
        customerSignedAt: quote.customerSignedAt,
        rootedSignature: quote.rootedSignature ?? legacyQuote.contractorSignature ?? "",
        rootedSignedAt: quote.rootedSignedAt,
        approvedAt: quote.approvedAt,
        completedAt: quote.completedAt,
        status: (quote.status as QuoteStatus) ?? "draft"
      } satisfies Quote;
    }),
    jobs: raw.jobs ?? defaultData.jobs,
    invoices: (raw.invoices ?? defaultData.invoices).map((invoice) => {
      const relatedQuote = (raw.quotes ?? defaultData.quotes).find(
        (quote) => quote.id === (invoice.relatedQuoteId ?? invoice.quoteId)
      );
      return normalizeInvoice(invoice, relatedQuote);
    }),
    payments: raw.payments ?? defaultData.payments,
    expenses: raw.expenses ?? defaultData.expenses,
    siteContent: {
      ...defaultData.siteContent,
      ...raw.siteContent,
      services: raw.siteContent?.services?.length
        ? raw.siteContent.services
        : defaultData.siteContent.services,
      featuredProjects: raw.siteContent?.featuredProjects?.length
        ? raw.siteContent.featuredProjects.map((project) => ({
            ...project,
            imageDataUrl: project.imageDataUrl ?? ""
          }))
        : defaultData.siteContent.featuredProjects
    }
  };
}

export function loadAppData(): AppData {
  if (!canUseStorage()) {
    return defaultData;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const normalized = normalizeData(parsed);

    if (!window.localStorage.getItem(TIME_ENTRY_RESET_KEY)) {
      normalized.timeEntries = [];
      window.localStorage.setItem(TIME_ENTRY_RESET_KEY, "done");
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }
}

export function saveAppData(data: AppData) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function dateOffset(days: number) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate.toISOString().slice(0, 10);
}

function normalizeMatchValue(value: string) {
  return value.trim().toLowerCase();
}

export function createEstimateLead(
  data: AppData,
  payload: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    preferredContact: Customer["preferredContact"];
    notes: string;
    preferredSlot: string;
    jobType: string;
    description: string;
  }
): AppData {
  const requestId = makeId("estimate");
  const normalizedEmail = normalizeMatchValue(payload.email);
  const normalizedPhone = normalizeMatchValue(payload.phone);
  const normalizedAddress = normalizeMatchValue(payload.address);

  const existingCustomer = data.customers.find((customer) => {
    const emailMatches =
      normalizedEmail.length > 0 && normalizeMatchValue(customer.email) === normalizedEmail;
    const phoneMatches =
      normalizedPhone.length > 0 && normalizeMatchValue(customer.phone) === normalizedPhone;
    const addressMatches =
      normalizedAddress.length > 0 &&
      normalizeMatchValue(customer.address) === normalizedAddress;

    return emailMatches || phoneMatches || addressMatches;
  });

  const customerId = existingCustomer?.id ?? makeId("customer");

  const customer: Customer = {
    id: customerId,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    preferredContact: payload.preferredContact,
    notes: payload.notes,
    createdAt: existingCustomer?.createdAt ?? new Date().toISOString().slice(0, 10),
    lifecycle: existingCustomer?.lifecycle === "archived" ? "active" : existingCustomer?.lifecycle ?? "lead"
  };

  const estimateRequest: EstimateRequest = {
    id: requestId,
    customerId,
    preferredSlot: payload.preferredSlot,
    jobType: payload.jobType,
    description: payload.description,
    photos: [],
    status: "new lead",
    createdAt: new Date().toISOString().slice(0, 10),
    serviceAddress: payload.address
  };

  const notification: AppNotification = {
    id: makeId("notification"),
    type: "estimate_request",
    title: "New estimate request",
    message: `${payload.fullName} requested ${payload.preferredSlot} for ${payload.jobType}.`,
    createdAt: new Date().toISOString(),
    estimateRequestId: requestId,
    customerId,
    read: false
  };

  const followUpTask: Task = {
    id: makeId("task"),
    title: `Follow up with ${payload.fullName}`,
    description: `New estimate request for ${payload.jobType}. Preferred time: ${payload.preferredSlot}.`,
    dueDate: dateOffset(1),
    status: "to_do",
    priority: "high",
    relatedLeadId: requestId,
    relatedCustomerId: customerId,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  return {
    ...data,
    customers: existingCustomer
      ? data.customers.map((item) => (item.id === existingCustomer.id ? customer : item))
      : [customer, ...data.customers],
    estimateRequests: [estimateRequest, ...data.estimateRequests],
    notifications: [notification, ...data.notifications],
    tasks: [followUpTask, ...data.tasks]
  };
}

function buildScheduledEstimateLabel(estimateDate: string, estimateTime: string) {
  const dateTime = new Date(`${estimateDate}T${estimateTime}:00`);
  return `Scheduled for ${dateTime.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })} at ${dateTime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

export function markNotificationsRead(data: AppData, notificationIds?: string[]): AppData {
  const idsToMark = notificationIds?.length ? new Set(notificationIds) : null;

  return {
    ...data,
    notifications: data.notifications.map((notification) =>
      !idsToMark || idsToMark.has(notification.id)
        ? { ...notification, read: true }
        : notification
    )
  };
}

export function createQuote(
  data: AppData,
  payload: {
    customerId: string;
    estimateRequestId?: string;
    customerName: string;
    customerAddress: string;
    customerPhone: string;
    customerEmail: string;
    projectTitle: string;
    scope: string;
    depositType?: Quote["depositType"];
    items: QuoteLineItem[];
    depositAmount: number;
    depositPercent?: number;
    depositRequired: boolean;
    rootedSignature: string;
  }
): AppData {
  const total = payload.items.reduce((sum, item) => sum + item.amount, 0);

  const quote: Quote = {
    id: makeId("quote"),
    customerId: payload.customerId,
    estimateRequestId: payload.estimateRequestId,
    customerName: payload.customerName,
    customerAddress: payload.customerAddress,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail,
    projectTitle: payload.projectTitle,
    scope: payload.scope,
    depositType: payload.depositType ?? (payload.depositRequired ? "fixed" : "none"),
    items: payload.items,
    total,
    depositAmount: payload.depositAmount,
    depositPercent: payload.depositPercent ?? 0,
    depositRequired: payload.depositRequired,
    terms: DEFAULT_QUOTE_TERMS,
    customerSignature: "",
    customerSignedAt: undefined,
    rootedSignature: payload.rootedSignature,
    rootedSignedAt: payload.rootedSignature ? new Date().toISOString().slice(0, 10) : undefined,
    approvedAt: undefined,
    completedAt: undefined,
    status: "draft",
    createdAt: new Date().toISOString().slice(0, 10)
  };

  return {
    ...data,
    quotes: [quote, ...data.quotes],
    estimateRequests: data.estimateRequests.map((request) =>
      request.id === payload.estimateRequestId
        ? { ...request, status: "estimate completed" }
        : request
    )
  };
}

export function scheduleEstimate(
  data: AppData,
  payload: {
    estimateRequestId: string;
    estimateDate: string;
    estimateTime: string;
    note?: string;
  }
): AppData {
  const estimate = data.estimateRequests.find((item) => item.id === payload.estimateRequestId);
  if (!estimate) {
    return data;
  }

  const customer = data.customers.find((item) => item.id === estimate.customerId);
  const scheduledLabel = buildScheduledEstimateLabel(payload.estimateDate, payload.estimateTime);
  const scheduleTask: Task = {
    id: makeId("task"),
    title: `Estimate scheduled for ${customer?.fullName ?? estimate.jobType}`,
    description: [
      `${estimate.jobType} scheduled for ${scheduledLabel}.`,
      payload.note?.trim() ? `Note: ${payload.note.trim()}` : ""
    ]
      .filter(Boolean)
      .join(" "),
    dueDate: payload.estimateDate,
    status: "to_do",
    priority: "high",
    relatedLeadId: estimate.id,
    relatedCustomerId: estimate.customerId,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  return {
    ...data,
    estimateRequests: data.estimateRequests.map((request) =>
      request.id === estimate.id
        ? { ...request, status: "estimate scheduled" }
        : request
    ),
    tasks: [scheduleTask, ...data.tasks]
  };
}

export function sendQuote(data: AppData, quoteId: string): AppData {
  const matchingQuote = data.quotes.find((quote) => quote.id === quoteId);
  const quoteFollowUpTask: Task | null = matchingQuote
    ? {
        id: makeId("task"),
        title: `Follow up on quote for ${matchingQuote.projectTitle}`,
        description: `Check whether ${matchingQuote.customerName} wants to approve or decline this quote.`,
        dueDate: dateOffset(3),
        status: "to_do",
        priority: "normal",
        relatedCustomerId: matchingQuote.customerId,
        relatedLeadId: matchingQuote.estimateRequestId,
        relatedQuoteId: matchingQuote.id,
        createdAt: new Date().toISOString().slice(0, 10)
      }
    : null;

  return {
    ...data,
    quotes: data.quotes.map((quote) =>
      quote.id === quoteId && quote.status === "draft" ? { ...quote, status: "sent" } : quote
    ),
    estimateRequests: data.estimateRequests.map((request) => {
      const matchingQuote = data.quotes.find((quote) => quote.id === quoteId);
      if (!matchingQuote || request.id !== matchingQuote.estimateRequestId) {
        return request;
      }

      return { ...request, status: "quote sent" };
    }),
    tasks: quoteFollowUpTask ? [quoteFollowUpTask, ...data.tasks] : data.tasks
  };
}

export function approveQuote(
  data: AppData,
  quoteId: string,
  options?: { allowDraftApproval?: boolean; withCustomerSignature?: boolean }
): AppData {
  const quote = data.quotes.find((item) => item.id === quoteId);
  if (!quote || !canApproveQuote(quote.status, options?.allowDraftApproval)) {
    return data;
  }

  const approvedAt = new Date().toISOString().slice(0, 10);
  const customerSignedAt = options?.withCustomerSignature === false ? undefined : approvedAt;

  const job: Job = {
    id: makeId("job"),
    customerId: quote.customerId,
    quoteId: quote.id,
    title: quote.projectTitle,
    scheduledDate: approvedAt,
    status: "scheduled",
    notes: "New job created from approved quote."
  };

  return {
    ...data,
    quotes: data.quotes.map((item) =>
      item.id === quoteId
        ? {
            ...item,
            status: "approved",
            approvedAt,
            customerSignature: item.customerSignature || item.customerName,
            customerSignedAt,
            rootedSignedAt: item.rootedSignedAt ?? approvedAt
          }
        : item
    ),
    customers: data.customers.map((customer) =>
      customer.id === quote.customerId ? { ...customer, lifecycle: "active" } : customer
    ),
    jobs: data.jobs.some((item) => item.quoteId === quote.id) ? data.jobs : [job, ...data.jobs],
    estimateRequests: data.estimateRequests.map((request) =>
      request.id === quote.estimateRequestId ? { ...request, status: "approved" } : request
    )
  };
}

export function declineQuote(data: AppData, quoteId: string): AppData {
  const quote = data.quotes.find((item) => item.id === quoteId);
  if (!quote || quote.status !== "sent") {
    return data;
  }

  return {
    ...data,
    quotes: data.quotes.map((item) =>
      item.id === quoteId ? { ...item, status: "declined" } : item
    ),
    estimateRequests: data.estimateRequests.map((request) =>
      request.id === quote.estimateRequestId ? { ...request, status: "declined" } : request
    )
  };
}

export function completeJobAndCreateInvoice(data: AppData, jobId: string): AppData {
  const job = data.jobs.find((item) => item.id === jobId);
  if (!job) {
    return data;
  }

  const quote = data.quotes.find((item) => item.id === job.quoteId);
  if (!quote || (quote.status !== "approved" && quote.status !== "completed")) {
    return data;
  }

  const existingInvoice = data.invoices.find((item) => item.jobId === job.id);
  const completedAt = new Date().toISOString().slice(0, 10);

  const invoice: Invoice = {
    ...normalizeInvoice(
      {
        id: existingInvoice?.id ?? makeId("invoice"),
        customerId: job.customerId,
        relatedQuoteId: quote.id,
        relatedWorkAuthorizationId:
          quote.status === "approved" || quote.status === "completed" ? quote.id : undefined,
        createdAt: existingInvoice?.createdAt ?? completedAt,
        issuedAt: existingInvoice?.issuedAt ?? completedAt,
        dueAt:
          existingInvoice?.dueAt ??
          new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
        quoteId: quote.id,
        jobId: job.id,
        issueDate: existingInvoice?.issueDate ?? completedAt,
        dueDate:
          existingInvoice?.dueDate ??
          new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
        customerName: quote.customerName,
        billingAddress: quote.customerAddress,
        serviceAddress:
          data.estimateRequests.find((request) => request.id === quote.estimateRequestId)
            ?.serviceAddress ?? quote.customerAddress,
        customerPhone: quote.customerPhone,
        customerEmail: quote.customerEmail,
        projectTitle: quote.projectTitle,
        jobDate: completedAt,
        lineItems: quote.items.map((item) => ({
          id: item.id,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          amount: item.amount
        })),
        subtotal: quote.items.reduce((sum, item) => sum + item.amount, 0),
        taxAmount: existingInvoice?.taxAmount ?? 0,
        total: quote.total + (existingInvoice?.taxAmount ?? 0),
        amountPaid: existingInvoice?.amountPaid ?? 0,
        balanceDue: existingInvoice?.balanceDue,
        paymentMethodNotes: existingInvoice?.paymentMethodNotes ?? "",
        notes: existingInvoice?.notes,
        paymentInstructions: existingInvoice?.paymentInstructions,
        amount: quote.total + (existingInvoice?.taxAmount ?? 0),
        status: existingInvoice?.status,
        paymentNotes: existingInvoice?.paymentNotes ?? ""
      },
      quote
    )
  };

  const paymentFollowUpTask: Task = {
    id: makeId("task"),
    title: `Follow up on invoice for ${quote.projectTitle}`,
    description: `Invoice ${invoice.id} was created. Confirm payment or follow up before the due date.`,
    dueDate: invoice.dueAt,
    status: "to_do",
    priority: "normal",
    relatedCustomerId: quote.customerId,
    relatedJobId: job.id,
    relatedQuoteId: quote.id,
    relatedInvoiceId: invoice.id,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  return {
    ...data,
    jobs: data.jobs.map((item) =>
      item.id === jobId ? { ...item, status: "completed" } : item
    ),
    quotes: data.quotes.map((item) =>
      item.id === quote.id ? { ...item, status: "completed", completedAt } : item
    ),
    invoices: existingInvoice
      ? data.invoices.map((item) => (item.id === existingInvoice.id ? invoice : item))
      : [invoice, ...data.invoices],
    tasks: existingInvoice ? data.tasks : [paymentFollowUpTask, ...data.tasks],
    estimateRequests: data.estimateRequests.map((request) =>
      request.customerId === job.customerId ? { ...request, status: "completed" } : request
    )
  };
}

export function recordPayment(
  data: AppData,
  payload: {
    invoiceId: string;
    amount: number;
    method: Payment["method"];
    note: string;
  }
): AppData {
  const invoice = data.invoices.find((item) => item.id === payload.invoiceId);
  if (!invoice) {
    return data;
  }

  const payment: Payment = {
    id: makeId("payment"),
    invoiceId: invoice.id,
    customerId: invoice.customerId,
    amount: payload.amount,
    paidAt: new Date().toISOString().slice(0, 10),
    method: payload.method,
    note: payload.note
  };

  const collected = data.payments
    .filter((item) => item.invoiceId === invoice.id)
    .reduce((sum, item) => sum + item.amount, 0);
  const nextCollected = collected + payload.amount;

  const normalizedInvoice = normalizeInvoice(
    {
      ...invoice,
      amountPaid: nextCollected
    },
    data.quotes.find((quote) => quote.id === (invoice.relatedQuoteId ?? invoice.quoteId))
  );
  const status = deriveInvoiceStatus(
    normalizedInvoice.amountPaid,
    normalizedInvoice.total,
    normalizedInvoice.dueAt,
    normalizedInvoice.status
  );
  const nextInvoice = { ...normalizedInvoice, status, balanceDue: Math.max(normalizedInvoice.total - normalizedInvoice.amountPaid, 0) };

  return {
    ...data,
    payments: [payment, ...data.payments],
    invoices: data.invoices.map((item) =>
      item.id === invoice.id ? nextInvoice : item
    ),
    customers: data.customers.map((customer) =>
      customer.id === invoice.customerId && status === "paid"
        ? { ...customer, lifecycle: "archived" }
        : customer
    ),
    estimateRequests: data.estimateRequests.map((request) =>
      request.customerId === invoice.customerId && status === "paid"
        ? { ...request, status: "paid" }
        : request
    )
  };
}

export function createTask(
  data: AppData,
  payload: {
    title: string;
    description: string;
    dueDate: string;
    status: TaskStatus;
    priority: TaskPriority;
    relatedLeadId?: string;
    relatedCustomerId?: string;
    relatedJobId?: string;
  }
): AppData {
  const task: Task = {
    id: makeId("task"),
    title: payload.title,
    description: payload.description,
    dueDate: payload.dueDate,
    status: payload.status,
    priority: payload.priority,
    relatedLeadId: payload.relatedLeadId,
    relatedCustomerId: payload.relatedCustomerId,
    relatedJobId: payload.relatedJobId,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  return {
    ...data,
    tasks: [task, ...data.tasks]
  };
}

export function updateTask(
  data: AppData,
  taskId: string,
  updates: Partial<Pick<Task, "title" | "description" | "dueDate" | "status" | "priority">>
): AppData {
  return {
    ...data,
    tasks: data.tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
  };
}

export function recordExpense(
  data: AppData,
  payload: {
    expenseDate: string;
    vendor: string;
    category: Expense["category"];
    amount: number;
    note: string;
    linkedJobId?: string;
    receiptName?: string;
    receiptDataUrl?: string;
  }
): AppData {
  const expense: Expense = {
    id: makeId("expense"),
    expenseDate: payload.expenseDate,
    vendor: payload.vendor,
    category: payload.category,
    amount: payload.amount,
    note: payload.note,
    linkedJobId: payload.linkedJobId,
    receiptName: payload.receiptName,
    receiptDataUrl: payload.receiptDataUrl
  };

  return {
    ...data,
    expenses: [expense, ...data.expenses]
  };
}

export function startTimeEntry(
  data: AppData,
  payload: {
    category: TimeCategory;
    note: string;
    customerId?: string;
    jobId?: string;
  }
): AppData {
  if (data.timeEntries.some((entry) => entry.isRunning)) {
    return data;
  }

  const now = new Date();
  const timeEntry: TimeEntry = {
    id: makeId("time"),
    entryDate: now.toISOString().slice(0, 10),
    category: payload.category,
    note: payload.note,
    customerId: payload.customerId,
    jobId: payload.jobId,
    startedAt: now.toISOString(),
    endedAt: undefined,
    minutes: 0,
    isRunning: true,
    createdAt: now.toISOString().slice(0, 10)
  };

  return {
    ...data,
    timeEntries: [timeEntry, ...data.timeEntries]
  };
}

export function stopTimeEntry(data: AppData, timeEntryId: string): AppData {
  const timeEntry = data.timeEntries.find((entry) => entry.id === timeEntryId && entry.isRunning);
  if (!timeEntry || !timeEntry.startedAt) {
    return data;
  }

  const endedAt = new Date().toISOString();
  const elapsedMinutes = Math.max(
    1,
    Math.round((new Date(endedAt).getTime() - new Date(timeEntry.startedAt).getTime()) / 60000)
  );

  return {
    ...data,
    timeEntries: data.timeEntries.map((entry) =>
      entry.id === timeEntryId
        ? {
            ...entry,
            endedAt,
            minutes: elapsedMinutes,
            isRunning: false
          }
        : entry
    )
  };
}
