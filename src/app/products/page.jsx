"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Filter,
  Search,
  Star,
  Package,
  X,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import Pagination from "@/components/ui/Pagination";

const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

const TAKA = "\u09F3";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-low-to-high", label: "Price: Low to High" },
  { value: "price-high-to-low", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "best-selling", label: "Best Selling" },
  { value: "highest-rated", label: "Highest Rated" },
  { value: "biggest-discount", label: "Biggest Discount" },
];

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

/** Sanitize a numeric filter string: allow digits only (or empty). */
function sanitizeNumericInput(raw) {
  const s = safeString(raw);
  // keep digits and a single decimal point; strip everything else
  const cleaned = s.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  return cleaned;
}

function buildStateFromParams(sp) {
  const page = Math.max(1, toPositiveInt(sp.get("page"), 1));
  const limit = Math.max(1, Math.min(MAX_LIMIT, toPositiveInt(sp.get("limit"), DEFAULT_LIMIT)));
  return {
    page,
    limit,
    sort: sp.get("sort") || "featured",
    search: sp.get("search") || "",
    category: sp.get("category") || "all",
    minPrice: sanitizeNumericInput(sp.get("minPrice") || ""),
    maxPrice: sanitizeNumericInput(sp.get("maxPrice") || ""),
    minRating: sp.get("minRating") || "",
    minDiscount: sp.get("minDiscount") || "",
    inStock: sp.get("inStock") === "1" || sp.get("inStock") === "true",
  };
}

function buildQueryString(state, debouncedSearch) {
  const params = new URLSearchParams();
  if (state.page && state.page !== 1) params.set("page", String(state.page));
  if (state.limit && state.limit !== DEFAULT_LIMIT) params.set("limit", String(state.limit));
  if (state.sort && state.sort !== "featured") params.set("sort", state.sort);
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (state.category && state.category !== "all") params.set("category", state.category);
  if (state.minPrice) params.set("minPrice", state.minPrice);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);
  if (state.minRating) params.set("minRating", state.minRating);
  if (state.minDiscount) params.set("minDiscount", state.minDiscount);
  if (state.inStock) params.set("inStock", "1");
  return params.toString();
}

