import { handleApi, ok, notFound, badRequest, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { productInputSchema } from "@/lib/validation";
import { serializeProduct } from "@/lib/products";
import { slugify, resolveCategoryRef } from "@/lib/catalog";
import { writeAudit } from "@/lib/audit";

/**
 * PATCH /api/admin/products/[id] - update catalog data (incl. stock & status)
 * DELETE /api/admin/products/[id] - deactivate a product
 */
export const PATCH = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("Product not found.");

  const { products } = await collections();
  const before = await products.findOne({ _id: objectId });
  if (!before) throw notFound("Product not found.");

  const body = productInputSchema.partial().parse(await readJson(request));
  const patch = { updatedAt: new Date() };

  if (body.title !== undefined) patch.title = body.title;
  if (body.slug !== undefined || body.title !== undefined) {
    const desired = body.slug || (body.title ? slugify(body.title) : before.slug);
    if (desired && desired !== before.slug) {
      if (await products.findOne({ slug: desired, _id: { $ne: objectId } })) {
        throw badRequest("A product with this slug already exists.");
      }
      patch.slug = desired;
    }
  }
  if (body.description !== undefined) patch.description = body.description;
  if (body.category !== undefined) {
    const ref = await resolveCategoryRef(body.category, body.categoryId);
    patch.category = ref.name;
    patch.categorySlug = ref.slug;
    patch.categoryId = ref.id;
  }
  if (body.subCategory !== undefined) patch.subCategory = body.subCategory;
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.oldPrice !== undefined) patch.oldPrice = body.oldPrice ? Number(body.oldPrice) : null;
  if (body.discountPrice !== undefined)
    patch.discountPrice = body.discountPrice ? Number(body.discountPrice) : null;
  if (body.sku !== undefined) patch.sku = body.sku;
  if (body.stock !== undefined) {
    if (Number(body.stock) < 0) throw badRequest("Stock cannot be negative.");
    patch.stock = Number(body.stock);
  }
  if (body.images !== undefined) patch.images = body.images;
  if (body.badge !== undefined) patch.badge = body.badge;
  if (body.brand !== undefined) patch.brand = body.brand;
  if (body.features !== undefined) patch.features = body.features;
  if (body.variants !== undefined) patch.variants = body.variants;
  if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);

  await products.updateOne({ _id: objectId }, { $set: patch });
  const updated = await products.findOne({ _id: objectId });

  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "product.update",
    targetType: "product",
    targetId: String(objectId),
    before: { price: before.price, stock: before.stock, isActive: before.isActive },
    after: { price: updated.price, stock: updated.stock, isActive: updated.isActive },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({ product: serializeProduct(updated) });
});

export const DELETE = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("Product not found.");

  const { products } = await collections();
  const before = await products.findOne({ _id: objectId });
  if (!before) throw notFound("Product not found.");

  await products.updateOne({ _id: objectId }, { $set: { isActive: false, updatedAt: new Date() } });

  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "product.deactivate",
    targetType: "product",
    targetId: String(objectId),
    before: { isActive: before.isActive },
    after: { isActive: false },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({ deactivated: true });
});
