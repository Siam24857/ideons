import { handleApi, ok } from "@/lib/api";
import { collections } from "@/lib/db";

export const GET = handleApi(async () => {
  const { reviews } = await collections();
  const docs = await reviews
    .find({ status: { $ne: "hidden" } })
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
  return ok({
    testimonials: docs.map((r) => ({
      _id: String(r._id),
      rating: r.rating,
      comment: r.comment,
      userName: r.userName || "Customer",
      isVerified: Boolean(r.verifiedPurchase),
    })),
  });
});
