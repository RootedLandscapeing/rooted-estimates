"use client";

import { DEFAULT_WEEKLY_AVAILABILITY } from "@/lib/availability";
import { defaultData } from "@/lib/mock-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  AppData,
  AvailabilitySlot,
  Customer,
  EstimateRequest,
  Expense,
  Invoice,
  Job,
  Payment,
  Quote,
  SiteContent,
  Task,
  TimeEntry
} from "@/lib/types";

type JsonArray<T> = T[];

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  preferred_contact: Customer["preferredContact"];
  notes: string;
  lifecycle: Customer["lifecycle"];
  created_at: string;
};

type EstimateRequestRow = {
  id: string;
  customer_id: string;
  preferred_slot: string;
  job_type: string;
  description: string;
  service_address: string;
  status: EstimateRequest["status"];
  created_at: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: Task["status"];
  priority: Task["priority"];
  related_lead_id: string | null;
  related_customer_id: string | null;
  related_job_id: string | null;
  related_quote_id: string | null;
  related_invoice_id: string | null;
  created_at: string;
};

type TimeEntryRow = {
  id: string;
  entry_date: string;
  category: TimeEntry["category"];
  note: string;
  customer_id: string | null;
  job_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  minutes: number;
  is_running: boolean;
  created_at: string;
};

type QuoteRow = {
  id: string;
  customer_id: string;
  estimate_request_id: string | null;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  customer_email: string;
  project_title: string;
  scope: string;
  deposit_type: Quote["depositType"];
  deposit_amount: number;
  deposit_percent: number;
  deposit_required: boolean;
  items: Quote["items"];
  total: number;
  terms: string[];
  customer_signature: string;
  customer_signed_at: string | null;
  rooted_signature: string;
  rooted_signed_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  status: Quote["status"];
  created_at: string;
};

type JobRow = {
  id: string;
  customer_id: string;
  quote_id: string;
  title: string;
  scheduled_date: string;
  status: Job["status"];
  notes: string;
};

type InvoiceRow = {
  id: string;
  customer_id: string;
  related_quote_id: string | null;
  related_work_authorization_id: string | null;
  created_at: string;
  issued_at: string;
  due_at: string;
  quote_id: string | null;
  job_id: string | null;
  issue_date: string;
  due_date: string;
  customer_name: string;
  billing_address: string;
  service_address: string;
  customer_phone: string;
  customer_email: string;
  project_title: string;
  job_date: string | null;
  line_items: Invoice["lineItems"];
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_method_notes: string;
  notes: string;
  payment_instructions: string[];
  amount: number;
  status: Invoice["status"];
  payment_notes: string;
};

type PaymentRow = {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  paid_at: string;
  method: Payment["method"];
  note: string;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  vendor: string;
  category: Expense["category"];
  amount: number;
  note: string;
  linked_job_id: string | null;
  receipt_name: string | null;
  receipt_data_url: string | null;
};

type AvailabilityRow = {
  id: string;
  weekday: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
  label: string | null;
};

type SiteContentRow = {
  id: string;
  business_name: string;
  hero_title: string;
  hero_description: string;
  primary_cta_label: string;
  secondary_cta_label: string;
  about_title: string;
  about_description: string;
  service_area: string;
  featured_title: string;
  featured_intro: string;
  services: SiteContent["services"];
  featured_projects: SiteContent["featuredProjects"];
};

function toDateOnly(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function toOptionalDate(value?: string | null) {
  return value ? toDateOnly(value) : undefined;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    preferredContact: row.preferred_contact,
    notes: row.notes,
    lifecycle: row.lifecycle,
    createdAt: toDateOnly(row.created_at)
  };
}

