/**
 * Presentation helpers shared by the storefront, account and admin screens.
 */

export function formatDate(value, { withTime = true } = {}) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatDateShort(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function timeAgo(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateShort(value);
}

export function money(amount, symbol = "৳") {
  const value = Number(amount) || 0;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function orderStatusTone(status) {
  switch (status) {
    case "delivered":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "shipped":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "processing":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "confirmed":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "cancelled":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function paymentStatusTone(status) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "failed":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "refunded":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
}

export function paymentMethodLabel(method) {
  if (method === "cod") return "Cash on Delivery";
  if (method === "stripe") return "Card (Stripe)";
  return method || "-";
}

export function orderStatusLabel(status) {
  const map = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[status] || status;
}
