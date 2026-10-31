/**
 * Next.js instrumentation hook - runs once when the server starts.
 * Starts the MongoDB-backed job worker so scheduled notifications (for
 * example the "confirm your order" notification ~1 minute after checkout)
 * are delivered on self-hosted deployments.
 *
 * For serverless hosting, also schedule `POST /api/cron/process-jobs` with a
 * `CRON_SECRET` - see .env.example.
 */
export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.IDEONS_DISABLE_WORKER === "1") return;
  if (typeof window !== "undefined") return;

  try {
    const { startJobWorker } = await import("@/lib/jobs");
    startJobWorker({ intervalMs: Number(process.env.JOB_INTERVAL_MS) || 15_000 });
    console.log("[ideons] background job worker started");
  } catch (error) {
    console.error("[ideons] failed to start job worker:", error.message);
  }
}
