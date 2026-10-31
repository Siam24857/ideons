import { handleApi, ok, badRequest, readJson, qp, qpInt } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";

/**
 * GET  /api/admin/inventory - stock overview (low stock first) + summary
 * POST /api/admin/inventory - adjust stock for a product (audited)
 *
 * Stock adjustments are explicit and logged so inventory changes are always
 * attributable to an administrator.
 */
export const GET = handleApi(async (request) => {
  await requireAdmin();
  const { products } = await collections();
  const page = qpInt(request, "page", 1, { min: 1 });
  const limit = qpInt(request, "limit", 25, { min: 1, max: 100 });
  const filter = qp(request, "filter", "all");
  const search = qp(request, "search");
  const threshold = Number(process.env.LOW_STOCK_THRESHOLD) || 5;

  const query = {};
  if (filter === "low") query.stock = { $gt: 0, $lte: threshold };
  if (filter === "out") query.stock = { $lte: 0 };
  if (filter === "in") query.stock = { $gt: threshold };
  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [{ title: { $regex: safe, $options: "i" } }, { sku: { $regex: safe, $options: "i" } }];
  }

  const [items, total, agg] = await Promise.all([
    products
      .find(query)
      .sort({ stock: 1, title: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    products.countDocuments(query),
    products
      .aggregate([
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$stock" },
            low: { $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", threshold] }] }, 1, 0] } },
            out: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  return ok({
    items: items.map((p) => ({
      _id: String(p._id),
      title: p.title,
      sku: p.sku || "",
      category: p.category || "",
      image: Array.isArray(p.images) ? p.images[0] || "" : "",
      price: p.price,
      stock: Number(p.stock) || 0,
      sold: Number(p.sold) || 0,
      isActive: p.isActive !== false,
      threshold,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: agg[0] || { totalUnits: 0, low: 0, out: 0, total: 0 },
  });
});

const adjustSchema = z.object({
  productId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  stock: z.number().int().min(0).max(1_000_000),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const POST = handleApi(async (request) => {
  const admin = await requireAdmin();
  const body = adjustSchema.parse(await readJson(request));

  const objectId = toObjectIdOrNull(body.productId);
  const { products } = await collections();
  const before = await products.findOne({ _id: objectId });
  if (!before) throw badRequest("Product not found.");

  await products.updateOne(
    { _id: objectId },
    { $set: { stock: body.stock, updatedAt: new Date() } }
  );

  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "inventory.adjust",
    targetType: "product",
    targetId: String(objectId),
    before: { stock: before.stock },
    after: { stock: body.stock },
    meta: { reason: body.reason || "", title: before.title },
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({ productId: String(objectId), stock: body.stock, previousStock: before.stock });
});
