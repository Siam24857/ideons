"use client";

import Link from "next/link";
import { Heart, ShoppingCart, PackageX } from "lucide-react";
import toast from "react-hot-toast";
import Price from "@/components/ui/Price";
import Rating from "@/components/ui/Rating";
import { Badge } from "@/components/ui/Badge";
import { useStore } from "@/components/providers/StoreProvider";

/**
 * The product card used on the homepage, catalogue, wishlist and related
 * sections. Add-to-cart and wishlist actions call the real APIs and only
 * report success afterwards.
 */
export default function ProductCard({ product, symbol = "৳", loading = false }) {
  const { addToCart, toggleWishlist, isWishlistSaved, busy } = useStore();

  if (!product) return null;

  const href = `/products/${product.slug || product._id}`;
  const saved = isWishlistSaved(product._id);
  const outOfStock = !(product.inStock ?? product.stock > 0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (outOfStock) {
      toast.error("This product is out of stock");
      return;
    }
    await addToCart({ productId: product._id, quantity: 1 });
  };

  const handleWishlist = async (event) => {
    event.preventDefault();
    await toggleWishlist(product._id, saved);
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-navy-100 bg-white">
        <div className="skeleton aspect-square w-full" />
        <div className="space-y-2 p-4">
          <div className="skeleton h-3 w-1/3 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-5 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  const image = product.images?.[0];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-navy-100 bg-white transition hover:border-navy-200 hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative aspect-square overflow-hidden bg-navy-50">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-navy-300">
              <PackageX className="h-10 w-10" />
            </div>
          )}

          {product.badge && (
            <span className="absolute left-2 top-2 rounded bg-navy-950 px-2 py-1 text-[11px] font-semibold text-white">
              {product.badge}
            </span>
          )}
          {outOfStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-bold uppercase tracking-wide text-rose-600">
              Out of stock
            </span>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={handleWishlist}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        aria-pressed={saved}
        className={`absolute right-2 top-2 rounded-full border bg-white p-2 shadow-sm transition hover:border-rose-300 ${
          saved ? "border-rose-200 text-rose-500" : "border-navy-100 text-navy-500 hover:text-rose-500"
        }`}
      >
        <Heart className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
      </button>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[11px] uppercase tracking-wide text-navy-400">
          {product.category}
        </p>

        <Link href={href} className="mt-1">
          <h3 className="line-clamp-2 min-h-[36px] text-sm font-semibold leading-5 text-navy-950 hover:text-blue-600">
            {product.title}
          </h3>
        </Link>

        <div className="mt-1.5">
          <Rating value={product.rating} count={product.reviewsCount} />
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <Price value={product.salePrice ?? product.price} regular={product.oldPrice ?? product.price} symbol={symbol} size="sm" />
          {product.stock > 0 && product.stock <= 5 && (
            <Badge tone="warning">Only {product.stock} left</Badge>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || outOfStock}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-200"
        >
          <ShoppingCart className="h-4 w-4" />
          {outOfStock ? "Unavailable" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

