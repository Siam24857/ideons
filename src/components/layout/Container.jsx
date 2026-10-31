"use client";

/**
 * Centered container component used consistently across the IDeons website.
 * Keeps all shopping content within a max-width of 1440px with equal
 * left/right margins, never touching the screen edges.
 */
export default function Container({ children, className }) {
  return (
    <div className={`mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 ${className || ""}`}>
      {children}
    </div>
  );
}
