import { handleApi, ok, notFound, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { z } from "zod";
import { ORDER_STATUS } from "@/lib/constants";
import { applyStatusChange } from "@/lib/orders";
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
 *
 * Thin wrapper around `applyStatusChange()`, which owns the transition rules,
 * stock restoration on cancellation, the history/timeline entries, and the
 * customer notification. Accepts either an ObjectId or an order number.
 */
export const PATCH = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { orders } = await collections();

  let order = null;
  const objectId = toObjectIdOrNull(id);
  if (objectId) order = await orders.findOne({ _id: objectId });
  if (!order) order = await orders.findOne({ orderNumber: id });
  if (!order) throw notFound("Order not found.");

  const body = statusSchema.parse(await readJson(request));
  const beforeStatus = order.orderStatus;

  const updated = await applyStatusChange({
    orderId: String(order._id),
    status: body.status,
    admin,
    note: body.internalNote || "",
    customerMessage: body.customerMessage || "",
  });

  await writeAudit({
    adminId: String(admin.id),
    adminEmail: admin.email || "admin",
    action: "order.status.update",
    targetType: "order",
    targetId: order.orderNumber,
    before: { orderStatus: beforeStatus },
    after: {
      orderStatus: body.status,
      internalNote: body.internalNote,
      customerMessage: body.customerMessage,
    },
    ip: request.headers.get("x-forwarded-for") || "",
  });

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
