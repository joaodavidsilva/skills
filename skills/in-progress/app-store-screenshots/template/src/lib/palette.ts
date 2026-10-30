// The colours a screenshot is made of, so a generated backdrop matches the app it
// sits behind instead of the deck theme. Counted, not averaged: averaging a dark
// screen with amber buttons gives a brown that is in none of its pixels.

export type ImagePalette = {
  /** The colour most of the image is made of. */
  base: string;
  /** The most common clearly coloured shade, or null for a grey screenshot. */
  accent: string | null;
};

/** Bucket width per channel: coarse enough that a gradient collapses into its shade. */
const BUCKET = 24;
/** An accent must be at least this saturated and this light, so greys and shadows never qualify. */
const MIN_SATURATION = 0.45;
const MIN_VALUE = 0.45;

type Bucket = { n: number; r: number; g: number; b: number };

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

function saturationAndValue(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return { saturation: max === 0 ? 0 : (max - min) / max, value: max / 255 };
}

/** RGBA pixels (as `getImageData` returns them) to their base and accent colours. */
export function dominantPalette(data: Uint8ClampedArray): ImagePalette | null {
  const buckets = new Map<number, Bucket>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r / BUCKET) | 0) * 10_000 + ((g / BUCKET) | 0) * 100 + ((b / BUCKET) | 0);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  if (buckets.size === 0) return null;

  // The colour a bucket stands for is the mean of the pixels inside it, so the
  // answer is a shade that is really in the image.
  const colour = (bucket: Bucket) =>
    `#${hex(bucket.r / bucket.n)}${hex(bucket.g / bucket.n)}${hex(bucket.b / bucket.n)}`.toUpperCase();

  let base: Bucket | null = null;
  let accent: Bucket | null = null;
  for (const bucket of buckets.values()) {
    if (!base || bucket.n > base.n) base = bucket;
    const { saturation, value } = saturationAndValue(bucket.r / bucket.n, bucket.g / bucket.n, bucket.b / bucket.n);
    if (saturation >= MIN_SATURATION && value >= MIN_VALUE && (!accent || bucket.n > accent.n)) accent = bucket;
  }
  return base ? { base: colour(base), accent: accent ? colour(accent) : null } : null;
}

/** The palette of an image the editor has already loaded (a path or a data URL). Null when it cannot be read. */
export async function paletteOfImage(src: string): Promise<ImagePalette | null> {
  if (!src) return null;
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    const width = 64;
    const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, width, height);
    return dominantPalette(ctx.getImageData(0, 0, width, height).data);
  } catch {
    return null;
  }
}
