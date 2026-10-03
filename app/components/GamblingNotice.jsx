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
      className={`rounded-2xl border border-white/10 bg-black/40 p-5 text-sm leading-relaxed text-zinc-400 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md border border-white/60 px-2 text-xs font-bold text-white">21+</span>
        <p className="font-semibold text-white">{text.title}</p>
      </div>
      <p className="mt-3">{text.body}</p>
      <p className="mt-3 text-white">{text.florida}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {text.sources}:{' '}
        {FLORIDA.sources.map((source, i) => (
          <span key={source.url}>
            {i > 0 && ', '}
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-600 underline-offset-2 hover:text-white">
              {source.name}
            </a>
          </span>
        ))}
        {' · '}{text.checked} {formatCheckedDate(CHECKED_AT, locale)}
      </p>
      <p className="mt-3">
        {text.help} <a href="tel:18004262537" className="font-semibold text-white">{HELPLINE}</a>.
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
    <p className={`text-xs leading-relaxed text-zinc-400 ${className}`}>
      <span className={availability.inFlorida ? 'font-semibold text-emerald-400' : 'font-semibold text-zinc-300'}>
        {availability.inFlorida ? text.inFlorida : text.notInFlorida}
      </span>
      {' · '}
      <a href={availability.source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-600 underline-offset-2 hover:text-white">
        {text.whereLegal}: {availability.source.name}
      </a>
      {' · '}{text.checked} {formatCheckedDate(availability.checkedAt, locale)}
      {' · 21+'}
    </p>
  );
}
