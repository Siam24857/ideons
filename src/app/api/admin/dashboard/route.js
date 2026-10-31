import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections } from "@/lib/db";
import { ORDER_STATUS_LIST, PAYMENT_STATUS_LIST } from "@/lib/constants";

/**
 * GET /api/admin/dashboard
 * Real statistics computed from MongoDB.
 *
 * Revenue rules:
 *  - `paidRevenue`   counts only orders whose payment status is "paid"
 *                    (i.e. captured online payments).
 *  - `codCollectible` reports Cash on Delivery totals separately - COD money
 *                    is NOT counted as revenue until it is collected.
 *  - failed / unpaid online transactions are never counted.
 */
export const GET = handleApi(async () => {
  await requireAdmin();

  const { orders, users, products, contactMessages, notifications } = await collections();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    totalCustomers,
    totalOrders,
    statusCounts,
    paymentCounts,
    revenueAgg,
    codAgg,
    lowStock,
    recentOrders,
    newMessages,
    productCount,
    activeProductCount,
    thirtyDayOrders,
    pendingNotifications,
  ] = await Promise.all([
    users.countDocuments({}),
    orders.countDocuments({}),
    orders
      .aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }])
      .toArray(),
    orders
      .aggregate([
        { $group: { _id: { p: "$paymentMethod", s: "$paymentStatus" }, count: { $sum: 1 }, total: { $sum: "$total" } } },
      ])
      .toArray(),
    orders
      .aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    orders
      .aggregate([
        { $match: { paymentMethod: "cod", paymentStatus: { $ne: "paid" }, orderStatus: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    products
      .find({ isActive: { $ne: false }, stock: { $lte: Number(process.env.LOW_STOCK_THRESHOLD) || 5 } })
      .project({ title: 1, stock: 1, sku: 1, images: 1, price: 1, category: 1 })
      .limit(12)
      .toArray(),
    orders.find({}).sort({ createdAt: -1 }).limit(8).toArray(),
    contactMessages.countDocuments({ status: "new" }),
    products.countDocuments({}),
    products.countDocuments({ isActive: { $ne: false } }),
    orders.countDocuments({ createdAt: { $gte: since } }),
    notifications.countDocuments({ "email.status": "pending" }),
  ]);

  const byStatus = Object.fromEntries(ORDER_STATUS_LIST.map((s) => [s, 0]));
  for (const row of statusCounts) byStatus[row._id] = row.count;

  const codCount = paymentCounts.find((p) => p._id.p === "cod")?.count || 0;
  const onlineCount = paymentCounts.find((p) => p._id.p === "stripe")?.count || 0;
  const paidCount = paymentCounts.find((p) => p._id.s === "paid")?.count || 0;

  return ok({
    stats: {
      totalCustomers,
      totalOrders,
      ordersByStatus: byStatus,
      pending: byStatus.pending,
      confirmed: byStatus.confirmed,
      processing: byStatus.processing,
      shipped: byStatus.shipped,
      delivered: byStatus.delivered,
      cancelled: byStatus.cancelled,
      paidRevenue: revenueAgg[0]?.total || 0,
      paidOrders: revenueAgg[0]?.count || 0,
      codCollectible: codAgg[0]?.total || 0,
      codOrders: codAgg[0]?.count || codCount,
      codOrderCount: codCount,
      onlineOrderCount: onlineCount,
      paidOrderCount: paidCount,
      lowStockCount: lowStock.length,
      productCount,
      activeProductCount,
      newMessages,
      ordersLast30Days: thirtyDayOrders,
      pendingEmails: pendingNotifications,
      currencySymbol: (await getSymbol()) || "৳",
    },
    lowStock,
    recentOrders: recentOrders.map((o) => ({
      _id: String(o._id),
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || "",
      total: o.total,
      orderStatus: o.orderStatus,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      itemsCount: o.itemsCount,
      createdAt: o.createdAt,
    })),
  });
});

async function getSymbol() {
  try {
    const { settings } = await collections();
    const doc = await settings.findOne({ key: "store" });
    return doc?.currencySymbol;
  } catch {
    return "৳";
  }
}
