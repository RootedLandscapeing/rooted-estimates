import { NextResponse } from "next/server";
import { Customer } from "@/lib/types";
import {
  requiredEstimateFields,
  sendEstimateNotification,
  type EstimateNotificationPayload
} from "@/lib/notifications/estimate-email";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

type CustomerRow = {
  id: string;
  lifecycle: Customer["lifecycle"];
};

function normalizeMatchValue(value: string) {
  return value.trim().toLowerCase();
}

function dateOffset(days: number) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Estimate intake is not configured yet." }, { status: 500 });
  }

  const payload = (await request.json()) as EstimateNotificationPayload;
  const missingField = requiredEstimateFields.find((field) => !payload[field]?.trim?.());

  if (missingField) {
    return NextResponse.json(
      { error: `Missing required field: ${missingField}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const normalizedEmail = normalizeMatchValue(payload.email);
  const normalizedPhone = normalizeMatchValue(payload.phone);
  const normalizedAddress = normalizeMatchValue(payload.address);

  const { data: existingCustomers, error: customerLookupError } = await supabase
    .from("customers")
    .select("id, lifecycle")
    .or(`email.eq.${normalizedEmail},phone.eq.${normalizedPhone},address.eq.${normalizedAddress}`)
    .limit(1);

  if (customerLookupError) {
    return NextResponse.json(
      { error: "We couldn't save the estimate request right now. Please try again." },
      { status: 500 }
    );
  }

  const existingCustomer = existingCustomers?.[0] as CustomerRow | undefined;
  const customerPayload = {
    full_name: payload.fullName.trim(),
    phone: payload.phone.trim(),
    email: payload.email.trim(),
    address: payload.address.trim(),
    preferred_contact: payload.preferredContact,
    notes: payload.notes.trim(),
    lifecycle: existingCustomer?.lifecycle === "archived" ? "active" : existingCustomer?.lifecycle ?? "lead"
  };

  const customerResult = existingCustomer
    ? await supabase.from("customers").update(customerPayload).eq("id", existingCustomer.id).select("id").single()
    : await supabase.from("customers").insert(customerPayload).select("id").single();

  if (customerResult.error || !customerResult.data) {
    return NextResponse.json(
      { error: "We couldn't save the estimate request right now. Please try again." },
      { status: 500 }
    );
  }

  const { data: estimateRequest, error: estimateError } = await supabase
    .from("estimate_requests")
    .insert({
      customer_id: customerResult.data.id,
      preferred_slot: payload.preferredSlot.trim(),
      job_type: payload.jobType.trim(),
      description: payload.description.trim(),
      service_address: payload.address.trim(),
      status: "new lead"
    })
    .select("id")
    .single();

  if (estimateError || !estimateRequest) {
    return NextResponse.json(
      { error: "We couldn't save the estimate request right now. Please try again." },
      { status: 500 }
    );
  }

  const { error: taskError } = await supabase.from("tasks").insert({
    title: `Follow up with ${payload.fullName.trim()}`,
    description: `New estimate request for ${payload.jobType.trim()}. Preferred time: ${payload.preferredSlot.trim()}.`,
    due_date: dateOffset(1),
    status: "to_do",
    priority: "high",
    related_lead_id: estimateRequest.id,
    related_customer_id: customerResult.data.id
  });

  if (taskError) {
    return NextResponse.json(
      { error: "We couldn't save the estimate request right now. Please try again." },
      { status: 500 }
    );
  }

  try {
    await sendEstimateNotification(payload);
    return NextResponse.json({ ok: true, notified: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      ok: true,
      notified: false,
      warning:
        "Your request was received and added to Rooted's dashboard, but the email alert did not go out."
    });
  }
}
