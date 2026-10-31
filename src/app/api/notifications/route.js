import { handleApi, ok, badRequest, readJson, qpInt } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { listNotifications, markAllRead, markRead } from "@/lib/notifications";
import { z } from "zod";

/**
 * GET   /api/notifications - in-app notifications (paged)
 * PATCH /api/notifications - mark some/all as read
 */

function serialize(doc) {
  return {
    _id: String(doc._id),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    orderNumber: doc.orderNumber,
    orderId: doc.orderId,
    data: doc.data || {},
    readAt: doc.readAt,
    createdAt: doc.createdAt,
    email: {
      status: doc.email?.status || "skipped",
      sentAt: doc.email?.sentAt || null,
      reason: doc.email?.reason || null,
    },
  };
}

export const GET = handleApi(async (request) => {
  const user = await requireUser();
  const page = qpInt(request, "page", 1, { min: 1 });
  const limit = qpInt(request, "limit", 20, { min: 1, max: 50 });
  const unreadOnly = request.nextUrl?.searchParams?.get("unread") === "1";

  const result = await listNotifications(user.id, { page, limit, unreadOnly });
  return ok({
    items: result.items.map(serialize),
    total: result.total,
    unread: result.unread,
    page: result.page,
    limit: result.limit,
    totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
  });
});

const patchSchema = z
  .object({
    all: z.boolean().optional(),
    ids: z.array(z.string()).max(100).optional(),
  })
  .refine((v) => v.all || (v.ids && v.ids.length), {
    message: "Provide ids to mark or set all: true",
  });

export const PATCH = handleApi(async (request) => {
  const user = await requireUser();
  const body = patchSchema.parse(await readJson(request));
  const result = body.all ? await markAllRead(user.id) : await markRead(user.id, body.ids);
  return ok({ modified: result.modified });
});
