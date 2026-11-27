import { handleApi, ok, badRequest, notFound, readJson, fail } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  createJonotaPayment,
  getPublicBaseUrl,
  isJonotaPayConfigured,
  serializePaymentOrder,
} from "@/lib/jonota-pay";
import { PAYMENT_METHOD } from "@/lib/constants";

/**
 * POST /api/payments/jonota/create
 *
 * Starts (or restarts) an online payment for an order that already belongs to
 * the signed-in customer. The amount is never taken from the request body - it
 * is read from the stored order, which was priced on the server at checkout.
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
  assertRateLimit(request, "jonota-create", { limit: 10, windowMs: 60_000 });

  if (!isJonotaPayConfigured()) {
    throw badRequest(
      "Online payment is not available on this store right now. Please choose Cash on Delivery."
    );
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

  const result = await createJonotaPayment({
    order,
    baseUrl: getPublicBaseUrl(request),
  });

  return ok({
    paymentUrl: result.paymentUrl,
    order: serializePaymentOrder(result.order),
  });
});

export function GET() {
  return fail("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
}
