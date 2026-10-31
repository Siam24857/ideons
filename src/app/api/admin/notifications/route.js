import { handleApi, ok, qp, qpInt } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";

/**
 * GET /api/admin/notifications - notification log (per customer, per type,
 * with the real email delivery status reported by the provider).
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();
  const { notifications, users } = await collections();
  const page = qpInt(request, "page", 1, { min: 1 });
  const limit = qpInt(request, "limit", 25, { min: 1, max: 100 });
  const type = qp(request, "type");
  const emailStatus = qp(request, "emailStatus");

  const query = {};
  if (type && type !== "all") query.type = type;
  if (emailStatus && emailStatus !== "all") query["email.status"] = emailStatus;

  const [items, total, stats] = await Promise.all([
    notifications
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    notifications.countDocuments(query),
    notifications
      .aggregate([
        {
          $group: {
            _id: "$email.status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  const userIds = [...new Set(items.map((n) => n.userId))];
  const userDocs = userIds.length
    ? await users
        .find({ _id: { $in: userIds.map(toObjectIdOrNull).filter(Boolean) } })
        .project({ name: 1, email: 1 })
        .toArray()
    : [];
  const uMap = new Map(userDocs.map((u) => [String(u._id), u]));

  return ok({
    items: items.map((n) => ({
      _id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body,
      orderNumber: n.orderNumber || null,
      userId: n.userId,
      user: {
        name: uMap.get(n.userId)?.name || "Customer",
        email: uMap.get(n.userId)?.email || "",
      },
      readAt: n.readAt || null,
      email: n.email || { status: "skipped", attempts: 0 },
      createdAt: n.createdAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    emailStats: Object.fromEntries(stats.map((s) => [s._id || "none", s.count])),
  });
});
