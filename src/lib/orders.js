import { collections, toObjectIdOrNull } from "@/lib/db";
import { ApiError, notFound, badRequest, conflict } from "@/lib/api";
import {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  CANCELLABLE_STATUSES,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  COUNTRY,
} from "@/lib/constants";
import { effectivePrice, round2, toMinor, fromMinor, multiply } from "@/lib/money";
import { getSettings, computeDeliveryCharge } from "@/lib/settings";
import { generateOrderNumber } from "@/lib/order-number";
import { createNotification } from "@/lib/notifications";
import { scheduleJob } from "@/lib/jobs";

/**
 * Order service - the heart of the store.
 *
 * Guarantees implemented here:
 *  - prices are ALWAYS read from MongoDB at checkout time (client prices are
 *    ignored, so price manipulation is impossible)
 *  - stock is reserved with an atomic conditional `findOneAndUpdate`, so two
 *    concurrent buyers can never take the same unit
 *  - when a reservation fails, earlier reservations in the same request are
 *    rolled back before returning an error
 *  - duplicate submissions are collapsed by a unique `idempotencyKey`
 *  - the order stores an immutable snapshot of items and the shipping address
 */

/* ------------------------------ stock helpers ----------------------------- */

/**
 * Atomically reserves stock for every requested item.
 * Returns the product snapshots that were used for the order.
 * Rolls back every reservation it already made if one item fails.
 */
export async function reserveStock(items) {
  const { products } = await collections();
  const reserved = [];

  for (const item of items) {
    const variantName = item.variant?.name || null;
    const filter = { _id: item.objectId, isActive: { $ne: false } };
    if (variantName && item.variantValue) {
      // Variant-aware products reserve against their own counter when present.
      filter[`variants.${variantName}.options.${item.variantValue}.stock`] = {
        $gte: item.quantity,
      };
    } else {
      filter.stock = { $gte: item.quantity };
    }

    const update =
      variantName && item.variantValue
        ? {
            $inc: {
              [`variants.${variantName}.options.${item.variantValue}.stock`]: -item.quantity,
              sold: item.quantity,
            },
          }
        : { $inc: { stock: -item.quantity, sold: item.quantity } };

    const product = await products.findOneAndUpdate(filter, update, {
      returnDocument: "after",
    });

    if (!product) {
      // Roll back the units reserved so far in this request.
      await releaseStock(reserved);
      const current = await products.findOne({ _id: item.objectId });
      if (!current) {
        throw new ApiError("A product in your cart is no longer available.", 409, "OUT_OF_STOCK");
      }
      if (current.isActive === false) {
        throw new ApiError(`"${current.title}" is no longer for sale.`, 409, "PRODUCT_INACTIVE");
      }
      throw new ApiError(
        `Only ${current.stock ?? 0} unit(s) of "${current.title}" are available.`,
        409,
        "INSUFFICIENT_STOCK",
        { productId: String(current._id), available: current.stock ?? 0 }
      );
    }

    reserved.push({
      objectId: item.objectId,
      quantity: item.quantity,
      variantName,
      variantValue: item.variantValue || null,
      snapshot: product,
    });
  }

  return reserved;
}

/** Returns previously reserved units to stock (cancellation / failed insert). */
export async function releaseStock(reservations) {
  const { products } = await collections();
  let restored = 0;
  for (const reservation of reservations || []) {
    const { objectId, quantity, variantName, variantValue } = reservation;
    const update =
      variantName && variantValue
        ? {
            $inc: {
              [`variants.${variantName}.options.${variantValue}.stock`]: quantity,
              sold: -quantity,
            },
          }
        : { $inc: { stock: quantity, sold: -quantity } };
    const result = await products.updateOne({ _id: objectId }, update);
    restored += result.modifiedCount;
  }
  return restored;
}

/* ------------------------------ item building ----------------------------- */

async function resolveLineItem(input) {
  const { products } = await collections();
  const objectId = toObjectIdOrNull(input.productId);
  if (!objectId) throw badRequest("A cart item is invalid.");

  const product = await products.findOne({ _id: objectId });
  if (!product || product.isActive === false) {
    throw conflict("A product in your order is no longer available.");
  }

  const quantity = Number(input.quantity) || 1;
  const unitPrice = effectivePrice(product);
  // "Regular" price = the higher listed price (oldPrice) when one exists, so
  // the order shows the customer's real saving as the discount column.
  const listedPrice = round2(Number(product.oldPrice) || 0);
  const regularPrice =
    listedPrice > unitPrice ? listedPrice : round2(Number(product.price) || 0);
  const variant =
    input.variant && Object.keys(input.variant).length
      ? {
          name: input.variant.name || input.variantName || Object.keys(input.variant)[0],
          value:
            input.variant.value ||
            input.variant[Object.keys(input.variant)[0]] ||
            Object.values(input.variant)[0],
        }
      : null;

  return {
    objectId,
    productId: String(product._id),
    title: product.title,
    slug: product.slug || "",
    image: Array.isArray(product.images) ? product.images[0] || "" : product.images || "",
    sku: product.sku || "",
    category: product.category || "",
    regularPrice,
    unitPrice,
    quantity,
    variant,
    lineSubtotal: round2(regularPrice * quantity),
    lineTotal: multiply(unitPrice, quantity),
    lineDiscount: fromMinor(toMinor(regularPrice - unitPrice) * quantity),
    stockAtPurchase: Number(product.stock) || 0,
  };
}

