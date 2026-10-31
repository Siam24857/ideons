import { handleApi, ok, qp, qpInt } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections } from "@/lib/db";

/**
 * GET /api/admin/categories - every category (including inactive) + counts
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();
  const { categories, products } = await collections();
  const includeInactive = qp(request, "includeInactive") !== "0";

  const query = includeInactive ? {} : { isActive: { $ne: false } };
  const [items, counts] = await Promise.all([
    categories.find(query).sort({ order: 1, name: 1 }).toArray(),
    products
      .aggregate([
        { $match: { isActive: { $ne: false } } },
        { $group: { _id: "$categorySlug", count: { $sum: 1 }, stock: { $sum: "$stock" } } },
      ])
      .toArray(),
  ]);

  const map = new Map(counts.map((c) => [c._id, c]));
  return ok({
    items: items.map((c) => ({
      ...c,
      _id: String(c._id),
      productCount: map.get(c.slug)?.count || 0,
      stockCount: map.get(c.slug)?.stock || 0,
    })),
  });
});
