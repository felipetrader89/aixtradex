"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageLightbox } from "./ImageLightbox";

type Tab = "images" | "videos";

// 3 rows x 5 columns at desktop width — keeps the initial page light for
// slow connections, since this gallery only grows over time.
const ROWS_PER_PAGE = 3;
const COLS_DESKTOP = 5;
const PAGE_SIZE = ROWS_PER_PAGE * COLS_DESKTOP;

type Props = {
  images: { src: string }[];
  videos: { youtubeId: string; title: string }[];
  labels: {
    images: string;
    videos: string;
    videosEmpty: string;
    showMore: string;
    showLess: string;
  };
};

export function ResultsTabs({ images, videos, labels }: Props) {
  const [tab, setTab] = useState<Tab>("images");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleImages = images.slice(0, visibleCount);

  return (
    <div>
      <div className="mb-8 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setTab("images")}
          className={
            tab === "images"
              ? "rounded-full bg-brand-accent px-6 py-2 text-sm font-semibold text-brand-bg transition-transform hover:scale-[1.02]"
              : "rounded-full border border-brand-hairline px-6 py-2 text-sm font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
          }
        >
          {labels.images}
        </button>
        <button
          type="button"
          onClick={() => setTab("videos")}
          className={
            tab === "videos"
              ? "rounded-full bg-brand-accent px-6 py-2 text-sm font-semibold text-brand-bg transition-transform hover:scale-[1.02]"
              : "rounded-full border border-brand-hairline px-6 py-2 text-sm font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
          }
        >
          {labels.videos}
        </button>
      </div>

      {tab === "images" ? (
        <>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {visibleImages.map((img, i) => (
              <button
                key={img.src}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="hover-card glow-border relative aspect-[9/20] overflow-hidden rounded-xl transition-transform duration-200 hover:scale-[1.03]"
              >
                <Image
                  src={img.src}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
              </button>
            ))}
          </div>

          {(visibleCount < images.length || visibleCount > PAGE_SIZE) && (
            <div className="mt-8 flex justify-center gap-3">
              {visibleCount > PAGE_SIZE && (
                <button
                  type="button"
                  onClick={() => setVisibleCount(PAGE_SIZE)}
                  className="rounded-full border border-brand-hairline px-6 py-2.5 text-sm font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
                >
                  {labels.showLess}
                </button>
              )}
              {visibleCount < images.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, images.length))}
                  className="cta-neon rounded-full bg-brand-surface px-6 py-2.5 text-sm font-semibold text-brand-ink transition-transform hover:scale-[1.02] hover:text-brand-accent"
                >
                  {labels.showMore}
                </button>
              )}
            </div>
          )}
        </>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {videos.map((v) => (
            <div key={v.youtubeId} className="glow-border overflow-hidden rounded-xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${v.youtubeId}`}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-[9/16] w-full"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-brand-ink-dim">{labels.videosEmpty}</p>
      )}

      {tab === "images" && lightboxIndex !== null && (
        <ImageLightbox
          images={visibleImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
