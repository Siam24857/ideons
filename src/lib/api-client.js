"use client";

/**
 * Tiny fetch wrapper used by every client component.
 *
 * It never resolves with "success" unless the server really returned
 * `success: true`, which is what allows toast messages to be trusted.
 */

async function request(url, { method = "GET", body, cache } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache,
      credentials: "same-origin",
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: "Network error. Please check your connection and try again.",
      code: "NETWORK_ERROR",
      details: null,
      data: null,
    };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    return {
      ok: false,
      status: response.status,
      message: payload?.message || "Request failed. Please try again.",
      code: payload?.code || `HTTP_${response.status}`,
      details: payload?.details || null,
      data: payload,
    };
  }

  return { ok: true, status: response.status, message: payload?.message, data: payload, details: null };
}

export const api = {
  get: (url, init) => request(url, init),
  post: (url, body, init) => request(url, { ...init, method: "POST", body }),
  patch: (url, body, init) => request(url, { ...init, method: "PATCH", body }),
  delete: (url, body, init) => request(url, { ...init, method: "DELETE", body }),
};

/** Human readable message for a failed response (incl. field errors). */
export function errorMessage(result) {
  if (!result) return "Something went wrong.";
  if (result.details) {
    const first = Object.values(result.details)[0];
    if (typeof first === "string") return first;
  }
  return result.message || "Something went wrong.";
}

/** Stable idempotency key for checkout (kept in sessionStorage). */
export function getIdempotencyKey() {
  if (typeof window === "undefined") return undefined;
  const KEY = "ideons.checkout.key";
  let value = window.sessionStorage.getItem(KEY);
  if (!value) {
    value = `chk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.sessionStorage.setItem(KEY, value);
  }
  return value;
}

export function clearIdempotencyKey() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem("ideons.checkout.key");
}
