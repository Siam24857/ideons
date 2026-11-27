import { handleApi, ok, notFound, badRequest, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  publicVerification,
  recordJonotaVerification,
  serializePaymentOrder,
  verifyJonotaTransaction,
} from "@/lib/jonota-pay";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/constants";

/**
 * POST /api/admin/orders/[id]/verify-payment
 *
 * Re-verifies a Jonota Pay order against the provider. This is the only way an
 * admin can mark a Jonota order paid - the generic payment endpoint refuses to
 * do it manually, because a human click is not proof of payment.
 *
 * Body (optional):
 *   { transactionId?: string }
 *
 * When the stored order has no transaction id yet, an admin can supply the id
 * shown in the gateway dashboard.
 */
export const POST = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { orders } = await collections();

  let order = null;
  const objectId = toObjectIdOrNull(id);
  if (objectId) order = await orders.findOne({ _id: objectId });
  if (!order) order = await orders.findOne({ orderNumber: id });
  if (!order) throw notFound("Order not found.");

  if (order.paymentMethod !== PAYMENT_METHOD.JONOTA_PAY) {
    throw badRequest("Only Jonota Pay orders can be verified with the gateway.");
  }

  const body = await readJson(request);
  const transactionId = String(
    body.transactionId || body.transaction_id || order.transactionId || ""
  ).trim();

  if (!transactionId) {
    throw badRequest(
      "This order has no gateway transaction id yet. Enter the transaction id from the Jonota Pay dashboard."
    );
  }

  const beforeStatus = order.paymentStatus;
  const verification = await verifyJonotaTransaction(transactionId);

  const result = await recordJonotaVerification({
    order,
    verification,
    source: "admin-verify",
  });

  await writeAudit({
    adminId: String(admin.id),
    adminEmail: admin.email || "admin",
    action: "order.payment.verify",
    targetType: "order",
    targetId: order.orderNumber,
    before: {
      paymentStatus: beforeStatus,
      transactionId: order.transactionId || null,
    },
    after: {
      paymentStatus: result.order?.paymentStatus || null,
      transactionId: result.order?.transactionId || transactionId,
      providerStatus: verification.rawStatus || verification.status,
      applied: Boolean(result.applied),
    },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({
    order: serializePaymentOrder(result.order),
    verification: publicVerification(result.order, verification),
    applied: Boolean(result.applied),
    alreadyPaid: Boolean(result.alreadyPaid),
    paid: result.order?.paymentStatus === PAYMENT_STATUS.PAID,
  });
});
