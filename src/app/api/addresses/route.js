import { handleApi, ok, created, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections } from "@/lib/db";
import { addressSchema } from "@/lib/validation";

function serializeAddress(doc) {
  return { ...doc, _id: String(doc._id), userId: undefined };
}

/**
 * GET  /api/addresses - the customer's saved delivery addresses
 * POST /api/addresses - save a new address (optional default)
 */
export const GET = handleApi(async () => {
  const user = await requireUser();
  const { addresses } = await collections();
  const items = await addresses
    .find({ userId: String(user.id) })
    .sort({ isDefault: -1, updatedAt: -1 })
    .toArray();
  return ok({ items: items.map(serializeAddress) });
});

export const POST = handleApi(async (request) => {
  const user = await requireUser();
  const body = addressSchema.parse(await readJson(request));
  const { addresses } = await collections();

  const now = new Date();
  const count = await addresses.countDocuments({ userId: String(user.id) });
  const isDefault = body.isDefault || count === 0;

  if (isDefault) {
    await addresses.updateMany({ userId: String(user.id) }, { $set: { isDefault: false } });
  }

  const doc = {
    ...body,
    userId: String(user.id),
    email: body.email || user.email || "",
    country: body.country || "Bangladesh",
    isDefault,
    createdAt: now,
    updatedAt: now,
  };

  const result = await addresses.insertOne(doc);
  doc._id = result.insertedId;
  return created({ address: serializeAddress(doc) });
});