/* ------------------------------- totals ---------------------------------- */

export function calculateTotals(settings, lineItems, division, orderDiscount = 0) {
  const subtotal = fromMinor(lineItems.reduce((acc, i) => acc + toMinor(i.lineSubtotal), 0));
  const itemsTotal = fromMinor(lineItems.reduce((acc, i) => acc + toMinor(i.lineTotal), 0));
  const itemsDiscount = fromMinor(toMinor(subtotal) - toMinor(itemsTotal));
  const deliveryCharge = computeDeliveryCharge(settings, itemsTotal, division);
  const extraDiscount = fromMinor(Math.max(0, toMinor(orderDiscount)));
  const total = fromMinor(
    toMinor(itemsTotal) + toMinor(deliveryCharge) - Math.min(toMinor(itemsTotal), toMinor(extraDiscount))
  );
  return {
    subtotal,            // regular prices x qty (before sale price)
    discount: fromMinor(toMinor(itemsDiscount) + toMinor(extraDiscount)),
    itemsTotal,          // what the customer actually pays for the goods
    deliveryCharge,
    total,
  };
}

/* ------------------------------- checkout -------------------------------- */

function buildAddressSnapshot(address, user) {
  return {
    fullName: address.fullName || user?.name || "",
    phone: address.phone || "",
    email: address.email || user?.email || "",
    country: address.country || COUNTRY,
    division: address.division || "",
    district: address.district || "",
    city: address.city || "",
    streetAddress: address.streetAddress || "",
    houseInfo: address.houseInfo || "",
    postalCode: address.postalCode || "",
    deliveryInstructions: address.deliveryInstructions || "",
    label: address.label || "",
  };
}

async function resolveShippingAddress(user, { addressId, address }) {
  if (addressId) {
    const { addresses } = await collections();
    const saved = await addresses.findOne({
      _id: toObjectIdOrNull(addressId),
      userId: String(user.id || user._id),
    });
    if (!saved) throw badRequest("Selected delivery address was not found.");
    return { snapshot: buildAddressSnapshot(saved, user), source: "saved" };
  }
  if (address) {
    return { snapshot: buildAddressSnapshot(address, user), source: "new" };
  }
  throw badRequest("Please choose or enter a delivery address.");
}

/**
 * Creates an order. This is the only place where an order document is born.
 */
