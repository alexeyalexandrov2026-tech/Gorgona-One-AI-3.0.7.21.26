// OVAGO — flights integration (prepared, not live).
//
// Architecture stub per the approved plan: declares capability + intents and
// maps to the in-app travel route today. When a real OVAGO API/affiliate is
// wired, implement search() and set ready = true; the registry does the rest.

export const ovago = {
  id: 'ovago',
  name: 'OVAGO',
  kind: 'flights',
  ready: false,
  route: '/travel',
  keywords: ['flight', 'flights', 'fly', 'airfare', 'airline', 'airport'],

  // eslint-disable-next-line no-unused-vars
  async search(params) {
    return {
      ready: false,
      results: [],
      route: this.route,
      note: 'OVAGO flight search is prepared; live results arrive when the API is connected.'
    };
  }
};
