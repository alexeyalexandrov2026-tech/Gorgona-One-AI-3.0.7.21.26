import { getTicketProvidersWithLogos } from '../../lib/mockEventsData';
import { getTicketNetworkFallback } from '../../lib/ticketnetwork';

// Wall of ticket aggregators shown on a single subcategory page (NFL,
// Pop & Rock, ...). Logos rest in monochrome and ease back to their full brand
// colour on hover, so the row reads as one quiet band until you reach for it.
export function TicketProviders({ categoryLabel, group }) {
  const providers = getTicketProvidersWithLogos();

  return (
    <section className="mt-16 border-t border-villa-obsidian/15 pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
          Ticket providers
        </h3>
        <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
          {String(providers.length + 1).padStart(2, '0')} marketplaces
        </p>
      </div>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-villa-graphite">
        Compare {categoryLabel ? `${categoryLabel} ` : ''}inventory across the marketplaces we track.
        Every listing is fulfilled by the provider you choose.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <a
          href={getTicketNetworkFallback(group)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label="Browse tickets on TicketNetwork (affiliate link)"
          className="group flex h-28 items-center justify-center rounded-2xl border border-villa-obsidian/10 bg-white px-6 font-display text-xl font-semibold tracking-tight text-villa-obsidian transition-all duration-500 hover:-translate-y-1 hover:border-brand-gold"
        >
          TicketNetwork
        </a>
        {providers.map((provider) => (
          <a
            key={provider.slug}
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-label={provider.name}
            className="group flex h-28 items-center justify-center rounded-2xl border border-villa-obsidian/10 bg-white px-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-brand-gold hover:shadow-[0_14px_34px_rgba(0,0,0,0.12)]"
          >
            <img
              src={provider.logo}
              alt={provider.name}
              className={`w-auto max-w-full object-contain grayscale opacity-60 transition-all duration-500 ease-out group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 ${provider.logoClass || 'max-h-8'}`}
            />
          </a>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-villa-graphite">
        TicketNetwork links are affiliate links; we may earn a commission. Checkout opens on TicketNetwork.
      </p>
    </section>
  );
}
