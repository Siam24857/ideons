import { collections } from "@/lib/db";
import { deliverNotificationEmail } from "@/lib/notifications";

/**
 * Persistent background job queue backed by MongoDB.
 *
 * Why not `setTimeout()`? A serverless/edge route handler may be frozen or
 * discarded the moment the response is returned, so an unawaited timer is not
 * a delivery system. Jobs are therefore stored, claimed atomically and
 * processed by:
 *
 *   1. the in-process worker started by `src/instrumentation.js` (self-hosted
 *      / `next start` deployments), and
 *   2. `POST /api/cron/process-jobs` protected by CRON_SECRET, which is what a
 *      platform cron (Vercel Cron, GitHub Actions, UptimeRobot, etc.) should
 *      call on a schedule for serverless hosting.
 *
 * The claim step uses `findOneAndUpdate` with a status + lock filter, so two
 * concurrent workers can never run the same job twice, and `key` gives
 * exactly-once scheduling per logical event.
 */

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

export async function scheduleJob({ key, type, payload = {}, runAt = null, maxAttempts = MAX_ATTEMPTS }) {
  const { jobs } = await collections();
  const now = new Date();
  const doc = {
    key,
    type,
    payload,
    runAt: runAt ? new Date(runAt) : now,
    status: "scheduled",
    attempts: 0,
    maxAttempts,
    lockedUntil: null,
    lockedBy: null,
    lastError: null,
    result: null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await jobs.updateOne({ key }, { $setOnInsert: doc }, { upsert: true });
    return { scheduled: true, key };
  } catch (error) {
    if (error?.code === 11000) return { scheduled: false, key, duplicate: true };
    console.error("[jobs] schedule failed:", error.message);
    throw error;
  }
}

async function claimDueJobs(limit) {
  const { jobs } = await collections();
  const claimed = [];
  const now = new Date();

  for (let i = 0; i < limit; i += 1) {
    const job = await jobs.findOneAndUpdate(
      {
        status: "scheduled",
        runAt: { $lte: now },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
      },
      {
        $set: {
          status: "processing",
          lockedUntil: new Date(now.getTime() + LOCK_MS),
          lockedBy: `w_${process.pid}`,
          updatedAt: now,
        },
        $inc: { attempts: 1 },
      },
      { returnDocument: "after" }
    );
    if (!job) break;
    claimed.push(job);
  }
  return claimed;
}

const handlers = {
  async send_notification_email(job) {
    const { notificationId } = job.payload || {};
    if (!notificationId) return { skipped: "no_notification_id" };
    return deliverNotificationEmail(notificationId);
  },

  async order_confirmation(job) {
    const { orderId } = job.payload || {};
    if (!orderId) return { skipped: "no_order_id" };
    const { orders } = await collections();
    const { ObjectId } = await import("mongodb");
    const order = await orders.findOne({ _id: new ObjectId(String(orderId)) });
    if (!order) return { skipped: "order_not_found" };
    // Only confirm an order that is still awaiting confirmation.
    if (order.orderStatus !== "pending") return { skipped: `status_${order.orderStatus}` };

    const { createNotification } = await import("@/lib/notifications");
    const notification = await createNotification({
      userId: order.userId,
      type: "order_confirmation_pending",
      order,
      dedupeKey: `confirm_${order.orderNumber}`,
    });
    if (notification?.email?.status === "pending") {
      await scheduleJob({
        key: `mail_${notification._id}`,
        type: "send_notification_email",
        payload: { notificationId: String(notification._id) },
        runAt: new Date(Date.now() + 5_000),
      });
    }
    return { confirmed: Boolean(notification) };
  },
};

/**
 * Processes every job that is due. Returns a summary so both the in-process
 * worker and the cron endpoint can log what happened.
 */
export async function processDueJobs({ limit = 10 } = {}) {
  const { jobs } = await collections();
  const claimed = await claimDueJobs(limit);
  const summary = { claimed: claimed.length, done: 0, retried: 0, failed: 0 };

  for (const job of claimed) {
    const handler = handlers[job.type];
    try {
      if (!handler) throw new Error(`No handler for job type "${job.type}"`);
      const result = await handler(job);
      await jobs.updateOne(
        { _id: job._id },
        { $set: { status: "done", result: result ?? null, lockedUntil: null, updatedAt: new Date() } }
      );
      summary.done += 1;
    } catch (error) {
      const attempts = job.attempts || 1;
      const maxAttempts = job.maxAttempts || MAX_ATTEMPTS;
      const canRetry = attempts < maxAttempts;
      const backoffMs = Math.min(60 * 60 * 1000, 15_000 * 2 ** attempts);
      await jobs.updateOne(
        { _id: job._id },
        {
          $set: canRetry
            ? {
                status: "scheduled",
                runAt: new Date(Date.now() + backoffMs),
                lockedUntil: null,
                lastError: String(error.message || error).slice(0, 500),
                updatedAt: new Date(),
              }
            : {
                status: "failed",
                lockedUntil: null,
                lastError: String(error.message || error).slice(0, 500),
                updatedAt: new Date(),
              },
        }
      );
      if (canRetry) summary.retried += 1;
      else summary.failed += 1;
      console.error(`[jobs] ${job.type} failed (attempt ${attempts}/${maxAttempts}):`, error.message);
    }
  }

  return summary;
}

/** Starts the in-process worker. Safe to call once per server process. */
export function startJobWorker({ intervalMs = 15_000 } = {}) {
  if (globalThis.__ideonsJobWorker) return globalThis.__ideonsJobWorker;
  if (typeof setInterval !== "function") return null;

  const tick = async () => {
    if (globalThis.__ideonsJobWorkerBusy) return;
    globalThis.__ideonsJobWorkerBusy = true;
    try {
      const summary = await processDueJobs({ limit: 10 });
      if (summary.claimed > 0) console.log("[jobs] processed", summary);
    } catch (error) {
      console.error("[jobs] worker tick failed:", error.message);
    } finally {
      globalThis.__ideonsJobWorkerBusy = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  globalThis.__ideonsJobWorker = timer;
  // First run shortly after boot.
  setTimeout(tick, 2_000).unref?.();
  return timer;
}