function statesEqual(a, b) {
  return (
    a.page === b.page &&
    a.limit === b.limit &&
    a.sort === b.sort &&
    a.search === b.search &&
    a.category === b.category &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.minRating === b.minRating &&
    a.minDiscount === b.minDiscount &&
    a.inStock === b.inStock
  );
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const lastPushedUrlRef = useRef(null);
  const mountedRef = useRef(false);

  // Lazy initialize from URL once.
  const [state, setState] = useState(() => buildStateFromParams(searchParams));
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => buildStateFromParams(searchParams).search
  );

  // ----------------------------------------------------------------
  // Categories
  // ----------------------------------------------------------------
  const fetchCategories = useCallback(async () => {
    setCategoriesError(null);
    try {
      const res = await fetch("/api/categories", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setCategories(
        items
          .filter((c) => c && c.slug)
          .map((c) => ({
            name: safeString(c.name, c.slug),
            slug: String(c.slug),
            count: Number.isFinite(Number(c.count)) ? Number(c.count) : 0,
          }))
      );
    } catch (err) {
      setCategories([]);
      setCategoriesError(err instanceof Error ? err.message : "Failed to load categories.");
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ----------------------------------------------------------------
  // Debounce search
  // ----------------------------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch((prev) => (prev === state.search ? prev : state.search));
    }, 300);
    return () => clearTimeout(t);
  }, [state.search]);

  // ----------------------------------------------------------------
  // Fetch products — memoized on primitive fields only
  // ----------------------------------------------------------------
  const {
    page,
    limit,
    sort,
    category,
    minPrice,
    maxPrice,
    minRating,
    minDiscount,
    inStock,
  } = state;

  const fetchProducts = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sort", sort);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category && category !== "all") params.set("category", category);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (minRating) params.set("minRating", minRating);
      if (minDiscount) params.set("minDiscount", minDiscount);
      if (inStock) params.set("inStock", "1");

      const url = `${SERVER_URL}/products?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.message || `Failed to load products (${res.status})`);
      }

      const data = await res.json();
      if (ctrl.signal.aborted) return;

      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.products)
        ? data.products
        : [];

      // Use nullish coalescing — preserves legit zero totals.
      const totalCount =
        data?.total ?? data?.pagination?.totalProducts ?? items.length;

      setProducts(items);
      setTotal(totalCount);
      setTotalPages(Math.max(1, Math.ceil(totalCount / limit)));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load products.");
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [page, limit, sort, category, minPrice, maxPrice, minRating, minDiscount, inStock, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Abort in-flight fetch on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // ----------------------------------------------------------------
  // Sync URL → state (skip if we just pushed this URL ourselves)
  // ----------------------------------------------------------------
  useEffect(() => {
    const currentUrl = searchParams.toString();
    if (lastPushedUrlRef.current === currentUrl) return;
    const next = buildStateFromParams(searchParams);
    setState((prev) => (statesEqual(prev, next) ? prev : next));
    setDebouncedSearch((prev) => (prev === next.search ? prev : next.search));
  }, [searchParams]);

  // ----------------------------------------------------------------
  // Sync state → URL (with loop guard)
  // ----------------------------------------------------------------
  useEffect(() => {
    const next = buildQueryString(state, debouncedSearch);
    const current = searchParams.toString();
    if (next === current) {
      lastPushedUrlRef.current = current;
      return;
    }
    if (lastPushedUrlRef.current === next) return;
    lastPushedUrlRef.current = next;
    router.replace(next ? `/products?${next}` : "/products", { scroll: false });
  }, [state, debouncedSearch, router, searchParams]);

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------
  const handleTextChange = useCallback((key) => (e) => {
    const value = e.target.value;
    setState((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleNumericChange = useCallback((key) => (e) => {
    const value = sanitizeNumericInput(e.target.value);
    setState((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = useCallback(() => {
    setState((prev) => ({
      page: 1,
      limit: prev.limit,
      sort: "featured",
      search: "",
      category: "all",
      minPrice: "",
      maxPrice: "",
      minRating: "",
      minDiscount: "",
      inStock: false,
    }));
    setDebouncedSearch("");
  }, []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (state.search) n++;
    if (state.category !== "all") n++;
    if (state.minPrice) n++;
    if (state.maxPrice) n++;
    if (state.minRating) n++;
    if (state.minDiscount) n++;
    if (state.inStock) n++;
    return n;
  }, [state]);

  const hasActiveFilters = activeFilterCount > 0;

  const productKey = (product) =>
    product?._id ?? product?.id ?? product?.slug ?? Math.random().toString(36);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <section className="border-b border-[#EAEDED] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0B2545] sm:text-3xl">
                Browse All Products
              </h1>
              <p className="mt-1 text-sm text-[#123B69]">
                {total} product{total === 1 ? "" : "s"} found
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row">
              <div className="relative flex-1 sm:w-80">
                <form onSubmit={handleSubmit} className="flex">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#123B69]/50" />
                  <input
                    type="search"
                    value={state.search}
                    onChange={handleTextChange("search")}
                    placeholder="Search products…"
                    aria-label="Search products"
                    className="w-full rounded-lg border border-[#123B69]/30 bg-white py-2.5 pl-9 pr-20 text-sm text-[#0B2545] outline-none transition placeholder:text-[#123B69]/40 focus:border-[#FFC928] focus:bg-white sm:w-80 caret-[#FFC928]"
                  />
                  {state.search ? (
                    <button
                      type="button"
                      onClick={() => setState((prev) => ({ ...prev, search: "", page: 1 }))}
                      className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-[#123B69]/60 hover:text-[#FFC928]"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-[#123B69] hover:text-[#FFC928]"
                    aria-label="Submit search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </form>
              </div>

              <select
                value={state.category}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, category: e.target.value, page: 1 }))
                }
                aria-label="Filter by category"
                className="rounded-lg border border-[#123B69]/30 bg-white px-3 py-2.5 text-sm text-[#0B2545] outline-none transition focus:border-[#FFC928]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
                {/* Preserve an unknown slug coming from the URL */}
                {state.category !== "all" &&
                !categories.some((c) => c.slug === state.category) ? (
                  <option value={state.category}>{state.category}</option>
                ) : null}
              </select>

              <select
                value={state.sort}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, sort: e.target.value, page: 1 }))
                }
                aria-label="Sort products"
                className="rounded-lg border border-[#123B69]/30 bg-white px-3 py-2.5 text-sm text-[#0B2545] outline-none transition focus:border-[#FFC928]"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block space-y-8">
            <div>
              <h2 className="mb-4 text-lg font-bold text-[#0B2545]">Categories</h2>
              <div className="space-y-2">
                <Link
                  href="/products"
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    state.category === "all"
                      ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold"
                      : "text-[#123B69] hover:bg-[#F5F7FA]"
                  }`}
                >
                  All Categories
                </Link>
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() =>
                      setState((prev) => ({ ...prev, category: cat.slug, page: 1 }))
                    }
                    className={`w-full text-left block rounded-lg px-3 py-2 text-sm transition ${
                      state.category === cat.slug
                        ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold"
                        : "text-[#123B69] hover:bg-[#F5F7FA]"
                    }`}
                  >
                    {cat.name}{" "}
                    <span className="ml-2 text-xs text-[#123B69]/50">({cat.count})</span>
                  </button>
                ))}
                {categoriesError ? (
                  <p className="px-3 text-xs text-red-600">Categories unavailable.</p>
                ) : null}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-[#0B2545]">Price</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <label className="text-[#123B69]">Min ({TAKA})</label>
                  <input
                    type="number"
                    min="0"
                    value={state.minPrice}
                    onChange={handleNumericChange("minPrice")}
                    placeholder="0"
                    className="w-20 rounded-lg border border-[#123B69]/30 bg-white px-2.5 py-1.5 text-sm text-[#0B2545] outline-none focus:border-[#FFC928]"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="text-[#123B69]">Max ({TAKA})</label>
                  <input
                    type="number"
                    min="0"
                    value={state.maxPrice}
                    onChange={handleNumericChange("maxPrice")}
                    placeholder="No limit"
                    className="w-20 rounded-lg border border-[#123B69]/30 bg-white px-2.5 py-1.5 text-sm text-[#0B2545] outline-none focus:border-[#FFC928]"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-[#0B2545]">Rating</h2>
              <div className="space-y-2">
                {[4, 3, 2, 1].map((rating) => {
                  const active = state.minRating === String(rating);
                  return (
                    <button
                      key={rating}
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          minRating: active ? "" : String(rating),
                          page: 1,
                        }))
                      }
                      aria-pressed={active}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold border border-[#FFC928]"
                          : "text-[#123B69] hover:bg-[#F5F7FA]"
                      }`}
                    >
                      <Star className="h-4 w-4 text-[#FFC928]" fill={active ? "currentColor" : "none"} />
                      <span>{rating} stars &amp; up</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-[#0B2545]">Availability</h2>
              <button
                onClick={() =>
                  setState((prev) => ({ ...prev, inStock: !prev.inStock, page: 1 }))
                }
                aria-pressed={state.inStock}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  state.inStock
                    ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold border border-[#FFC928]"
                    : "text-[#172337] hover:bg-[#F5F7FA]"
                }`}
              >
                <Package className="h-4 w-4" />
                <span>In stock only</span>
                {state.inStock && (
                  <span className="ml-auto text-xs font-semibold text-[#FFC928]">On</span>
                )}
              </button>
            </div>

            {hasActiveFilters && (
              <div className="pt-4 border-t border-[#EAEDED]">
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[#123B69] transition hover:bg-[#F5F7FA]"
                >
                  <X className="h-4 w-4" /> Clear all filters ({activeFilterCount})
                </button>
              </div>
            )}
          </aside>

          <div>
            {error ? (
              <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-[#EF4444]">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-[#991B1B]">{error}</p>
                    <button
                      onClick={fetchProducts}
                      className="mt-2 inline-flex items-center rounded-lg bg-[#123B69] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B2545]"
                    >
                      <ArrowRight className="h-3 w-3 mr-2" /> Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {!error && loading && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAEDED] bg-white px-6 py-16 text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#FFC928]/50 border-t-transparent animate-spin mb-3" />
                <p className="text-sm text-[#123B69]">Loading products...</p>
              </div>
            ) : null}

            {!error && products.length > 0 ? (
              <div
                className={`grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 transition-opacity ${
                  loading ? "opacity-60" : "opacity-100"
                }`}
              >
                {products.map((product) => (
                  <ProductCard key={productKey(product)} product={product} symbol={TAKA} />
                ))}
              </div>
            ) : null}

            {!error && !loading && products.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAEDED] bg-white px-6 py-16 text-center">
                <p className="text-lg font-semibold text-[#0B2545]">
                  No products found. Try another search.
                </p>
                <p className="mt-1 text-sm text-[#123B69]">
                  Try adjusting your search or filters.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center rounded-lg bg-[#123B69] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0B2545]"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : null}

            {totalPages > 1 && (
              <Pagination
                page={state.page}
                totalPages={totalPages}
                total={total}
                className="mt-8"
                onPageChange={(p) =>
                  setState((prev) => ({ ...prev, page: Math.max(1, Math.min(totalPages, p)) }))
                }
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading products...
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}