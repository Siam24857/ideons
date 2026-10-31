/**
 * Order number generator: IDN-20261024-A1B2C3
 * Unique index on `orderNumber` is created by the migration script, and the
 * insert is retried on duplicate key so collisions can never produce two
 * orders with the same reference.
 */

function randomPart(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let out = "";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function generateOrderNumber(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `IDN-${y}${m}${d}-${randomPart(6)}`;
}

export function isValidOrderNumber(value) {
  return /^IDN-\d{8}-[A-Z0-9]{6}$/.test(String(value || ""));
}

/** Idempotency keys prevent the same checkout request from creating 2 orders. */
export function generateIdempotencyKey() {
  return `chk_${randomPart(16)}`;
}
