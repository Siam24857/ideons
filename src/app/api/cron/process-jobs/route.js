import { handleApi, ok, fail } from "@/lib/api";
import { processDueJobs } from "@/lib/jobs";

/**
 * POST /api/cron/process-jobs
 *
 * Drains the MongoDB job queue (scheduled notifications, confirmation
 * messages, email deliveries).
 *
 * Authentication: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`.
 *
 * On self-hosted deployments the same work also runs in-process (started by
 * `src/instrumentation.js`); on serverless hosting you must schedule this
 * endpoint (Vercel Cron, GitHub Actions, an uptime pinger, ...).
 */
export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return fail(
      "CRON_SECRET is not configured. Set it in the environment to use the job runner.",
      503,
      "NOT_CONFIGURED"
    );
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-cron-secret") ||
    "";

  if (provided !== secret) {
    return fail("Unauthorized.", 401, "UNAUTHORIZED");
  }

  try {
    const summary = await processDueJobs({ limit: 25 });
    return ok({ summary });
  } catch (error) {
    console.error("[cron] job processing failed:", error);
    return fail("Job processing failed.", 500, "JOB_FAILURE");
  }
}

export const GET = async () => fail("Method not allowed. Use POST.", 405, "METHOD_NOT_ALLOWED");
