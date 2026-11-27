import { handleApi, ok, created, readJson, qp, badRequest, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { checkoutSchema } from "@/lib/validation";
import { getCart } from "@/lib/cart";
import { createOrder, calculateTotals } from "@/lib/orders";
import { resolveCheckoutItems } from "@/lib/checkout";
import { getSettings } from "@/lib/settings";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import {
  createJonotaPayment,
  getPublicBaseUrl,
  isJonotaPayConfigured,
} from "@/lib/jonota-pay";
import { assertRateLimit } from "@/lib/rate-limit";
import { effectivePrice, multiply, round2 } from "@/lib/money";

/**
 * GET  /api/checkout - live preview of the order totals (from the cart)
 * POST /api/checkout - create the order (idempotent, stock-safe, server priced)
 */

export const GET = handleApi(async (request) => {
  const user = await requireUser();
  const settings = await getSettings();
  let cart;
  const buyNowProductId = qp(request, "buyNowProductId");
  const rawQuantity = qp(request, "quantity");

  if (buyNowProductId || rawQuantity) {
    if (!buyNowProductId || !/^\d+$/.test(String(rawQuantity || ""))) {
      throw badRequest("Invalid Buy Now item.");
    }
    const quantity = Number(rawQuantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50) {
      throw badRequest("Quantity must be between 1 and 50.");
    }
    const productObjectId = toObjectIdOrNull(buyNowProductId);
    if (!productObjectId) throw badRequest("Invalid product.");

    const { products } = await collections();
    const product = await products.findOne({ _id: productObjectId });
    if (!product || product.isActive === false) {
      throw badRequest("This product is no longer available.");
    }
    const stock = Number(product.stock) || 0;
    if (quantity > stock) {
      throw badRequest(`Only ${stock} unit(s) are available.`);
    }

    const unitPrice = effectivePrice(product);
    const regularPrice = Math.max(round2(Number(product.oldPrice) || 0), round2(Number(product.price) || 0));
    const lineTotal = multiply(unitPrice, quantity);
    cart = {
      items: [{
        _id: String(product._id),
        productId: String(product._id),
        title: product.title,
        slug: product.slug || "",
        image: Array.isArray(product.images) ? product.images[0] || "" : product.images || "",
        sku: product.sku || "",
        unitPrice,
        regularPrice,
        quantity,
        lineTotal,
      }],
      subtotal: lineTotal,
      itemsCount: quantity,
      hasIssues: false,
    };
  } else {
    cart = await getCart(user.id);
  }

  const addressId = qp(request, "addressId");
  let division = qp(request, "division");
  let district = qp(request, "district");
  let shippingSnapshot = null;

  if (addressId) {
    const { addresses } = await collections();
    const saved = await addresses.findOne({
      _id: toObjectIdOrNull(addressId),
      userId: String(user.id),
    });
    if (saved) {
      division = saved.division;
      district = saved.district;
      shippingSnapshot = {
        fullName: saved.fullName,
        phone: saved.phone,
        email: saved.email,
        country: saved.country,
        division: saved.division,
        district: saved.district,
        city: saved.city,
        streetAddress: saved.streetAddress,
        houseInfo: saved.houseInfo,
        postalCode: saved.postalCode,
        deliveryInstructions: saved.deliveryInstructions,
        label: saved.label,
      };
    }
  }

  const lineItems = cart.items.map((i) => ({
    lineSubtotal: round2(i.regularPrice * i.quantity),
    lineTotal: i.lineTotal,
    quantity: i.quantity,
  }));

  const totals = calculateTotals(settings, lineItems, division, 0, district);

  return ok({
    cart,
    totals,
    division: division || null,
    shippingAddress: shippingSnapshot,
    settings: {
      codEnabled: settings.codEnabled,
      stripeEnabled: Boolean(settings.stripeEnabled && isStripeConfigured()),
      jonotaPayEnabled: Boolean(settings.jonotaPayEnabled !== false && isJonotaPayConfigured()),
      currencySymbol: settings.currencySymbol,
      deliveryChargeInsideDhaka: settings.deliveryChargeInsideDhaka,
      deliveryChargeOutsideDhaka: settings.deliveryChargeOutsideDhaka,
      freeDeliveryOver: settings.freeDeliveryOver,
    },
  });
});

export const POST = handleApi(async (request) => {
  const user = await requireUser();
  assertRateLimit(request, "checkout", { limit: 8, windowMs: 60_000 });

  const body = checkoutSchema.parse(await readJson(request));
  const settings = await getSettings();

  /* Resolve the item list: explicit items (Buy Now) or the account cart. */
  const { items, source } = await resolveCheckoutItems(user.id, body.items);

  const { order, duplicate } = await createOrder({
    user,
    paymentMethod: body.paymentMethod,
    items,
    addressId: body.addressId,
    address: body.address,
    idempotencyKey: body.idempotencyKey,
    notes: body.notes,
    source,
  });

  const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

  /* Online payment: a server-created Stripe Checkout Session. */
  if (body.paymentMethod === "stripe") {
    if (!settings.stripeEnabled || !isStripeConfigured()) {
      throw badRequest("Online card payment is not enabled on this store.");
    }
    if (order.paymentStatus === "paid") {
      return ok({ order: summarize(order), duplicate, alreadyPaid: true });
    }
    try {
      const session = await createCheckoutSession({
        order,
        settings,
        baseUrl,
        successUrl: `${baseUrl}/checkout/success?order=${order.orderNumber}`,
        cancelUrl: `${baseUrl}/checkout/cancelled?order=${order.orderNumber}`,
      });
      await collections().then(({ orders }) =>
        orders.updateOne(
          { _id: order._id },
          { $set: { paymentReference: session.id, updatedAt: new Date() } }
        )
      );
      return created({ order: summarize(order), duplicate, checkoutUrl: session.url });
    } catch (error) {
      console.error("[checkout] stripe session failed:", error.message);
      throw badRequest("Could not start the online payment. Please try Cash on Delivery.");
    }
  }

  /* Online payment via Jonota Pay: a server-created hosted payment link. */
  if (body.paymentMethod === "jonota_pay") {
    if (!settings.jonotaPayEnabled || !isJonotaPayConfigured()) {
      throw badRequest("Online payment is not available on this store right now.");
    }
    if (order.paymentStatus === "paid") {
      return ok({ order: summarize(order), duplicate, alreadyPaid: true });
    }

    /* A duplicate submission should reuse the link that already exists, but
     * never when a transaction is already attached - that order must be
     * verified instead of paid a second time. */
    if (duplicate && order.paymentUrl && !order.transactionId) {
      return ok({ order: summarize(order), duplicate, paymentUrl: order.paymentUrl });
    }

    try {
      const { paymentUrl, order: updated } = await createJonotaPayment({
        order,
        baseUrl: getPublicBaseUrl(request),
      });
      return created({ order: summarize(updated), duplicate, paymentUrl });
    } catch (error) {
      /* The order was already created and stock reserved. Do not hide it from
       * the customer - return the order plus a retryable payment error. */
      if (!(error instanceof ApiError)) {
        console.error("[checkout] jonota payment init failed:", error);
      }
      return created({
        order: summarize(order),
        duplicate,
        paymentError:
          error?.message ||
          "The online payment could not be started. You can retry from your order page.",
      });
    }
  }

  return created({ order: summarize(order), duplicate });
});

function summarize(order) {
  return {
    _id: String(order._id),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryCharge: order.deliveryCharge,
    currencySymbol: order.currencySymbol,
    itemsCount: order.itemsCount,
    createdAt: order.createdAt,
    duplicate: undefined,
  };
}
