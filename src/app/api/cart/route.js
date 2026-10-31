import { handleApi, ok, created, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getCart, addToCart, clearCart } from "@/lib/cart";
import { cartAddSchema } from "@/lib/validation";

/**
 * GET    /api/cart - the signed-in customer's cart (re-priced from the catalog)
 * POST   /api/cart - add an item
 * DELETE /api/cart - empty the cart
 */
export const GET = handleApi(async () => {
  const user = await requireUser();
  const cart = await getCart(user.id);
  return ok({ cart });
});

export const POST = handleApi(async (request) => {
  const user = await requireUser();
  const body = cartAddSchema.parse(await readJson(request));
  const cart = await addToCart(user.id, {
    productId: body.productId,
    quantity: body.quantity,
    variant: body.variant && Object.keys(body.variant).length ? body.variant : null,
  });
  return created({ cart });
});

export const DELETE = handleApi(async () => {
  const user = await requireUser();
  const cart = await clearCart(user.id);
  return ok({ cart });
});
