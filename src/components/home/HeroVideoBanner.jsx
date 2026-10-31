"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";

const VIDEO_URL =
  "https://savedly.net/api/stream/534whkk6?t=0.7Aa8yEceyfjW194nYay6ExJ8ZxE8kNkcyxPsxd5uBv0";

export default function HeroVideoBanner(props) {
  const { stats, symbol = "৳", heroProduct, hasHero } = props;
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadTimeoutRef = useRef(null);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadStart = () => {
      setLoading(true);
      setError(null);
      clearLoadTimeout();
      loadTimeoutRef.current = setTimeout(() => {
        setError("Video is taking too long to load. Please check your connection.");
        setLoading(false);
      }, 20000);
    };

    const onLoadedMetadata = () => {
      clearLoadTimeout();
      setLoading(false);
    };

    const onCanPlay = () => {
      clearLoadTimeout();
      setLoading(false);
    };

    const onError = (e) => {
      clearLoadTimeout();
      const target = e.target;
      const errCode = target && target.error ? target.error.code : null;
      let errMsg = "Video could not be loaded.";
      switch (errCode) {
        case 1:
          errMsg = "Video download was aborted.";
          break;
        case 2:
          errMsg = "Video format is not supported.";
          break;
        case 3:
          errMsg = "Video playback was corrupted.";
          break;
        case 4:
          errMsg = "Video could not be loaded from the server.";
          break;
        default:
          errMsg = "Video playback failed.";
      }
      setError(errMsg);
      setLoading(false);
    };

    video.addEventListener("loadstart", onLoadStart);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);

    return () => {
      clearLoadTimeout();
      video.removeEventListener("loadstart", onLoadStart);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-navy-900 min-h-[420px] sm:min-h-[520px] lg:min-h-[600px]">
      {/* Background video */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        src={VIDEO_URL}
      />

      {/* Subtle dark overlays for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/40 to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy-900/40 to-navy-900" aria-hidden="true" />
      <div className="absolute inset-0 bg-navy-900/35" aria-hidden="true" />

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-navy-900/80 backdrop-blur-sm text-white">
          <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-3">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Video unavailable</h3>
          <p className="text-sm text-navy-300 max-w-xs">{error}</p>
        </div>
      )}

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Left: Branding & CTA */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-600">
              <span className="h-3 w-3 rounded-full bg-blue-600 animate-pulse" />
              New at IDeons
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl text-white">
              Discover Smart Products.
              <span className="block text-blue-400">Better Everyday Living.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-navy-200 sm:text-lg">
              Smart Products. Better Everyday Living. Discover innovative gadgets,
              smart home solutions, practical kitchen tools, and everyday essentials
              designed to make life easier.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-4 text-sm font-bold text-white transition hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Explore Products
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/products?deal=today"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Shop Today's Deals
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Catalogue stats */}
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/20 pt-6">
              <div>
                <dt className="text-xs uppercase tracking-wide text-blue-400">Products</dt>
                <dd className="mt-1 text-2xl font-bold text-white">
                  {stats ? stats.totalProducts : 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-blue-400">Categories</dt>
                <dd className="mt-1 text-2xl font-bold text-white">
                  {stats ? stats.totalCategories : 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-blue-400">Reviews</dt>
                <dd className="mt-1 text-2xl font-bold text-white">
                  {stats ? stats.totalReviews : 0}
                </dd>
              </div>
            </dl>
          </div>

          {/* Right: Hero product highlight */}
          <div className="relative hidden lg:block">
            {hasHero ? (
              <div className="relative rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                <span className="absolute -top-2 -left-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  Featured
                </span>
                <Link href={`/products/${heroProduct.slug || heroProduct._id}`} className="block">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white/5 border border-white/20">
                    {heroProduct.images?.[0] ? (
                      <img
                        src={heroProduct.images[0]}
                        alt={heroProduct.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">{heroProduct.title}</h2>
                      <p className="mt-1 text-sm text-blue-200">{heroProduct.category}</p>
                    </div>
                    <p className="text-xl font-bold text-blue-400">
                      {formatMoney(heroProduct.salePrice ?? heroProduct.price, symbol)}
                    </p>
                  </div>
                  <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
                    View details
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/20 bg-white/10 p-10 text-center backdrop-blur-sm">
                <p className="text-sm text-blue-200">New products are on the way.</p>
                <Link href="/products" className="mt-4 inline-block text-sm font-semibold text-blue-400 hover:underline">
                  Browse the catalogue →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
