"use client";

import Link from 'next/link';
import { useFavorites } from './FavoritesProvider';
import { useAuth } from './AuthProvider';
import { useAskConcierge } from './home/shared';
import { useSavedText } from './LocalizedText';
import { useLocale } from './LocaleProvider';
import { getTranslation } from '../../lib/i18n';
import { favouriteKind, planRequest } from '../../lib/myMiami.mjs';
import { btn } from './g1/ui';
import Icon from './g1/icons';
import SaveButton from './SaveButton';

// The favourites part of "My Miami" (the profile page): everything the guest
// put a heart on, and one button that asks the concierge to build a plan out
// of it (the plan of step 2, lib/ai/plan.mjs). Before signing in the list is
// kept on this device; after, in the account - the same list on the site and
// in the iOS app (FavoritesProvider).
export default function MyMiami() {
  const msg = useSavedText();
  const t = getTranslation(useLocale());
  const ask = useAskConcierge();
  const auth = useAuth();
  const { items, ready, mode } = useFavorites();
  const favourites = items.filter((item) => favouriteKind(item.href));
  const sections = { yacht: t.nav.yachts, stay: t.nav.villas, car: t.nav.cars, dining: t.restaurantsNightlife.pill };
  const kinds = new Set(favourites.map((item) => favouriteKind(item.href)));
  const request = planRequest(favourites, { template: msg('Build a plan from my favourites: {items}'), sections });
  const browse = [['/yachts', t.nav.yachts], ['/vacation-rentals', t.nav.villas], ['/rentals', t.nav.cars], ['/restaurants-nightlife', t.restaurantsNightlife.pill]];
  // Where the list lives, said only when it is not yet in the account.
  const where = !ready || !favourites.length || mode === 'account' ? ''
    : auth?.session ? msg('Favourites are kept on this device.')
    : msg('Saved on this device. Sign in to see them in the app and on every device.');

  return (
    <section aria-labelledby="my-miami-saved" className="border-t border-g1-rule py-[clamp(28px,4vw,48px)]" data-my-miami data-favourites-mode={ready ? mode : undefined}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 id="my-miami-saved" className="font-g1display text-[clamp(1.6rem,1.4vw+1rem,2.2rem)] font-medium leading-tight text-g1-ink">
          {msg('Favourites')}{ready && favourites.length > 0 && <span className="text-g1-soft"> · {favourites.length}</span>}
        </h2>
        {request && (
          <button type="button" onClick={() => ask(request)} className={`${btn.base} ${btn.primary}`} data-plan-from-favourites>
            {kinds.size > 1 ? msg('Build a plan with the concierge') : msg('Ask the concierge about these')}
          </button>
        )}
      </div>
      {!ready ? (
        <p role="status" className="text-g1-soft">{msg('Loading...')}</p>
      ) : !favourites.length ? (
        <div className="grid max-w-[60ch] gap-4">
          <p className="flex items-start gap-2 text-g1-soft"><Icon name="heart" className="mt-0.5 h-5 w-5" />{msg('Tap the heart on a yacht, villa, car or restaurant and it will wait for you here.')}</p>
          <nav className="flex flex-wrap gap-2" aria-label={msg('Favourites')}>
            {browse.map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-[40px] items-center rounded-full border border-g1-rule px-4 text-sm text-g1-ink hover:border-g1-ink">{label}</Link>)}
          </nav>
        </div>
      ) : (
        <ul className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {favourites.map((item) => (
            <li key={item.kind + ':' + item.slug} className="grid min-w-0 content-start gap-3" data-favourite={item.kind + ':' + item.slug}>
              <Link href={item.href} className="block aspect-[3/2] overflow-hidden rounded-2xl bg-g1-rule" tabIndex={-1} aria-hidden="true">
                {item.image && <img src={item.image} alt="" loading="lazy" width="720" height="480" className="h-full w-full object-cover" />}
              </Link>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <p className="text-[0.8rem] text-g1-soft [overflow-wrap:anywhere]">{sections[favouriteKind(item.href)]}{item.subtitle ? ` · ${item.subtitle}` : ''}</p>
                  <Link href={item.href} className="font-g1display text-[1.2rem] font-medium leading-[1.15] text-g1-ink [overflow-wrap:anywhere] hover:text-g1-accent">{item.title}</Link>
                </div>
                <SaveButton compact href={item.href} kind={item.kind} title={item.title} subtitle={item.subtitle} image={item.image} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {where && <p className="mt-6 text-sm text-g1-soft">{where}</p>}
    </section>
  );
}
