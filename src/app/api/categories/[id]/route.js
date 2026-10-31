import { handleApi, ok, notFound, badRequest, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { categorySchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

/**
 * PATCH /api/categories/[id] - admin: update a category
 * DELETE /api/categories/[id] - admin: deactivate a category
 */
export const PATCH = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("Category not found.");

  const { categories } = await collections();
  const before = await categories.findOne({ _id: objectId });
  if (!before) throw notFound("Category not found.");

  const body = categorySchema.partial().parse(await readJson(request));
  if (body.slug && body.slug !== before.slug) {
    const clash = await categories.findOne({ slug: body.slug, _id: { $ne: objectId } });
    if (clash) throw badRequest("A category with this slug already exists.");
  }

  const patch = { ...body, updatedAt: new Date() };
  await categories.updateOne({ _id: objectId }, { $set: patch });
  const after = await categories.findOne({ _id: objectId });

  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "category.update",
    targetType: "category",
    targetId: String(objectId),
    before: { name: before.name, isActive: before.isActive },
    after: { name: after.name, isActive: after.isActive },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({ category: after });
});

export const DELETE = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("Category not found.");

  const { categories, products } = await collections();
  const before = await categories.findOne({ _id: objectId });
  if (!before) throw notFound("Category not found.");

  const productCount = await products.countDocuments({ categoryId: String(objectId) });
  if (productCount > 0) {
    throw badRequest(
      `This category still contains ${productCount} product(s). Deactivate it instead.`
    );
  }

  await categories.updateOne({ _id: objectId }, { $set: { isActive: false, updatedAt: new Date() } });

  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "category.deactivate",
    targetType: "category",
    targetId: String(objectId),
    after: { name: before.name },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({ deactivated: true });
});
