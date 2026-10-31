import { handleApi, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { updateCartItem, removeCartItem } from "@/lib/cart";
import { cartUpdateSchema, cartItemRefSchema } from "@/lib/validation";

/**
 * PATCH  /api/cart/[itemId] - change quantity
 * DELETE /api/cart/[itemId] - remove one item
 *
 * Ownership is enforced inside the cart helpers (every query is filtered by
 * the session's userId), so a customer cannot touch another cart.
 */
export const PATCH = handleApi(async (request, { params }) => {
  const user = await requireUser();
  const { itemId } = await params;
  const body = cartUpdateSchema.parse({ ...(await readJson(request)), itemId });
  const cart = await updateCartItem(user.id, itemId, body.quantity);
  return ok({ cart });
});

export const DELETE = handleApi(async (request, { params }) => {
  const user = await requireUser();
  const { itemId } = await params;
  cartItemRefSchema.parse({ itemId });
  const cart = await removeCartItem(user.id, itemId);
  return ok({ cart });
});
