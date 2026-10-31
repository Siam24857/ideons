import Link from "next/link";

/**
 * Empty state used for empty carts, no results, no orders, etc.
 * Always gives the user a next action.
 */
export default function EmptyState({ icon, title, description, actionLabel, actionHref, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
      {icon && <div className="text-navy-300">{icon}</div>}
      <h2 className="mt-4 text-lg font-semibold text-navy-900">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-navy-500">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  );
}

/** Section heading used across the storefront. */
export function SectionHeading({ eyebrow, title, description, action, href }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{eyebrow}</p>
        )}
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">{description}</p>}
      </div>
      {action && href && (
        <Link href={href} className="text-sm font-semibold text-navy-900 hover:text-blue-600">
          {action} →
        </Link>
      )}
    </div>
  );
}

