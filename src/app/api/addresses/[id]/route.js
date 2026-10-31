import { handleApi, ok, notFound, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { addressSchema } from "@/lib/validation";

/**
 * PATCH  /api/addresses/[id] - edit own address / set default
 * DELETE /api/addresses/[id] - remove own address
 *
 * Every query includes the session user id, so an id from another customer
 * behaves exactly like a missing document.
 */
async function findOwn(userId, id) {
  const objectId = toObjectIdOrNull(id);
  if (!objectId) return null;
  const { addresses } = await collections();
  return addresses.findOne({ _id: objectId, userId: String(userId) });
}

export const PATCH = handleApi(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const existing = await findOwn(user.id, id);
  if (!existing) throw notFound("Address not found.");

  const body = addressSchema.partial().parse(await readJson(request));
  const { addresses } = await collections();

  if (body.isDefault) {
    await addresses.updateMany({ userId: String(user.id) }, { $set: { isDefault: false } });
  }

  const patch = { ...body, updatedAt: new Date() };
  await addresses.updateOne({ _id: existing._id, userId: String(user.id) }, { $set: patch });

  const updated = await findOwn(user.id, id);
  return ok({ address: { ...updated, _id: String(updated._id), userId: undefined } });
});

export const DELETE = handleApi(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const existing = await findOwn(user.id, id);
  if (!existing) throw notFound("Address not found.");

  const { addresses } = await collections();
  await addresses.deleteOne({ _id: existing._id, userId: String(user.id) });

  // Keep exactly one default address so checkout never has no default option.
  if (existing.isDefault) {
    const next = await addresses.findOne({ userId: String(user.id) });
    if (next) await addresses.updateOne({ _id: next._id }, { $set: { isDefault: true } });
  }

  return ok({ deleted: true });
});
