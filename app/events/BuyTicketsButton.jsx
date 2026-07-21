'use client';

import { trackTicketClick, trackProviderClick } from '../../lib/analytics';

export function BuyTicketsButton({ eventSlug, provider, href, label }) {
  function handleClick() {
    trackTicketClick(eventSlug, provider.slug);
    trackProviderClick(provider.slug);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={handleClick}
      className="market-button"
    >
      {label} — {provider.name}
    </a>
  );
}
