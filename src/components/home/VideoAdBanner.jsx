"use client";

import { useState } from "react";
import Link from "next/link";

// Google Drive file ID extracted from the sharing URL.
const DRIVE_FILE_ID = "1gLV5i795GeEXSfRjKmGlon9DXe0-I2PS";
// Official Google Drive preview/embed player URL (reliable for playback).
const DRIVE_PREVIEW_URL = `https://drive.google.com/file/d/${DRIVE_FILE_ID}/preview`;

export default function VideoAdBanner() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-[#EAEDED] bg-white shadow-sm">
        <div className="grid gap-0 md:grid-cols-[55%_45%]">
          {/* Video player (Google Drive preview iframe) */}
          <div className="relative bg-black">
            {error ? (
              <div className="flex aspect-video items-center justify-center bg-[#0B2545] text-white">
                <p className="px-4 text-center text-sm">
                  Video could not be loaded. Please check the video source or permissions.
                </p>
              </div>
            ) : (
              <>
                <iframe
                  src={DRIVE_PREVIEW_URL}
                  title="IDeons promotional video"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full border-0"
                  onLoad={() => setLoaded(true)}
                  onError={() => setError(true)}
                />
                {!loaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0B2545]/80 text-white">
                    <p className="text-sm">Loading video…</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Promotional content */}
          <div className="flex flex-col justify-center bg-[#F5F7FA] p-6 sm:p-8">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#FFC928]/30 bg-[#FFC928]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FFC928]">
              IDeons Ad
            </span>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-[#0B2545] sm:text-3xl">
              Discover Smart Products for Everyday Life
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#FFC928]">
              Smart Products. Better Everyday Living.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#172337]">
              Explore innovative gadgets, smart home solutions, kitchen essentials,
              and useful everyday products at IDeons.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-[#FFC928] px-6 py-3 text-sm font-bold text-[#123B69] transition hover:bg-[#FFD84D] hover:shadow-lg"
            >
              Shop Now
            </Link>
            <p className="mt-4 text-xs text-[#123B69]/60">
              Video controls are provided by the embedded Google Drive player.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
