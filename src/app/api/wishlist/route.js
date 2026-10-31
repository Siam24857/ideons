import { handleApi, ok, readJson, qp } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/wishlist";
import { wishlistSchema } from "@/lib/validation";

/**
 * GET    /api/wishlist - saved products
 * POST   /api/wishlist - save a product (never creates duplicates)
 * DELETE /api/wishlist?productId=... - remove a saved product
 */
export const GET = handleApi(async () => {
  const user = await requireUser();
  const wishlist = await getWishlist(user.id);
  return ok({ wishlist });
});

export const POST = handleApi(async (request) => {
  const user = await requireUser();
  const body = wishlistSchema.parse(await readJson(request));
  const result = await addToWishlist(user.id, body.productId);
  return ok({ wishlist: result.wishlist, added: result.added });
});

export const DELETE = handleApi(async (request) => {
  const user = await requireUser();
  const productId = qp(request, "productId");
  wishlistSchema.parse({ productId });
  const wishlist = await removeFromWishlist(user.id, productId);
  return ok({ wishlist });
});
