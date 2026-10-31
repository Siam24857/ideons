import { ObjectId } from "mongodb";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { effectivePrice, round2 } from "@/lib/money";
import { badRequest, notFound } from "@/lib/api";

/**
 * Database-backed shopping cart (one document per user).
 * Prices shown in the cart are always re-read from the product document, so
 * a stale cart can never charge an outdated price.
 */

function serializeCartItem(item) {
  return {
    ...item,
    _id: String(item._id),
    productId: String(item.productId),
  };
}

async function loadCartDoc(userId) {
  const { carts } = await collections();
  let cart = await carts.findOne({ userId: String(userId) });
  if (!cart) {
    const doc = { userId: String(userId), items: [], createdAt: new Date(), updatedAt: new Date() };
    try {
      await carts.updateOne({ userId: String(userId) }, { $setOnInsert: doc }, { upsert: true });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    cart = await carts.findOne({ userId: String(userId) });
  }
  return cart || { userId: String(userId), items: [] };
}

/**
 * Returns the cart with every line re-priced against the live catalog and
 * flagged with `availability` so the UI can show out-of-stock warnings.
 */
export async function getCart(userId) {
  const cart = await loadCartDoc(userId);
  const { products } = await collections();

  const lines = [];
  for (const raw of cart.items || []) {
    const product = await products.findOne({ _id: toObjectIdOrNull(raw.productId) });
    if (!product) continue;

    const unitPrice = effectivePrice(product);
    const quantity = Number(raw.quantity) || 1;
    const stock = Number(product.stock) || 0;
    const active = product.isActive !== false;
    const inStock = stock >= quantity;

    lines.push({
      _id: String(raw._id),
      productId: String(product._id),
      title: product.title,
      slug: product.slug || "",
      image: Array.isArray(product.images) ? product.images[0] || "" : "",
      category: product.category || "",
      sku: product.sku || "",
      unitPrice: round2(unitPrice),
      regularPrice: round2(Number(product.price) || 0),
      quantity,
      variant: raw.variant || null,
      stock,
      isActive: active,
      availability: !active ? "inactive" : inStock ? "ok" : stock > 0 ? "insufficient" : "out",
      lineTotal: round2(unitPrice * quantity),
      maxQuantity: active ? Math.max(1, Math.min(stock, 50)) : 1,
    });
  }

  const subtotal = round2(lines.reduce((acc, l) => acc + l.lineTotal, 0));
  const itemsCount = lines.reduce((acc, l) => acc + l.quantity, 0);

  return {
    items: lines,
    subtotal,
    itemsCount,
    hasIssues: lines.some((l) => l.availability !== "ok"),
  };
}

export async function addToCart(userId, { productId, quantity = 1, variant = null }) {
  const { carts, products } = await collections();
  const objectId = toObjectIdOrNull(productId);
  if (!objectId) throw badRequest("Invalid product.");

  const product = await products.findOne({ _id: objectId });
  if (!product || product.isActive === false) throw notFound("Product is not available.");
  if ((Number(product.stock) || 0) < quantity) {
    throw badRequest(`Only ${product.stock ?? 0} unit(s) of "${product.title}" are available.`);
  }

  const cart = await loadCartDoc(userId);
  const variantKey = variant && Object.keys(variant).length ? JSON.stringify(variant) : "";

  const existing = (cart.items || []).find(
    (i) => String(i.productId) === String(objectId) && JSON.stringify(i.variant || null) === (variantKey || "null")
  );

  if (existing) {
    const nextQty = Math.min((Number(existing.quantity) || 1) + quantity, Math.max(1, Number(product.stock) || 1), 50);
    await carts.updateOne(
      { userId: String(userId), "items._id": existing._id },
      { $set: { "items.$.quantity": nextQty, updatedAt: new Date() } }
    );
  } else {
    await carts.updateOne(
      { userId: String(userId) },
      {
        $push: {
          items: {
            _id: new ObjectId(),
            productId: String(objectId),
            quantity: Math.min(quantity, 50),
            variant: variant || null,
            addedAt: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );
  }

  return getCart(userId);
}

export async function updateCartItem(userId, itemId, quantity) {
  const { carts, products } = await collections();
  const itemObjectId = toObjectIdOrNull(itemId);
  if (!itemObjectId) throw badRequest("Invalid cart item.");

  const cart = await loadCartDoc(userId);
  const item = (cart.items || []).find((i) => String(i._id) === String(itemObjectId));
  if (!item) throw notFound("Cart item not found.");

  const product = await products.findOne({ _id: toObjectIdOrNull(item.productId) });
  if (!product || product.isActive === false) {
    throw badRequest("This product is no longer available.");
  }
  const stock = Number(product.stock) || 0;
  if (quantity > stock) {
    throw badRequest(`Only ${stock} unit(s) of "${product.title}" are available.`);
  }

  await carts.updateOne(
    { userId: String(userId), "items._id": itemObjectId },
    { $set: { "items.$.quantity": quantity, updatedAt: new Date() } }
  );
  return getCart(userId);
}

export async function removeCartItem(userId, itemId) {
  const { carts } = await collections();
  const itemObjectId = toObjectIdOrNull(itemId);
  if (!itemObjectId) throw badRequest("Invalid cart item.");
  await carts.updateOne(
    { userId: String(userId) },
    { $pull: { items: { _id: itemObjectId } }, $set: { updatedAt: new Date() } }
  );
  return getCart(userId);
}

export async function clearCart(userId) {
  const { carts } = await collections();
  await carts.updateOne({ userId: String(userId) }, { $set: { items: [], updatedAt: new Date() } });
  return { items: [], subtotal: 0, itemsCount: 0, hasIssues: false };
}

/**
 * Merges a guest cart (built in localStorage) into the signed-in cart.
 * Quantities are combined, never silently overwritten, and stock limits are
 * enforced while merging.
 */
export async function mergeGuestCart(userId, guestItems = []) {
  if (!Array.isArray(guestItems) || !guestItems.length) return getCart(userId);
  for (const entry of guestItems.slice(0, 30)) {
    try {
      const qty = Math.max(1, Number(entry.quantity) || 1);
      await addToCart(userId, {
        productId: entry.productId || entry.product?._id,
        quantity: qty,
        variant: entry.variant || null,
      });
    } catch (error) {
      console.warn("[cart] merge skipped item:", error.message);
    }
  }
  return getCart(userId);
}
