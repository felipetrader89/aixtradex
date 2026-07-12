import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const IMAGES_DIR = path.join(process.cwd(), "public", "results", "images");
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export type ResultImage = { src: string; file: string };

// Curated for the Home carousel: mid-range profit results (not cents-level,
// not the four-digit outliers) picked by eye from the current batch. The
// full /results page always shows everything, this list only trims the
// homepage teaser.
const HOME_CAROUSEL_FILES = [
  "photo_33_2026-07-11_18-41-42.jpg",
  "photo_32_2026-07-11_18-41-42.jpg",
  "photo_23_2026-07-11_18-41-42.jpg",
  "photo_30_2026-07-11_18-41-42.jpg",
  "photo_26_2026-07-11_18-41-42.jpg",
  "photo_31_2026-07-11_18-41-42.jpg",
  "photo_12_2026-07-11_18-41-42.jpg",
  "photo_25_2026-07-11_18-41-42.jpg",
  "photo_29_2026-07-11_18-41-42.jpg",
  "photo_24_2026-07-11_18-41-42.jpg",
];

function extractIndex(filename: string) {
  const match = filename.match(/_(\d+)_/);
  return match ? Number(match[1]) : 0;
}

export function getResultImages(): ResultImage[] {
  let files: string[];
  try {
    files = fs.readdirSync(IMAGES_DIR).filter((f) => IMAGE_EXT.test(f));
  } catch {
    return [];
  }

  files.sort((a, b) => extractIndex(a) - extractIndex(b));

  const seenHashes = new Set<string>();
  const images: ResultImage[] = [];
  for (const file of files) {
    const hash = crypto
      .createHash("md5")
      .update(fs.readFileSync(path.join(IMAGES_DIR, file)))
      .digest("hex");
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);
    images.push({ src: `/results/images/${file}`, file });
  }
  return images;
}

export function getHomeResultImages(): ResultImage[] {
  const all = getResultImages();
  const byFile = new Map(all.map((img) => [img.file, img]));
  const curated = HOME_CAROUSEL_FILES.map((f) => byFile.get(f)).filter(
    (img): img is ResultImage => Boolean(img)
  );
  return curated.length > 0 ? curated : all.slice(0, 10);
}

export type ResultVideo = { youtubeId: string; title: string };

// Fill in as YouTube Shorts links come in — { youtubeId: "abc123", title: "..." }.
export const RESULT_VIDEOS: ResultVideo[] = [];
