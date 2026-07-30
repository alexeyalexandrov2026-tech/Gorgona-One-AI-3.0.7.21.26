// Shown on a category view that has no dated listings yet. The section carries
// no invented afisha, so this is the normal state for most categories rather
// than an error - it reads as an editorial note and points at the marketplaces
// that do have the calendar.
export function EventsEmptyState({ label, hasProviders }) {
  return (
    <div className="mt-16 border-t border-villa-obsidian/15 pt-14">
      <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
        Programme
      </p>
      <h3 className="mt-5 max-w-2xl font-serif text-2xl italic leading-snug text-villa-obsidian sm:text-3xl">
        {label ? `No dated ${label} listings published yet.` : 'No dated listings published yet.'}
      </h3>
      <p className="mt-5 max-w-xl text-sm leading-relaxed text-villa-graphite">
        A seat appears here only once it is confirmed with a provider.{' '}
        {hasProviders
          ? 'Until then, the marketplaces below carry the full calendar for this category.'
          : 'Choose a category above to see the marketplaces selling for it.'}
      </p>
    </div>
  );
}
