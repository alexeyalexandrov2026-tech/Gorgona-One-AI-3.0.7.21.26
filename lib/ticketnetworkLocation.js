// A fixed editorial starting area, never the visitor's device location.
// Include the surrounding venue cities so local NHL/NFL and live shows remain
// discoverable even when their address is outside the City of Miami.
export const MIAMI_AREA_CITIES = [
  'Miami', 'Miami Beach', 'Miami Gardens', 'Coral Gables', 'Hialeah',
  'Homestead', 'Key Biscayne', 'Doral', 'Fort Lauderdale', 'Ft Lauderdale',
  'Sunrise', 'Hollywood', 'Dania Beach', 'Davie', 'Miramar', 'Pembroke Pines',
  'Pompano Beach', 'Deerfield Beach', 'Boca Raton', 'Delray Beach',
  'Boynton Beach', 'West Palm Beach', 'Palm Beach Gardens'
];

export const TICKETNETWORK_AREAS = [
  { value: 'miami', label: 'Miami & South Florida', filter: ` and stateProvince/text/abbr eq 'FL' and city/text/name in (${MIAMI_AREA_CITIES.map(city => `'${city}'`).join(',')})` },
  { value: 'florida', label: 'All Florida', filter: " and stateProvince/text/abbr eq 'FL'" },
  { value: 'all', label: 'All cities', filter: '' }
];
