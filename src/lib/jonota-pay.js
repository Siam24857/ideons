import { ApiError, badRequest, conflict, notFound } from "@/lib/api";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/constants";
import { round2, toMinor } from "@/lib/money";
import { createNotification } from "@/lib/notifications";
import { scheduleJob } from "@/lib/jobs";

/**
 * Jonota Pay (FahimFaysal) payment gateway.
 *
 * Security model:
 *  - the API key is only ever read from the server environment
 *  - a redirect to a success URL is NEVER proof of payment
 *  - every "paid" decision comes from the official /api/payment/verify call
 *  - the order amount is re-checked against the verified provider amount
 *  - a provider transaction can only ever be attached to one order
 *  - updates are atomic and idempotent, so repeated callbacks/webhooks are safe
 *
 * Stock is reserved by createOrder() when the order is created (the existing
 * store rule). Payment confirmation therefore never touches stock again, which
 * is what makes duplicate callbacks safe.
 */

const PROVIDER = PAYMENT_METHOD.JONOTA_PAY;
const DEFAULT_CREATE_URL = "https://client.fahimfaysal.shop/api/payment/create";
const DEFAULT_VERIFY_URL = "https://client.fahimfaysal.shop/api/payment/verify";
const INDEX_FLAG = Symbol.for("ideons.jonota.indexes.ready");

export function getJonotaConfig() {
  const apiKey = String(process.env.JONOTA_PAY_API_KEY || "").trim();
  return {
    apiKey,
    createUrl: String(process.env.JONOTA_PAY_CREATE_URL || DEFAULT_CREATE_URL).trim(),
    verifyUrl: String(process.env.JONOTA_PAY_VERIFY_URL || DEFAULT_VERIFY_URL).trim(),
    timeoutMs: Math.max(5_000, Number(process.env.JONOTA_PAY_TIMEOUT_MS) || 20_000),
  };
}

/** True only when a real (non-placeholder) API key and both URLs exist. */
export function isJonotaPayConfigured() {
  const { apiKey, createUrl, verifyUrl } = getJonotaConfig();
  if (!apiKey || !createUrl || !verifyUrl) return false;
  if (/^(YOUR_|REPLACE_|CHANGE_|PASTE_)/i.test(apiKey)) return false;
  return true;
}

/** Public store URL used for provider redirects. Never derived from user input. */
export function getPublicBaseUrl(request) {
  const configured =
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL;
  const base = configured || request?.nextUrl?.origin || "http://localhost:3000";
  return String(base).replace(/\/+$/, "");
}

/** Provider wants the amount without trailing zeros (10.50 -> 10.5). */
export function formatProviderAmount(amount) {
  return String(round2(amount));
}

function parseProviderAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseProviderMetadata(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function buildMetadata(order) {
  return {
    order_id: String(order._id),
    order_number: order.orderNumber,
  };
}

function applyUrlTemplate(template, order) {
  return String(template)
    .replace(/\{orderId\}/g, encodeURIComponent(String(order._id)))
    .replace(/\{orderNumber\}/g, encodeURIComponent(String(order.orderNumber)));
}

function buildProviderUrls(order, baseUrl) {
  const successTemplate =
    process.env.JONOTA_PAY_SUCCESS_URL ||
    `${baseUrl}/api/payments/jonota/callback/{orderId}`;
  /* Keep the cancel URL path-based: the gateway appends its own query string
   * (transactionId, status, ...) and a pre-existing `?` would break parsing. */
  const cancelTemplate =
    process.env.JONOTA_PAY_CANCEL_URL ||
    `${baseUrl}/payment/cancel/{orderId}`;
  const webhookUrl =
    process.env.JONOTA_PAY_WEBHOOK_URL ||
    `${baseUrl}/api/payments/jonota/webhook`;

  return {
    successUrl: applyUrlTemplate(successTemplate, order),
    cancelUrl: applyUrlTemplate(cancelTemplate, order),
    webhookUrl: applyUrlTemplate(webhookUrl, order),
  };
}

function validatePaymentUrl(raw) {
  if (!raw) return null;
  let url;
  try {
    url = new URL(String(raw), new URL(getJonotaConfig().createUrl).origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
  return url.toString();
}

function providerMessage(data) {
  if (!data) return "";
  const message = data.message || data.error || data.msg || "";
  return String(message).slice(0, 300);
}

/**
 * Creates a payment URL for an existing order. The order must already exist;
 * this function never creates orders and never changes the amount.
 */
export async function createJonotaPayment({ order, baseUrl }) {
  if (!isJonotaPayConfigured()) {
    throw new ApiError(
      "Online payment is not configured on this store. Please choose Cash on Delivery.",
      503,
      "JONOTA_NOT_CONFIGURED"
    );
  }
  if (!order) throw notFound("Order not found.");
  if (order.paymentMethod !== PROVIDER) {
    throw badRequest("This order is not an online payment order.");
  }
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    throw badRequest("This order has already been paid.");
  }
  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
    throw badRequest("This order was refunded and cannot be paid again.");
  }
  if (order.orderStatus === ORDER_STATUS.CANCELLED) {
    throw badRequest("This order was cancelled and can no longer be paid.");
  }

  /* A transaction that is not explicitly failed may still be in flight at the
   * gateway. Starting a second payment link could charge the customer twice,
   * so the existing transaction must be verified first. */
  if (order.transactionId && order.paymentStatus !== PAYMENT_STATUS.FAILED) {
    throw badRequest(
      "A payment transaction is already linked to this order. Please verify it before starting another payment."
    );
  }

  const customerName =
    order.customer?.name ||
    order.shippingAddress?.fullName ||
    "Customer";
  const customerEmail = order.customer?.email || order.shippingAddress?.email || "";
  if (!customerEmail) {
    throw badRequest(
      "Your account needs an email address before online payment can be started."
    );
  }

  const { apiKey, createUrl, timeoutMs } = getJonotaConfig();
  const urls = buildProviderUrls(order, baseUrl);
  const metadata = buildMetadata(order);

  const payload = {
    cus_name: customerName,
    cus_email: customerEmail,
    amount: formatProviderAmount(order.total),
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    webhook_url: urls.webhookUrl,
  };

  /* The docs table says meta_data while every sample uses metadata. Sending
   * both by default is the safest compatibility choice. Set
   * JONOTA_PAY_METADATA_FIELD=metadata or meta_data if the provider rejects
   * the extra field. */
  const metadataField = String(process.env.JONOTA_PAY_METADATA_FIELD || "both").toLowerCase();
  if (metadataField !== "metadata") payload.meta_data = metadata;
  if (metadataField !== "meta_data") payload.metadata = metadata;

  const currency = String(process.env.JONOTA_PAY_CURRENCY || "").trim();
  if (currency) payload.currency = currency;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "API-KEY": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error(
        "[jonota] create rejected:",
        response.status,
        providerMessage(data) || "non-JSON response"
      );
      throw new ApiError(
        "The payment gateway rejected the payment request. Please try again or choose Cash on Delivery.",
        502,
        "PAYMENT_INIT_FAILED"
      );
    }

    if (!data) {
      throw new ApiError(
        "The payment gateway returned an invalid response. Please try again.",
        502,
        "PAYMENT_INIT_INVALID_RESPONSE"
      );
    }

    if (data.status === false || data.status === 0 || data.success === false) {
      console.error("[jonota] create failed:", providerMessage(data) || "provider status false");
      throw new ApiError(
        "The payment gateway could not start this payment. Please try again or choose Cash on Delivery.",
        502,
        "PAYMENT_INIT_FAILED"
      );
    }

    const paymentUrl = validatePaymentUrl(data.payment_url || data.paymentUrl || data.url);
    if (!paymentUrl) {
      console.error("[jonota] create returned no valid payment_url");
      throw new ApiError(
        "The payment gateway did not return a valid payment link. Please try again.",
        502,
        "INVALID_PAYMENT_URL"
      );
    }

    const { orders } = await collections();
    const now = new Date();
    const update = {
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentProvider: PROVIDER,
      paymentUrl,
      paymentInitializedAt: now,
      updatedAt: now,
    };
    const updateDoc = { $set: update };

    /* A failed attempt may be replaced by a fresh link. Clear its transaction
     * id, otherwise the new callback would look like a different transaction
     * on the same order and be rejected as a mismatch. */
    if (order.paymentStatus === PAYMENT_STATUS.FAILED) {
      updateDoc.$unset = {
        transactionId: "",
        paymentReference: "",
        paymentVerification: "",
      };
    }

    const result = await orders.updateOne(
      { _id: order._id, paymentStatus: { $ne: PAYMENT_STATUS.PAID } },
      updateDoc
    );
    if (result.matchedCount === 0) {
      throw new ApiError(
        "The order could not be updated with the payment link. Please try again.",
        500,
        "PAYMENT_LINK_SAVE_FAILED"
      );
    }

    const refreshed = await orders.findOne({ _id: order._id });
    return {
      paymentUrl,
      order: refreshed || { ...order, ...update },
      providerResponse: { status: data.status ?? null, message: providerMessage(data) },
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError(
        "The payment gateway timed out. Please try again.",
        504,
        "PAYMENT_TIMEOUT"
      );
    }
    if (error instanceof ApiError) throw error;
    console.error("[jonota] create request failed:", error.message);
    throw new ApiError(
      "We could not reach the payment gateway. Please check your connection and try again.",
      502,
      "PAYMENT_GATEWAY_UNAVAILABLE"
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls the official verification API. The returned status is normalised but
 * the caller still decides what to do with it.
 */
export async function verifyJonotaTransaction(transactionId) {
  if (!isJonotaPayConfigured()) {
    throw new ApiError(
      "Online payment is not configured on this store.",
      503,
      "JONOTA_NOT_CONFIGURED"
    );
  }

  const id = String(transactionId || "").trim();
  if (!/^[A-Za-z0-9._:-]{3,128}$/.test(id)) {
    throw badRequest("Invalid transaction id.");
  }

  const { apiKey, verifyUrl, timeoutMs } = getJonotaConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "API-KEY": apiKey,
      },
      body: JSON.stringify({ transaction_id: id }),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error(
        "[jonota] verify rejected:",
        response.status,
        providerMessage(data) || "non-JSON response"
      );
      throw new ApiError(
        "The payment gateway could not verify this transaction. Please try again.",
        502,
        "PAYMENT_VERIFY_FAILED"
      );
    }

    if (!data) {
      throw new ApiError(
        "The payment gateway returned an invalid verification response.",
        502,
        "PAYMENT_VERIFY_INVALID_RESPONSE"
      );
    }

    if (data.status === false || data.status === 0 || data.success === false) {
      console.error("[jonota] verify failed:", providerMessage(data) || "provider status false");
      throw new ApiError(
        "The payment gateway could not verify this transaction. Please try again or contact support.",
        502,
        "PAYMENT_VERIFY_REJECTED"
      );
    }

    const rawStatus = String(data.status || "").trim().toUpperCase();
    let status = "UNKNOWN";
    if (["COMPLETED", "SUCCESS", "PAID"].includes(rawStatus)) status = "COMPLETED";
    else if (["PENDING", "PROCESSING", "INITIATED"].includes(rawStatus)) status = "PENDING";
    else if (["ERROR", "FAILED", "CANCELLED", "CANCELED", "DECLINED"].includes(rawStatus)) {
      status = "FAILED";
    }

    return {
      status,
      rawStatus,
      transactionId: String(data.transaction_id || data.transactionId || id).trim(),
      amount: data.amount ?? null,
      paymentMethod: data.payment_method || data.paymentMethod || null,
      metadata: parseProviderMetadata(data.metadata ?? data.meta_data),
      message: providerMessage(data),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError(
        "The payment gateway verification timed out. Please check the status again.",
        504,
        "PAYMENT_VERIFY_TIMEOUT"
      );
    }
    if (error instanceof ApiError) throw error;
    console.error("[jonota] verify request failed:", error.message);
    throw new ApiError(
      "We could not reach the payment gateway. Please check the status again in a moment.",
      502,
      "PAYMENT_GATEWAY_UNAVAILABLE"
    );
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------- order lookup ------------------------------ */

export async function findJonotaOrder({ orderId, orderNumber, transactionId } = {}) {
  const { orders } = await collections();
  if (orderId) {
    const objectId = toObjectIdOrNull(orderId);
    if (objectId) {
      const byId = await orders.findOne({ _id: objectId });
      if (byId) return byId;
    }
    const byNumber = await orders.findOne({ orderNumber: String(orderId) });
    if (byNumber) return byNumber;
  }
  if (orderNumber) {
    const byNumber = await orders.findOne({ orderNumber: String(orderNumber) });
    if (byNumber) return byNumber;
  }
  if (transactionId) {
    return orders.findOne({ transactionId: String(transactionId) });
  }
  return null;
}

export async function findJonotaOrderByVerification(verification) {
  const metadata = verification?.metadata || {};
  const candidates = [
    metadata.order_id,
    metadata.orderId,
    metadata.order_number,
    metadata.orderNumber,
  ]
    .filter((v) => v !== null && v !== undefined && String(v).trim())
    .map((v) => String(v).trim());

  for (const candidate of candidates) {
    const order = await findJonotaOrder({ orderId: candidate });
    if (order) return order;
  }
  if (verification?.transactionId) {
    return findJonotaOrder({ transactionId: verification.transactionId });
  }
  return null;
}

function assertVerificationMatchesOrder(order, verification) {
  const metadata = verification?.metadata || {};
  const candidates = [
    metadata.order_id,
    metadata.orderId,
    metadata.order_number,
    metadata.orderNumber,
  ]
    .filter((v) => v !== null && v !== undefined && String(v).trim())
    .map((v) => String(v).trim());

  if (candidates.length) {
    const matches = candidates.some(
      (value) => value === String(order._id) || value === String(order.orderNumber)
    );
    if (!matches) {
      throw new ApiError(
        "This payment transaction does not belong to this order.",
        409,
        "PAYMENT_ORDER_MISMATCH"
      );
    }
    return;
  }

  /* No metadata in the provider response. We only trust the transaction when
   * it is already recorded against this exact order (e.g. a retry after the
   * first callback stored it). Otherwise a transaction could be replayed onto
   * a different order. */
  if (
    order.transactionId &&
    verification?.transactionId &&
    String(order.transactionId) === String(verification.transactionId)
  ) {
    return;
  }

  throw new ApiError(
    "The payment gateway did not return the order reference, so this payment cannot be matched automatically. Please contact support.",
    409,
    "PAYMENT_ORDER_REFERENCE_MISSING"
  );
}

/* ---------------------------- idempotent updates --------------------------- */

export async function ensureJonotaIndexes() {
  if (globalThis[INDEX_FLAG]) return;
  globalThis[INDEX_FLAG] = true;
  try {
    const { orders } = await collections();
    await orders.createIndex(
      { transactionId: 1 },
      {
        unique: true,
        partialFilterExpression: { transactionId: { $type: "string" } },
        name: "uniq_provider_transaction",
      }
    );
  } catch (error) {
    /* Existing duplicate data can prevent index creation. The application
     * still performs an explicit duplicate check, so we log and continue. */
    console.warn("[jonota] transaction index not created:", error.message);
  }
}

async function recordVerificationIssue(order, verification, reason, code, source) {
  const { orders } = await collections();
  const now = new Date();
  const previousCode = order.paymentVerification?.code || null;
  const update = {
    $set: {
      paymentProvider: PROVIDER,
      paymentStatus:
        order.paymentStatus === PAYMENT_STATUS.PAID ||
        order.paymentStatus === PAYMENT_STATUS.REFUNDED
          ? order.paymentStatus
          : PAYMENT_STATUS.PENDING,
      paymentVerification: {
        status: "MISMATCH",
        code,
        providerStatus: verification?.rawStatus || verification?.status || null,
        transactionId: verification?.transactionId || null,
        amount: verification?.amount ?? null,
        paymentMethod: verification?.paymentMethod || null,
        verifiedAt: now,
        source,
        message: reason,
      },
      updatedAt: now,
    },
    ...(previousCode !== code
      ? {
          $push: {
            adminNotes: {
              note: `Jonota Pay verification issue: ${reason}`,
              at: now,
              by: "jonota-pay",
              byName: "Payment Gateway",
            },
          },
        }
      : {}),
  };

  await orders.updateOne(
    { _id: order._id, paymentStatus: { $ne: PAYMENT_STATUS.PAID } },
    update
  );
}

async function notifyPaymentSuccess(order) {
  try {
    const notification = await createNotification({
      userId: order.userId,
      type: "payment_success",
      order,
      dedupeKey: `paid_${order.orderNumber}`,
      title: "Payment received",
      body: `We have received your payment for order ${order.orderNumber}. Your order is now confirmed.`,
    });
    if (notification?.email?.status === "pending") {
      await scheduleJob({
        key: `mail_${notification._id}`,
        type: "send_notification_email",
        payload: { notificationId: String(notification._id) },
        runAt: new Date(Date.now() + 5_000),
      });
    }
  } catch (error) {
    console.error("[jonota] payment notification failed:", error.message);
  }
}

async function notifyPaymentFailed(order, transactionId) {
  try {
    const notification = await createNotification({
      userId: order.userId,
      type: "payment_failed",
      order,
      dedupeKey: `payfail_${order.orderNumber}_${transactionId || "unknown"}`,
      title: "Payment failed",
      body: `The online payment for order ${order.orderNumber} could not be completed. You can retry payment or choose Cash on Delivery.`,
    });
    if (notification?.email?.status === "pending") {
      await scheduleJob({
        key: `mail_${notification._id}`,
        type: "send_notification_email",
        payload: { notificationId: String(notification._id) },
        runAt: new Date(Date.now() + 5_000),
      });
    }
  } catch (error) {
    console.error("[jonota] payment failure notification failed:", error.message);
  }
}

/**
 * Marks an order paid. Only called with a COMPLETED verification response.
 */
export async function applyJonotaPayment({ order, verification, source }) {
  if (!order) throw notFound("Order not found.");
  if (order.paymentMethod !== PROVIDER) {
    throw badRequest("This order is not an online payment order.");
  }
  if (verification?.status !== "COMPLETED") {
    throw badRequest("Payment is not completed.");
  }
  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
    await recordVerificationIssue(
      order,
      verification,
      "The order was refunded before this payment was verified.",
      "ORDER_REFUNDED",
      source
    );
    throw conflict("This order was refunded. The payment needs manual review.");
  }
  if (order.orderStatus === ORDER_STATUS.CANCELLED) {
    await recordVerificationIssue(
      order,
      verification,
      "The order was cancelled before this payment was verified.",
      "ORDER_CANCELLED",
      source
    );
    throw conflict("This order was cancelled. The payment needs manual review.");
  }

  const txId = String(verification.transactionId || "").trim();
  if (!txId) {
    await recordVerificationIssue(
      order,
      verification,
      "The gateway did not return a transaction id.",
      "MISSING_TRANSACTION_ID",
      source
    );
    throw new ApiError(
      "The payment could not be verified because the gateway did not return a transaction id.",
      502,
      "MISSING_TRANSACTION_ID"
    );
  }

  const paidAmount = parseProviderAmount(verification.amount);
  if (paidAmount === null) {
    await recordVerificationIssue(
      order,
      verification,
      "The gateway did not return a payable amount.",
      "MISSING_AMOUNT",
      source
    );
    throw new ApiError(
      "The payment amount could not be verified. Please contact support.",
      409,
      "PAYMENT_AMOUNT_MISSING"
    );
  }
  if (toMinor(paidAmount) !== toMinor(order.total)) {
    await recordVerificationIssue(
      order,
      verification,
      `Paid amount ${paidAmount} does not match order total ${order.total}.`,
      "AMOUNT_MISMATCH",
      source
    );
    throw new ApiError(
      "The paid amount does not match the order total. Please contact support.",
      409,
      "PAYMENT_AMOUNT_MISMATCH"
    );
  }

  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    if (order.transactionId && String(order.transactionId) !== txId) {
      await recordVerificationIssue(
        order,
        verification,
        "The order was already paid with a different transaction.",
        "ORDER_ALREADY_PAID",
        source
      );
      throw conflict("This order has already been paid with a different transaction.");
    }
    return { order, applied: false, alreadyPaid: true };
  }

  if (order.transactionId && String(order.transactionId) !== txId) {
    if (order.paymentStatus !== PAYMENT_STATUS.FAILED) {
      await recordVerificationIssue(
        order,
        verification,
        "A different payment transaction is already linked to this order.",
        "TRANSACTION_MISMATCH",
        source
      );
      throw conflict(
        "This order is already linked to a different payment transaction. Please contact support."
      );
    }
    /* A failed attempt may be replaced by a fresh retry. */
  }

  await ensureJonotaIndexes();
  const { orders } = await collections();

  const duplicate = await orders.findOne({
    transactionId: txId,
    _id: { $ne: order._id },
  });
  if (duplicate) {
    await recordVerificationIssue(
      order,
      verification,
      "This gateway transaction is already attached to another order.",
      "TRANSACTION_ALREADY_USED",
      source
    );
    throw conflict("This transaction has already been used for another order.");
  }

  const now = new Date();
  const wasPending = order.orderStatus === ORDER_STATUS.PENDING;
  const nextOrderStatus = wasPending ? ORDER_STATUS.CONFIRMED : order.orderStatus;
  const historyEntry = {
    status: nextOrderStatus,
    at: now,
    by: source,
    byRole: "system",
    previous: order.orderStatus,
    note: "Online payment verified",
    customerMessage: "Your payment has been received and your order is confirmed.",
  };

  let updated;
  try {
    updated = await orders.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: PAYMENT_STATUS.PAID } },
      {
        $set: {
          paymentStatus: PAYMENT_STATUS.PAID,
          paymentProvider: PROVIDER,
          paymentReference: txId,
          transactionId: txId,
          paidAt: now,
          paymentVerifiedAt: now,
          paymentVerification: {
            status: "COMPLETED",
            providerStatus: verification.rawStatus || "COMPLETED",
            transactionId: txId,
            amount: verification.amount,
            paymentMethod: verification.paymentMethod || null,
            verifiedAt: now,
            source,
            message: null,
          },
          updatedAt: now,
          ...(wasPending
            ? {
                orderStatus: ORDER_STATUS.CONFIRMED,
                "timeline.confirmedAt": now,
              }
            : {}),
        },
        $push: { history: historyEntry },
      },
      { returnDocument: "after" }
    );
  } catch (error) {
    if (error?.code === 11000) {
      await recordVerificationIssue(
        order,
        verification,
        "This gateway transaction is already attached to another order.",
        "TRANSACTION_ALREADY_USED",
        source
      );
      throw conflict("This transaction has already been used for another order.");
    }
    throw error;
  }

  if (!updated) {
    const current = await orders.findOne({ _id: order._id });
    if (current?.paymentStatus === PAYMENT_STATUS.PAID) {
      if (current.transactionId && String(current.transactionId) !== txId) {
        throw conflict("This order has already been paid with a different transaction.");
      }
      return { order: current, applied: false, alreadyPaid: true };
    }
    throw new ApiError(
      "The order payment status could not be updated. Please try again.",
      500,
      "PAYMENT_UPDATE_FAILED"
    );
  }

  await notifyPaymentSuccess(updated);
  return { order: updated, applied: true, alreadyPaid: false };
}

