import { handleApi, ok, created, qp, qpInt, badRequest, readJson, parseError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { listProducts, serializeProduct, getProductByKey } from "@/lib/products";
import { productInputSchema, productListQuerySchema } from "@/lib/validation";
import { collections } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { slugify, resolveCategoryRef } from "@/lib/catalog";
import { ZodError } from "zod";

/**
 * Deal presets applied server-side. Each preset returns a Mongo filter and an
 * optional sort so the same pagination/count logic can be reused.
 */
const DEAL_PRESETS = {
  today: {
    filter: {
      discountPrice: { $exists: true, $ne: null, $ne: "" },
      $expr: { $lt: ["$discountPrice", "$price"] },
    },
    sort: "newest",
    label: "Today's Deals",
  },
  bestsellers: {
    filter: { sold: { $gt: 0 } },
    sort: "best-selling",
    label: "Best Sellers",
  },
  "new-arrivals": {
    filter: {},
    sort: "newest",
    label: "New Arrivals",
  },
  "best-price": {
    filter: {},
    sort: "price-asc",
    label: "Best Price",
  },
  clearance: {
    filter: {
      discountPrice: { $exists: true, $ne: null, $ne: "" },
      $expr: { $lt: ["$discountPrice", "$price"] },
    },
    sort: "price-asc",
    label: "Clearance Sale",
  },
};

/**
 * GET  /api/products        - public catalog (server-side filter + pagination)
 * POST /api/products        - admin: create a product
 */
export const GET = handleApi(async (request) => {
  let input;
  try {
    input = productListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
  } catch (error) {
    if (error instanceof ZodError) return parseError(error);
    throw error;
  }

  const { searchParams } = request.nextUrl;
  const page = input.page;
  const limit = input.limit;
  const sort = input.sort || "newest";
  const search = input.search || undefined;
  const category = input.category || undefined;
  const subCategory = input.subCategory || undefined;
  const minPrice = input.minPrice !== undefined ? Number(input.minPrice) : undefined;
  const maxPrice = input.maxPrice !== undefined ? Number(input.maxPrice) : undefined;
  const minRating = input.minRating !== undefined ? Number(input.minRating) : undefined;
  const minDiscount = input.minDiscount !== undefined ? Number(input.minDiscount) : undefined;
  const inStock = input.inStock === true ? true : undefined;
  const deal = input.deal || searchParams.get("deal") || undefined;
  const includeInactive = searchParams.get("includeInactive");

  // Public callers only ever see active products.
  let isActive = true;
  if (includeInactive) {
    await requireAdmin();
    isActive = undefined;
  }

  // Apply deal presets on top of any explicit filters/sort.
  let dealSort = sort;
  let extraFilter = {};
  if (deal && DEAL_PRESETS[deal]) {
    const preset = DEAL_PRESETS[deal];
    extraFilter = preset.filter;
    dealSort = preset.sort;
  }

  const result = await listProducts(
    {
      search,
      category,
      subCategory,
      minPrice,
      maxPrice,
      minRating,
      minDiscount,
      inStock: inStock || undefined,
      isActive,
      _extraFilter: extraFilter,
    },
    { page, limit, sort: dealSort },
  );

  return ok({ ...result, deal });
});

export const POST = handleApi(async (request) => {
  const admin = await requireAdmin();
  const body = productInputSchema.parse(await readJson(request));

  const { products } = await collections();
  const key = body.slug || slugify(body.title);
  const existing = await products.findOne({ slug: key });
  if (existing) throw badRequest("A product with this slug already exists.");

  const categoryRef = await resolveCategoryRef(body.category, body.categoryId);
  const now = new Date();

  const doc = {
    title: body.title,
    slug: key,
    description: body.description,
    category: categoryRef.name,
    categorySlug: categoryRef.slug,
    categoryId: categoryRef.id || null,
    subCategory: body.subCategory || categoryRef.name,
    price: Number(body.price),
    oldPrice: body.oldPrice ?? undefined,
    discountPrice: body.discountPrice || null,
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
