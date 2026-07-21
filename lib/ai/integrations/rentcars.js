// RentCars — car-rental integration (prepared, not live).
//
// Architecture stub per the approved plan: declares capability + intents and
// maps to the in-app rentals route today. When a real RentCars API/affiliate is
// wired, implement search() and set ready = true; the registry does the rest.

export const rentcars = {
  id: 'rentcars',
  name: 'RentCars',
  kind: 'car-rental',
  ready: false,
  route: '/rentals',
  keywords: ['car rental', 'rent a car', 'rental car', 'hire car', 'rentcars'],

  // eslint-disable-next-line no-unused-vars
  async search(params) {
    return {
      ready: false,
      results: [],
      route: this.route,
      note: 'RentCars search is prepared; live results arrive when the API is connected.'
    };
  }
};
