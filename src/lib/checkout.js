import { badRequest } from "@/lib/api";
import { getCart } from "@/lib/cart";

/**
 * Resolves the line items for a checkout request.
 *
 * `items` is only present for the Buy Now flow. When it is absent the account
 * cart is re-priced from MongoDB by getCart(), so the client can never send a
 * price. This helper is shared by the COD/Stripe checkout endpoint and the
 * Jonota Pay payment endpoint so both use exactly the same rules.
 */
export async function resolveCheckoutItems(userId, explicitItems) {
  let items = explicitItems;
  let source = "buy-now";

  if (!items || !items.length) {
    const cart = await getCart(userId);
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

  return { items, source };
}