/**
 * Stores PENDING / FAILED / UNKNOWN verification results without ever marking
 * the order paid.
 */
export async function recordNonCompletedVerification({ order, verification, source }) {
  if (!order) throw notFound("Order not found.");
  if (order.paymentMethod !== PROVIDER) {
    throw badRequest("This order is not an online payment order.");
  }
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    return { order, applied: false, alreadyPaid: true };
  }
  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
    return { order, applied: false, alreadyPaid: false };
  }

  const txId = String(verification?.transactionId || "").trim();
  const targetStatus =
    verification?.status === "FAILED" ? PAYMENT_STATUS.FAILED : PAYMENT_STATUS.PENDING;

  if (order.transactionId && txId && String(order.transactionId) !== txId) {
    if (order.paymentStatus !== PAYMENT_STATUS.FAILED) {
      throw conflict(
        "This order is already linked to a different payment transaction. Please contact support."
      );
    }
  }

  await ensureJonotaIndexes();
  const { orders } = await collections();

  if (txId) {
    const duplicate = await orders.findOne({
      transactionId: txId,
      _id: { $ne: order._id },
    });
    if (duplicate) {
      throw conflict("This transaction has already been used for another order.");
    }
  }

  const now = new Date();
  const statusChanged = order.paymentStatus !== targetStatus;
  const update = {
    $set: {
      paymentStatus: targetStatus,
      paymentProvider: PROVIDER,
      ...(txId ? { transactionId: txId, paymentReference: txId } : {}),
      paymentVerification: {
        status: verification?.status || "UNKNOWN",
        providerStatus: verification?.rawStatus || null,
        transactionId: txId || null,
        amount: verification?.amount ?? null,
        paymentMethod: verification?.paymentMethod || null,
        verifiedAt: now,
        source,
        message: verification?.message || null,
      },
      updatedAt: now,
    },
  };

  if (statusChanged) {
    update.$push = {
      history: {
        status: order.orderStatus,
        at: now,
        by: source,
        byRole: "system",
        previous: order.orderStatus,
        note:
          targetStatus === PAYMENT_STATUS.FAILED
            ? "Online payment failed"
            : "Online payment pending",
        customerMessage:
          targetStatus === PAYMENT_STATUS.FAILED
            ? "Your online payment could not be completed."
            : "",
      },
    };
  }

  const updated = await orders.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: PAYMENT_STATUS.PAID } },
    update,
    { returnDocument: "after" }
  );

  if (!updated) {
    const current = await orders.findOne({ _id: order._id });
    if (current?.paymentStatus === PAYMENT_STATUS.PAID) {
      return { order: current, applied: false, alreadyPaid: true };
    }
    throw new ApiError(
      "The order payment status could not be updated. Please try again.",
      500,
      "PAYMENT_UPDATE_FAILED"
    );
  }

  if (targetStatus === PAYMENT_STATUS.FAILED && statusChanged) {
    await notifyPaymentFailed(updated, txId);
  }

  return { order: updated, applied: statusChanged, alreadyPaid: false };
}

