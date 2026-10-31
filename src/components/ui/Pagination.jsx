"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Server-paginated list controls. The page state always lives in the URL, so
 * a refresh, a share link or the browser back button keep the user on the
 * same page of results.
 */
export default function Pagination({ page, totalPages, total, className = "" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!totalPages || totalPages <= 1) {
    return total ? (
      <p className={`text-center text-xs text-navy-400 ${className}`}>
        {total} result{total === 1 ? "" : "s"}
      </p>
    ) : null;
  }

  const hrefFor = (target) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(target));
    return `${pathname}?${params.toString()}`;
  };

  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);
  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav className={`flex flex-col items-center gap-3 sm:flex-row sm:justify-between ${className}`} aria-label="Pagination">
      <p className="text-xs text-navy-500">
        Page {page} of {totalPages} · {total} result{total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={hrefFor(page - 1)}
            className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50"
          >
            Previous
          </Link>
        )}
        {start > 1 && (
          <>
            <Link href={hrefFor(1)} className="rounded-md px-2.5 py-1.5 text-xs text-navy-600 hover:bg-navy-50">
              1
            </Link>
            {start > 2 && <span className="px-1 text-xs text-navy-400">…</span>}
          </>
        )}
        {pages.map((value) => (
          <Link
            key={value}
            href={hrefFor(value)}
            aria-current={value === page ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              value === page
                ? "bg-navy-950 text-white"
                : "border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
            }`}
          >
            {value}
          </Link>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-xs text-navy-400">…</span>}
            <Link href={hrefFor(totalPages)} className="rounded-md px-2.5 py-1.5 text-xs text-navy-600 hover:bg-navy-50">
              {totalPages}
            </Link>
          </>
        )}
        {page < totalPages && (
          <Link
            href={hrefFor(page + 1)}
            className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50"
          >
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}

