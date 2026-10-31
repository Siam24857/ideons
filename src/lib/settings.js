import { collections } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/constants";

/**
 * Store settings are stored as a single mutable document so that the owner can
 * change delivery charges, currency and enabled payment methods without a
 * code change. Values always fall back to safe defaults.
 */
export async function getSettings() {
  try {
    const { settings } = await collections();
    const doc = await settings.findOne({ key: "store" });
    return { ...DEFAULT_SETTINGS, ...(doc || {}), key: "store" };
  } catch (error) {
    console.error("[settings] failed to load, using defaults:", error.message);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(patch, { adminId } = {}) {
  const { settings } = await collections();
  const update = { ...patch, key: "store", updatedAt: new Date() };
  delete update._id;
  await settings.updateOne({ key: "store" }, { $set: update }, { upsert: true });
  return getSettings();
}

/**
 * Delivery charge for an order going to a given division.
 * Free delivery is applied when the order subtotal reaches the threshold.
 */
export function computeDeliveryCharge(settings, subtotal, division, district) {
  const freeOver = Number(settings.freeDeliveryOver) || 0;
  if (freeOver > 0 && toMinorSafe(subtotal) >= toMinorSafe(freeOver)) return 0;
  const inside =
    String(division || "").trim().toLowerCase() === "dhaka" ||
    String(district || "").trim().toLowerCase() === "dhaka";
  return inside
    ? Number(settings.deliveryChargeInsideDhaka) || 0
    : Number(settings.deliveryChargeOutsideDhaka) || 0;
}

function toMinorSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
