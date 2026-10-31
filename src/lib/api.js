import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Shared helpers for Next.js Route Handlers.
 *
 * `handleApi` wraps every handler so that:
 *  - thrown ApiError / plain errors become safe JSON responses
 *  - Zod validation failures become 400 with field level messages
 *  - unexpected errors never leak stack traces or secrets to the client
 */

export class ApiError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST", details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const unauthorized = (message = "You must be signed in to continue.") =>
  new ApiError(message, 401, "UNAUTHORIZED");

export const forbidden = (message = "You do not have permission to perform this action.") =>
  new ApiError(message, 403, "FORBIDDEN");

export const notFound = (message = "Resource not found.") =>
  new ApiError(message, 404, "NOT_FOUND");

export const conflict = (message, details) => new ApiError(message, 409, "CONFLICT", details);

export const badRequest = (message, details) => new ApiError(message, 400, "BAD_REQUEST", details);

export function ok(data, init = {}) {
  return NextResponse.json({ success: true, ...data }, { status: 200, ...init });
}

export function created(data) {
  return NextResponse.json({ success: true, ...data }, { status: 201 });
}

export function fail(message, status = 400, code = "BAD_REQUEST", details) {
  return NextResponse.json(
    { success: false, message, code, ...(details ? { details } : {}) },
    { status }
  );
}

export function parseError(error) {
  if (error instanceof ZodError) {
    const details = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      if (!details[key]) details[key] = issue.message;
    }
    return fail(
      "Please correct the highlighted fields.",
      400,
      "VALIDATION_ERROR",
      details
    );
  }
  if (error instanceof ApiError) {
    return fail(error.message, error.status, error.code, error.details);
  }
  const status = Number(error?.status) || 500;
  const code = error?.code && typeof error.code === "string" ? error.code : "SERVER_ERROR";
  if (status >= 500) {
    console.error("[api] unexpected error:", error);
    return fail("Something went wrong on our side. Please try again.", 500, "SERVER_ERROR");
  }
  return fail(error?.message || "Request failed.", status, code, error?.details);
}

/**
 * Route handler wrapper.
 *
 *   export const POST = handleApi(async (request, ctx) => { ... });
 */
export function handleApi(handler) {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      return parseError(error);
    }
  };
}

/** Reads and parses a JSON body, returning {} for empty bodies. */
export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

/** Zod parse helper that surfaces field-level details. */
export function parseBody(schema, data) {
  return schema.parse(data);
}

/**
 * Search the request URL for a query parameter with a default.
 */
export function qp(request, key, fallback = null) {
  const value = request.nextUrl?.searchParams?.get(key);
  return value === null || value === "" ? fallback : value;
}

export function qpInt(request, key, fallback, { min, max } = {}) {
  const raw = qp(request, key);
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}
