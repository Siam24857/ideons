import { handleApi, ok, parseError, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections } from "@/lib/db";
import { adminOrderQuerySchema } from "@/lib/validation";
import { ZodError } from "zod";

/**
 * GET /api/admin/orders
 *
 * Server-side search / filter / sort / pagination over every store order.
 * Search matches order number, customer id, name, email and phone number.
 * The result never returns whole documents without paging - the table always
 * requests an explicit page and limit.
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();

  let input;
  try {
    input = adminOrderQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
  } catch (error) {
    if (error instanceof ZodError) return parseError(error);
    throw error;
  }

  const { search, status, paymentMethod, paymentStatus, from, to, sort, page, limit } = input;
  const { orders } = await collections();

  const query = {};
  const and = [];

  if (status) query.orderStatus = status;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (from || to) {
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
    }
    query.createdAt = range;
  }

  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: safe, $options: "i" };
    const looksLikeObjectId = /^[a-fA-F0-9]{24}$/.test(search.trim());
    const terms = [
      { orderNumber: regex },
      { "customer.name": regex },
      { "customer.email": regex },
      { "customer.phone": regex },
      { "shippingAddress.phone": regex },
      { "shippingAddress.fullName": regex },
      { "shippingAddress.district": regex },
      { "shippingAddress.city": regex },
      { "items.title": regex },
      { "customer.userId": regex },
    ];
    if (looksLikeObjectId) terms.push({ userId: search.trim() }, { _id: search.trim() });
    and.push({ $or: terms });
  }

  if (and.length) query.$and = and;

  const sortSpec =
    sort === "oldest"
      ? { createdAt: 1 }
      : sort === "total-desc"
        ? { total: -1, createdAt: -1 }
        : sort === "total-asc"
          ? { total: 1, createdAt: -1 }
          : { createdAt: -1 };

  const [items, total] = await Promise.all([
    orders
      .find(query)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    orders.countDocuments(query),
  ]);

  const countsAgg = await orders
    .aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }])
    .toArray();
  const counts = Object.fromEntries(countsAgg.map((c) => [c._id, c.count]));

  return ok({
    items: items.map(projectOrder),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts,
  });
});

/** Compact row shape used by the admin orders table. */
export function projectOrder(order) {
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
    delivery: {
      district: order.shippingAddress?.district || "",
      city: order.shippingAddress?.city || "",
      division: order.shippingAddress?.division || "",
      fullName: order.shippingAddress?.fullName || "",
      phone: order.shippingAddress?.phone || "",
    },
    itemsCount: order.itemsCount,
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryCharge: order.deliveryCharge,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference || null,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
