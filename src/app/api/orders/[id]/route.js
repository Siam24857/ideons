import { ObjectId } from "mongodb";
import { handleApi, ok, notFound } from "@/lib/api";
import { getSession } from "@/lib/session";
import { collections } from "@/lib/db";
import { getOwnOrder } from "@/lib/orders";
import { serializeOrder } from "../route";

/**
 * GET /api/orders/[id]
 *
 * The `[id]` segment accepts an order number (IDN-YYYYMMDD-XXXXXX) or a raw
 * ObjectId. Ownership is verified with the session user id: another
 * customer's order and a missing order both return 404, so the endpoint never
 * reveals whether an order number exists for somebody else.
 *
 * Admins may read any order (used by the admin detail screen).
 */
export const GET = handleApi(async (request, { params }) => {
  const session = await getSession();
  if (!session?.user) throw notFound("Order not found.");

  const { id } = await params;
  const user = session.user;

  let order = await getOwnOrder(id, user.id);

  if (!order && user.role === "admin") {
    const { orders } = await collections();
    order = await orders.findOne({ orderNumber: String(id) });
    if (!order && ObjectId.isValid(String(id))) {
      order = await orders.findOne({ _id: new ObjectId(String(id)) });
    }
  }

  if (!order) throw notFound("Order not found.");

  const payload = serializeOrder(order);
  if (user.role === "admin") {
    payload.customer = order.customer;
    payload.adminNotes = order.adminNotes || [];
    payload.notes = order.notes || [];
    payload.addressSource = order.addressSource;
    payload.idempotencyKey = undefined;
  }

  return ok({ order: payload });
});
