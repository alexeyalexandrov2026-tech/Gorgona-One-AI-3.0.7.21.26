# Restaurants & nightlife: booking hand-off (2026-11-21)

Miami Elio has no booking system. Every venue's main action sends the guest to the
venue's own booking page; Miami Elio never confirms a table.

## Sources

- **Facts** (name, neighborhood, address, price, website, booking link, platform,
  Google Maps link, checked/unchecked): the owner's spreadsheet
  `miami-elio-dining-booking-links.xlsx`, copied verbatim into
  `lib/dining/bookingSheet.mjs`. An empty cell is `null` in the catalogue.
- **MICHELIN**: only distinctions published on guide.michelin.com (Florida 2026
  selection, revealed 2026-05-28; checked 2026-11-21). Every value carries its source URL
  in `lib/dining/editorial.mjs`.
  - Stars: <https://guide.michelin.com/us/en/article/michelin-guide-ceremony/every-michelin-starred-restaurant-in-florida-for-2026-and-the-year-s-key-trends-copy1>
  - Bib Gourmand: <https://guide.michelin.com/us/en/article/michelin-guide-ceremony/florida-s-most-affordable-restaurants-in-2026-copy1>
  - Green Star (Los Félix): <https://guide.michelin.com/us/en/article/sustainable-gastronomy/sustainable-dining-one-star-green-star-los-felix-miami-florida>
  - Stubborn Seed's Green Star appears in tourism and press sources but not on a
    guide.michelin.com page we could read, so it is **not** shown.
- **Vibe, Art Basel, Date night, Concierge picks**: editorial tags (our judgement),
  in `lib/dining/editorial.mjs`, for the owner to correct before merge.
- **Budget, Sunset, MICHELIN collections**: derived, never assigned by hand —
  Budget = price `$` or `$$` in the sheet; Sunset = rooftop, waterfront or beach club;
  MICHELIN = any MICHELIN value.

## Rules

- Main button: booking page when the sheet marks the link checked (`verified = yes`),
  otherwise "Open in Google Maps ↗". Unchecked links stay in the data
  (`bookingUrlUnverified`) and are never shown.
- The platform comes from the link's exact host, not from the sheet's platform column.
  Naoe's link is on naoemiami.com, so it is "Book on the restaurant's site" although the
  sheet says Tock.
- No affiliate parameters; links are copied as given (OpenTable's `ot_source`,
  SevenRooms' `tracking=website` are the venues' own).
- No platform logo files (trademarks): the platform is named in the button text.
- New venues have no licensed photos yet; cards show a typographic header instead.
- "Popular this week" is not shown: there is no popularity data. Only the editorial
  "Concierge picks" strip, labelled as an editorial choice.

## Every venue

