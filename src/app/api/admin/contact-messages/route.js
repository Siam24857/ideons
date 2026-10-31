import { handleApi, ok, notFound, readJson, qp, qpInt } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { contactMessageStatusSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

/**
 * GET   /api/admin/contact-messages - paged inbox with status filter
 * PATCH /api/admin/contact-messages/[id] - mark as read / replied / closed
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();
  const { contactMessages } = await collections();
  const page = qpInt(request, "page", 1, { min: 1 });
  const limit = qpInt(request, "limit", 20, { min: 1, max: 100 });
  const status = qp(request, "status");
  const search = qp(request, "search");

  const query = {};
  if (status && status !== "all") query.status = status;
  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: safe, $options: "i" };
    query.$or = [{ name: regex }, { email: regex }, { subject: regex }, { message: regex }, { orderId: regex }];
  }

  const [items, total, counts] = await Promise.all([
    contactMessages
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    contactMessages.countDocuments(query),
    contactMessages.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
  ]);

  return ok({
    items: items.map((m) => ({ ...m, _id: String(m._id), ip: undefined })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
  });
});

export const PATCH = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("Message not found.");

  const body = contactMessageStatusSchema.partial().parse(await readJson(request));
  const { contactMessages } = await collections();
  const before = await contactMessages.findOne({ _id: objectId });
  if (!before) throw notFound("Message not found.");

  const set = { updatedAt: new Date() };
  if (body.status) {
    set.status = body.status;
    set.handledBy = String(admin.id);
    set.handledAt = new Date();
  }
  if (body.note !== undefined) set.adminNote = body.note;

  await contactMessages.updateOne({ _id: objectId }, { $set: set });

  if (body.status) {
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "contact.status.change",
      targetType: "contactMessage",
      targetId: String(objectId),
      before: { status: before.status },
      after: { status: body.status },
      ip: request.headers.get("x-forwarded-for") || "",
    });
  }

  return ok({ updated: true });
});
