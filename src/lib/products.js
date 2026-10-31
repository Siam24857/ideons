import { collections, toObjectIdOrNull } from "@/lib/db";
import { effectivePrice, round2, discountPercent } from "@/lib/money";

/**
 * Product query layer shared by the storefront, the homepage and the admin
 * catalog. Filtering, sorting and pagination all happen server-side so the
 * browser never receives the whole catalog.
 */

export const ALLOWED_SORTS = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
  rating: { rating: -1, reviewsCount: -1, _id: -1 },
  "best-selling": { sold: -1, rating: -1, _id: -1 },
  popular: { reviewsCount: -1, rating: -1, _id: -1 },
  featured: { badge: -1, rating: -1, _id: -1 },
  name: { title: 1, _id: 1 },
  "stock-asc": { stock: 1, _id: 1 },
  "discount-desc": [
    { $subtract: ["$price", { $ifNull: ["$discountPrice", 0] }] },
    { _id: -1 },
  ],
};

export function buildProductQuery({
  search,
  category,
  subCategory,
  minPrice,
  maxPrice,
  minRating,
  minDiscount,
  inStock,
  status,
  isActive,
} = {}) {
  const query = {};
  const and = [];

  if (isActive !== undefined) query.isActive = isActive;
  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;
  if (status === "out-of-stock") query.stock = { $lte: 0 };
  if (status === "low-stock") query.stock = { $gte: 1, $lte: 4 };

  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    and.push({
      $or: [
        { title: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
        { category: { $regex: safe, $options: "i" } },
        { subCategory: { $regex: safe, $options: "i" } },
        { brand: { $regex: safe, $options: "i" } },
        { sku: { $regex: safe, $options: "i" } },
        { tags: { $regex: safe, $options: "i" } },
      ],
    });
  }

  if (category && category !== "all" && category !== "All Categories") {
    and.push({
      $or: [{ categorySlug: category }, { category: category }, { subCategory: category }],
    });
  }

  if (subCategory && subCategory !== "all" && subCategory !== "All Subcategories") {
    and.push({ subCategory: subCategory });
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const range = {};
    if (minPrice !== undefined) range.$gte = Number(minPrice);
    if (maxPrice !== undefined) range.$lte = Number(maxPrice);
    and.push({ price: range });
  }

  if (minRating !== undefined && minRating > 0) {
    query.rating = { $gte: Number(minRating) };
  }

  if (minDiscount !== undefined && minDiscount > 0) {
    and.push({
      $expr: {
        $gt: [
          {
            $subtract: ["$price", { $ifNull: ["$discountPrice", 0] }],
          },
          {
            $multiply: ["$price", minDiscount / 100],
          },
        ],
      },
    });
  }

  if (inStock === true) {
    and.push({ stock: { $gt: 0 } }, { isActive: { $ne: false } });
  }

  if (and.length) query.$and = and;

  return query;
}

export async function listProducts(filter = {}, { page = 1, limit = 12, sort = "newest" } = {}) {
  const { products } = await collections();
  const mongoQuery = buildProductQuery(filter);
  // Merge deal-preset filters into the top-level $and so they apply alongside
  // explicit category/price/rating filters.
  if (filter._extraFilter && Object.keys(filter._extraFilter).length) {
    mongoQuery.$and = mongoQuery.$and || [];
    mongoQuery.$and.push(filter._extraFilter);
  }
  const sortSpec = ALLOWED_SORTS[sort] || ALLOWED_SORTS.newest;

  // Expression-based sorts (e.g. discount-desc) require aggregation because
  // they sort by a computed field rather than a stored document field.
  const isExprSort = Array.isArray(sortSpec);

  let items;
  let total;

  if (isExprSort) {
    // sortSpec[0] is the $expr sort object, sortSpec[1] is tie-breaker { _id: -1 }
    const exprSort = sortSpec[0];
    const tieBreak = sortSpec[1] || { _id: -1 };

    const pipeline = [
      { $match: mongoQuery },
      {
        $addFields: {
          _computedDiscount: exprSort,
        },
      },
      { $sort: { _computedDiscount: -1, ...tieBreak } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $unset: "_computedDiscount" },
    ];

    [items, total] = await Promise.all([
      products.aggregate(pipeline).toArray(),
      products.countDocuments(mongoQuery),
    ]);
  } else {
    [items, total] = await Promise.all([
      products
        .find(mongoQuery)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      products.countDocuments(mongoQuery),
    ]);
  }

  return {
    items: items.map(serializeProduct),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  };
}