function mapEstimateRequest(row: EstimateRequestRow): EstimateRequest {
  return {
    id: row.id,
    customerId: row.customer_id,
    preferredSlot: row.preferred_slot,
    jobType: row.job_type,
    description: row.description,
    photos: [],
    status: row.status,
    createdAt: toDateOnly(row.created_at),
    serviceAddress: row.service_address
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    status: row.status,
    priority: row.priority,
    relatedLeadId: row.related_lead_id ?? undefined,
    relatedCustomerId: row.related_customer_id ?? undefined,
    relatedJobId: row.related_job_id ?? undefined,
    relatedQuoteId: row.related_quote_id ?? undefined,
    relatedInvoiceId: row.related_invoice_id ?? undefined,
    createdAt: toDateOnly(row.created_at)
  };
}

function mapTimeEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    category: row.category,
    note: row.note,
    customerId: row.customer_id ?? undefined,
    jobId: row.job_id ?? undefined,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    minutes: Number(row.minutes),
    isRunning: row.is_running,
    createdAt: toDateOnly(row.created_at)
  };
}

function mapQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    customerId: row.customer_id,
    estimateRequestId: row.estimate_request_id ?? undefined,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    projectTitle: row.project_title,
    scope: row.scope,
    depositType: row.deposit_type,
    depositAmount: Number(row.deposit_amount),
    depositPercent: Number(row.deposit_percent),
    depositRequired: row.deposit_required,
    items: row.items ?? [],
    total: Number(row.total),
    terms: row.terms ?? [],
    customerSignature: row.customer_signature,
    customerSignedAt: toOptionalDate(row.customer_signed_at),
    rootedSignature: row.rooted_signature,
    rootedSignedAt: toOptionalDate(row.rooted_signed_at),
    approvedAt: toOptionalDate(row.approved_at),
    completedAt: toOptionalDate(row.completed_at),
    status: row.status,
    createdAt: toDateOnly(row.created_at)
  };
}

function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    customerId: row.customer_id,
    quoteId: row.quote_id,
    title: row.title,
    scheduledDate: row.scheduled_date,
    status: row.status,
    notes: row.notes
  };
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    customerId: row.customer_id,
    relatedQuoteId: row.related_quote_id ?? undefined,
    relatedWorkAuthorizationId: row.related_work_authorization_id ?? undefined,
    createdAt: row.created_at,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    quoteId: row.quote_id ?? "",
    jobId: row.job_id ?? undefined,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    customerName: row.customer_name,
    billingAddress: row.billing_address,
    serviceAddress: row.service_address,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    projectTitle: row.project_title,
    jobDate: row.job_date ?? undefined,
    lineItems: row.line_items ?? [],
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    amountPaid: Number(row.amount_paid),
    balanceDue: Number(row.balance_due),
    paymentMethodNotes: row.payment_method_notes,
    notes: row.notes,
    paymentInstructions: row.payment_instructions ?? [],
    amount: Number(row.amount),
    status: row.status,
    paymentNotes: row.payment_notes
  };
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    customerId: row.customer_id,
    amount: Number(row.amount),
    paidAt: row.paid_at,
    method: row.method,
    note: row.note
  };
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    expenseDate: row.expense_date,
    vendor: row.vendor,
    category: row.category,
    amount: Number(row.amount),
    note: row.note,
    linkedJobId: row.linked_job_id ?? undefined,
    receiptName: row.receipt_name ?? undefined,
    receiptDataUrl: row.receipt_data_url ?? undefined
  };
}

function mapAvailability(row: AvailabilityRow): AvailabilitySlot {
  return {
    id: row.id,
    weekday: row.weekday,
    isAvailable: row.is_available,
    start: row.start_time,
    end: row.end_time,
    label: row.label ?? undefined
  };
}

function mapSiteContent(row: SiteContentRow): SiteContent {
  return {
    businessName: row.business_name,
    heroTitle: row.hero_title,
    heroDescription: row.hero_description,
    primaryCtaLabel: row.primary_cta_label,
    secondaryCtaLabel: row.secondary_cta_label,
    aboutTitle: row.about_title,
    aboutDescription: row.about_description,
    serviceArea: row.service_area,
    featuredTitle: row.featured_title,
    featuredIntro: row.featured_intro,
    services: row.services ?? [],
    featuredProjects: row.featured_projects ?? []
  };
}

