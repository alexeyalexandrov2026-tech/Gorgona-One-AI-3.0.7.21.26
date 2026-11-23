import { LocalizedText, LocalizedElement } from '../../components/LocalizedText';
import JsonLd from '../../components/JsonLd';
import { btn } from '../../components/g1/ui';
import { getServerTranslation } from '../../../lib/serverLocale';
import { pageMetadata, sectionJsonLd } from '../../../lib/seo.mjs';

export const dynamic = 'force-dynamic';

const OVAGO_FEATURES = [
  { title: 'Trusted Brand', sub: 'Established travel agency', d: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z' },
  { title: 'Flight Deals', sub: 'Exclusive fare offers', d: 'M3 8h18v13H3zM12 8v13M3 12h18M12 8c-1.5-3-5-4-5-1.5S9 8 12 8Zm0 0c1.5-3 5-4 5-1.5S15 8 12 8Z' },
  { title: 'Book Anywhere', sub: 'Fast mobile-friendly booking', d: 'M6 2h12v20H6zM11 18h2' },
  { title: 'Secure & Safe', sub: 'Your privacy matters', d: 'M4 11h16v10H4zM8 11V7a4 4 0 0 1 8 0v4' }
];

// Every field below (name, description, image, affiliate link) comes
// directly from the deal's own supplied source file - not invented, not
// shared across deals.
const OVAGO_DEALS = [
  {
    name: 'Last Minute Flights',
    description: 'Save up to $30 off* on Flights with code: LASTMINUTE30, Book Now!',
    image: '/images/ovago/last-minute-flights.jpg',
    href: 'https://www.dpbolvw.net/click-101825540-15821121'
  },
  {
    name: 'Cheap Flights',
    description: 'Cheap Flight Deals *Hot Selling',
    image: '/images/ovago/cheap-flights.jpg',
    href: 'https://www.tkqlhce.com/click-101825540-15820959'
  },
  {
    name: 'Business Class Flights',
    description: 'Business Class Flight Deals',
    image: '/images/ovago/business-class-flights.jpg',
    href: 'https://www.kqzyfj.com/click-101825540-15832128'
  }
];

const description = 'Ovago flight deals - last minute flights, cheap flights, and business class fares.';

export const metadata = pageMetadata({
  title: 'Ovago Flight Deals',
  fullTitle: 'Ovago Flight Deals | MIAMI ELIO',
  description,
  path: '/travel/ovago'
});

export default async function OvagoProfilePage() {
  const { t } = await getServerTranslation();

  return (
    <main className="min-w-0 flex-1 pb-12 font-g1sans text-g1-ink">
      <JsonLd data={sectionJsonLd({ name: 'Ovago Flight Deals', description, path: '/travel/ovago' })} />

      <header className="grid items-center gap-8 py-10 sm:py-14 md:grid-cols-[1.2fr_1fr]">
        <div className="grid justify-items-start gap-4">
          <p className="font-g1mono text-[0.76rem] uppercase tracking-[0.16em] text-g1-soft">
            {t.categories.travel}
            <LocalizedText source=" Profile" />
          </p>
          <h1 className="g1-display font-g1display text-[clamp(2.8rem,6vw,5.2rem)] font-medium leading-none">
            Ovago
          </h1>
          <p className="max-w-[50ch] text-lg leading-relaxed text-g1-soft">
            <LocalizedText source="Flight deals and discounts, including last-minute fares, cheap flights, and business class offers." />
          </p>
        </div>
        <div className="flex items-center justify-center rounded-2xl border border-g1-rule bg-white p-10 shadow-sm">
          <img
            src="/images/brands/ovago-travel.svg"
            alt="Ovago"
            width="360"
            height="120"
            className="max-h-24 w-auto object-contain"
          />
        </div>
      </header>

      <section className="grid grid-cols-2 border-y border-g1-rule lg:grid-cols-4">
        {OVAGO_FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3 border-b border-g1-rule py-5 pr-4 lg:border-b-0 lg:border-r lg:px-5 lg:last:border-r-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="mt-0.5 h-5 w-5 shrink-0 text-g1-accent" aria-hidden="true">
              <path d={f.d} />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-g1-ink"><LocalizedText source={f.title} /></p>
              <p className="mt-0.5 text-xs text-g1-soft"><LocalizedText source={f.sub} /></p>
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="ovago-deals-heading" className="pt-9">
        <h2 id="ovago-deals-heading" className="font-g1mono text-[0.76rem] uppercase tracking-[0.16em] text-g1-soft">
          <LocalizedText source="Ovago Deals" />
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {OVAGO_DEALS.map((deal) => (
            <article key={deal.name} className="flex flex-col overflow-hidden rounded-2xl border border-g1-rule bg-g1-card">
              <div className="aspect-[16/10] w-full overflow-hidden border-b border-g1-rule bg-g1-paper">
                <LocalizedElement as="img" src={deal.image} alt={deal.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                <div>
                  <h3 className="font-g1display text-2xl font-medium leading-snug text-g1-ink">
                    <LocalizedText source={deal.name} />
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-g1-soft">
                    <LocalizedText source={deal.description} />
                  </p>
                </div>
                <a
                  href={deal.href}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className={`${btn.base} ${btn.ink} w-full justify-center`}
                >
                  {t.buttons.getDeal}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
