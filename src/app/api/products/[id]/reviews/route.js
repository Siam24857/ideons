import { handleApi, ok, created, badRequest, readJson, qpInt } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { reviewSchema } from "@/lib/validation";
import { getSettings } from "@/lib/settings";
import { getProductReviews, serializeReview, recomputeProductRating } from "@/lib/reviews";

/**
 * GET  /api/products/[id]/reviews - public reviews (genuine + catalog ones)
 * POST /api/products/[id]/reviews - signed-in customer writes a review
 *
 * A review is only accepted from a signed-in account, and it is flagged as a
 * verified purchase when that account actually received the product.
 */
export const GET = handleApi(async (request, { params }) => {
  const { id } = await params;
  const page = qpInt(request, "page", 1, { min: 1 });
  const limit = qpInt(request, "limit", 10, { min: 1, max: 50 });
  const objectId = toObjectIdOrNull(id);
  if (!objectId) return ok({ items: [], total: 0, page, limit, summary: { average: 0, count: 0 } });

  const result = await getProductReviews(objectId, { page, limit });
  return ok({ ...result, page, limit });
});

export const POST = handleApi(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const body = reviewSchema.parse({ ...(await readJson(request)), productId: id });

  const settings = await getSettings();
  if (!settings.allowReviews) throw badRequest("Reviews are currently disabled.");

  const objectId = toObjectIdOrNull(body.productId);
  if (!objectId) throw badRequest("Invalid product.");

  const { products, reviews, orders } = await collections();
  const product = await products.findOne({ _id: objectId });
  if (!product || product.isActive === false) throw badRequest("Product not found.");

  const alreadyReviewed = await reviews.findOne({
    productId: String(objectId),
    userId: String(user.id),
  });
  if (alreadyReviewed) throw badRequest("You have already reviewed this product.");

  const deliveredOrder = await orders.findOne(
    {
      userId: String(user.id),
      "items.productId": String(objectId),
      orderStatus: "delivered",
    },
    { sort: { createdAt: -1 } }
  );

  const now = new Date();
  const doc = {
    productId: String(objectId),
    userId: String(user.id),
    userName: user.name || "Customer",
    rating: body.rating,
    title: body.title || "",
    comment: body.comment,
    verifiedPurchase: Boolean(deliveredOrder),
    orderNumber: deliveredOrder?.orderNumber || null,
    status: "published",
    source: "store",
    createdAt: now,
    updatedAt: now,
  };

  const result = await reviews.insertOne(doc);
  doc._id = result.insertedId;

  const summary = await recomputeProductRating(objectId);

  return created({ review: serializeReview(doc), summary });
});
