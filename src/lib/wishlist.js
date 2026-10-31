import { collections, toObjectIdOrNull } from "@/lib/db";
import { effectivePrice, round2 } from "@/lib/money";
import { badRequest } from "@/lib/api";

/**
 * Wishlist stored in MongoDB - one document per user with a unique index on
 * `userId`, so duplicate entries are impossible at the database level.
 */

async function loadWishlist(userId) {
  const { wishlists } = await collections();
  let doc = await wishlists.findOne({ userId: String(userId) });
  if (!doc) {
    try {
      await wishlists.updateOne(
        { userId: String(userId) },
        { $setOnInsert: { userId: String(userId), productIds: [], createdAt: new Date(), updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    doc = await wishlists.findOne({ userId: String(userId) });
  }
  return doc || { userId: String(userId), productIds: [] };
}

export async function getWishlist(userId) {
  const doc = await loadWishlist(userId);
  const { products } = await collections();
  const ids = (doc.productIds || [])
    .map((id) => toObjectIdOrNull(id))
    .filter(Boolean);

  const docs = ids.length
    ? await products.find({ _id: { $in: ids } }).toArray()
    : [];

  const items = (doc.productIds || [])
    .map((id) => {
      const product = docs.find((d) => String(d._id) === String(id));
      if (!product) return null;
      return {
        _id: String(product._id),
        productId: String(product._id),
        title: product.title,
        slug: product.slug || "",
        category: product.category || "",
        image: Array.isArray(product.images) ? product.images[0] || "" : "",
        price: effectivePrice(product),
        regularPrice: round2(Number(product.price) || 0),
        stock: Number(product.stock) || 0,
        isActive: product.isActive !== false,
        inStock: (Number(product.stock) || 0) > 0 && product.isActive !== false,
      };
    })
    .filter(Boolean);

  return { items, count: items.length };
}

/** Adds the product. Returns `{ added, wishlist }`. Never duplicates. */
export async function addToWishlist(userId, productId) {
  const objectId = toObjectIdOrNull(productId);
  if (!objectId) throw badRequest("Invalid product.");
  const { wishlists, products } = await collections();

  const product = await products.findOne({ _id: objectId });
  if (!product) throw badRequest("Product not found.");

  const id = String(objectId);
  const result = await wishlists.updateOne(
    { userId: String(userId) },
    {
      $addToSet: { productIds: id },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );
  const added = Boolean(result.upsertedCount) || Boolean(result.modifiedCount);
  const wishlist = await getWishlist(userId);
  const alreadyPresent = wishlist.items.some((i) => i.productId === id);
  return { added: alreadyPresent, wishlist, already: !added && alreadyPresent };
}

export async function removeFromWishlist(userId, productId) {
  const { wishlists } = await collections();
  await wishlists.updateOne(
    { userId: String(userId) },
    { $pull: { productIds: String(productId) }, $set: { updatedAt: new Date() } }
  );
  return getWishlist(userId);
}

export async function isInWishlist(userId, productId) {
  const doc = await loadWishlist(userId);
  return (doc.productIds || []).includes(String(productId));
}
