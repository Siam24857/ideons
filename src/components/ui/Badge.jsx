import { orderStatusTone, paymentStatusTone, orderStatusLabel, paymentMethodLabel } from "@/lib/format";

/** Pill badges used across order tables and detail screens. */
export function StatusBadge({ status, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${orderStatusTone(status)} ${className}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}

export function PaymentBadge({ status }) {
  const tone = paymentStatusTone(status);
  const label =
    status === "paid" ? "Paid" : status === "failed" ? "Failed" : status === "refunded" ? "Refunded" : "Unpaid";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export function MethodBadge({ method }) {
  return (
    <span className="inline-flex items-center rounded-full border border-navy-200 bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">
      {paymentMethodLabel(method)}
    </span>
  );
}

export function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "border-navy-200 bg-navy-50 text-navy-700",
    brand: "border-blue-300 bg-blue-100 text-navy-900",
    success: "border-emerald-200 bg-emerald-100 text-emerald-700",
    warning: "border-amber-200 bg-amber-100 text-amber-800",
    danger: "border-rose-200 bg-rose-100 text-rose-700",
    info: "border-blue-200 bg-blue-100 text-blue-700",
    dark: "border-navy-900 bg-navy-900 text-white",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

