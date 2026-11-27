import { handleApi, ok, badRequest, notFound, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  isJonotaPayConfigured,
  publicVerification,
  recordJonotaVerification,
  serializePaymentOrder,
  verifyJonotaTransaction,
} from "@/lib/jonota-pay";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/constants";

/**
 * POST /api/payments/jonota/verify
 *
 * Customer-triggered re-verification. The browser may pass the transaction id
 * it saw in the redirect, but the decision is made only by the provider's
 * verification API and the amount / ownership checks in `recordJonotaVerification`.
 */

async function findOwnOrder(userId, { orderId, orderNumber }) {
  const { orders } = await collections();

  if (orderNumber) {
    const byNumber = await orders.findOne({
      orderNumber: String(orderNumber),
      userId: String(userId),
    });
    if (byNumber) return byNumber;
  }

  if (orderId) {
    const objectId = toObjectIdOrNull(orderId);
    if (objectId) {
      const byId = await orders.findOne({ _id: objectId, userId: String(userId) });
      if (byId) return byId;
    }
    const byNumber = await orders.findOne({
      orderNumber: String(orderId),
      userId: String(userId),
    });
    if (byNumber) return byNumber;
  }

  return null;
}

export const POST = handleApi(async (request) => {
  const user = await requireUser();
  assertRateLimit(request, "jonota-verify", { limit: 20, windowMs: 60_000 });

  if (!isJonotaPayConfigured()) {
    throw badRequest("Online payment is not configured on this store.");
  }

  const body = await readJson(request);
  const order = await findOwnOrder(user.id, {
    orderId: body.orderId,
    orderNumber: body.orderNumber,
  });
  if (!order) throw notFound("Order not found.");
  if (order.paymentMethod !== PAYMENT_METHOD.JONOTA_PAY) {
    throw badRequest("This order is not an online payment order.");
  }

  const transactionId = String(
    body.transactionId || body.transaction_id || order.transactionId || ""
  ).trim();

  if (!transactionId) {
    throw badRequest(
      "We do not have a payment transaction to verify yet. If you were charged, please contact support with your order number."
    );
  }

  const verification = await verifyJonotaTransaction(transactionId);

  const result = await recordJonotaVerification({
    order,
    verification,
    source: "customer-verify",
  });

  return ok({
    order: serializePaymentOrder(result.order),
    verification: publicVerification(result.order, verification),
    applied: Boolean(result.applied),
    alreadyPaid: Boolean(result.alreadyPaid),
    paid: result.order?.paymentStatus === PAYMENT_STATUS.PAID,
  });
});
