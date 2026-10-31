import { handleApi, ok, created, readJson, qp, badRequest } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { checkoutSchema } from "@/lib/validation";
import { getCart } from "@/lib/cart";
import { createOrder, calculateTotals } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { assertRateLimit } from "@/lib/rate-limit";

/**
 * GET  /api/checkout - live preview of the order totals (from the cart)
 * POST /api/checkout - create the order (idempotent, stock-safe, server priced)
 */

export const GET = handleApi(async (request) => {
  const user = await requireUser();
  const settings = await getSettings();
  const cart = await getCart(user.id);

  const addressId = qp(request, "addressId");
  let division = qp(request, "division");
  let shippingSnapshot = null;

  if (addressId) {
    const { addresses } = await collections();
    const saved = await addresses.findOne({
      _id: toObjectIdOrNull(addressId),
      userId: String(user.id),
    });
    if (saved) {
      division = saved.division;
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
    lineSubtotal: i.regularPrice,
    lineTotal: i.unitPrice,
    quantity: i.quantity,
  }));

  const totals = calculateTotals(settings, lineItems, division, 0);

  return ok({
    cart,
    totals,
    division: division || null,
    shippingAddress: shippingSnapshot,
    settings: {
      codEnabled: settings.codEnabled,
      stripeEnabled: Boolean(settings.stripeEnabled && isStripeConfigured()),
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
  let items = body.items;
  let source = "buy-now";
  if (!items || !items.length) {
    const cart = await getCart(user.id);
    if (!cart.items.length) throw badRequest("Your cart is empty.");
    items = cart.items
      .filter((i) => i.availability === "ok")
      .map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        variant: i.variant || undefined,
      }));
    if (!items.length) {
      throw badRequest("None of the items in your cart can be ordered right now.");
    }
    source = "cart";
  }

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
