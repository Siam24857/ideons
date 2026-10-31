import { handleApi, ok, created, readJson, conflict } from "@/lib/api";
import { newsletterSchema } from "@/lib/validation";
import { collections } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/newsletter
 * Stores the subscription in MongoDB. No third-party newsletter service is
 * configured for this store, so the response says exactly that instead of
 * claiming an email was sent.
 */
export const POST = handleApi(async (request) => {
  assertRateLimit(request, "newsletter", { limit: 5, windowMs: 60_000 });
  const body = newsletterSchema.parse(await readJson(request));
  const { subscribers } = await collections();

  const existing = await subscribers.findOne({ email: body.email.toLowerCase() });
  if (existing && existing.active !== false) {
    throw conflict("This email is already subscribed.");
  }

  await subscribers.updateOne(
    { email: body.email.toLowerCase() },
    {
      $set: { active: true, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date(), source: "website", confirmedAt: null },
    },
    { upsert: true }
  );

  return created({
    message: "Thank you for subscribing to IDeons updates.",
    provider: "store",
  });
});
