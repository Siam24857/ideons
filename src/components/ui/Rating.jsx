/**
 * Star rating. `count` of 0 renders nothing except an em dash so we never
 * invent a rating for a product that has none.
 */
export default function Rating({ value = 0, count, size = "sm", showCount = true }) {
  const rating = Number(value) || 0;
  const stars = [1, 2, 3, 4, 5];
  const sizeClass = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";

  if (!rating && !count) {
    return <span className="text-xs text-navy-400">No reviews yet</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center" aria-label={`${rating} out of 5 stars`}>
        {stars.map((star) => (
          <svg
            key={star}
            className={`${sizeClass} ${star <= Math.round(rating) ? "text-blue-500" : "text-navy-200"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.95a1 1 0 0 0 .95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 0 0-.36 1.12l1.28 3.95c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 0 0-1.17 0l-3.36 2.44c-.78.57-1.83-.2-1.54-1.12l1.28-3.95a1 1 0 0 0-.36-1.12L2.05 9.38c-.78-.57-.38-1.81.6-1.81h4.14a1 1 0 0 0 .95-.69l1.28-3.95Z" />
          </svg>
        ))}
      </span>
      <span className="text-xs font-medium text-navy-700">{rating.toFixed(1)}</span>
      {showCount && count !== undefined && (
        <span className="text-xs text-navy-400">({count})</span>
      )}
    </span>
  );
}

