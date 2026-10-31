/**
 * Email delivery.
 *
 * Honesty rule: `sendMail()` returns `{ sent: false, reason }` unless the
 * provider actually confirmed the send. Nothing in the UI may claim that an
 * email was sent when the provider is not configured.
 *
 * Supported providers:
 *   - resend  : RESEND_API_KEY   (HTTPS API, no SDK required)
 *   - log     : MAIL_PROVIDER=log (dev only, prints to the server console)
 *   - none    : not configured
 */

const GENERIC_EMAIL_TAGS = {
  order_placed: "Order placed",
  order_confirmed: "Order confirmed",
  order_processing: "Order processing",
  order_shipped: "Order shipped",
  order_delivered: "Order delivered",
  order_cancelled: "Order cancelled",
  payment_success: "Payment received",
  payment_failed: "Payment failed",
  welcome: "Welcome to IDeons",
};

export function isMailConfigured() {
  const provider = (process.env.MAIL_PROVIDER || "").toLowerCase();
  if (provider === "resend" && process.env.RESEND_API_KEY) return true;
  if (provider === "log") return true;
  if (process.env.RESEND_API_KEY) return true;
  return false;
}

function resolveProvider() {
  if (process.env.MAIL_PROVIDER === "log") return "log";
  if (process.env.RESEND_API_KEY) return "resend";
  return "none";
}

function safeFrom() {
  return (
    process.env.EMAIL_FROM ||
    "IDeons <no-reply@ideons.com>"
  );
}

export async function sendMail({ to, subject, html, text, type }) {
  if (!to) return { sent: false, reason: "missing_recipient" };
  const provider = resolveProvider();

  if (provider === "none") {
    return { sent: false, reason: "not_configured" };
  }

  try {
    if (provider === "log") {
      console.log("[mail:log]", { to, subject, type: type || "generic" });
      return { sent: true, provider: "log", messageId: `log_${Date.now()}` };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: safeFrom(),
        to: [to],
        subject,
        html,
        text,
        tags: type ? [{ name: "type", value: String(type).slice(0, 60) }] : undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[mail] provider rejected send:", res.status, body.slice(0, 500));
      return { sent: false, reason: `provider_error_${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    return { sent: true, provider: "resend", messageId: data?.id || null };
  } catch (error) {
    console.error("[mail] send failed:", error.message);
    return { sent: false, reason: "network_error" };
  }
}

export function renderNotificationEmail({ type, title, body, actionUrl, orderNumber }) {
  const tag = GENERIC_EMAIL_TAGS[type] || "IDeons update";
  const url = actionUrl ? `${process.env.BETTER_AUTH_URL || ""}${actionUrl}` : "";
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f6;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececec">
      <div style="background:#111111;padding:20px 24px">
        <span style="color:#facc15;font-size:20px;font-weight:700">IDeons</span>
        <span style="color:#9ca3af;font-size:12px;display:block;margin-top:4px">Smart Products. Better Everyday Living.</span>
      </div>
      <div style="padding:24px">
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin:0 0 8px">${tag}</p>
        <h1 style="font-size:18px;color:#111827;margin:0 0 12px">${escapeHtml(title)}</h1>
        <p style="font-size:14px;line-height:1.6;color:#374151;white-space:pre-line;margin:0">${escapeHtml(body)}</p>
        ${orderNumber ? `<p style="font-size:13px;color:#111827;margin-top:16px"><strong>Order number:</strong> ${escapeHtml(orderNumber)}</p>` : ""}
        ${url ? `<p style="margin-top:20px"><a href="${url}" style="background:#111111;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;display:inline-block">View details</a></p>` : ""}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #ececec;color:#9ca3af;font-size:12px">
        This is an automated message from IDeons.
      </div>
    </div>
  </div>`;
  const textBody = `${title}\n\n${body}${orderNumber ? `\n\nOrder number: ${orderNumber}` : ""}${url ? `\n\n${url}` : ""}`;
  return { html, text: textBody };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
