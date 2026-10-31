import Link from "next/link";
import { Search, Filter, Star, Package } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import Pagination from "@/components/ui/Pagination";
import { SectionHeading } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { listProducts, getCategoriesWithCounts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }) {
  const settings = await getSettings();
  const symbol = settings?.currencySymbol || "৳";

  const page = Number.parseInt(String(searchParams?.page ?? "1"), 10) || 1;
  const limit = Number.parseInt(String(searchParams?.limit ?? "12"), 10) || 12;
  const sort = searchParams?.sort || "newest";
  const search = searchParams?.search || "";
  const category = searchParams?.category || "";
  const minPrice = searchParams?.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPrice = searchParams?.maxPrice ? Number(searchParams.maxPrice) : undefined;
  const minRating = searchParams?.minRating ? Number(searchParams.minRating) : undefined;
  const inStock = searchParams?.inStock === "1" || searchParams?.inStock === "true";

  const [result, categories] = await Promise.all([
    listProducts(
      {
        search: search || undefined,
        category: category || undefined,
        minPrice,
        maxPrice,
        minRating,
        inStock: inStock || undefined,
      },
      { page, limit, sort }
    ),
    getCategoriesWithCounts().catch(() => []),
  ]);

  const { items: products, total, totalPages } = result;

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "rating", label: "Highest Rated" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <section className="border-b border-[#EAEDED] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0B2545] sm:text-3xl">
                All Products
              </h1>
              <p className="mt-1 text-sm text-[#123B69]">
                {total} product{total === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:w-auto">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#123B69]/50" />
                <input
                  type="search"
                  defaultValue={search}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="w-full rounded-lg border border-[#EAEDED] bg-white py-2.5 pl-9 pr-3 text-sm text-[#0B2545] outline-none transition focus:border-[#FFC928] focus:bg-white sm:w-64"
                />
              </div>
              <select
                defaultValue={sort}
                className="rounded-lg border border-[#EAEDED] bg-white px-3 py-2.5 text-sm text-[#0B2545] outline-none transition focus:border-[#FFC928]"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                className="rounded-lg border border-[#EAEDED] bg-white px-3 py-2.5 text-[#0B2545] transition hover:bg-[#F5F7FA] sm:ml-2"
                aria-label="Filters"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block space-y-8">
            <div>
              <h2 className="mb-4 text-lg font-bold text-[#0B2545]">Categories</h2>
              <div className="space-y-2">
                <a
                  href={`/products${search ? `?search=${encodeURIComponent(search)}` : ""}`}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${!category ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#123B69] hover:bg-[#F5F7FA]"}`}
                >
                  All Categories
                </a>
                {categories.map((cat) => (
                  <a
                    key={cat.slug}
                    href={`/products?category=${encodeURIComponent(cat.slug)}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${category === cat.slug ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#123B69] hover:bg-[#F5F7FA]"}`}
                  >
                    {cat.name} <span className="ml-2 text-xs text-[#123B69]/50">({cat.count || 0})</span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-[#0B2545]">Price</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <label className="text-[#123B69]/60">Min</label>
                  <input
                    type="number"
                    defaultValue={minPrice ?? ""}
                    placeholder="0"
                    className="rounded-lg border border-[#EAEDED] bg-white px-2.5 py-1.5 text-sm text-[#0B2545] outline-none focus:border-[#FFC928] w-20"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="text-[#123B69]/60">Max</label>
                  <input
                    type="number"
                    defaultValue={maxPrice ?? ""}
                    placeholder="No limit"
                    className="rounded-lg border border-[#EAEDED] bg-white px-2.5 py-1.5 text-sm text-[#0B2545] outline-none focus:border-[#FFC928] w-20"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-[#0B2545]">Rating</h2>
              <div className="space-y-2">
                {[4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition text-[#123B69]/60 hover:bg-[#F5F7FA]"
                  >
                    <Star className="h-4 w-4" fill="currentColor" />
                    <span>{rating} stars & up</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-[#0B2545]">Availability</h2>
              <button className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition text-[#123B69]/60 hover:bg-[#F5F7FA]">
                <Package className="h-4 w-4" />
                <span>In stock only</span>
              </button>
            </div>
          </aside>

          <div>
            <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.length > 0 ? (
                products.map((product) => (
                  <ProductCard key={product._id} product={product} symbol={symbol} />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAEDED] bg-white px-6 py-16 text-center">
                  <p className="text-lg font-semibold text-[#0B2545]">No products found</p>
                  <p className="mt-1 text-sm text-[#123B69]">
                    Try adjusting your search or filters.
                  </p>
                  {(search || category) && (
                    <Link
                      href="/products"
                      className="mt-4 inline-flex items-center rounded-lg bg-[#0B2545] px-5 py-2.5 text-sm font-semibold text-white transition hover:#0B2545"
                    >
                      Clear filters
                    </Link>
                  )}
                </div>
              )}
            </div>

            <Pagination page={page} totalPages={totalPages} total={total} className="mt-8" />
          </div>
        </div>
      </section>
    </div>
  );
}
