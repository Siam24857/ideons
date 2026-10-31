import { handleApi, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getCart, addToCart, mergeGuestCart } from "@/lib/cart";
import { z } from "zod";

/**
 * POST /api/cart/merge
 * Merges the guest cart (kept in localStorage before sign-in) into the
 * account cart. Quantities are combined and stock limits are enforced.
 */
const mergeSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(50).default(1),
        variant: z.record(z.string(), z.string()).optional(),
      })
    )
    .max(30)
    .default([]),
});

export const POST = handleApi(async (request) => {
  const user = await requireUser();
  const body = mergeSchema.parse(await readJson(request));
  const cart = await mergeGuestCart(user.id, body.items);
  return ok({ cart, merged: body.items.length });
});
