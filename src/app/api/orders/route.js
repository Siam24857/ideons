import { handleApi, ok, qpInt, qp, forbidden, notFound } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections } from "@/lib/db";
import { ORDER_STATUS_LIST } from "@/lib/constants";

/**
 * GET /api/orders - the signed-in customer's own order history.
 *
 * The query is always filtered by the session user id: changing an id in the
 * URL can never reveal somebody else's orders.
 */

export function serializeOrder(order) {
  if (!order) return null;
  return {
    _id: String(order._id),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference || null,
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryCharge: order.deliveryCharge,
    currencySymbol: order.currencySymbol,
    itemsCount: order.itemsCount,
    items: (order.items || []).map((i) => ({
      productId: i.productId,
      title: i.title,
      image: i.image,
      sku: i.sku || "",
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      variant: i.variant || null,
    })),
    shippingAddress: order.shippingAddress || null,
    history: order.history || [],
    customerMessages: order.customerMessages || [],
    timeline: order.timeline || {},
    cancelInfo: order.cancelInfo || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export const GET = handleApi(async (request) => {
  const user = await requireUser();
  const page = qpInt(request, "page", 1, { min: 1 });
  const limit = qpInt(request, "limit", 10, { min: 1, max: 50 });
  const status = qp(request, "status");

  const { orders } = await collections();
  const query = { userId: String(user.id), ...(status && ORDER_STATUS_LIST.includes(status) ? { orderStatus: status } : {}) };

  const [items, total, statusCounts] = await Promise.all([
    orders
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    orders.countDocuments({ userId: String(user.id) }),
    orders
      .aggregate([
        { $match: { userId: String(user.id) } },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const counts = Object.fromEntries(ORDER_STATUS_LIST.map((s) => [s, 0]));
  for (const row of statusCounts) counts[row._id] = row.count;

  return ok({
    items: items.map(serializeOrder),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts,
  });
});
