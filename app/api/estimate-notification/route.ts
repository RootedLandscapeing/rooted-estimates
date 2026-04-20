import { NextResponse } from "next/server";
import {
  requiredEstimateFields,
  sendEstimateNotification,
  type EstimateNotificationPayload
} from "@/lib/notifications/estimate-email";

export async function POST(request: Request) {
  const payload = (await request.json()) as EstimateNotificationPayload;
  const missingField = requiredEstimateFields.find((field) => !payload[field]);

  if (missingField) {
    return NextResponse.json(
      { error: `Missing required field: ${missingField}` },
      { status: 400 }
    );
  }

  try {
    await sendEstimateNotification(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to send email notification." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
