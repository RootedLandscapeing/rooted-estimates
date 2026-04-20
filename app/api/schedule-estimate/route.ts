import { NextResponse } from "next/server";

type ScheduleEstimatePayload = {
  customerName: string;
  customerEmail: string;
  serviceAddress: string;
  estimateDate: string;
  estimateTime: string;
  projectTitle: string;
  note?: string;
};

function buildDateTimeLabel(estimateDate: string, estimateTime: string) {
  const dateTime = new Date(`${estimateDate}T${estimateTime}:00`);
  return {
    longDate: dateTime.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }),
    time: dateTime.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    })
  };
}

const rootedContactEmail =
  process.env.ESTIMATE_NOTIFICATION_EMAIL ?? "rootedlandscape1@gmail.com";
const rootedContactPhone = "(702) 419-9636";
const rootedLogoUrl = "https://rootedlandscapingmoapavalley.com/rooted-logo.png";

function buildScheduleEmailText(payload: ScheduleEstimatePayload) {
  const formatted = buildDateTimeLabel(payload.estimateDate, payload.estimateTime);

  return [
    `Hi ${payload.customerName},`,
    "",
    `Rooted Moapa Valley Landscaping has scheduled your estimate for ${formatted.longDate} at ${formatted.time}. We will meet you at ${payload.serviceAddress}.`,
    "",
    `Project: ${payload.projectTitle}`,
    payload.note?.trim() ? `Note from Rooted: ${payload.note.trim()}` : "",
    "",
    `If you need to reschedule the quote, please contact Rooted at ${rootedContactPhone}.`,
    "",
    "Thank you,",
    "Rooted Moapa Valley Landscaping"
  ]
    .filter(Boolean)
    .join("\n");
}

function buildScheduleEmailHtml(payload: ScheduleEstimatePayload) {
  const formatted = buildDateTimeLabel(payload.estimateDate, payload.estimateTime);

  return `
    <div style="font-family: Arial, sans-serif; color: #181f0e; line-height: 1.5;">
      <img
        src="${rootedLogoUrl}"
        alt="Rooted Moapa Valley Landscaping"
        style="display:block; max-width: 180px; height:auto; margin: 0 0 18px;"
      />
      <h1 style="margin: 0 0 12px;">Your estimate has been scheduled</h1>
      <p style="margin: 0 0 18px;">Hi ${payload.customerName},</p>
      <p style="margin: 0 0 14px;">
        Rooted Moapa Valley Landscaping has scheduled your estimate for
        <strong>${formatted.longDate}</strong> at <strong>${formatted.time}</strong>.
        We will meet you at <strong>${payload.serviceAddress}</strong>.
      </p>
      <p style="margin: 0 0 12px;"><strong>Project:</strong> ${payload.projectTitle}</p>
      ${
        payload.note?.trim()
          ? `<p style="margin: 0 0 18px;"><strong>Note from Rooted:</strong> ${payload.note.trim()}</p>`
          : ""
      }
      <p style="margin: 0;">
        If you need to reschedule the quote, please contact Rooted at
        <a href="tel:+17024199636">${rootedContactPhone}</a>.
      </p>
    </div>
  `;
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email notifications are not configured." }, { status: 500 });
  }

  const payload = (await request.json()) as ScheduleEstimatePayload;
  if (
    !payload.customerName ||
    !payload.customerEmail ||
    !payload.serviceAddress ||
    !payload.estimateDate ||
    !payload.estimateTime ||
    !payload.projectTitle
  ) {
    return NextResponse.json({ error: "Missing scheduling details." }, { status: 400 });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Rooted Moapa Valley Landscaping <notifications@rootedlandscapingmoapavalley.com>",
      to: payload.customerEmail,
      reply_to: rootedContactEmail,
      subject: `Your estimate is scheduled: ${payload.projectTitle}`,
      text: buildScheduleEmailText(payload),
      html: buildScheduleEmailHtml(payload)
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Estimate schedule email failed:", errorBody);
    return NextResponse.json({ error: "Failed to send estimate email." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
