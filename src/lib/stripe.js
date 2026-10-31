/**
 * Stripe is optional. Nothing in the store assumes it is configured:
 * `isStripeReady()` is false until both the env keys and the store setting are
 * present, and checkout then offers Cash on Delivery only.
 */

let stripePromise = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function getStripe() {
  if (!isStripeConfigured()) return null;
  if (!stripePromise) {
    stripePromise = import("stripe").then((mod) => {
      const Stripe = mod.default || mod.Stripe;
      return new Stripe(process.env.STRIPE_SECRET_KEY, {
        appInfo: { name: "IDeons Store" },
      });
    });
  }
  return stripePromise;
}

export async function createCheckoutSession({ order, settings, baseUrl, successUrl, cancelUrl }) {
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured.");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.customer?.email || undefined,
    client_reference_id: order.orderNumber,
    metadata: {
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      userId: order.userId,
    },
    line_items: (order.items || []).map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: (settings.currency || "BDT").toLowerCase(),
        unit_amount: Math.round(Number(item.unitPrice) * 100),
        product_data: {
          name: item.title,
          images: item.image ? [item.image] : undefined,
          metadata: { productId: item.productId, sku: item.sku || "" },
        },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery charge",
          type: "fixed_amount",
          fixed_amount: { amount: Math.round(Number(order.deliveryCharge) * 100), currency: (settings.currency || "BDT").toLowerCase() },
        },
      },
    ],
    success_url: successUrl || `${baseUrl}/checkout/success?order=${order.orderNumber}`,
    cancel_url: cancelUrl || `${baseUrl}/checkout/cancelled?order=${order.orderNumber}`,
  });

  return session;
}

/**
 * Verifies a webhook payload signature. Throws when the signature is invalid,
 * which is what guarantees a redirect to /success can never mark an order paid.
 */
export async function verifyStripeEvent(payload, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured.");
  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
