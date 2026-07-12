"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";

type Props = {
  images: { src: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function ImageLightbox({ images, index, onClose, onNavigate }: Props) {
  const goPrev = useCallback(
    () => onNavigate((index - 1 + images.length) % images.length),
    [index, images.length, onNavigate]
  );
  const goNext = useCallback(
    () => onNavigate((index + 1) % images.length),
    [index, images.length, onNavigate]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  const current = images[index];
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-xl text-white transition-colors hover:border-brand-accent hover:text-brand-accent"
      >
        ×
      </button>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Anterior"
          className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-xl text-white transition-colors hover:border-brand-accent hover:text-brand-accent sm:left-6"
        >
          ‹
        </button>
      )}

      <div
        className="relative flex max-h-[85vh] w-full max-w-sm items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={current.src}
          alt=""
          width={720}
          height={1560}
          unoptimized
          className="max-h-[85vh] w-auto rounded-xl object-contain"
        />
      </div>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Próximo"
          className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-xl text-white transition-colors hover:border-brand-accent hover:text-brand-accent sm:right-6"
        >
          ›
        </button>
      )}
    </div>
  );
}
