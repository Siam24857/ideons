"use client";

/**
 * Guest cart kept in localStorage so anonymous visitors can shop, then hand
 * their cart over to their account after signing in (POST /api/cart/merge).
 * Only product ids, quantities and variants are stored - never prices.
 */

const KEY = "ideons.guest.cart";

export function readGuestCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGuestCart(items) {
  if (typeof window === "undefined") return [];
  const list = Array.isArray(items) ? items : [];
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("ideons:guest-cart"));
  return list;
}

export function addGuestItem(productId, quantity = 1, variant = null) {
  const items = readGuestCart();
  const key = JSON.stringify(variant || null);
  const existing = items.find(
    (i) => i.productId === productId && JSON.stringify(i.variant || null) === key
  );
  if (existing) {
    existing.quantity = Math.min(50, (existing.quantity || 1) + quantity);
  } else {
    items.push({ productId, quantity: Math.min(50, quantity), variant: variant || null });
  }
  return writeGuestCart(items.slice(0, 30));
}

export function setGuestQuantity(productId, quantity, variant = null) {
  const items = readGuestCart();
  const key = JSON.stringify(variant || null);
  const next = items
    .map((i) =>
      i.productId === productId && JSON.stringify(i.variant || null) === key
        ? { ...i, quantity }
        : i
    )
    .filter((i) => i.quantity > 0);
  return writeGuestCart(next);
}

export function removeGuestItem(productId, variant = null) {
  const items = readGuestCart().filter(
    (i) =>
      !(i.productId === productId && JSON.stringify(i.variant || null) === JSON.stringify(variant || null))
  );
  return writeGuestCart(items);
}

export function clearGuestCart() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("ideons:guest-cart"));
  return [];
}

export function guestCount() {
  return readGuestCart().reduce((sum, i) => sum + (i.quantity || 1), 0);
}
