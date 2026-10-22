
import { LocalizedText, LocalizedElement } from "../components/LocalizedText";
import { getTicketNetworkFallback } from '../../lib/ticketnetwork';

export function TicketProviders({ categoryLabel, category }) {
  return (
    <section className="mt-16 border-t border-villa-obsidian/15 pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash"><LocalizedText source="Ticket partner" /></h3>
        <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash"><LocalizedText source="01 marketplace" /></p>
      </div>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-villa-graphite">{categoryLabel ? <LocalizedText source="Explore tickets for {category} on TicketNetwork. TicketNetwork handles its own listings and orders." values={{ category: <LocalizedText source={categoryLabel} /> }} /> : <LocalizedText source="Explore tickets on TicketNetwork. TicketNetwork handles its own listings and orders." />}</p>

      <div className="mt-8 max-w-sm">
        <LocalizedElement as="a"
          href={getTicketNetworkFallback(category)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label="Browse tickets on TicketNetwork (affiliate link)"
          className="group flex h-28 items-center justify-center rounded-2xl border border-villa-obsidian/10 bg-white px-6 font-display text-xl font-semibold tracking-tight text-villa-obsidian transition-all duration-500 hover:-translate-y-1 hover:border-brand-gold"
        >
          TicketNetwork
        </LocalizedElement>
      </div>
      <p className="mt-5 text-xs leading-relaxed text-villa-graphite"><LocalizedText source="TicketNetwork is our affiliate partner; we may earn a commission through its links. Checkout opens on TicketNetwork." /></p>
    </section>
  );
}
