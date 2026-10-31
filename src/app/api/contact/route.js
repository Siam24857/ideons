import { handleApi, ok, created, readJson } from "@/lib/api";
import { contactSchema, newsletterSchema } from "@/lib/validation";
import { collections } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/contact - public contact form (saved for the admin dashboard)
 * POST /api/newsletter - newsletter subscription (opt-in, single confirmation)
 *
 * Both endpoints are rate limited and store the submission; nothing is sent
 * to a third party because no newsletter provider is configured.
 */

export const POST = handleApi(async (request) => {
  assertRateLimit(request, "contact", { limit: 5, windowMs: 60_000 });
  const body = contactSchema.parse(await readJson(request));
  const { contactMessages } = await collections();

  const now = new Date();
  const doc = {
    name: body.name,
    email: body.email,
    phone: body.phone || "",
    subject: body.subject,
    message: body.message,
    orderId: body.orderId || "",
    status: "new",
    ip: request.headers.get("x-forwarded-for") || "",
    createdAt: now,
    updatedAt: now,
    handledBy: null,
    handledAt: null,
    adminNote: "",
  };

  const result = await contactMessages.insertOne(doc);
  return created({ message: "Thanks! Your message has been received.", id: String(result.insertedId) });
});