/** Used when the callback is reached but the gateway cannot be contacted. */
export async function recordUnconfirmedTransaction({ order, transactionId, source, reason }) {
  if (!order) return null;
  if (order.paymentStatus === PAYMENT_STATUS.PAID) return order;
  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) return order;
  const txId = String(transactionId || "").trim();
  if (!txId) return order;
  if (order.transactionId && String(order.transactionId) !== txId) return order;

  await ensureJonotaIndexes();
  const { orders } = await collections();

  const duplicate = await orders.findOne({
    transactionId: txId,
    _id: { $ne: order._id },
  });
  if (duplicate) {
    console.warn("[jonota] unconfirmed transaction already belongs to another order");
    return order;
  }

  const now = new Date();
  await orders.updateOne(
    { _id: order._id, paymentStatus: { $ne: PAYMENT_STATUS.PAID } },
    {
      $set: {
        paymentStatus: PAYMENT_STATUS.PENDING,
        paymentProvider: PROVIDER,
        transactionId: txId,
        paymentReference: txId,
        paymentVerification: {
          status: "UNCONFIRMED",
          transactionId: txId,
          verifiedAt: now,
          source,
          message: reason || "The payment gateway could not be reached.",
        },
        updatedAt: now,
      },
    }
  );
  return orders.findOne({ _id: order._id });
}

