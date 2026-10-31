import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections } from "@/lib/db";
import { z } from "zod";

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(120).optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * GET /api/admin/audit-logs
 * List administrative audit log entries.
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();

  const input = auditLogQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const { page, limit, search, action, userId } = input;
  const { auditLogs } = await collections();

  const query = {};
  const and = [];

  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: safe, $options: "i" };
    const terms = [
      { action: regex },
      { adminEmail: regex },
      { targetId: regex },
    ];
    and.push({ $or: terms });
  }

  if (action) and.push({ action });
  if (userId) and.push({ adminId: userId });

  if (and.length) query.$and = and;

  const [items, total] = await Promise.all([
    auditLogs
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    auditLogs.countDocuments(query),
  ]);

  return ok({
    items: items.map((a) => ({
      _id: String(a._id),
      adminId: a.adminId,
      adminEmail: a.adminEmail || "",
      action: a.action || "",
      targetType: a.targetType || "",
      targetId: a.targetId || "",
      before: a.before || null,
      after: a.after || null,
      ip: a.ip || null,
      createdAt: a.createdAt || null,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});
