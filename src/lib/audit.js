import { collections } from "@/lib/db";

/**
 * Audit trail for sensitive administrative actions.
 * Written directly to MongoDB; failures never break the main operation but
 * are always surfaced in the server logs.
 */

export async function writeAudit({
  adminId,
  adminEmail,
  action,
  targetType,
  targetId,
  before,
  after,
  meta = {},
  ip,
}) {
  try {
    const { auditLogs } = await collections();
    await auditLogs.insertOne({
      adminId: adminId ? String(adminId) : null,
      adminEmail: adminEmail || null,
      action,
      targetType: targetType || null,
      targetId: targetId ? String(targetId) : null,
      before: before ?? null,
      after: after ?? null,
      meta,
      ip: ip || null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[audit] failed to write audit log:", error.message, { action, targetId });
  }
}

export async function listAuditLogs({ page = 1, limit = 25, search = "" } = {}) {
  const { auditLogs } = await collections();
  const query = search
    ? {
        $or: [
          { action: { $regex: search, $options: "i" } },
          { adminEmail: { $regex: search, $options: "i" } },
          { targetId: { $regex: search, $options: "i" } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    auditLogs
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    auditLogs.countDocuments(query),
  ]);
  return { items, total, page, limit };
}
