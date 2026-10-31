import { handleApi, ok, badRequest, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long").optional(),
  email: z.string().trim().email("Enter a valid email address").max(254, "Email is too long").optional(),
});

/**
 * GET  /api/user/profile - current user's profile (from session)
 * PATCH /api/user/profile - update name / email
 */
export const GET = handleApi(async () => {
  const user = await requireUser();
  return ok({
    user: {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "customer",
      emailVerified: user.emailVerified ?? false,
      createdAt: user.createdAt || null,
    },
  });
});

export const PATCH = handleApi(async (request) => {
  const user = await requireUser();
  const body = profileSchema.parse(await readJson(request));

  const { users } = await collections();

  const update = { updatedAt: new Date() };
  if (body.name !== undefined) update.name = body.name;
  if (body.email !== undefined) update.email = body.email;

  if (Object.keys(update).length <= 1) {
    throw badRequest("Nothing to update.");
  }

  const objectId = toObjectIdOrNull(user.id);
  if (!objectId) throw badRequest("Invalid user id.");

  const result = await users.updateOne({ _id: objectId }, { $set: update });
  if (result.matchedCount === 0) {
    throw badRequest("User not found.");
  }

  return ok({ message: "Profile updated successfully." });
});
