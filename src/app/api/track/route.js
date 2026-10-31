import { handleApi, ok, notFound, readJson, badRequest } from "@/lib/api";
import { collections } from "@/lib/db";
import { z } from "zod";
import { assertRateLimit } from "@/lib/rate-limit";
import { ORDER_STATUS_LIST } from "@/lib/constants";

/**
 * POST /api/track - public order tracking.
 *
 * The caller must supply the order number AND the email or phone number that
 * was used for the order. The response is deliberately limited to the status
 * timeline - it never exposes items, prices or the full address to an
 * unauthenticated caller.
 */
const trackSchema = z
  .object({
    orderNumber: z.string().trim().min(4).max(40),
    identifier: z.string().trim().min(4).max(254),
  })
  .refine((v) => v.orderNumber && v.identifier, { message: "Both fields are required." });

export const POST = handleApi(async (request) => {
  assertRateLimit(request, "track", { limit: 10, windowMs: 60_000 });
  const body = trackSchema.parse(await readJson(request));

  const { orders } = await collections();
  const order = await orders.findOne({ orderNumber: body.orderNumber.trim().toUpperCase() });
  if (!order) throw notFound("No order matches that order number.");

  const identifier = body.identifier.trim().toLowerCase();
  const matches =
    (order.customer?.email || "").toLowerCase() === identifier ||
    String(order.shippingAddress?.phone || "").replace(/\s|-/g, "") ===
      identifier.replace(/\s|-/g, "") ||
    (order.customer?.phone || "").replace(/\s|-/g, "") === identifier.replace(/\s|-/g, "");

  if (!matches) {
    // Same message as "not found" so order numbers cannot be enumerated.
    throw notFound("No order matches the details you entered.");
  }

  return ok({
    order: {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      itemsCount: order.itemsCount,
      total: order.total,
      currencySymbol: order.currencySymbol,
      timeline: order.timeline,
      history: (order.history || []).map((h) => ({
        status: h.status,
        at: h.at,
        message: h.customerMessage || h.note || "",
      })),
      createdAt: order.createdAt,
      validStatuses: ORDER_STATUS_LIST,
    },
  });
});
