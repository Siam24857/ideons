"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BANNERS = [
  {
    id: "china-imports",
    image: "https://i.postimg.cc/t4y7tbJT/IDeons-China-Imports-Banner.png",
    alt: "IDeons China Imports",
    href: "/products",
  },
  {
    id: "upgrade-life",
    image: "https://i.postimg.cc/LXr8qKGZ/Upgrade-Your-Everyday-Life.png",
    alt: "Upgrade Your Everyday Life",
    href: "/products",
  },
];

export default function BannerSlider() {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState({});
  const [errored, setErrored] = useState({});
  const [paused, setPaused] = useState(false);
  const containerRef = useRef(null);
  const touchStartX = useRef(null);
  const total = BANNERS.length;

  // Autoplay with pause on hover / tab hidden
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex((i) => (i + 1) % total);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [paused, total]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") setPaused(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 50) prev();
    else if (dx < -50) next();
    touchStartX.current = null;
  };

  return (
    <section className="relative w-full bg-white">
      <div
        ref={containerRef}
        className="relative mx-auto max-w-[1440px] overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative aspect-[3/1] w-full bg-[#F5F7FA]">
          {BANNERS.map((b, i) => (
            <div
              key={b.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                i === index ? "opacity-100 translate-x-0 z-10" : "opacity-0 translate-x-4 z-0 pointer-events-none"
              }`}
            >
              {errored[b.id] ? (
                <div className="flex h-full w-full items-center justify-center bg-[#F5F7FA] text-sm text-[#123B69]">
                  Failed to load banner image.
                </div>
              ) : (
                <>
                  {!loaded[b.id] && (
                    <div className="absolute inset-0 animate-pulse bg-[#EAEDED]" />
                  )}
                  <Link href={b.href} className="block h-full w-full">
                    <img
                      src={b.image}
                      alt={b.alt}
                      className="h-full w-full object-contain"
                      loading={i === 0 ? "eager" : "lazy"}
                      onLoad={() => setLoaded((s) => ({ ...s, [b.id]: true }))}
                      onError={() => setErrored((s) => ({ ...s, [b.id]: true }))}
                    />
                  </Link>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white sm:left-4"
          aria-label="Previous banner"
        >
          <ChevronLeft className="h-5 w-5 text-[#123B69]" />
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white sm:right-4"
          aria-label="Next banner"
        >
          <ChevronRight className="h-5 w-5 text-[#123B69]" />
        </button>

        {/* Indicators */}
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? "w-6 bg-[#FFC928]" : "w-2.5 bg-white/70 hover:bg-white"
              }`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
