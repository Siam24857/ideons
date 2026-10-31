import { handleApi, ok, notFound, qp, qpInt } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";

/**
 * GET /api/admin/reviews - all reviews with product + author context
 * (Modifying a review happens at /api/admin/reviews/[id].)
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();
  const { reviews, products, users } = await collections();
  const page = qpInt(request, "page", 1, { min: 1 });
  const limit = qpInt(request, "limit", 20, { min: 1, max: 100 });
  const status = qp(request, "status");
  const search = qp(request, "search");

  const query = {};
  if (status && status !== "all") query.status = status;
  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: safe, $options: "i" };
    query.$or = [{ comment: regex }, { userName: regex }, { title: regex }];
  }

  const [items, total, statusCounts] = await Promise.all([
    reviews
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    reviews.countDocuments(query),
    reviews.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
  ]);

  const productIds = [...new Set(items.map((r) => r.productId))]
    .map(toObjectIdOrNull)
    .filter(Boolean);
  const userIds = [...new Set(items.map((r) => r.userId))].map(toObjectIdOrNull).filter(Boolean);

  const [productDocs, userDocs] = await Promise.all([
    productIds.length
      ? products
          .find({ _id: { $in: productIds } })
          .project({ title: 1, slug: 1, images: 1 })
          .toArray()
      : [],
    userIds.length
      ? users.find({ _id: { $in: userIds } }).project({ name: 1, email: 1 }).toArray()
      : [],
  ]);
  const pMap = new Map(productDocs.map((p) => [String(p._id), p]));
  const uMap = new Map(userDocs.map((u) => [String(u._id), u]));

  return ok({
    items: items.map((r) => ({
      _id: String(r._id),
      rating: r.rating,
      title: r.title || "",
      comment: r.comment,
      status: r.status || "published",
      verified: Boolean(r.verifiedPurchase),
      createdAt: r.createdAt,
      product: r.productId
        ? {
            _id: r.productId,
            title: pMap.get(r.productId)?.title || "Removed product",
            slug: pMap.get(r.productId)?.slug || "",
            image: pMap.get(r.productId)?.images?.[0] || "",
          }
        : null,
      author: {
        _id: r.userId,
        name: r.userName || uMap.get(r.userId)?.name || "Customer",
        email: uMap.get(r.userId)?.email || "",
      },
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts: Object.fromEntries(statusCounts.map((c) => [c._id || "unpublished", c.count])),
  });
});
