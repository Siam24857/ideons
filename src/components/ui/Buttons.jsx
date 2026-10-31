import Link from "next/link";

/**
 * Button primitives. Every variant supports `loading` (spinner + disabled),
 * which is how the UI prevents double submissions.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  ...rest
}) {
  const variants = {
    primary:
      "bg-navy-950 text-white hover:bg-navy-800 disabled:bg-navy-300 border border-transparent",
    brand:
      "bg-blue-500 text-navy-950 hover:bg-blue-400 disabled:bg-blue-200 border border-transparent font-semibold",
    secondary:
      "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 disabled:text-navy-300",
    outlineDark:
      "border border-navy-700 bg-transparent text-white hover:bg-navy-800 disabled:opacity-50",
    danger:
      "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50",
    ghost: "border border-transparent bg-transparent text-navy-700 hover:bg-navy-100",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-sm",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}) {
  const variants = {
    primary: "bg-navy-950 text-white hover:bg-navy-800 border border-transparent",
    brand: "bg-blue-500 text-navy-950 hover:bg-blue-400 border border-transparent font-semibold",
    secondary: "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50",
    outlineDark: "border border-navy-700 bg-transparent text-white hover:bg-navy-800",
    dark: "bg-navy-950 text-white hover:bg-navy-800",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-sm",
  };
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Inline spinner for lists / panels. */
export function Spinner({ label = "Loading", className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 text-navy-500 ${className}`}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy-300 border-t-navy-950" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

