// Lighter copies of the site's own photos.
//
// scripts/images/build-variants.mjs writes WebP copies of the JPEG and PNG
// files in public/images at a few widths and records each original's width in
// lib/imageManifest.js. responsiveImage() turns an image address into the
// attributes that let the browser pick the smallest copy that fits.
//
// The original file stays the `src`, so anything that reads only `src`
// (old browsers, share cards, the database) is unaffected. Addresses that are
// not in the manifest - Unsplash, partner uploads - pass through unchanged.
import manifest from './imageManifest.js';

export const VARIANT_WIDTHS = [480, 960, 1600];

// The widths a photo of this width is copied at. Never larger than the
// original, and no copy almost as large as the next one up.
export function variantWidths(width) {
  const top = Math.min(width, VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]);
  return [...VARIANT_WIDTHS.filter((candidate) => candidate < top * 0.85), top];
}

// '/images/rentals/urus/cover.jpg', 480 -> '/images/v/rentals/urus/cover-480.webp'
export function variantPath(src, width) {
  return src.replace(/^\/images\//, '/images/v/').replace(/\.(jpe?g|png)$/i, `-${width}.webp`);
}

// `sizes` is the width the photo is shown at, in the usual HTML form.
export function responsiveImage(src, sizes, sources = manifest) {
  const width = typeof src === 'string' && Object.hasOwn(sources, src) ? sources[src] : 0;
  if (!width) return { src };
  return {
    src,
    srcSet: variantWidths(width).map((w) => `${variantPath(src, w)} ${w}w`).join(', '),
    sizes
  };
}
