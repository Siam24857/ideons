import { handleApi, ok, created, badRequest, readJson, qp, qpInt } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections } from "@/lib/db";
import { adminProductQuerySchema, productInputSchema } from "@/lib/validation";
import { buildProductQuery, serializeProduct, ALLOWED_SORTS } from "@/lib/products";
import { slugify, resolveCategoryRef } from "@/lib/catalog";
import { writeAudit } from "@/lib/audit";

/**
 * GET  /api/admin/products - full catalog including inactive/low stock
 * POST /api/admin/products - create a product
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();
  const input = adminProductQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  const { products } = await collections();

  const query = buildProductQuery({
    search: input.search,
    category: input.category,
    status: input.status && input.status !== "all" ? input.status : undefined,
  });

  const sortSpec =
    input.sort === "price-asc"
      ? ALLOWED_SORTS["price-asc"]
      : input.sort === "price-desc"
        ? ALLOWED_SORTS["price-desc"]
        : input.sort === "stock-asc"
          ? ALLOWED_SORTS["stock-asc"]
          : input.sort === "name"
            ? ALLOWED_SORTS.name
            : { createdAt: -1, _id: -1 };

  const [items, total, statusAgg] = await Promise.all([
    products
      .find(query)
      .sort(sortSpec)
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .toArray(),
    products.countDocuments(query),
    products
      .aggregate([
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $ne: ["$isActive", false] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
            outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
            lowStock: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 5] }] },
                  1,
                  0,
                ],
              },
            },
            total: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  return ok({
    items: items.map(serializeProduct),
    total,
    page: input.page,
    limit: input.limit,
    totalPages: Math.max(1, Math.ceil(total / input.limit)),
    summary: statusAgg[0] || { active: 0, inactive: 0, outOfStock: 0, lowStock: 0, total: 0 },
  });
});

export const POST = handleApi(async (request) => {
  const admin = await requireAdmin();
  const body = productInputSchema.parse(await readJson(request));

  const { products } = await collections();
  const slug = body.slug || slugify(body.title);
  if (await products.findOne({ slug })) {
    throw badRequest("A product with this slug already exists.");
  }

  const ref = await resolveCategoryRef(body.category, body.categoryId);
  const now = new Date();

  const doc = {
    title: body.title,
    slug,
    description: body.description,
    category: ref.name,
    categorySlug: ref.slug,
    categoryId: ref.id,
    subCategory: body.subCategory || ref.name,
    price: Number(body.price),
    oldPrice: body.oldPrice ? Number(body.oldPrice) : null,
    discountPrice: body.discountPrice ? Number(body.discountPrice) : null,
    discount: 0,
    sku: body.sku || "",
    stock: Number(body.stock),
    sold: 0,
    rating: 0,
    reviewsCount: 0,
    images: body.images,
    badge: body.badge || "",
    brand: body.brand || "",
    features: body.features,
    variants: body.variants,
    isActive: body.isActive,
    createdAt: now,
    updatedAt: now,
  };

  const result = await products.insertOne(doc);
  doc._id = result.insertedId;

  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "product.create",
    targetType: "product",
    targetId: String(result.insertedId),
    after: { title: doc.title, price: doc.price, stock: doc.stock },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return created({ product: serializeProduct(doc) });
});
