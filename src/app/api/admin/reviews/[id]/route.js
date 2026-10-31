import { handleApi, ok, notFound, readJson, qp, qpInt } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { recomputeProductRating } from "@/lib/reviews";
import { z } from "zod";

/**
 * GET    /api/admin/reviews/[id] - single review
 * PATCH  /api/admin/reviews/[id] - publish / hide
 * DELETE /api/admin/reviews/[id] - remove (product rating is recomputed)
 */

export const GET = handleApi(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("Review not found.");
  const { reviews } = await collections();
  const review = await reviews.findOne({ _id: objectId });
  if (!review) throw notFound("Review not found.");
  return ok({ review: { ...review, _id: String(review._id) } });
});

const patchSchema = z.object({ status: z.enum(["published", "hidden"]) });

export const PATCH = handleApi(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("Review not found.");
  const body = patchSchema.parse(await readJson(request));

  const { reviews } = await collections();
  const review = await reviews.findOne({ _id: objectId });
  if (!review) throw notFound("Review not found.");
  await reviews.updateOne({ _id: objectId }, { $set: { status: body.status, updatedAt: new Date() } });

  await recomputeProductRating(review.productId);
  return ok({ status: body.status });
});

export const DELETE = handleApi(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("Review not found.");

  const { reviews } = await collections();
  const review = await reviews.findOne({ _id: objectId });
  if (!review) throw notFound("Review not found.");

  await reviews.deleteOne({ _id: objectId });
  await recomputeProductRating(review.productId);

  return ok({ deleted: true });
});