/** Shapes a product document for the client and adds derived pricing data. */
export function serializeProduct(product) {
  if (!product) return null;
  const price = round2(Number(product.price) || 0);
  const salePrice = effectivePrice(product);
  const discount = product.discountPrice
    ? discountPercent(price, salePrice)
    : Number(product.discount) || 0;

  return {
    ...product,
    _id: String(product._id),
    id: product.id ?? String(product._id),
    price,
    salePrice,
    effectivePrice: salePrice,
    discount,
    oldPrice: product.oldPrice ?? product.price,
    stock: Number(product.stock) || 0,
    sold: Number(product.sold) || 0,
    rating: Number(product.rating) || 0,
    reviewsCount: Number(product.reviewsCount) || 0,
    isActive: product.isActive !== false,
    images: Array.isArray(product.images) ? product.images : product.images ? [product.images] : [],
    variants: Array.isArray(product.variants) ? product.variants : [],
    features: Array.isArray(product.features) ? product.features : [],
    inStock: (Number(product.stock) || 0) > 0 && product.isActive !== false,
    currencySymbol: product.currencySymbol || undefined,
  };
}

export async function getProductById(id) {
  const objectId = toObjectIdOrNull(id);
  if (!objectId) return null;
  const { products } = await collections();
  return products.findOne({ _id: objectId });
}

export async function getProductBySlug(slug) {
  if (!slug) return null;
  const { products } = await collections();
  return products.findOne({ slug: String(slug) });
}

/** Resolves either a Mongo id or a slug - used by the product detail page. */
export async function getProductByKey(key) {
  const byId = await getProductById(key);
  if (byId) return byId;
  return getProductBySlug(key);
}

/* ------------------------- homepage collections -------------------------- */

async function simpleSection(filter, sort, limit = 8) {
  const { products } = await collections();
  const items = await products
    .find({ isActive: { $ne: false }, ...filter })
    .sort(sort)
    .limit(limit)
    .toArray();
  return items.map(serializeProduct);
}

/**
 * Builds every homepage section from real documents.
 * Sections whose source data does not exist are returned as empty arrays so
 * the UI can hide them instead of inventing content.
 */
export async function getHomeSections() {
  const { products, categories, reviews } = await collections();
  const active = { isActive: { $ne: false } };

  const [categoryDocs, featured, newest, trending, smartTech, smartHome, kitchen, household, salesCount, reviewCount] =
    await Promise.all([
      categories.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).toArray(),
      simpleSection({ ...active, badge: { $exists: true, $ne: "" } }, { rating: -1, _id: -1 }, 8),
      simpleSection(active, { _id: -1 }, 8),
      simpleSection({ ...active, rating: { $gte: 4 } }, { reviewsCount: -1, _id: -1 }, 8),
      simpleSection({ ...active, categorySlug: "technology-gadgets" }, { rating: -1, _id: -1 }, 8),
      simpleSection({ ...active, categorySlug: "smart-home-products" }, { rating: -1, _id: -1 }, 8),
      simpleSection({ ...active, categorySlug: "kitchen-accessories" }, { rating: -1, _id: -1 }, 8),
      simpleSection({ ...active, categorySlug: "household-essentials" }, { rating: -1, _id: -1 }, 8),
      products.countDocuments({ sold: { $gt: 0 } }),
      reviews.countDocuments({}),
    ]);

  const bestSellers =
    salesCount > 0
      ? await simpleSection({ ...active, sold: { $gt: 0 } }, { sold: -1, _id: -1 }, 8)
      : [];

  const totalProducts = await products.countDocuments(active);

  return {
    categories: categoryDocs,
    featured,
    newest,
    trending,
    bestSellers,
    hasSalesData: salesCount > 0,
    hasReviews: reviewCount > 0,
    sections: {
      smartTech,
      smartHome,
      kitchen,
      household,
    },
    stats: {
      totalProducts,
      totalCategories: categoryDocs.length,
      totalReviews: reviewCount,
      totalSales: salesCount,
    },
  };
}

/** Category list with live product counts (used in the browse sidebar). */
export async function getCategoriesWithCounts() {
  const { categories, products } = await collections();
  const [categoryDocs, counts] = await Promise.all([
    categories.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).toArray(),
    products
      .aggregate([
        { $match: { isActive: { $ne: false } } },
        { $group: { _id: "$categorySlug", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const map = new Map(counts.map((c) => [c._id, c.count]));
  return categoryDocs.map((c) => ({ ...c, count: map.get(c.slug) || 0 }));
}