/**
 * Main entry point used by the callback, webhook and manual verification.
 */
export async function recordJonotaVerification({ order, verification, source }) {
  if (!order) throw notFound("Order not found.");
  if (order.paymentMethod !== PROVIDER) {
    throw badRequest("This order is not an online payment order.");
  }

  assertVerificationMatchesOrder(order, verification);

  if (verification.status === "COMPLETED") {
    return applyJonotaPayment({ order, verification, source });
  }
  return recordNonCompletedVerification({ order, verification, source });
}

/* ------------------------------- serialization ----------------------------- */

export function publicVerification(order, verification = null) {
  const v = verification || order?.paymentVerification || null;
  if (!v) return null;
  return {
    status: v.status || null,
    providerStatus: v.providerStatus || null,
    transactionId: v.transactionId || order?.transactionId || null,
    amount: v.amount ?? null,
    paymentMethod: v.paymentMethod || null,
    verifiedAt: v.verifiedAt || null,
    message: v.message || null,
    code: v.code || null,
  };
}

export function serializePaymentOrder(order) {
  if (!order) return null;
  const canRetry =
    order.paymentMethod === PROVIDER &&
    order.paymentStatus !== PAYMENT_STATUS.PAID &&
    order.paymentStatus !== PAYMENT_STATUS.REFUNDED &&
    order.orderStatus !== ORDER_STATUS.CANCELLED &&
    (!order.transactionId || order.paymentStatus === PAYMENT_STATUS.FAILED);

  return {
    _id: String(order._id),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider || null,
    transactionId: order.transactionId || null,
    paidAt: order.paidAt || null,
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryCharge: order.deliveryCharge,
    currencySymbol: order.currencySymbol || "৳",
    itemsCount: order.itemsCount,
    items: (order.items || []).map((item) => ({
      productId: item.productId,
      title: item.title,
      image: item.image || "",
      sku: item.sku || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      variant: item.variant || null,
    })),
    shippingAddress: order.shippingAddress
      ? {
          fullName: order.shippingAddress.fullName || "",
          phone: order.shippingAddress.phone || "",
          city: order.shippingAddress.city || "",
          district: order.shippingAddress.district || "",
          division: order.shippingAddress.division || "",
          streetAddress: order.shippingAddress.streetAddress || "",
          country: order.shippingAddress.country || "",
        }
      : null,
    paymentVerification: publicVerification(order),
    canRetry,
    paymentUrl:
      order.paymentStatus !== PAYMENT_STATUS.PAID && order.paymentUrl
        ? order.paymentUrl
        : null,
  };
}
