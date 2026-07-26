import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const IMAGES_DIR = path.join(process.cwd(), "public", "results", "images");
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export type ResultImage = { src: string; file: string };

// How many of the newest /results screenshots to show in the Home teaser.
const HOME_CAROUSEL_COUNT = 15;

function extractIndex(filename: string) {
  const match = filename.match(/_(\d+)_/);
  return match ? Number(match[1]) : 0;
}

// Capture date embedded in the filename (e.g. "photo_2026-07-15_11-19-10.jpg").
// We deliberately don't use filesystem mtime here — git checkout resets
// mtimes on every Vercel deploy, so it can't tell recent uploads apart in
// production even though it works fine on a local machine.
function extractDateKey(filename: string) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
  return match ? `${match[1]}_${match[2]}` : "";
}

export function getResultImages(): ResultImage[] {
  let files: string[];
  try {
    files = fs.readdirSync(IMAGES_DIR).filter((f) => IMAGE_EXT.test(f));
  } catch {
    return [];
  }

  // Newest capture date first. Files sharing the same date (the original
  // bulk batch, all stamped with the same export timestamp) fall back to
  // their "_N_" index so that batch's relative order stays stable.
  files.sort((a, b) => {
    const dateA = extractDateKey(a);
    const dateB = extractDateKey(b);
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;
    return extractIndex(a) - extractIndex(b);
  });

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
  return getResultImages().slice(0, HOME_CAROUSEL_COUNT);
}

export type ResultVideo = { youtubeId: string; title: string };

// Fill in as YouTube Shorts links come in — { youtubeId: "abc123", title: "..." }.
export const RESULT_VIDEOS: ResultVideo[] = [];
