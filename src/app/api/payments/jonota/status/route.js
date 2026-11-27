import { handleApi, ok, notFound, qp } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { serializePaymentOrder } from "@/lib/jonota-pay";

/**
 * GET /api/payments/jonota/status?orderNumber=... (or ?orderId=...)
 *
 * Returns the stored payment state for one of the signed-in customer's orders.
 * This endpoint never calls the provider and never changes anything - it is
 * used by the payment result screen to poll after the gateway redirect.
 */

export const GET = handleApi(async (request) => {
  const user = await requireUser();
  const orderId = qp(request, "orderId");
  const orderNumber = qp(request, "orderNumber");

  if (!orderId && !orderNumber) {
    throw notFound("Order not found.");
  }

  const { orders } = await collections();
  let order = null;

  if (orderNumber) {
    order = await orders.findOne({
      orderNumber: String(orderNumber),
      userId: String(user.id),
    });
  }

  if (!order && orderId) {
    const objectId = toObjectIdOrNull(orderId);
    if (objectId) {
      order = await orders.findOne({ _id: objectId, userId: String(user.id) });
    }
    if (!order) {
      order = await orders.findOne({
        orderNumber: String(orderId),
        userId: String(user.id),
      });
    }
  }

  if (!order) throw notFound("Order not found.");

  return ok({ order: serializePaymentOrder(order) });
});
