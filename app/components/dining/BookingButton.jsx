import {primaryAction, PROVIDERS} from '../../../lib/dining/gateway.mjs';
import {btn} from '../g1/ui';

// The one main action for a venue: book on the venue's own booking platform, or
// open it in Google Maps when no checked booking link exists. Always opens a new
// tab, always followed by the reminder that Miami Elio does not confirm tables.
// Server-safe: no hooks, so cards and pages can render it directly. The platform
// is named in text (no third-party logo files).
export default function BookingButton({venue, copy, compact = false, className = ''}) {
  const action = primaryAction(venue);
  if (!action) return null;
  const platform = action.kind === 'book' && action.platform !== 'venue' ? PROVIDERS.find(provider => provider.id === action.platform)?.name : null;
  const label = action.kind === 'maps' ? copy.openMaps : platform ? copy.bookOn.replace('{platform}', platform) : copy.bookOnSite;
  return (
    <div className={`grid min-w-0 gap-2 ${className}`}>
      <a
        href={action.href}
        target="_blank"
        rel="noopener noreferrer"
        data-booking={action.kind === 'book' ? action.platform : 'maps'}
        className={`${btn.base} ${action.kind === 'book' ? btn.primary : btn.ghost} ${compact ? btn.sm + ' w-full' : 'w-full sm:w-fit'} text-center`}
      >
        <span>{label}</span>
        <span aria-hidden="true">↗</span>
        <span className="sr-only">({copy.newTab})</span>
      </a>
      <p className={`${compact ? 'text-[11px]' : 'text-xs'} leading-snug text-g1-soft`}>{copy.disclaimer}</p>
    </div>
  );
}