function compactRows<T>(rows: Array<T | null>) {
  return rows.filter((row): row is T => Boolean(row));
}

function toSiteContentRow(siteContent: SiteContent): SiteContentRow {
  return {
    id: "main",
    business_name: siteContent.businessName,
    hero_title: siteContent.heroTitle,
    hero_description: siteContent.heroDescription,
    primary_cta_label: siteContent.primaryCtaLabel,
    secondary_cta_label: siteContent.secondaryCtaLabel,
    about_title: siteContent.aboutTitle,
    about_description: siteContent.aboutDescription,
    service_area: siteContent.serviceArea,
    featured_title: siteContent.featuredTitle,
    featured_intro: siteContent.featuredIntro,
    services: siteContent.services,
    featured_projects: siteContent.featuredProjects
  };
}

export async function loadSupabaseAppData(fallbackData = defaultData): Promise<AppData | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  const [
    customersResult,
    estimatesResult,
    tasksResult,
    timeEntriesResult,
    quotesResult,
    jobsResult,
    invoicesResult,
    paymentsResult,
    expensesResult,
    availabilityResult,
    siteContentResult
  ] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("estimate_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("time_entries").select("*").order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").order("created_at", { ascending: false }),
    supabase.from("jobs").select("*"),
    supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("payments").select("*").order("paid_at", { ascending: false }),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("availability").select("*"),
    supabase.from("site_content").select("*").eq("id", "main").maybeSingle()
  ]);

  const firstError =
    customersResult.error ??
    estimatesResult.error ??
    tasksResult.error ??
    timeEntriesResult.error ??
    quotesResult.error ??
    jobsResult.error ??
    invoicesResult.error ??
    paymentsResult.error ??
    expensesResult.error ??
    availabilityResult.error ??
    siteContentResult.error;

  if (firstError) {
    throw firstError;
  }

  const availabilityRows = (availabilityResult.data ?? []) as AvailabilityRow[];
  const siteContentRow = siteContentResult.data as SiteContentRow | null;

  return {
    ...fallbackData,
    customers: ((customersResult.data ?? []) as CustomerRow[]).map(mapCustomer),
    estimateRequests: ((estimatesResult.data ?? []) as EstimateRequestRow[]).map(mapEstimateRequest),
    tasks: ((tasksResult.data ?? []) as TaskRow[]).map(mapTask),
    timeEntries: ((timeEntriesResult.data ?? []) as TimeEntryRow[]).map(mapTimeEntry),
    quotes: ((quotesResult.data ?? []) as QuoteRow[]).map(mapQuote),
    jobs: ((jobsResult.data ?? []) as JobRow[]).map(mapJob),
    invoices: ((invoicesResult.data ?? []) as InvoiceRow[]).map(mapInvoice),
    payments: ((paymentsResult.data ?? []) as PaymentRow[]).map(mapPayment),
    expenses: ((expensesResult.data ?? []) as ExpenseRow[]).map(mapExpense),
    availability: availabilityRows.length ? availabilityRows.map(mapAvailability) : fallbackData.availability,
    siteContent: siteContentRow ? mapSiteContent(siteContentRow) : fallbackData.siteContent
  };
}

