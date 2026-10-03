import { ListingCard } from './g1/ui';

// Dining and nightlife venue card, shared by /stores/restaurants and
// /restaurants-nightlife so the two lists never drift apart.
export function VenueCard({ venue, t }) {
  const kind = venue.category === 'restaurant' ? t.restaurantsNightlife.restaurants : t.restaurantsNightlife.nightlife;
  return (
    <ListingCard
      href={`/restaurants-nightlife/${venue.slug}`}
      img={venue.image}
      alt={venue.name}
      title={venue.name}
      meta={`${kind} · ${venue.location}`}
      note={venue.description}
      rate={t.common.viewDetails}
    />
  );
}
