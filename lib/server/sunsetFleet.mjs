import details from './sunsetFleetDetails.json' with { type: 'json' };

// Kept server-side: multi-page descriptions and complete galleries must not
// enter the client search/AI intent index through rentalsData or homeData.
export function sunsetDetail(slug) {
  return Object.hasOwn(details, slug) ? details[slug] : null;
}
