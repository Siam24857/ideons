"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Flame } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { formatMoney } from "@/lib/money";

const QUICK_DEAL_TABS = [
  { key: "today", label: "Today's Deals" },
  { key: "bestsellers", label: "Best Sellers" },
  { key: "new-arrivals", label: "New Arrivals" },
  { key: "best-price", label: "Best Price" },
  { key: "clearance", label: "Clearance Sale" },
];

const TAB_TO_DEAL = {
  today: "today",
  bestsellers: "bestsellers",
  "new-arrivals": "new-arrivals",
  "best-price": "best-price",
  clearance: "clearance",
};

const DEAL_LABELS = {
  today: "Today's Deals",
  bestsellers: "Best Sellers",
  "new-arrivals": "New Arrivals",
  "best-price": "Best Price",
  clearance: "Clearance Sale",
};

export default function QuickDeals({ symbol = "৳" }) {
  const [activeTab, setActiveTab] = useState("today");
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const abortRef = useRef(null);
  const containerRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // ---------- Sync active tab to URL ----------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = params.get("deal");
    if (current && current !== activeTab && TAB_TO_DEAL[current]) {
      setActiveTab(current);
    }
  }, [activeTab]);

  // ---------- Fetch products for a deal ----------
  const fetchDeal = useCallback(
    async (dealKey, newPage = 1, append = false) => {
      const deal = TAB_TO_DEAL[dealKey];
      if (!deal) return;

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("deal", deal);
        params.set("page", String(newPage));
        params.set("limit", String(limit));

        const res = await fetch(`/api/products?${params.toString()}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: ctrl.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `Failed to load ${dealLabel(dealKey)}`);
        }

        const data = await res.json();
        if (ctrl.signal.aborted) return;

        if (append) {
          setProducts((prev) => [...prev, ...(data.items || [])]);
        } else {
          setProducts(data.items || []);
        }
        setTotal(data.total || 0);
        setHasMore(data.hasMore || false);
        setPage(newPage);
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load deals.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    },
    [limit]
  );

  // ---------- Initial fetch ----------
  useEffect(() => {
    fetchDeal(activeTab, 1, false);
  }, [activeTab, fetchDeal]);

  // ---------- Load more ----------
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    fetchDeal(activeTab, page + 1, true);
  }, [loading, hasMore, page, activeTab, fetchDeal]);

  // ---------- Scroll handlers ----------
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollLeft(el.scrollLeft);
    setContainerWidth(el.clientWidth);
  }, []);

  const scrollBy = useCallback((delta) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  const canScrollLeft = scrollLeft > 5;
  const canScrollRight =
    containerWidth > 0 &&
    scrollLeft + containerWidth < containerRef.current?.scrollWidth - 5;

  // ---------- Card width estimation for responsive ----------
  // Approximate card width: 160px on mobile, ~240px on tablet, ~200px on desktop
  // We'll use CSS grid with auto-fit instead of fixed widths

  const dealLabel = DEAL_LABELS[activeTab] || activeTab;
  const viewAllHref = `/products?deal=${TAB_TO_DEAL[activeTab]}`;

  return (
    <section className="border-b border-navy-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold text-navy-900 tracking-tight">
              Quick Deals ⚡
            </h2>
          </div>
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            View all {dealLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-8 pb-2">
          {QUICK_DEAL_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  // Update URL without scroll
                  const params = new URLSearchParams(window.location.search);
                  params.set("deal", tab.key);
                  window.history.replaceState(null, "", `?${params.toString()}`);
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-navy-50 text-navy-600 hover:bg-navy-100 border border-navy-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error state */}
        {error && !loading && products.length === 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-rose-500">⚠️</div>
              <div>
                <p className="text-sm font-medium text-rose-900">{error}</p>
                <button
                  onClick={() => fetchDeal(activeTab, 1, false)}
                  className="mt-2 inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  <ArrowRight className="h-3 w-3 rotate-180 mr-2" /> Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Carousel */}
        <div className="relative">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto pb-6 scroll-smooth -space-x-4"
          >
            {loading && products.length === 0 ? (
              <div className="flex-none w-64">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
                  <p className="text-sm text-navy-500">Loading {dealLabel}…</p>
                </div>
              </div>
            ) : products.length > 0 ? (
              products.map((product) => (
                <QuickDealCard
                  key={product._id}
                  product={product}
                  symbol={symbol}
                />
              ))
            ) : (
              <div className="flex-none w-64">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center">
                  <p className="text-sm text-navy-400">No {dealLabel.toLowerCase()} available right now.</p>
                </div>
              </div>
            )}
          </div>

          {/* Scroll arrows (desktop only) */}
          {products.length > 0 && (
            <>
              <button
                onClick={() => scrollBy(-220)}
                disabled={!canScrollLeft}
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/95 border border-navy-200 p-2 shadow-lg transition ${
                  !canScrollLeft
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-white"
                }`}
                aria-label="Scroll left"
              >
                <ArrowLeft className="h-5 w-5 text-navy-600" />
              </button>
              <button
                onClick={() => scrollBy(220)}
                disabled={!canScrollRight}
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/95 border border-navy-200 p-2 shadow-lg transition ${
                  !canScrollRight
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-white"
                }`}
                aria-label="Scroll right"
              >
                <ArrowRight className="h-5 w-5 text-navy-600" />
              </button>
            </>
          )}
        </div>

        {/* Load More */}
        {hasMore && !loading && products.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
            >
              <ArrowRight className="h-4 w-4" /> Load more
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function QuickDealCard({ product, symbol }) {
  const image = product.images?.[0];
  const outOfStock = !(product.inStock ?? product.stock > 0);
  const salePrice = product.salePrice ?? product.effectivePrice ?? product.price;
  const regularPrice = product.oldPrice ?? product.price;
  const hasDiscount = Boolean(
    product.discountPrice && product.discountPrice < product.price
  );
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <div className="flex-none w-64 flex flex-col overflow-hidden rounded-xl border border-navy-100 bg-white transition hover:border-blue-400 hover:shadow-lg">
      <Link href={`/products/${product.slug || product._id}`} className="block relative aspect-[3/4] overflow-hidden bg-navy-50 group">
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-navy-300">
            <PackageIcon className="h-10 w-10" />
          </div>
        )}
        {product.badge && (
          <span className="absolute left-2 top-2 rounded bg-navy-950 px-2 py-1 text-[11px] font-semibold text-white">
            {product.badge}
          </span>
        )}
        {hasDiscount && (
          <span className="absolute right-2 top-2 rounded bg-rose-600 px-2 py-1 text-[11px] font-bold text-white">
            -{discountPercent}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/85 text-xs font-bold uppercase tracking-wide text-rose-600">
            Out of stock
          </span>
        )}
      </Link>

      <div className="p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-navy-400">
          {product.category || ""}
        </p>
        <Link href={`/products/${product.slug || product._id}`} className="block">
          <h3 className="line-clamp-2 min-h-[30px] text-sm font-bold leading-5 text-navy-900 hover:text-blue-600">
            {product.title}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-navy-900">
            {formatMoney(salePrice, symbol)}
          </span>
          {hasDiscount && regularPrice > salePrice && (
            <span className="text-xs line-through text-navy-400">
              {formatMoney(regularPrice, symbol)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (outOfStock) return;
          }}
          disabled={outOfStock}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs font-semibold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {outOfStock ? "Unavailable" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

function PackageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="8" x2="21" y2="8" />
      <path d="M21 8l-5-6L12 8l2 4z" />
      <path d="M3 16l3-4 3 4 3-4 3 4" />
      <line x1="12" y1="12" x2="12" y2="16" />
    </svg>
  );
}
