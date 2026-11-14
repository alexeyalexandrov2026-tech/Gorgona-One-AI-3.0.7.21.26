import { LEAGUES, TEAMS, PROVIDERS } from '../mockEventsData';

function domainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function buildRegistry() {
  const registry = [];
  const seen = new Set();

  function register(type, slug, name, website) {
    if (!slug) return;
    const key = `${type}:${slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    const domain = domainFromUrl(website);
    registry.push({
      type,
      slug,
      name,
      domain,
      filename: domain ? `${domain}.png` : null,
    });
  }

  LEAGUES.forEach((league) => register('league', league.slug, league.name, league.website));
  TEAMS.forEach((team) => register('team', team.slug, team.name, team.website));
  PROVIDERS.forEach((provider) => register('provider', provider.slug, provider.name, provider.website));
  // Events don't have their own domain/logo - they render the league, team,
  // or artist/provider logo instead (see EventCard), so no event entries here.

  return registry;
}

// Every league, team, and ticket
// provider currently in the project, each resolved to the domain (and
// therefore logo filename) it maps to. Nothing here is invented: it is
// derived directly from
// lib/eventsData.js, so adding/removing an entity there updates this list too.
export const logoRegistry = buildRegistry();
