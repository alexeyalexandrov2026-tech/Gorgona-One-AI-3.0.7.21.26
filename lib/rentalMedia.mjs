// Zero-downtime media URL resolver for migrating public/images/rentals/ (632 MB)
// to Cloudflare R2 (e.g., https://media.gorgona-one.com).
//
// While NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL is unset, returns local paths unchanged
// so all existing static assets and tests remain 100% compatible. Once R2 is
// enabled and synced via scripts/media/migrate-rentals-to-r2.mjs, setting
// NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL transparently switches image delivery to R2.

const SAFE_BASE = /^https:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i;

export function normalizedMediaBase(raw) {
  if (typeof raw !== 'string') return '';
  const clean = raw.trim().replace(/\/+$/, '');
  return SAFE_BASE.test(clean) ? clean : '';
}

export function configuredRentalsMediaBase() {
  const raw = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL : '';
  return normalizedMediaBase(raw);
}

export function rentalMediaUrl(assetPath, base = configuredRentalsMediaBase()) {
  if (typeof assetPath !== 'string' || !assetPath) return assetPath;
  const origin = normalizedMediaBase(base);
  if (!origin) return assetPath;
  if (!assetPath.startsWith('/images/rentals/')) return assetPath;
  return `${origin}${assetPath}`;
}

export function rewriteRentalImages(car, base = configuredRentalsMediaBase()) {
  if (!car || typeof car !== 'object') return car;
  const origin = normalizedMediaBase(base);
  if (!origin) return car;
  return {
    ...car,
    ...(car.image ? { image: rentalMediaUrl(car.image, origin) } : {}),
    ...(car.card ? { card: rentalMediaUrl(car.card, origin) } : {}),
    ...(car.thumbnail ? { thumbnail: rentalMediaUrl(car.thumbnail, origin) } : {}),
    ...(Array.isArray(car.gallery) ? { gallery: car.gallery.map((u) => rentalMediaUrl(u, origin)) } : {}),
    ...(Array.isArray(car.galleryThumbnails)
      ? { galleryThumbnails: car.galleryThumbnails.map((u) => rentalMediaUrl(u, origin)) }
      : {})
  };
}
