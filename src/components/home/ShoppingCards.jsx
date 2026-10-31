"use client";

import Link from "next/link";
import {
  ArrowRight,
  Flame,
  Home,
  CookingPot,
  TrendingUp,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { formatMoney } from "@/lib/money";

const SHOPPING_CARDS = [
  {
    id: "best-deals",
    title: "Best Deals",
    subtitle: "Hand-picked deals on your favorite products.",
    href: "/products?deal=today",
    cta: "See All Deals",
    icon: Flame,
    iconColor: "text-orange-500",
  },
  {
    id: "smart-home",
    title: "Smart Home Essentials",
    subtitle: "Smart plugs, lights, switches, and home devices.",
    href: "/products?category=smart-home-products",
    cta: "Shop Smart Home",
    icon: Home,
    iconColor: "text-[#123B69]",
  },
  {
    id: "kitchen",
    title: "Kitchen Must-Haves",
    subtitle: "Kitchen gadgets, oil-free cooking products, and food prep tools.",
    href: "/products?category=kitchen-accessories",
    cta: "Shop Kitchen",
    icon: CookingPot,
    iconColor: "text-[#FFC928]",
  },
  {
    id: "trending",
    title: "Trending Products",
    subtitle: "Popular products customers love right now.",
    href: "/products?sort=rating",
    cta: "View Trending",
    icon: TrendingUp,
    iconColor: "text-emerald-500",
  },
];

export default function ShoppingCards({ products = [], symbol = "৳" }) {
  // Match products to cards by category slug/name
  const cardsWithProducts = SHOPPING_CARDS.map((card) => {
    const cardProducts = products.filter((p) => {
      const cat = (p.category || "").toLowerCase();
      const catSlug = (p.categorySlug || "").toLowerCase();
      const subCat = (p.subCategory || "").toLowerCase();

      if (card.id === "smart-home") {
        return (
          cat.includes("smart home") ||
          catSlug.includes("smart-home") ||
          subCat.includes("smart home") ||
          subCat.includes("smart-home")
        );
      }
      if (card.id === "kitchen") {
        return (
          cat.includes("kitchen") ||
          catSlug.includes("kitchen") ||
          subCat.includes("kitchen")
        );
      }
      if (card.id === "trending") {
        return true; // Show all products for trending
      }
      if (card.id === "best-deals") {
        return p.discountPrice && p.discountPrice < p.price;
      }
      return false;
    });
    return { ...card, products: cardProducts.slice(0, 3) };
  });

  // If some cards are empty, distribute remaining products to them
  const allMatched = new Set();
  cardsWithProducts.forEach((card) => {
    card.products.forEach((p) => allMatched.add(p._id));
  });
  const unmatched = products.filter((p) => !allMatched.has(p._id));

  let unmatchedIndex = 0;
  cardsWithProducts.forEach((card) => {
    while (card.products.length < 3 && unmatchedIndex < unmatched.length) {
      card.products.push(unmatched[unmatchedIndex]);
      unmatchedIndex++;
    }
  });

  return (
    <section className="bg-[#EAEDED] py-12">
      <Container>
        {/* Section Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#172337]">
              Shop by Category
            </h2>
            <p className="mt-1 text-sm text-[#667eea]">
              Discover the best products across our categories.
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-[#FFC928] hover:text-[#FFD84D] flex items-center gap-1"
          >
            Browse All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cardsWithProducts.map((card) => (
            <ShoppingCard
              key={card.id}
              card={card}
              products={card.products}
              symbol={symbol}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

function ShoppingCard({ card, products = [], symbol }) {
  return (
    <Link
      href={card.href}
      className="group block rounded-xl border border-[#EAEDED] bg-white p-6 shadow-sm transition hover:border-[#FFC928] hover:shadow-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFC928]/10 text-[#FFC928]">
          <card.icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold text-[#172337]">{products.length} items</span>
      </div>

      <h3 className="text-lg font-bold text-[#172337] mb-2">{card.title}</h3>
      <p className="text-sm text-[#667eea] mb-4">{card.subtitle}</p>

      {/* Product Grid within card */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <div
              key={product._id}
              className="group relative overflow-hidden rounded-lg border border-[#EAEDED] bg-white p-2 transition hover:border-[#FFC928]"
            >
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="h-20 w-full object-cover rounded-md transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="h-20 w-full rounded-md bg-[#EAEDED] flex items-center justify-center text-[#999]">
                  <span className="text-[10px]">📦</span>
                </div>
              )}
              <div className="mt-2">
                <p className="text-xs font-medium text-[#172337] line-clamp-1">
                  {product.title}
                </p>
                <p className="text-xs font-bold text-[#FFC928]">
                  {formatMoney(product.salePrice ?? product.price, symbol)}
                </p>
                {product.discountPrice && product.discountPrice < product.price && (
                  <span className="text-[10px] text-[#FF4D4D] font-bold line-through">
                    {formatMoney(product.price, symbol)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 p-3 rounded-lg border border-dashed border-[#EAEDED] bg-[#EAEDED]/50 text-center">
          <p className="text-xs text-[#667eea]">No products available</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-[#EAEDED]">
        <Link
          href={card.href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFC928] hover:text-[#FFD814]"
        >
          {card.cta}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Link>
  );
}

function Container({ children, className }) {
  return (
    <div className={`mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 ${className || ""}`}>
      {children}
    </div>
  );
}
