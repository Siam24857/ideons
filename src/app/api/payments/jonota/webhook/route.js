import { ok, fail } from "@/lib/api";
import {
  findJonotaOrder,
  findJonotaOrderByVerification,
  isJonotaPayConfigured,
  recordJonotaVerification,
  verifyJonotaTransaction,
} from "@/lib/jonota-pay";

/**
 * POST /api/payments/jonota/webhook
 *
 * Optional server-to-server notification from the gateway.
 *
 * The provider does not document a webhook signature, so the request body is
 * treated as an untrusted hint only:
 *   - the transaction id is extracted from the payload
 *   - the official verification API is called server-to-server
 *   - the order is matched by metadata returned by the verification API
 *   - all amount / ownership / uniqueness checks run in `recordJonotaVerification`
 *
 * The endpoint always acknowledges with 2xx once it has done its best, so the
 * provider does not retry forever. A 4xx is only returned for a request that
 * cannot possibly be a notification.
 */

const TX_KEYS = [
  "transaction_id",
  "transactionId",
  "txn_id",
  "txn",
  "trx_id",
  "payment_id",
  "paymentId",
];

const ORDER_KEYS = ["order_id", "orderId", "order_number", "orderNumber"];

function pick(source, keys) {
  if (!source || typeof source !== "object") return "";
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

async function readPayload(request) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  const raw = await request.text();
  if (!raw) return {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
}

export async function POST(request) {
  if (!isJonotaPayConfigured()) {
    return fail("Online payment is not configured on this store.", 503, "NOT_CONFIGURED");
  }

  let payload;
  try {
    payload = await readPayload(request);
  } catch (error) {
    console.error("[jonota] webhook payload read failed:", error.message);
    return ok({ received: true, skipped: "unreadable_payload" });
  }

  /* Many gateways wrap the real object in `data` / `payment` / `payload`. */
  const nested =
    (payload.data && typeof payload.data === "object" && payload.data) ||
    (payload.payment && typeof payload.payment === "object" && payload.payment) ||
    (payload.payload && typeof payload.payload === "object" && payload.payload) ||
    {};

  const transactionId = pick(payload, TX_KEYS) || pick(nested, TX_KEYS);
  if (!transactionId) {
    return ok({ received: true, skipped: "no_transaction_id" });
  }

  let verification;
  try {
    verification = await verifyJonotaTransaction(transactionId);
  } catch (error) {
    console.error("[jonota] webhook verification failed:", error?.code || "", error.message);
    /* Acknowledge so the gateway does not hammer us; the callback and the
     * manual/admin verification can still settle the payment later. */
    return ok({ received: true, verified: false });
  }

  const orderRef =
    pick(payload, ORDER_KEYS) ||
    pick(nested, ORDER_KEYS) ||
    pick(verification.metadata || {}, ["order_id", "orderId", "order_number", "orderNumber"]);

  let order = null;
  try {
    if (orderRef) {
      order = await findJonotaOrder({ orderId: orderRef });
    }
    if (!order) {
      order = await findJonotaOrderByVerification(verification);
    }
  } catch (error) {
    console.error("[jonota] webhook order lookup failed:", error.message);
  }

  if (!order) {
    console.warn("[jonota] webhook could not match a transaction to an order");
    return ok({ received: true, matched: false, status: verification.status });
  }

  try {
    const result = await recordJonotaVerification({
      order,
      verification,
      source: "gateway-webhook",
    });
    return ok({
      received: true,
      matched: true,
      applied: Boolean(result.applied),
      alreadyPaid: Boolean(result.alreadyPaid),
      paid: result.order?.paymentStatus === "paid",
    });
  } catch (error) {
    console.error("[jonota] webhook apply failed:", error?.code || "", error.message);
    return ok({ received: true, applied: false, status: verification.status });
  }
}

export function GET() {
  return fail("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
}
