import { getTicketNetworkCatalogue, getTicketNetworkFallback } from '../../lib/ticketnetwork';
import { buildTicketNetworkDocument } from '../../lib/ticketnetworkWidget';
import { TicketNetworkFrame } from './TicketNetworkFrame';

export function TicketNetworkCatalogue({ category }) {
  const catalogue = getTicketNetworkCatalogue(category);
  if (!catalogue) return null;

  return (
    <section id="live-tickets" aria-labelledby="live-tickets-title" className="mt-16 min-w-0 scroll-mt-24 border-t border-villa-obsidian/20 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-fira text-[0.64rem] uppercase tracking-[0.18em] text-villa-ash">Live calendar · {catalogue.label} · TicketNetwork</p>
          <h3 id="live-tickets-title" className="mt-3 font-display text-3xl font-light tracking-tight text-villa-obsidian sm:text-4xl">Find your next {catalogue.group === 'sports' ? 'game' : 'show'}.</h3>
        </div>
        <a href={getTicketNetworkFallback(category)} target="_blank" rel="noopener noreferrer sponsored" className="border-b border-villa-obsidian pb-1 font-fira text-xs uppercase tracking-[0.12em] text-villa-obsidian transition-opacity hover:opacity-60">
          Browse on TicketNetwork ↗
        </a>
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-villa-graphite">
        Explore events here. Ticket selection, payment and order support are handled by TicketNetwork in a new tab.
        Resale prices may be above face value. We may earn a commission when you buy through these links.
      </p>
      <TicketNetworkFrame key={category} category={category} document={buildTicketNetworkDocument(category)} />
      <noscript><p className="mt-6 text-sm text-villa-graphite">JavaScript is required for the live calendar. Use the TicketNetwork link above to browse tickets.</p></noscript>
    </section>
  );
}
