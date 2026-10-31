"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import toast from "react-hot-toast";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    try {
      const result = await api.get("/api/wishlist");
      if (result.ok) {
        setItems(result.data.wishlist?.items || []);
      } else {
        if (result.status === 401) {
          // Not signed in - redirect handled by showing empty state
          setItems([]);
        } else {
          toast.error(errorMessage(result));
        }
      }
    } catch {
      toast.error("Network error while loading wishlist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const removeFromWishlist = async (productId) => {
    try {
      const result = await api.delete(`/api/wishlist?productId=${encodeURIComponent(productId)}`);
      if (result.ok) {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
        toast.success("Removed from wishlist.");
      } else {
        toast.error(errorMessage(result));
      }
    } catch {
      toast.error("Failed to remove from wishlist.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-navy-500">Loading wishlist…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Wishlist</h1>
          <p className="mt-1 text-sm text-navy-500">
            Your saved products ({items.length})
          </p>
        </div>
        <LinkButton href="/products">Browse products</LinkButton>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-navy-100 bg-white p-16 text-center shadow-sm">
          <div className="text-navy-300 text-4xl mb-4">🤍</div>
          <h2 className="text-lg font-semibold text-navy-900">Your wishlist is empty</h2>
          <p className="mt-2 text-sm text-navy-500">
            Save products you love by clicking the heart icon on any product.
          </p>
          <LinkButton href="/products" variant="brand" className="mt-5">
            Start shopping
          </LinkButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.productId}
              href={`/products/${item.productId}`}
              className="group block rounded-xl border border-navy-100 bg-white overflow-hidden hover:border-blue-300 hover:shadow-md transition"
            >
              <div className="relative aspect-square bg-navy-50">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-navy-300">
                    📦
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromWishlist(item.productId);
                  }}
                  className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-blue-500 hover:text-white transition"
                  aria-label="Remove from wishlist"
                >
                  <span className="text-blue-600 group-hover:text-white">✕</span>
                </button>
              </div>
              <div className="px-3 py-3">
                <p className="text-sm font-medium text-navy-950 line-clamp-2">{item.title}</p>
                {item.sku && (
                  <p className="text-xs text-navy-400 mt-1">SKU: {item.sku}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="neutral">Saved</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <LinkButton href="/account">Back to account</LinkButton>
      </div>
    </div>
  );
}

