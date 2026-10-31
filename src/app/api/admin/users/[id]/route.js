import { handleApi, ok, notFound, badRequest, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";

const statusSchema = z.object({
  status: z.enum(["active", "banned"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

/**
 * GET /api/admin/users/[id]
 * Get a single customer's full details with order stats.
 */
export const GET = handleApi(async (request, { params }) => {
  await requireAdmin();

  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("User not found.");

  const { users, orders } = await collections();
  const user = await users.findOne(
    { _id: objectId },
    { projection: { password: 0, sessionToken: 0 } },
  );
  if (!user) throw notFound("User not found.");

  // Order stats
  const userId = String(user._id);
  const orderStats = await orders
    .aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 0, "$total"],
            },
          },
          lastOrderAt: { $max: "$createdAt" },
          byStatus: { $push: "$orderStatus" },
        },
      },
    ])
    .toArray();

  const stats = orderStats[0] || {
    totalOrders: 0,
    totalSpent: 0,
    lastOrderAt: null,
    byStatus: [],
  };

  const ordersByStatus = {};
  for (const s of stats.byStatus) {
    ordersByStatus[s] = (ordersByStatus[s] || 0) + 1;
  }

  const recentOrders = await orders
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  return ok({
    user: {
      _id: String(user._id),
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "customer",
      createdAt: user.createdAt || null,
      banned: user.banned || false,
      banReason: user.banReason || null,
      bannedAt: user.bannedAt || null,
      totalOrders: stats.totalOrders || 0,
      totalSpent: stats.totalSpent || 0,
      lastOrderAt: stats.lastOrderAt || null,
      ordersByStatus,
    },
    recentOrders: recentOrders.map((o) => ({
      orderNumber: o.orderNumber,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      total: o.total,
      itemsCount: o.itemsCount,
      createdAt: o.createdAt,
    })),
  });
});

/**
 * PATCH /api/admin/users/[id]
 * Ban or unban a customer.
 */
export const PATCH = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const adminId = String(admin.id);
  const adminEmail = admin.email || "admin";

  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("User not found.");

  const body = statusSchema.parse(await readJson(request));
  const { status, reason } = body;

  const { users } = await collections();
  const user = await users.findOne({ _id: objectId });
  if (!user) throw notFound("User not found.");

  // Prevent banning an admin
  if (user.role === "admin" && status === "banned") {
    throw badRequest("Cannot ban an administrator.");
  }

  const now = new Date();
  const update = {
    banned: status === "banned",
    banReason: status === "banned" ? (reason || "Banned by administrator") : null,
    bannedAt: status === "banned" ? now : null,
    unbannedAt: status !== "banned" ? now : null,
  };

  const result = await users.updateOne({ _id: objectId }, { $set: update });
  if (result.matchedCount === 0) throw notFound("User not found.");

  await writeAudit({
    adminId,
    adminEmail,
    action: `user.${status === "banned" ? "ban" : "unban"}`,
    targetType: "user",
    targetId: String(user._id),
    before: { banned: user.banned },
    after: { banned: update.banned, reason: update.banReason },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({
    user: {
      _id: String(user._id),
      banned: update.banned,
      banReason: update.banReason,
      bannedAt: update.bannedAt,
      unbannedAt: update.unbannedAt,
    },
  });
});

/**
 * DELETE /api/admin/users/[id]
 * Soft-delete / deactivate a customer account.
 */
export const DELETE = handleApi(async (request, { params }) => {
  const admin = await requireAdmin();
  const adminId = String(admin.id);
  const adminEmail = admin.email || "admin";

  const { id } = await params;
  const objectId = toObjectIdOrNull(id);
  if (!objectId) throw notFound("User not found.");

  const { users } = await collections();
  const user = await users.findOne({ _id: objectId });
  if (!user) throw notFound("User not found.");

  // Prevent deleting an admin
  if (user.role === "admin") {
    throw badRequest("Cannot delete an administrator.");
  }

  // Soft delete: mark as banned with reason
  const now = new Date();
  await users.updateOne({ _id: objectId }, {
    $set: {
      banned: true,
      banReason: "Account deleted by administrator",
      bannedAt: now,
      isDeleted: true,
      deletedAt: now,
      deletedBy: adminId,
    },
  });

  await writeAudit({
    adminId,
    adminEmail,
    action: "user.delete",
    targetType: "user",
    targetId: String(user._id),
    before: { banned: user.banned, email: user.email },
    after: { banned: true, isDeleted: true },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({
    user: {
      _id: String(user._id),
      banned: true,
      isDeleted: true,
    },
  });
});
