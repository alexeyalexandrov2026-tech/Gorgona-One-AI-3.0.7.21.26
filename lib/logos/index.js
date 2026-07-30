import { logoRegistry } from './manifest';
import { EVENT_CATEGORIES, LEAGUES } from '../mockEventsData';

export const LOGO_DIR = '/logos';
export const FALLBACK_LOGO = '/images/brands/placeholder.svg';

// slug -> logo path, built once from the manifest. Any entity without a
// resolvable domain (or without a matching file on disk, handled by the
// <Logo> component's fallback) falls back to FALLBACK_LOGO.
const slugToLogoPath = logoRegistry.reduce((map, entry) => {
  if (entry.domain) {
    map[entry.slug] = `${LOGO_DIR}/${entry.filename}`;
  }
  return map;
}, {});

// The leagues ship official emblems with the build (public/images/events/
// leagues), so prefer those over a domain-derived path that may have no file
// behind it. League slugs match their category slugs, and are distinct from
// every store/sportsbook slug.
const leagueSlugs = new Set(LEAGUES.map((league) => league.slug));
const leagueEmblems = EVENT_CATEGORIES.reduce((map, category) => {
  if (category.logo && leagueSlugs.has(category.slug)) {
    map[category.slug] = category.logo;
  }
  return map;
}, {});

export function getLogoPath(slug) {
  return leagueEmblems[slug] || slugToLogoPath[slug] || FALLBACK_LOGO;
}
