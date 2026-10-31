import { handleApi, ok, readJson, badRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { getSettings, updateSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validation";
import { isStripeConfigured } from "@/lib/stripe";
import { isMailConfigured } from "@/lib/mail";

/**
 * GET  /api/admin/settings - current store settings + integration status
 * PATCH /api/admin/settings - update store settings (audited)
 */
export const GET = handleApi(async () => {
  await requireAdmin();
  const settings = await getSettings();
  return ok({
    settings,
    integrations: {
      stripeConfigured: isStripeConfigured(),
      mailConfigured: isMailConfigured(),
      queueProvider: process.env.CRON_SECRET ? "cron" : "in-process-worker",
    },
  });
});

export const PATCH = handleApi(async (request) => {
  const admin = await requireAdmin();
  const body = settingsSchema.partial().parse(await readJson(request));

  if (body.stripeEnabled && !isStripeConfigured()) {
    throw badRequest(
      "Stripe is not configured. Set STRIPE_SECRET_KEY first, then enable it here."
    );
  }

  const before = await getSettings();
  const settings = await updateSettings(body, { adminId: admin.id });

  const { writeAudit } = await import("@/lib/audit");
  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "settings.update",
    targetType: "settings",
    targetId: "store",
    before: pickChanged(before, body),
    after: body,
    ip: request.headers.get("x-forwarded-for") || "",
  });

  return ok({
    settings,
    integrations: { stripeConfigured: isStripeConfigured(), mailConfigured: isMailConfigured() },
  });
});

function pickChanged(before, patch) {
  const out = {};
  for (const key of Object.keys(patch)) out[key] = before[key];
  return out;
}
