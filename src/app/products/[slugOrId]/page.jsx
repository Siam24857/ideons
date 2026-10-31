import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProductByKey, serializeProduct } from "@/lib/products";
import ProductCard from "@/components/ui/ProductCard";
import Rating from "@/components/ui/Rating";
import Price from "@/components/ui/Price";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Buttons";
import { ProductActions } from "@/components/products/ProductActions";

export const dynamic = "force-dynamic";

export default async function ProductDetailsPage({ params }) {
  const { slugOrId } = await params;
  const product = serializeProduct(await getProductByKey(slugOrId));

  if (!product) {
    notFound();
  }

  const symbol = product.currencySymbol || "৳";
  const effectivePrice = product.salePrice ?? product.price;
  const hasDiscount = product.oldPrice && Number(product.oldPrice) > effectivePrice;
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.oldPrice) - effectivePrice) / Number(product.oldPrice)) * 100)
    : 0;

  const relatedProducts = await (async () => {
    const { listProducts } = await import("@/lib/products");
    const result = await listProducts(
      { category: product.categorySlug || product.category },
      { page: 1, limit: 4, sort: "rating" }
    );
    return result.items.filter((p) => p._id !== product._id);
  })();

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-navy-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <LinkButton
            href="/products"
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 text-navy-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" /> Browse all products
          </LinkButton>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-navy-50 shadow-sm">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-navy-300">
                  <span className="text-2xl">📦</span>
                </div>
              )}
              {product.badge && (
                <span className="absolute left-3 top-3 rounded-full bg-blue-500 px-2.5 py-1 text-xs font-semibold text-white">
                  {product.badge}
                </span>
              )}
              {!product.inStock && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/90 text-xs font-bold uppercase tracking-wide text-rose-600">
                  Out of stock
                </span>
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="grid gap-2 grid-cols-4">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt=""
                    className="aspect-square overflow-hidden rounded-xl bg-navy-50 object-cover cursor-pointer hover:border-blue-400 transition"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                {product.category}
                {product.subCategory && ` / ${product.subCategory}`}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950">
                {product.title}
              </h1>
              {product.brand && (
                <p className="mt-1 text-sm text-navy-500">
                  Brand: <span className="font-medium text-navy-900">{product.brand}</span>
                </p>
              )}
            </div>

            {/* Rating & Stock */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Rating value={product.rating} count={product.reviewsCount} size="sm" />
              </div>
              <span className="text-navy-400">|</span>
              <span
                className={`font-medium ${product.inStock ? "text-emerald-600" : "text-rose-600"}`}
              >
                {product.inStock ? "In Stock" : "Out of Stock"}
              </span>
              {product.stock > 0 && product.stock <= 5 && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Only {product.stock} left
                </span>
              )}
            </div>

            {/* Price */}
            <div className="mt-2 flex items-center gap-4">
              <Price value={effectivePrice} regular={hasDiscount ? product.oldPrice : undefined} symbol={symbol} size="lg" />
              {hasDiscount && (
                <Badge tone="brand">-{discountPercent}%</Badge>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="mb-3 text-lg font-bold text-navy-950">Product Description</h2>
              <p className="text-navy-600 leading-7">{product.description}</p>
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-bold text-navy-950">Key Features</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-navy-600">
                      <span className="text-blue-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quantity selector & Actions */}
            <ProductActions
              product={product}
              symbol={symbol}
              effectivePrice={effectivePrice}
            />
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 border-t border-navy-100 pt-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-navy-950">Related products</h2>
                <Link href={`/products?category=${encodeURIComponent(product.categorySlug || product.category)}`} className="text-sm font-semibold text-navy-900 hover:text-blue-600">
                  View all →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {relatedProducts.map((p) => (
                  <ProductCard key={p._id} product={p} symbol={symbol} />
                ))}
              </div>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

