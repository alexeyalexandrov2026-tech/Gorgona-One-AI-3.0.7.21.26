import { CHECKED_AT, FLORIDA, HELPLINE, getAvailability } from '../../lib/sportsbookAvailability';
import { formatCheckedDate, getGamblingText } from '../../lib/gamblingNotice';

// Legal and responsible-gambling notice for every page that mentions a
// sportsbook: age limit, licensed states only, the Florida rule with its
// sources and check date, and the national helpline.
export default function GamblingNotice({ locale = 'en', className = '' }) {
  const text = getGamblingText(locale);
  return (
    <aside
      role="note"
      aria-label={text.title}
      className={`rounded-2xl border border-g1-rule bg-g1-card p-5 text-sm leading-relaxed text-g1-soft ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md border border-g1-ink px-2 text-xs font-bold text-g1-ink">21+</span>
        <p className="font-semibold text-g1-ink">{text.title}</p>
      </div>
      <p className="mt-3">{text.body}</p>
      <p className="mt-3 text-g1-ink">{text.florida}</p>
      <p className="mt-1 text-xs text-g1-soft">
        {text.sources}:{' '}
        {FLORIDA.sources.map((source, i) => (
          <span key={source.url}>
            {i > 0 && ', '}
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-g1-rule underline-offset-2 hover:text-g1-ink">
              {source.name}
            </a>
          </span>
        ))}
        {' · '}{text.checked} {formatCheckedDate(CHECKED_AT, locale)}
      </p>
      <p className="mt-3">
        {text.help} <a href="tel:18004262537" className="font-semibold text-g1-ink">{HELPLINE}</a>.
      </p>
    </aside>
  );
}

// One line per operator: Florida status and where its legal-states source is.
export function SportsbookAvailability({ slug, locale = 'en', className = '' }) {
  const availability = getAvailability(slug);
  if (!availability) return null;
  const text = getGamblingText(locale);
  return (
    <p className={`text-xs leading-relaxed text-g1-soft ${className}`}>
      <span className={availability.inFlorida ? 'font-semibold text-g1-ok' : 'font-semibold text-g1-ink'}>
        {availability.inFlorida ? text.inFlorida : text.notInFlorida}
      </span>
      {' · '}
      <a href={availability.source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-g1-rule underline-offset-2 hover:text-g1-ink">
        {text.whereLegal}: {availability.source.name}
      </a>
      {' · '}{text.checked} {formatCheckedDate(availability.checkedAt, locale)}
      {' · 21+'}
    </p>
  );
}
