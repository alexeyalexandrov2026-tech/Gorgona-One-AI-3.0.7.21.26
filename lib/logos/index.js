import { logoRegistry } from './manifest';

export const LOGO_DIR = '/logos';
export const FALLBACK_LOGO = '/images/brands/placeholder.svg';

// slug -> logo path, built once from the manifest. Any entity without a
// resolvable domain (or without a matching file on disk, handled by the
// <Logo> component's onError fallback) falls back to FALLBACK_LOGO.
const slugToLogoPath = logoRegistry.reduce((map, entry) => {
  if (entry.domain) {
    map[entry.slug] = `${LOGO_DIR}/${entry.filename}`;
  }
  return map;
}, {});

export function getLogoPath(slug) {
  return slugToLogoPath[slug] || FALLBACK_LOGO;
}
