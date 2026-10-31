import { handleApi, ok, notFound } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";

/**
 * GET /api/admin/orders/[id]
 * Full order details for admins: customer info, shipping address snapshot,
 * items snapshot, financial details, status history and timeline.
 *
 * Accepts either a MongoDB ObjectId or an order number string (e.g. IDN-...).
 */
export const GET = handleApi(async (request, { params }) => {
  await requireAdmin();

  const { id } = await params;
  const { orders } = await collections();

  let order = null;
  const objectId = toObjectIdOrNull(id);
  if (objectId) {
    order = await orders.findOne({ _id: objectId });
  }
  if (!order) {
    order = await orders.findOne({ orderNumber: id });
  }
  if (!order) throw notFound("Order not found.");

  return ok({
    order: serializeAdminOrder(order),
  });
});

export function serializeAdminOrder(order) {
  if (!order) return null;
  return {
    _id: String(order._id),
    orderNumber: order.orderNumber,
    userId: order.userId,
    customer: {
      userId: order.userId,
      name: order.customer?.name || "",
      email: order.customer?.email || "",
      phone: order.customer?.phone || order.shippingAddress?.phone || "",
      createdAt: order.customer?.createdAt || null,
    },
    shippingAddress: order.shippingAddress || null,
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
    itemsCount: order.itemsCount,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryCharge: order.deliveryCharge,
    total: order.total,
    currencySymbol: order.currencySymbol || "৳",
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference || null,
    orderStatus: order.orderStatus,
    history: order.history || [],
    customerMessages: order.customerMessages || [],
    timeline: order.timeline || {},
    cancelInfo: order.cancelInfo || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
