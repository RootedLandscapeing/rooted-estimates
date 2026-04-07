"use client";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Customer,
  EstimateRequest,
  Task
} from "@/lib/types";

type EstimatePayload = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  preferredContact: Customer["preferredContact"];
  notes: string;
  preferredSlot: string;
  jobType: string;
  description: string;
};

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

function toDateOnly(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function dateOffset(days: number) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate.toISOString().slice(0, 10);
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

function normalizeMatchValue(value: string) {
  return value.trim().toLowerCase();
}

export async function createSupabaseEstimateRequest(payload: EstimatePayload) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseBrowserClient();
  const normalizedEmail = normalizeMatchValue(payload.email);
  const normalizedPhone = normalizeMatchValue(payload.phone);
  const normalizedAddress = normalizeMatchValue(payload.address);

  const { data: existingCustomers, error: customerLookupError } = await supabase
    .from("customers")
    .select("*")
    .or(`email.eq.${normalizedEmail},phone.eq.${normalizedPhone},address.eq.${normalizedAddress}`)
    .limit(1);

  if (customerLookupError) {
    throw customerLookupError;
  }

  const existingCustomer = existingCustomers?.[0] as CustomerRow | undefined;
  const customerPayload = {
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    preferred_contact: payload.preferredContact,
    notes: payload.notes,
    lifecycle: existingCustomer?.lifecycle === "archived" ? "active" : existingCustomer?.lifecycle ?? "lead"
  };

  const customerResult = existingCustomer
    ? await supabase
        .from("customers")
        .update(customerPayload)
        .eq("id", existingCustomer.id)
        .select("*")
        .single()
    : await supabase
        .from("customers")
        .insert(customerPayload)
        .select("*")
        .single();

  if (customerResult.error) {
    throw customerResult.error;
  }

  const customer = customerResult.data as CustomerRow;

  const { data: estimateRequest, error: estimateError } = await supabase
    .from("estimate_requests")
    .insert({
      customer_id: customer.id,
      preferred_slot: payload.preferredSlot,
      job_type: payload.jobType,
      description: payload.description,
      service_address: payload.address,
      status: "new lead"
    })
    .select("*")
    .single();

  if (estimateError) {
    throw estimateError;
  }

  const request = estimateRequest as EstimateRequestRow;

  const { error: taskError } = await supabase.from("tasks").insert({
    title: `Follow up with ${payload.fullName}`,
    description: `New estimate request for ${payload.jobType}. Preferred time: ${payload.preferredSlot}.`,
    due_date: dateOffset(1),
    status: "to_do",
    priority: "high",
    related_lead_id: request.id,
    related_customer_id: customer.id
  });

  if (taskError) {
    throw taskError;
  }
}

export async function loadSupabaseEstimateWorkflow() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  const [customersResult, estimatesResult, tasksResult] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("estimate_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").order("created_at", { ascending: false })
  ]);

  if (customersResult.error || estimatesResult.error || tasksResult.error) {
    throw customersResult.error ?? estimatesResult.error ?? tasksResult.error;
  }

  return {
    customers: ((customersResult.data ?? []) as CustomerRow[]).map(mapCustomer),
    estimateRequests: ((estimatesResult.data ?? []) as EstimateRequestRow[]).map(mapEstimateRequest),
    tasks: ((tasksResult.data ?? []) as TaskRow[]).map(mapTask)
  };
}
