import { handleApi, ok, notFound } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { adminUserQuerySchema } from "@/lib/validation";

/**
 * GET /api/admin/users
 * Server-side search over customer id, name, email and phone number.
 * Passwords, tokens and session secrets are never returned.
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();
  const input = adminUserQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  const { search, role, sort, page, limit } = input;
  const { users, orders } = await collections();

  const query = {};
  const and = [];
  if (role) query.role = role;

  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: safe, $options: "i" };
    const terms = [{ name: regex }, { email: regex }, { phone: regex }];
    if (/^[a-fA-F0-9]{24}$/.test(search.trim())) terms.push({ _id: search.trim() });
    and.push({ $or: terms });
  }
  if (and.length) query.$and = and;

  const sortSpec =
    sort === "oldest" ? { createdAt: 1 } : sort === "name" ? { name: 1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    users
      .find(query, { projection: { name: 1, email: 1, phone: 1, role: 1, createdAt: 1, image: 1, banned: 1 } })
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    users.countDocuments(query),
  ]);

  // Aggregate per-user order stats only for the page that was requested.
  const ids = items.map((u) => u._id);
  const stats = ids.length
    ? await orders
        .aggregate([
          { $match: { userId: { $in: ids.map(String) } } },
          {
            $group: {
              _id: "$userId",
              totalOrders: { $sum: 1 },
              totalSpent: {
                $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 0, "$total"] },
              },
              lastOrderAt: { $max: "$createdAt" },
              byStatus: { $push: "$orderStatus" },
            },
          },
        ])
        .toArray()
    : [];
  const statsMap = new Map(stats.map((s) => [s._id, s]));

  const serialized = items.map((u) => {
    const s = statsMap.get(String(u._id));
    const byStatus = {};
    for (const status of s?.byStatus || []) byStatus[status] = (byStatus[status] || 0) + 1;
    return {
      _id: String(u._id),
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role || "customer",
      createdAt: u.createdAt || null,
      totalOrders: s?.totalOrders || 0,
      totalSpent: s?.totalSpent || 0,
      lastOrderAt: s?.lastOrderAt || null,
      ordersByStatus: byStatus,
    };
  });

  // An order number must also be searchable - resolve it to its owner first.
  let enriched = serialized;
  if (search && /^IDN-\d{8}-\w{6}$/.test(search.trim().toUpperCase())) {
    const order = await orders.findOne({ orderNumber: search.trim().toUpperCase() });
    if (order) {
      const owner = await users.findOne(
        { _id: toObjectIdOrNull(order.userId) },
        { projection: { name: 1, email: 1, phone: 1, role: 1, createdAt: 1 } }
      );
      if (owner && !serialized.some((u) => u._id === String(owner._id))) {
        enriched = [
          {
            _id: String(owner._id),
            name: owner.name || "",
            email: owner.email || "",
            phone: owner.phone || "",
            role: owner.role || "customer",
            createdAt: owner.createdAt || null,
            totalOrders: await orders.countDocuments({ userId: String(order.userId) }),
            totalSpent: 0,
            lastOrderAt: null,
            ordersByStatus: {},
            matchedOrder: order.orderNumber,
          },
          ...serialized,
        ];
      }
    }
  }

  return ok({
    items: enriched,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});
