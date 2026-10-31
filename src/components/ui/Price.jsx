import { formatMoney } from "@/lib/money";

/**
 * Price display with regular price + discount badge.
 * `symbol` comes from the store settings so the currency stays configurable.
 */
export default function Price({
  value,
  regular,
  symbol = "৳",
  size = "md",
  className = "",
}) {
  const current = Number(value) || 0;
  const old = Number(regular) || 0;
  const showOld = old > current;
  const discount = showOld ? Math.round(((old - current) / old) * 100) : 0;

  const sizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`font-bold text-navy-950 ${sizes[size] || sizes.md}`}>
        {formatMoney(current, symbol)}
      </span>
      {showOld && (
        <span className="text-sm text-navy-400 line-through">
          {formatMoney(old, symbol)}
        </span>
      )}
      {discount > 0 && (
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-navy-900">
          -{discount}%
        </span>
      )}
    </span>
  );
}