| Venue | Sheet | Main action | Price | MICHELIN | Vibe | Collections | Pick |
|---|---|---|---|---|---|---|---|
| Komodo | existing | SevenRooms |  |  | party |  |  |
| Papi Steak | existing | SevenRooms |  |  | party |  |  |
| Sexy Fish | existing | SevenRooms |  |  | party |  |  |
| Carbone | existing | Resy |  |  |  | art-basel |  |
| Prime 112 | existing | Google Maps |  |  | business |  |  |
| Joe's Stone Crab | existing | OpenTable | $$$-$$$$ |  | family |  | yes |
| LIV | existing | Discotech |  |  | party |  |  |
| E11EVEN | existing | Google Maps |  |  | party |  |  |
| Club Space | existing | venue site |  |  | party |  |  |
| Rosa Sky | existing | venue site |  |  | romantic | sunset | yes |
| Sugar Rooftop | existing | SevenRooms |  |  | party | sunset |  |
| Mandolin Aegean Bistro | existing | Resy | $$$-$$$$ | bib | romantic | art-basel, date-night, michelin | yes |
| Versailles | existing | Google Maps |  |  | family |  |  |
| Rusty Pelican | existing | Google Maps |  |  | family | sunset |  |
| COTE Miami | existing | Resy | $$$$ | 1star | business | art-basel, michelin | yes |
| LPM Restaurant & Bar | existing | SevenRooms | $$$$ |  | business |  |  |
| MILA | existing | OpenTable |  |  | party | sunset |  |
| Nikki Beach Miami Beach | existing | Resy |  |  | party | sunset |  |
| Michael's Genuine Food & Drink | existing | OpenTable |  | bib | family | art-basel, michelin |  |
| Glass & Vine | existing | SevenRooms |  |  | romantic | date-night |  |
| Makoto | existing | OpenTable | $$$-$$$$ |  | business |  |  |
| The Surf Club Restaurant | existing | Resy | $$$$ | 1star | romantic, business | date-night, michelin |  |
| Fontana | existing | Google Maps |  |  | romantic | date-night |  |
| Il Mulino New York | existing | OpenTable |  |  | business | sunset |  |
| DOYA | existing | SevenRooms |  |  |  | art-basel |  |
| Ball & Chain | existing | SevenRooms |  |  | party |  |  |
| Midline Miami | existing | Tablelist |  |  | party |  |  |
| L'Atelier de Joël Robuchon | new | SevenRooms | $$$$ | 2star | romantic | art-basel, michelin | yes |
| Le Jardinier | new | SevenRooms | $$$$ | 1star | romantic | art-basel, date-night, michelin |  |
| Elcielo | new | OpenTable | $$$$ | 1star | business | michelin |  |
| Hiden | new | Google Maps | $$$$ | 1star |  | art-basel, michelin |  |
| Boia De | new | Resy | $$$-$$$$ | 1star | romantic | date-night, michelin | yes |
| Stubborn Seed | new | SevenRooms |  | 1star |  | michelin |  |
| Shingo | new | SevenRooms | $$$$ | 1star |  | michelin |  |
| Los Félix | new | OpenTable | $$$ | 1star + green | romantic | date-night, michelin |  |
| Ogawa | new | Google Maps | $$$$ | 1star |  | michelin |  |
| Ariete | new | SevenRooms | $$$$ | 1star | romantic | date-night, michelin |  |
| Mutra | new | Resy | $$$$ | 1star |  | michelin |  |
| Palma | new | Resy | $$$ |  | romantic |  |  |
| Recoveco | new | SevenRooms | $$$-$$$$ |  |  |  |  |
| Sunny's | new | Resy | $$$$ |  |  |  |  |
| Klaw | new | SevenRooms | $$$$ |  | business |  |  |
| Osaka | new | OpenTable | $$$-$$$$ |  | business |  |  |
| Nuna | new | OpenTable | $$$$ |  |  |  |  |
| Mottai | new | OpenTable | $$$$ |  | business |  |  |
| Tokyo Tuna | new | Resy | $$ |  | family | budget |  |
| Zitz Sum | new | OpenTable | $$$ | bib | family | michelin |  |
| Barra Callao | new | OpenTable | $$$ | bib |  | michelin |  |
| Naoe | new | venue site | $$$$ |  |  |  |  |
| Mother Wolf | new | Resy |  |  |  | art-basel |  |
| Macchialina | new | Resy |  |  | romantic | date-night |  |
| ViceVersa | new | Resy | $$$ |  |  |  |  |
| Torno Subito | new | Resy | $$$ |  |  | art-basel |  |
| Luca Osteria | new | OpenTable | $$$-$$$$ |  | romantic | date-night |  |
| Amara at Paraiso | new | OpenTable | $$$$ |  | romantic | date-night |  |
| Cafe La Trova | new | OpenTable | $$$-$$$$ |  |  |  |  |
| Fooq's | new | SevenRooms | $$$ |  |  |  |  |
| Niu Kitchen | new | Google Maps | $$$-$$$$ |  |  |  |  |
| Rice Mediterranean Kitchen | new | Google Maps | $ |  | family | budget |  |
| Bouchon Bistro | new | Resy | $$$$ |  | romantic | date-night |  |
| La Natural | new | Resy | $$$ | bib |  | michelin |  |
| Watr at the 1 | new | SevenRooms |  |  | party | sunset |  |
| Catch Miami Beach | new | SevenRooms |  |  |  |  |  |
| Serena Rooftop | new | SevenRooms |  |  | party | sunset |  |
| Roof at Esmé | new | OpenTable |  |  |  | sunset |  |
| Level 6 | new | OpenTable |  |  |  | sunset |  |
| Strawberry Moon | new | Google Maps |  |  | party | sunset |  |
| Floyd | new | DICE |  |  | party |  |  |
| Twist | new | Google Maps |  |  | party |  |  |
| El Rey de las Fritas | new | Google Maps | $ |  | family | budget |  |
| Clive's Cafe | new | Google Maps | $ |  | family | budget |  |
| Frankie & Wally's | new | Google Maps | $$ |  | family | budget |  |
| El Bagel | new | Google Maps |  |  | family |  |  |
| Apocalypse BBQ | new | Google Maps | $$ |  | family | budget |  |
| Bombay Darbar | new | Google Maps | $$ |  | family | budget |  |
