"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageLightbox } from "./ImageLightbox";

type Props = { images: { src: string }[] };

// One "half" of the marquee track must be wider than any realistic viewport,
// otherwise the -50% loop shows blank space before it catches up (same bug
// and fix as MarketTicker's MIN_ITEMS_PER_HALF). Cards are ~144px + gap-4, so
// 40 items per half covers ultra-wide/4K viewports (~6000px) with margin.
const MIN_ITEMS_PER_HALF = 40;

// Duration is derived from the half's length (not a fixed seconds value) so
// the scroll speed stays constant no matter how many times the images repeat
// to satisfy MIN_ITEMS_PER_HALF above — otherwise a wider track covers the
// same -50% distance in the same fixed time, i.e. it visibly speeds up.
const CARD_WIDTH_PX = 160; // sm:w-36 (144px) + gap-4 (16px)
const PX_PER_SECOND = 35; // slow, readable marquee pace

export function ResultsCarousel({ images }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const repeatsPerHalf = Math.max(1, Math.ceil(MIN_ITEMS_PER_HALF / images.length));
  const half = Array.from({ length: repeatsPerHalf }, () => images).flat();
  const items = [...half, ...half];
  const durationSeconds = (half.length * CARD_WIDTH_PX) / PX_PER_SECOND;

  return (
    <>
      <div className="results-mask overflow-hidden">
        <div
          className="results-track flex w-max gap-4"
          style={{ animationDuration: `${durationSeconds}s` }}
        >
          {items.map((img, i) => (
            <button
              key={`${img.src}-${i}`}
              type="button"
              onClick={() => setLightboxIndex(i % images.length)}
              className="hover-card glow-border shrink-0 overflow-hidden rounded-xl transition-transform duration-200 hover:scale-[1.03]"
            >
              <Image
                src={img.src}
                alt=""
                width={220}
                height={476}
                unoptimized
                className="h-56 w-32 object-cover sm:h-64 sm:w-36"
              />
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
