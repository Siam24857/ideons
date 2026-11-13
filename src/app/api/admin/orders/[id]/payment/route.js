import { handleApi, ok, notFound, badRequest, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";

const paymentSchema = z.object({
  paymentStatus: z.enum(["unpaid", "paid", "failed", "refunded"]),
  internalNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const PATCH = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const adminId = String(admin.id);
  const adminEmail = admin.email || "admin";

  const { id } = await params;
  const { orders, notifications } = await collections();

  let order = null;
  const objectId = toObjectIdOrNull(id);
  if (objectId) order = await orders.findOne({ _id: objectId });
  if (!order) order = await orders.findOne({ orderNumber: id });
  if (!order) throw notFound("Order not found.");

  const body = paymentSchema.parse(await readJson(request));
  const current = order.paymentStatus || "unpaid";

  // Prevent duplicate payment confirmation
  if (current === "paid" && body.paymentStatus === "paid") {
    throw badRequest("Payment is already marked as paid.");
  }

  const now = new Date();
  const update = {
    paymentStatus: body.paymentStatus,
    updatedAt: now,
  };
  if (body.paymentStatus === "paid") {
    update.paidAt = now;
    update.paidBy = adminId;
  }

  const filter = objectId ? { _id: objectId } : { orderNumber: id };
  const result = await orders.updateOne(filter, { $set: update });
  if (result.matchedCount === 0) throw notFound("Order not found.");

  await writeAudit({
    adminId,
    adminEmail,
    action: "order.payment.update",
    targetType: "order",
    targetId: order.orderNumber,
    before: { paymentStatus: current },
    after: { paymentStatus: body.paymentStatus },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  // Notify customer
  try {
    if (body.paymentStatus === "paid") {
      await notifications.insertOne({
        userId: order.userId,
        type: "payment_confirmed",
        title: `Payment confirmed for order #${order.orderNumber}`,
        body: "Your payment has been successfully confirmed. Thank you!",
        orderNumber: order.orderNumber,
        orderId: String(order._id),
        readAt: null,
        createdAt: now,
        email: { status: "skipped", sentAt: null, reason: "no provider" },
      });
    }
  } catch {
    // non-fatal
  }

  const updated = await orders.findOne(filter);
  return ok({
    order: {
      _id: String(updated._id),
      orderNumber: updated.orderNumber,
      paymentStatus: updated.paymentStatus,
      paidAt: updated.paidAt || null,
      updatedAt: updated.updatedAt,
    },
  });
});
