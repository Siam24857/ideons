/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * It protects sensitive endpoints (auth-adjacent forms, contact form,
 * checkout, job runner) from accidental floods and scripted abuse on a single
 * Node process. On a multi-instance deployment configure an external limiter
 * (see .env.example) - the code below degrades gracefully rather than
 * blocking legitimate traffic when a window entry is missing.
 */

const buckets = new Map();
const MAX_BUCKETS = 5000;

export function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    if (buckets.size > MAX_BUCKETS) {
      // Drop the oldest entries to keep memory bounded.
      for (const [k, v] of buckets) {
        if (now - v.start > windowMs) buckets.delete(k);
      }
    }
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const resetMs = Math.max(0, windowMs - (now - bucket.start));
  return { ok: bucket.count <= limit, remaining, resetMs };
}

export function assertRateLimit(request, key, options) {
  const ip = getClientIp(request);
  const result = rateLimit(`${key}:${ip}`, options);
  if (!result.ok) {
    const err = new Error(
      "Too many requests. Please wait a moment and try again."
    );
    err.status = 429;
    err.code = "RATE_LIMITED";
    throw err;
  }
  return result;
}

export function getClientIp(request) {
  const forwarded = request.headers?.get?.("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers?.get?.("x-real-ip") || "unknown";
}
