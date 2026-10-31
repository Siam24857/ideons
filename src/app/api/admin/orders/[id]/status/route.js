import { handleApi, ok, notFound, badRequest, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { z } from "zod";
import { ORDER_STATUS_TRANSITIONS, ORDER_STATUS } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";

const statusSchema = z.object({
  status: z.enum([
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ]),
  internalNote: z.string().trim().max(1000).optional().or(z.literal("")),
  customerMessage: z.string().trim().max(1000).optional().or(z.literal("")),
});

/**
 * PATCH /api/admin/orders/[id]/status
 * Update order status with validation, audit trail, and notification scheduling.
 * Accepts either a MongoDB ObjectId or an order number string.
 */
export const PATCH = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const adminId = String(admin.id);
  const adminEmail = admin.email || "admin";

  const { id } = await params;
  const { orders, notifications } = await collections();

  let order = null;
  const objectId = toObjectIdOrNull(id);
  if (objectId) {
    order = await orders.findOne({ _id: objectId });
  }
  if (!order) {
    order = await orders.findOne({ orderNumber: id });
  }
  if (!order) throw notFound("Order not found.");

  const body = statusSchema.parse(await readJson(request));
  const currentStatus = order.orderStatus;
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(body.status)) {
    throw badRequest(
      `Cannot transition from "${currentStatus}" to "${body.status}". Allowed: ${allowed.join(", ") || "none"}`
    );
  }

  const now = new Date();
  const historyEntry = {
    status: body.status,
    at: now,
    byId: adminId,
    byName: adminEmail,
    note: body.internalNote || undefined,
    customerMessage: body.customerMessage || undefined,
  };

  const customerMessages = order.customerMessages || [];
  if (body.customerMessage) {
    customerMessages.push({
      message: body.customerMessage,
      at: now,
      by: "admin",
    });
  }

  const update = {
    orderStatus: body.status,
    updatedAt: now,
    history: [...(order.history || []), historyEntry],
    customerMessages,
  };

  if (body.status === ORDER_STATUS.CANCELLED) {
    update.cancelInfo = {
      cancelledAt: now,
      cancelledBy: adminId,
      reason: body.internalNote || "Cancelled by admin",
    };
  }

  if (body.status === ORDER_STATUS.DELIVERED) {
    update.deliveredAt = now;
  }

  const filter = objectId ? { _id: objectId } : { orderNumber: id };
  const result = await orders.updateOne(filter, { $set: update });
  if (result.matchedCount === 0) throw notFound("Order not found.");

  await writeAudit({
    adminId,
    adminEmail,
    action: "order.status.update",
    targetType: "order",
    targetId: order.orderNumber,
    before: { orderStatus: currentStatus },
    after: { orderStatus: body.status, internalNote: body.internalNote, customerMessage: body.customerMessage },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  // Create customer notification for status change
  try {
    const typeMap = {
      [ORDER_STATUS.CONFIRMED]: "order_confirmed",
      [ORDER_STATUS.PROCESSING]: "order_processing",
      [ORDER_STATUS.SHIPPED]: "order_shipped",
      [ORDER_STATUS.DELIVERED]: "order_delivered",
      [ORDER_STATUS.CANCELLED]: "order_cancelled",
    };
    const type = typeMap[body.status];
    if (type) {
      await notifications.insertOne({
        userId: order.userId,
        type,
        title: `Order #${order.orderNumber} updated`,
        body: body.customerMessage || `Your order status changed to ${body.status}.`,
        orderNumber: order.orderNumber,
        orderId: String(order._id),
        readAt: null,
        createdAt: now,
        email: { status: "skipped", sentAt: null, reason: "no provider" },
      });
    }
  } catch {
    // Non-fatal: notification failure shouldn't block status update
  }

  const updated = await orders.findOne(filter);
  return ok({
    order: {
      _id: String(updated._id),
      orderNumber: updated.orderNumber,
      orderStatus: updated.orderStatus,
      history: updated.history || [],
      customerMessages: updated.customerMessages || [],
      updatedAt: updated.updatedAt,
    },
  });
});
