/**
 * Money helpers.
 * All arithmetic is done on integer minor units (poisha / cents) to avoid
 * floating point drift, then rounded back to a 2 decimal number for storage
 * and display. Prices in the catalog are stored as plain 2 decimal numbers.
 */

export function toMinor(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromMinor(minor) {
  return Math.round(Number(minor)) / 100;
}

export function round2(value) {
  return fromMinor(toMinor(value));
}

/** Add several 2-decimal amounts safely. */
export function sumAmounts(values) {
  return fromMinor(values.reduce((acc, v) => acc + toMinor(v), 0));
}

/** Multiply a 2-decimal unit price by an integer quantity. */
export function multiply(unitPrice, quantity) {
  return fromMinor(toMinor(unitPrice) * Math.max(0, Number(quantity) || 0));
}

/**
 * Format a money amount for display: ৳1,234.56
 * The symbol comes from the store settings (passed in by the caller).
 */
export function formatMoney(amount, symbol = "৳") {
  const value = round2(amount ?? 0);
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/** Percentage discount between a regular price and a sale price. */
export function discountPercent(price, salePrice) {
  const p = toMinor(price);
  const s = toMinor(salePrice);
  if (!p || p <= s) return 0;
  return Math.round(((p - s) / p) * 100);
}

/**
 * Resolve the effective unit price of a product document.
 * The discount price wins only when it is lower than the regular price.
 */
export function effectivePrice(product) {
  const price = Number(product?.price) || 0;
  const discount = Number(product?.discountPrice ?? product?.salePrice);
  if (Number.isFinite(discount) && discount > 0 && toMinor(discount) < toMinor(price)) {
    return round2(discount);
  }
  return round2(price);
}