export async function createOrder({
  user,
  paymentMethod,
  items,
  addressId,
  address,
  idempotencyKey,
  notes,
  source = "cart",
}) {
  const { orders, settings, carts } = await collections();

  /* 1. Idempotency: identical re-submission returns the original order. */
  if (idempotencyKey) {
    const existing = await orders.findOne({ idempotencyKey, userId: String(user.id) });
    if (existing) return { order: existing, duplicate: true };
  }

  const storeSettings = await getSettings();

  if (paymentMethod === PAYMENT_METHOD.COD && storeSettings.codEnabled === false) {
    throw badRequest("Cash on Delivery is currently disabled.");
  }
  if (paymentMethod === PAYMENT_METHOD.STRIPE && !storeSettings.stripeEnabled) {
    throw badRequest("Online card payment is not enabled yet.");
  }

  /* 2. Resolve line items from MongoDB (never from the client payload). */
  const lineItems = [];
  for (const raw of items) lineItems.push(await resolveLineItem(raw));

  const maxItems = Number(storeSettings.maxItemsPerOrder) || 50;
  const totalQty = lineItems.reduce((acc, i) => acc + i.quantity, 0);
  if (totalQty > maxItems) {
    throw badRequest(`You can order a maximum of ${maxItems} units per order.`);
  }

  /* 3. Shipping address snapshot. */
  const { snapshot: shippingAddress, source: addressSource } = await resolveShippingAddress(user, {
    addressId,
    address,
  });

  /* 4. Totals computed from server-side prices. */
  const totals = calculateTotals(storeSettings, lineItems, shippingAddress.division);

  /* 5. Reserve stock atomically (with rollback on partial failure). */
  const reservations = await reserveStock(
    lineItems.map((i) => ({
      objectId: i.objectId,
      quantity: i.quantity,
      variant: i.variant ? { name: i.variant.name } : null,
      variantValue: i.variant?.value || null,
    }))
  );

  /* 6. Insert the order with an immutable snapshot. */
  const now = new Date();
  let orderNumber = generateOrderNumber(now);
  const order = {
    orderNumber,
    idempotencyKey: idempotencyKey || null,
    userId: String(user.id),
    customer: {
      userId: String(user.id),
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || shippingAddress.phone || "",
      createdAt: user.createdAt || null,
    },
    items: lineItems.map((i) => ({
      productId: i.productId,
      title: i.title,
      slug: i.slug,
      image: i.image,
      sku: i.sku,
      category: i.category,
      unitPrice: i.unitPrice,
      regularPrice: i.regularPrice,
      quantity: i.quantity,
      subtotal: i.lineSubtotal,
      lineTotal: i.lineTotal,
      variant: i.variant,
    })),
    itemsCount: totalQty,
    shippingAddress,
    addressSource,
    subtotal: totals.subtotal,
    discount: totals.discount,
    deliveryCharge: totals.deliveryCharge,
    total: totals.total,
    currency: storeSettings.currency,
    currencySymbol: storeSettings.currencySymbol,
    paymentMethod,
    paymentStatus: paymentMethod === PAYMENT_METHOD.COD ? PAYMENT_STATUS.UNPAID : PAYMENT_STATUS.UNPAID,
    paymentReference: null,
    transactionId: null,
    orderStatus: ORDER_STATUS.PENDING,
    source,
    notes: notes ? [{ note: notes, at: now, by: "customer" }] : [],
    adminNotes: [],
    customerMessages: [],
    history: [
      {
        status: ORDER_STATUS.PENDING,
        at: now,
        by: String(user.id),
        byRole: "customer",
        note: "Order placed",
        customerMessage: "We have received your order.",
      },
    ],
    timeline: {
      placedAt: now,
      confirmedAt: null,
      processingAt: null,
      shippedAt: null,
      deliveredAt: null,
      cancelledAt: null,
    },
    cancelInfo: null,
    createdAt: now,
    updatedAt: now,
  };

  let inserted;
  try {
    inserted = await orders.insertOne(order);
  } catch (error) {
    // Duplicate idempotency key / order number -> roll back the reservation.
    const rollback = reservations.map((r) => ({
      objectId: r.objectId,
      quantity: r.quantity,
      variantName: r.variantName,
      variantValue: r.variantValue,
    }));

    if (error?.code === 11000 && idempotencyKey) {
      const existing = await orders.findOne({ idempotencyKey, userId: String(user.id) });
      if (existing) {
        // This request re-reserved stock it does not need - give it back.
        await releaseStock(
          reservations.map((r) => ({
            objectId: r.objectId,
            quantity: r.quantity,
            variantName: r.variantName,
            variantValue: r.variantValue,
          }))
        );
        return { order: existing, duplicate: true };
      }
    }

    await releaseStock(rollback);

    if (error?.code === 11000) {
      // Rare order-number collision: retry once with a fresh number.
      order.orderNumber = generateOrderNumber(new Date());
      try {
        inserted = await orders.insertOne(order);
      } catch (retryError) {
        console.error("[checkout] retry insert failed:", retryError);
        throw new ApiError(
          "We could not save your order. Please try again.",
          500,
          "ORDER_SAVE_FAILED"
        );
      }
    } else {
      console.error("[checkout] order insert failed:", error);
      throw new ApiError("We could not save your order. Please try again.", 500, "ORDER_SAVE_FAILED");
    }
  }

  order._id = inserted.insertedId;

  /* 7. Clear the cart when the order came from the cart. */
  try {
    await carts.updateOne({ userId: String(user.id) }, { $set: { items: [], updatedAt: new Date() } });
  } catch (error) {
    console.error("[checkout] failed to clear cart:", error.message);
  }

  /* 8. Notifications: immediate in-app + delayed confirmation job (~1 min). */
  try {
    const notification = await createNotification({
      userId: user.id,
      type: "order_placed",
      order,
      dedupeKey: `placed_${order.orderNumber}`,
    });
    if (notification?.email?.status === "pending") {
      await scheduleJob({
        key: `mail_${notification._id}`,
        type: "send_notification_email",
        payload: { notificationId: String(notification._id) },
        runAt: new Date(Date.now() + 10_000),
      });
    }
    await scheduleJob({
      key: `confirm_${order.orderNumber}`,
      type: "order_confirmation",
      payload: { orderId: String(order._id) },
      runAt: new Date(Date.now() + 60_000), // ~1 minute later
    });
  } catch (error) {
    console.error("[checkout] notification scheduling failed:", error.message);
  }

  return { order, duplicate: false };
}

