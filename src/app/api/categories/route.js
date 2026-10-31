import { handleApi, ok, created, badRequest, readJson, forbidden } from "@/lib/api";
import { getSession, requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { getCategoriesWithCounts } from "@/lib/products";
import { categorySchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

/**
 * GET  /api/categories - public list (with live product counts)
 * POST /api/categories - admin: create a category
 */
export const GET = handleApi(async () => {
  const items = await getCategoriesWithCounts();
  return ok({ items });
});

export const POST = handleApi(async (request) => {
  const admin = await requireAdmin();
  const body = categorySchema.parse(await readJson(request));

  const { categories } = await collections();
  const clash = await categories.findOne({
    $or: [{ slug: body.slug }, { name: body.name }],
  });
  if (clash) throw badRequest("A category with this name or slug already exists.");

  const now = new Date();
  const doc = { ...body, createdAt: now, updatedAt: now };
  const result = await categories.insertOne(doc);

  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "category.create",
    targetType: "category",
    targetId: String(result.insertedId),
    after: { name: doc.name, slug: doc.slug },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return created({ category: { ...doc, _id: String(result.insertedId) } });
});
