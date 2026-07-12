"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageLightbox } from "./ImageLightbox";

type Props = { images: { src: string }[] };

export function ResultsCarousel({ images }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const items = [...images, ...images];

  return (
    <>
      <div className="results-mask overflow-hidden">
        <div className="results-track flex w-max gap-4">
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
