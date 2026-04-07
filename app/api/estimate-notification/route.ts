import { NextResponse } from "next/server";

type EstimateNotificationPayload = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  preferredContact: string;
  preferredSlot: string;
  jobType: string;
  description: string;
  notes: string;
};

const requiredFields: Array<keyof EstimateNotificationPayload> = [
  "fullName",
  "phone",
  "email",
  "address",
  "preferredSlot",
  "jobType",
  "description"
];

function buildEmailText(payload: EstimateNotificationPayload) {
  return [
    "New estimate request for Rooted Moapa Valley Landscaping",
    "",
    `Name: ${payload.fullName}`,
    `Phone: ${payload.phone}`,
    `Email: ${payload.email}`,
    `Preferred contact: ${payload.preferredContact}`,
    `Property address: ${payload.address}`,
    `Preferred estimate time: ${payload.preferredSlot}`,
    `Job type: ${payload.jobType}`,
    "",
    "Project details:",
    payload.description,
    "",
    "Scheduling notes:",
    payload.notes || "No scheduling notes provided."
  ].join("\n");
}

function buildEmailHtml(payload: EstimateNotificationPayload) {
  const detailRows = [
    ["Name", payload.fullName],
    ["Phone", payload.phone],
    ["Email", payload.email],
    ["Preferred contact", payload.preferredContact],
    ["Property address", payload.address],
    ["Preferred estimate time", payload.preferredSlot],
    ["Job type", payload.jobType]
  ];

  return `
    <div style="font-family: Arial, sans-serif; color: #181f0e; line-height: 1.5;">
      <h1 style="margin: 0 0 12px;">New estimate request</h1>
      <p style="margin: 0 0 20px;">A customer submitted a new request through the Rooted website.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
        <tbody>
          ${detailRows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="border: 1px solid #e5dccb; padding: 8px 10px; font-weight: 700;">${label}</td>
                  <td style="border: 1px solid #e5dccb; padding: 8px 10px;">${value}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
      <h2 style="margin: 22px 0 8px;">Project details</h2>
      <p style="margin: 0 0 16px; white-space: pre-wrap;">${payload.description}</p>
      <h2 style="margin: 22px 0 8px;">Scheduling notes</h2>
      <p style="margin: 0; white-space: pre-wrap;">${payload.notes || "No scheduling notes provided."}</p>
    </div>
  `;
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.ESTIMATE_NOTIFICATION_EMAIL;

  if (!apiKey || !notificationEmail) {
    return NextResponse.json(
      { error: "Email notifications are not configured." },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as EstimateNotificationPayload;
  const missingField = requiredFields.find((field) => !payload[field]);

  if (missingField) {
    return NextResponse.json(
      { error: `Missing required field: ${missingField}` },
      { status: 400 }
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Rooted Website <notifications@rootedlandscapingmoapavalley.com>",
      to: notificationEmail,
      reply_to: payload.email,
      subject: `New estimate request: ${payload.jobType}`,
      text: buildEmailText(payload),
      html: buildEmailHtml(payload)
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Resend notification failed:", errorBody);
    return NextResponse.json(
      { error: "Failed to send email notification." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