export async function saveSupabaseAppData(data: AppData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseBrowserClient();
  const customerIds = new Set(data.customers.map((customer) => customer.id));
  const estimateIds = new Set(data.estimateRequests.map((estimate) => estimate.id));

  const customers: CustomerRow[] = data.customers.map((customer) => ({
    id: customer.id,
    full_name: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    preferred_contact: customer.preferredContact,
    notes: customer.notes,
    lifecycle: customer.lifecycle,
    created_at: customer.createdAt
  }));

  const estimateRequests: EstimateRequestRow[] = data.estimateRequests.map((estimate) => ({
    id: estimate.id,
    customer_id: estimate.customerId,
    preferred_slot: estimate.preferredSlot,
    job_type: estimate.jobType,
    description: estimate.description,
    service_address: estimate.serviceAddress,
    status: estimate.status,
    created_at: estimate.createdAt
  }));

  const quotes = compactRows(
    data.quotes.map((quote): QuoteRow | null =>
      customerIds.has(quote.customerId)
        ? {
            id: quote.id,
            customer_id: quote.customerId,
            estimate_request_id:
              quote.estimateRequestId && estimateIds.has(quote.estimateRequestId)
                ? quote.estimateRequestId
                : null,
            customer_name: quote.customerName,
            customer_address: quote.customerAddress,
            customer_phone: quote.customerPhone,
            customer_email: quote.customerEmail,
            project_title: quote.projectTitle,
            scope: quote.scope,
            deposit_type: quote.depositType ?? "none",
            deposit_amount: quote.depositAmount,
            deposit_percent: quote.depositPercent ?? 0,
            deposit_required: quote.depositRequired,
            items: quote.items as JsonArray<Quote["items"][number]>,
            total: quote.total,
            terms: quote.terms,
            customer_signature: quote.customerSignature,
            customer_signed_at: quote.customerSignedAt ?? null,
            rooted_signature: quote.rootedSignature,
            rooted_signed_at: quote.rootedSignedAt ?? null,
            approved_at: quote.approvedAt ?? null,
            completed_at: quote.completedAt ?? null,
            status: quote.status,
            created_at: quote.createdAt
          }
        : null
    )
  );

  const jobs = compactRows(
    data.jobs.map((job): JobRow | null =>
      customerIds.has(job.customerId) && quotes.some((quote) => quote.id === job.quoteId)
        ? {
            id: job.id,
            customer_id: job.customerId,
            quote_id: job.quoteId,
            title: job.title,
            scheduled_date: job.scheduledDate,
            status: job.status,
            notes: job.notes
          }
        : null
    )
  );
  const validQuoteIds = new Set(quotes.map((quote) => quote.id));
  const validJobIds = new Set(jobs.map((job) => job.id));

  const invoices = compactRows(
    data.invoices.map((invoice): InvoiceRow | null =>
      customerIds.has(invoice.customerId)
        ? {
            id: invoice.id,
            customer_id: invoice.customerId,
            related_quote_id:
              invoice.relatedQuoteId && validQuoteIds.has(invoice.relatedQuoteId)
                ? invoice.relatedQuoteId
                : null,
            related_work_authorization_id: invoice.relatedWorkAuthorizationId ?? null,
            created_at: invoice.createdAt,
            issued_at: invoice.issuedAt,
            due_at: invoice.dueAt,
            quote_id: invoice.quoteId && validQuoteIds.has(invoice.quoteId) ? invoice.quoteId : null,
            job_id: invoice.jobId && validJobIds.has(invoice.jobId) ? invoice.jobId : null,
            issue_date: invoice.issueDate,
            due_date: invoice.dueDate,
            customer_name: invoice.customerName,
            billing_address: invoice.billingAddress,
            service_address: invoice.serviceAddress,
            customer_phone: invoice.customerPhone,
            customer_email: invoice.customerEmail,
            project_title: invoice.projectTitle,
            job_date: invoice.jobDate ?? null,
            line_items: invoice.lineItems as JsonArray<Invoice["lineItems"][number]>,
            subtotal: invoice.subtotal,
            tax_amount: invoice.taxAmount,
            total: invoice.total,
            amount_paid: invoice.amountPaid,
            balance_due: invoice.balanceDue,
            payment_method_notes: invoice.paymentMethodNotes,
            notes: invoice.notes,
            payment_instructions: invoice.paymentInstructions,
            amount: invoice.amount,
            status: invoice.status,
            payment_notes: invoice.paymentNotes
          }
        : null
    )
  );
  const validInvoiceIds = new Set(invoices.map((invoice) => invoice.id));

  const payments = compactRows(
    data.payments.map((payment): PaymentRow | null =>
      customerIds.has(payment.customerId) && validInvoiceIds.has(payment.invoiceId)
        ? {
            id: payment.id,
            invoice_id: payment.invoiceId,
            customer_id: payment.customerId,
            amount: payment.amount,
            paid_at: payment.paidAt,
            method: payment.method,
            note: payment.note
          }
        : null
    )
  );

  const expenses: ExpenseRow[] = data.expenses.map((expense) => ({
    id: expense.id,
    expense_date: expense.expenseDate,
    vendor: expense.vendor,
    category: expense.category,
    amount: expense.amount,
    note: expense.note,
    linked_job_id: expense.linkedJobId && validJobIds.has(expense.linkedJobId) ? expense.linkedJobId : null,
    receipt_name: expense.receiptName ?? null,
    receipt_data_url: expense.receiptDataUrl ?? null
  }));

  const availability: AvailabilityRow[] = data.availability.map((slot) => ({
    id: slot.id,
    weekday: slot.weekday,
    is_available: slot.isAvailable,
    start_time: slot.start,
    end_time: slot.end,
    label: slot.label ?? null
  }));

  const tasks = compactRows(
    data.tasks.map((task): TaskRow | null => ({
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      status: task.status,
      priority: task.priority,
      related_lead_id: task.relatedLeadId && estimateIds.has(task.relatedLeadId) ? task.relatedLeadId : null,
      related_customer_id:
        task.relatedCustomerId && customerIds.has(task.relatedCustomerId) ? task.relatedCustomerId : null,
      related_job_id: task.relatedJobId ?? null,
      related_quote_id: task.relatedQuoteId ?? null,
      related_invoice_id: task.relatedInvoiceId ?? null,
      created_at: task.createdAt
    }))
  );

  const timeEntries = data.timeEntries.map((entry): TimeEntryRow => ({
    id: entry.id,
    entry_date: entry.entryDate,
    category: entry.category,
    note: entry.note,
    customer_id: entry.customerId ?? null,
    job_id: entry.jobId ?? null,
    started_at: entry.startedAt ?? null,
    ended_at: entry.endedAt ?? null,
    minutes: entry.minutes,
    is_running: entry.isRunning,
    created_at: entry.createdAt
  }));

  const operations = [
    customers.length ? supabase.from("customers").upsert(customers) : null,
    estimateRequests.length ? supabase.from("estimate_requests").upsert(estimateRequests) : null,
    timeEntries.length ? supabase.from("time_entries").upsert(timeEntries) : null,
    quotes.length ? supabase.from("quotes").upsert(quotes) : null,
    jobs.length ? supabase.from("jobs").upsert(jobs) : null,
    invoices.length ? supabase.from("invoices").upsert(invoices) : null,
    payments.length ? supabase.from("payments").upsert(payments) : null,
    expenses.length ? supabase.from("expenses").upsert(expenses) : null,
    availability.length ? supabase.from("availability").upsert(availability) : null,
    tasks.length ? supabase.from("tasks").upsert(tasks) : null,
    supabase.from("site_content").upsert(toSiteContentRow(data.siteContent))
  ].filter(Boolean);

  const results = await Promise.all(operations);
  const firstError = results.find((result) => result?.error)?.error;

  if (firstError) {
    throw firstError;
  }
}

export async function loadSupabasePublicContent() {
  if (!isSupabaseConfigured()) {
    return {
      availability: DEFAULT_WEEKLY_AVAILABILITY,
      siteContent: defaultData.siteContent
    };
  }

  const supabase = getSupabaseBrowserClient();
  const [availabilityResult, siteContentResult] = await Promise.all([
    supabase.from("availability").select("*"),
    supabase.from("site_content").select("*").eq("id", "main").maybeSingle()
  ]);

  if (availabilityResult.error || siteContentResult.error) {
    throw availabilityResult.error ?? siteContentResult.error;
  }

  const availabilityRows = (availabilityResult.data ?? []) as AvailabilityRow[];
  const siteContentRow = siteContentResult.data as SiteContentRow | null;

  return {
    availability: availabilityRows.length ? availabilityRows.map(mapAvailability) : DEFAULT_WEEKLY_AVAILABILITY,
    siteContent: siteContentRow ? mapSiteContent(siteContentRow) : defaultData.siteContent
  };
}
