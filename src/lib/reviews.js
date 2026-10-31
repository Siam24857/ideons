import { collections, toObjectIdOrNull } from "@/lib/db";

/**
 * Review storage model
 *
 *  - `reviews` collection  : genuine reviews written by authenticated
 *    customers inside this store (with user id, verified-purchase flag).
 *  - product.reviews        : catalog reviews that already existed on the
 *    product documents before this upgrade. They are preserved as-is and
 *    clearly marked with `source: "catalog"` when they are returned.
 *  - product.baseRating / baseReviewsCount : the catalog baseline captured
 *    once, so real reviews can be merged into it instead of overwriting it.
 *
 * Rating displayed on a product = weighted average of the baseline and every
 * genuine store review. Nothing is ever hard-coded.
 */

export async function getProductReviews(productId, { page = 1, limit = 10 } = {}) {
  const { reviews, products } = await collections();
  const product = await products.findOne({ _id: toObjectIdOrNull(productId) });
  if (!product) return { items: [], total: 0, summary: { average: 0, count: 0 } };

  const query = { productId: String(product._id) };
  const [items, total] = await Promise.all([
    reviews
      .find({ ...query, status: { $ne: "hidden" } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    reviews.countDocuments(query),
  ]);

  const catalog = (product.reviews || []).map((r, index) => ({
    _id: `${product._id}_catalog_${index}`,
    productId: String(product._id),
    rating: Number(r.rating) || 0,
    title: "",
    comment: r.comment || "",
    userName: r.userName || r.name || "Customer",
    isVerified: false,
    source: "catalog",
    createdAt: r.date ? new Date(r.date) : product.createdAt || null,
  }));

  return {
    items: [
      ...items.map((r) => ({
        _id: String(r._id),
        productId: String(r.productId),
        rating: r.rating,
        title: r.title || "",
        comment: r.comment,
        userName: r.userName || "Customer",
        isVerified: Boolean(r.verifiedPurchase),
        source: "store",
        createdAt: r.createdAt,
      })),
      ...catalog,
    ],
    total: total + catalog.length,
    storeTotal: total,
    summary: await getRatingSummary(product),
  };
}

export async function getRatingSummary(product) {
  const { reviews } = await collections();
  const agg = await reviews
    .aggregate([
      { $match: { productId: String(product._id), status: { $ne: "hidden" } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();

  const baseCount = Number(product.baseReviewsCount ?? product.reviewsCount ?? 0);
  const baseRating = Number(product.baseRating ?? product.rating ?? 0);
  const storeCount = agg[0]?.count || 0;
  const storeAvg = agg[0]?.avg || 0;
  const totalCount = baseCount + storeCount;
  const average = totalCount
    ? Math.round(((baseRating * baseCount + storeAvg * storeCount) / totalCount) * 10) / 10
    : 0;

  return { average, count: totalCount, storeCount, baseCount };
}

/**
 * Recomputes and persists the merged rating of a product.
 * Captures the catalog baseline the first time it runs.
 */
export async function recomputeProductRating(productId) {
  const { products } = await collections();
  const object = toObjectIdOrNull(productId);
  if (!object) return null;

  const product = await products.findOne({ _id: object });
  if (!product) return null;

  if (product.baseRating === undefined || product.baseReviewsCount === undefined) {
    // First run: freeze today's catalog values as the baseline.
    const base = {
      baseRating: Number(product.rating) || 0,
      baseReviewsCount: Number(product.reviewsCount) || 0,
    };
    await products.updateOne({ _id: object }, { $set: base });
    product.baseRating = base.baseRating;
    product.baseReviewsCount = base.baseReviewsCount;
  }

  const summary = await getRatingSummary(product);
  await products.updateOne(
    { _id: object },
    {
      $set: {
        rating: summary.average,
        reviewsCount: summary.count,
        updatedAt: new Date(),
      },
    }
  );
  return summary;
}

export function serializeReview(doc) {
  return {
    _id: String(doc._id),
    productId: String(doc.productId),
    rating: doc.rating,
    title: doc.title || "",
    comment: doc.comment,
    userName: doc.userName || "Customer",
    isVerified: Boolean(doc.verifiedPurchase),
    source: "store",
    createdAt: doc.createdAt,
  };
}