/* ---------------------------- status changes ----------------------------- */

const STATUS_FIELD_TIME = {
  [ORDER_STATUS.CONFIRMED]: "confirmedAt",
  [ORDER_STATUS.PROCESSING]: "processingAt",
  [ORDER_STATUS.SHIPPED]: "shippedAt",
  [ORDER_STATUS.DELIVERED]: "deliveredAt",
  [ORDER_STATUS.CANCELLED]: "cancelledAt",
};

export function assertTransition(from, to) {
  const allowed = ORDER_STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw badRequest(
      `An order cannot move from "${from}" to "${to}".`,
      { from, to, allowed }
    );
  }
}

/**
 * Applies an order status change as an admin.
 * Records actor, timestamp, previous status and new status, then creates the
 * matching customer notification (in-app + queued email).
 */
export async function applyStatusChange({
  orderId,
  status,
  admin,
  note = "",
  customerMessage = "",
}) {
  const { orders } = await collections();
  const objectId = toObjectIdOrNull(orderId);
  if (!objectId) throw badRequest("Invalid order id.");

  const order = await orders.findOne({ _id: objectId });
  if (!order) throw notFound("Order not found.");

  assertTransition(order.orderStatus, status);

  const now = new Date();
  const isCancel = status === ORDER_STATUS.CANCELLED;

  /* Cancellation restores reserved stock (only for cancellable states). */
  if (isCancel) {
    if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
      throw badRequest("This order can no longer be cancelled.");
    }
    const { products } = await collections();
    for (const item of order.items || []) {
      await products.updateOne(
        { _id: toObjectIdOrNull(item.productId) },
        { $inc: { stock: item.quantity, sold: -item.quantity } }
      );
    }
  }

  const historyEntry = {
    status,
    at: now,
    by: String(admin.id),
    byRole: admin.role || "admin",
    byName: admin.name || admin.email || "",
    previous: order.orderStatus,
    note: note || "",
    customerMessage: customerMessage || "",
  };

  const timelinePatch = {};
  const timeField = STATUS_FIELD_TIME[status];
  if (timeField) timelinePatch[`timeline.${timeField}`] = now;

  const update = {
    $set: {
      orderStatus: status,
      updatedAt: now,
      ...(isCancel
        ? {
            cancelInfo: {
              reason: note || "Cancelled by administrator",
              at: now,
              by: String(admin.id),
              byName: admin.name || admin.email || "",
              stockRestored: true,
            },
          }
        : {}),
      ...timelinePatch,
    },
    $push: {
      history: historyEntry,
      ...(customerMessage
        ? { customerMessages: { message: customerMessage, at: now, by: String(admin.id) } }
        : {}),
      ...(note ? { adminNotes: { note, at: now, by: String(admin.id), byName: admin.name || "" } } : {}),
    },
  };

  const result = await orders.findOneAndUpdate({ _id: objectId }, update, { returnDocument: "after" });
  if (!result) throw notFound("Order not found.");

  /* Customer notification for the new status. */
  try {
    const notification = await createNotification({
      userId: order.userId,
      type: isCancel ? "order_cancelled" : status,
      order: result,
      dedupeKey: `${status}_${order.orderNumber}`,
      ...(customerMessage ? { body: customerMessage } : {}),
    });
    if (notification?.email?.status === "pending") {
      await scheduleJob({
        key: `mail_${notification._id}`,
        type: "send_notification_email",
        payload: { notificationId: String(notification._id) },
        runAt: new Date(Date.now() + 5_000),
      });
    }
  } catch (error) {
    console.error("[orders] notification failed:", error.message);
  }

  return result;
}

/* ------------------------------- lookups --------------------------------- */

export async function getOwnOrder(orderNumber, userId) {
  const { orders } = await collections();
  const order = await orders.findOne({
    orderNumber: String(orderNumber),
    userId: String(userId),
  });
  return order; // null when it does not exist OR belongs to another customer
}

export async function getAnyOrder(orderNumber) {
  const { orders } = await collections();
  const query = /^\w{3}-\d{8}-\w{6}$/.test(String(orderNumber || ""))
    ? { orderNumber: String(orderNumber) }
    : toObjectIdOrNull(orderNumber)
      ? { _id: toObjectIdOrNull(orderNumber) }
      : null;
  if (!query) return null;
  return orders.findOne(query);
}
