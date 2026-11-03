"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { formatMoney } from "@/lib/money";

/**
 * Hero promotional carousel component.
 * Displays multiple slides with automatic cycling, navigation arrows,
 * and pagination dots. Each slide promotes a category or sale.
 * Features the main product (e.g., Mosquito Killer Lamp) prominently.
 */

const HERO_SLIDES = [
  {
    id: "smart-tech",
    title: "Upgrade Your Everyday Living",
    subtitle: "Discover smart technology gadgets that solve real problems.",
    category: "Technology Gadgets",
    href: "/products?category=technology-gadgets",
    cta: "Shop Tech",
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80",
  },
  {
    id: "smart-home",
    title: "Smart Home, Smarter Life",
    subtitle: "Explore innovative home solutions for modern living.",
    category: "Smart Home Products",
    href: "/products?category=smart-home-products",
    cta: "Shop Smart Home",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2xnUAKIgg5Dv3APdsH-USigHEyTHJcJbeO3f3G617SnjGTf4RNTJ3i748&s=10",
  },
  {
    id: "kitchen",
    title: "Kitchen Essentials at Amazing Prices",
    subtitle: "Practical kitchen products that make everyday cooking easier.",
    category: "Kitchen Accessories",
    href: "/products?category=kitchen-accessories",
    cta: "Shop Kitchen",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8kVatAEPNX1oF_LBhqWRq9JPW9MQnc7QPrZbUrMAfaQ&s=10",
  },
  {
    id: "household",
    title: "Household Essentials",
    subtitle: "Reliable everyday products for a better home.",
    category: "Household Essentials",
    href: "/products?category=household-essentials",
    cta: "Shop Essentials",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqY0b9H06tVJscYqUjgpp9Fv7Z1rL2KocnjHfXD9j6dw&s=10",
  },
  {
    id: "lifestyle",
    title: "Innovative Lifestyle Products",
    subtitle: "Discover smarter ways to live with innovative products.",
    category: "Innovative Lifestyle Products",
    href: "/products?category=innovative-lifestyle-products",
    cta: "Shop Lifestyle",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyJadMhkBFBJ7JykwJ_wJdxTj1cnlsA6PWpV4PLxI5TA&s=10",
  },
];

export default function HeroCarousel({
  featuredProduct,
  hasHero = false,
  symbol = "৳",
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  const totalSlides = HERO_SLIDES.length;

  // Auto-advance slides every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, totalSlides]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  return (
    <section className="relative w-full overflow-hidden bg-white">
      <Container>
        {/* ============================ MAIN HERO FEATURED PRODUCT ============================ */}
        {hasHero && featuredProduct && (
          <section className="relative overflow-hidden bg-[#FFF] py-12 lg:py-20">
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
                {/* Left: Product Information */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#FFC928]/30 bg-[#FFC928]/10 px-4 py-1.5 text-xs font-semibold text-[#FFC928] uppercase tracking-wide">
                    Featured Product
                  </div>

                  <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl text-[#123B69]">
                    Enjoy a Mosquito-Free Home
                  </h1>

                  <p className="mt-4 max-w-xl text-base leading-7 text-[#172337] sm:text-lg">
                    Smart protection for your everyday comfort. USB UV Mosquito
                    Killer Lamp keeps your home free from mosquitoes with safe,
                    chemical-free UV technology.
                  </p>

                  <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Link
                      href={`/products/${featuredProduct.slug || featuredProduct._id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFC928] px-7 py-4 text-sm font-bold text-[#123B69] transition hover:bg-[#FFD84D] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFC928]/50"
                    >
                      Buy Now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/products/${featuredProduct.slug || featuredProduct._id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFC928] px-7 py-4 text-sm font-bold text-[#123B69] transition hover:bg-[#FFB84D]/10 focus:outline-none focus:ring-2 focus:ring-[#FFC928]/50"
                    >
                      View Details
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {/* Trust Badges */}
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    {[
                      { icon: "USB", text: "USB Powered" },
                      { icon: "Home", text: "Home Use" },
                    ].map((badge, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-[#EAEDED] bg-white p-3">
                        <span className="w-6 h-6 rounded bg-[#FFC928] text-[#123B69] flex items-center justify-center text-xs font-bold">
                          {badge.icon}
                        </span>
                        <span className="text-sm font-medium text-[#172337]">{badge.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFC928]/10 text-[#FFC928] text-xs font-bold px-2 py-0.5">
                      In Stock
                    </span>
                    <span className="text-sm text-[#172337]">
                      {formatMoney(featuredProduct.salePrice ?? featuredProduct.price, symbol)}
                    </span>
                  </div>
                </div>

                {/* Right: Product Image */}
                <div className="relative h-[320px] w-full max-w-[400px] rounded-xl overflow-hidden shadow-2xl border border-[#EAEDED]">
                  {featuredProduct.images?.[0] ? (
                    <img
                      src={featuredProduct.images[0]}
                      alt={featuredProduct.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full rounded-xl bg-[#EAEDED] flex items-center justify-center text-[#999]">
                      <span className="text-2xl">🦟</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Secondary Carousel Slides */}
        <section className="relative overflow-hidden">
          <Container>
            <div
              className={`relative h-[320px] overflow-hidden rounded-xl border border-[#EAEDED] group`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {HERO_SLIDES.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ease-in-out ${
                    index === currentIndex
                      ? "opacity-100 z-10"
                      : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <div className="flex h-full w-full items-center justify-center gap-8 px-4 lg:px-0">
                    {/* Left: Content */}
                    <div className="max-w-[55%]">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#FFC928]/30 bg-[#FFC928]/10 px-3 py-1 text-xs font-semibold text-[#FFC928] uppercase tracking-wide">
                        {slide.category}
                      </div>

                      <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#123B69] sm:text-4xl lg:text-5xl">
                        {slide.title}
                      </h2>

                      <p className="mt-4 max-w-md text-lg leading-7 text-[#172337]">
                        {slide.subtitle}
                      </p>

                      <div className="mt-8">
                        <Link
                          href={slide.href}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFC928] px-6 py-3 text-sm font-bold text-[#123B69] transition hover:bg-[#FFD84D] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFC928]/50"
                        >
                          {slide.cta}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Right: Product Image */}
                    <div className="hidden lg:block flex-1">
                      <div className="relative h-[280px] w-full max-w-[360px] rounded-xl overflow-hidden shadow-2xl border border-[#EAEDED]/50">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
              <button
                onClick={prevSlide}
                className="pointer-events-auto z-20 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white transition"
                aria-label="Previous slide"
              >
                <ArrowLeft className="h-6 w-6 text-[#123B69]" />
              </button>
              <button
                onClick={nextSlide}
                className="pointer-events-auto z-20 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white transition"
                aria-label="Next slide"
              >
                <ArrowRight className="h-6 w-6 text-[#123B69]" />
              </button>
            </div>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {HERO_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    index === currentIndex ? "bg-[#FFC928]" : "bg-[#EAEDED]"
                  }`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </Container>
        </section>
      </Container>
    </section>
  );
}

function Container({ children, className }) {
  return (
    <div className={`mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 ${className || ""}`}>
      {children}
    </div>
  );
}
