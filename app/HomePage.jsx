"use client";
import { useSavedText } from "./components/LocalizedText";

import Link from 'next/link';
import { getTranslation } from '../lib/i18n';
import { useLocale } from './components/LocaleProvider';
import { getHomeCopy } from '../lib/homeCopy';
import {getHeadoutCopy} from '../lib/headoutCopy.mjs';
import {getPrivateJetsCopy} from '../lib/privateJetsCopy.mjs';
import {HEADOUT_COLLECTIONS} from '../lib/headoutCatalog.mjs';
import { HOME_SECTIONS } from '../lib/homeData';
import HomeHero from './components/home/HomeHero';
import SeasonShelf from './components/home/SeasonShelf';
import TicketCarousel from './components/home/TicketCarousel';
import A1ALine from './components/home/A1ALine';
import ConciergeBand from './components/home/ConciergeBand';
import { SectionHead, btn } from './components/g1/ui';
import Icon from './components/g1/icons';

const DIRECTORY_IDS = new Set(['travel', 'stays', 'yachts', 'cars', 'events']);
const WORLDS = [
  { id: 'experiences', href: '/experiences', image: HEADOUT_COLLECTIONS[0].image },
  ...HOME_SECTIONS.filter((section) => DIRECTORY_IDS.has(section.id)),
  { id: 'dining', href: '/restaurants-nightlife', img: 'deco-street' },
  { id: 'privateJets', href: '/private-jets', img: 'travel-wing' }
];
const worldImage = (world) => world.image || `/images/home/worlds/${world.img}.jpg`;

export default function HomePage({ showcase = [] }) {
  const msg = useSavedText();
  const locale = useLocale();
  const t = getTranslation(locale);
  const copy = getHomeCopy(locale);
  const rule = 'border-t border-g1-rule';

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <HomeHero copy={copy} showcase={showcase} />

      <section className="py-[clamp(36px,5vw,72px)]">
        <SectionHead title={copy.season} sub={copy.seasonSub} href="/events" cta={t.nav.events} />
        <SeasonShelf copy={copy} locale={locale} />
      </section>

      <section className="py-[clamp(36px,5vw,72px)]">
        <SectionHead title={copy.tickets.title} sub={copy.tickets.sub} href="/events" cta={copy.tickets.all} />
        <TicketCarousel copy={copy} locale={locale} />
      </section>

      <section className={`${rule} py-[clamp(36px,5vw,72px)]`}>
        <SectionHead
          title={copy.line.split('A1A').flatMap((part, i) => (i ? [<span key={i} className="g1-road">A1A</span>, part] : [part]))}
          sub={copy.lineSub}
        />
        <A1ALine copy={copy} locale={locale} />
      </section>

      <section className={`${rule} py-[clamp(52px,7vw,110px)]`}>
        <SectionHead title={copy.worlds} sub={copy.worldsSub} />
        <ul className="border-b border-g1-rule">
          {WORLDS.map((world) => {
            const experienceCopy = getHeadoutCopy(locale);
            const jetCopy = getPrivateJetsCopy(locale);
            const [name, description] = world.id === 'experiences' ? [experienceCopy.nav, experienceCopy.parks] : world.id === 'privateJets' ? [jetCopy.nav, jetCopy.description] : world.id === 'dining' ? [t.restaurantsNightlife.pill, t.restaurantsNightlife.title] : copy.worldItems[world.id];
            return (
              <li key={world.id} className="border-t border-g1-rule">
                <Link href={world.href} className="g1-dir-row">
                  <img className="g1-dir-thumb" src={worldImage(world)} alt="" aria-hidden="true" loading="lazy" />
                  <span className="g1-dir-name">{name}</span>
                  <span className="g1-dir-desc text-[0.98rem] text-g1-soft">{description}</span>
                  <span className="g1-dir-arrow"><Icon name="arrow" className="g1-flip h-5 w-5" /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <ConciergeBand copy={copy} locale={locale} />

      <section className="grid items-center gap-[clamp(26px,4vw,56px)] pb-8 pt-[clamp(52px,7vw,110px)] md:grid-cols-2">
        <figure className="aspect-[4/3] overflow-hidden rounded-[26px] bg-g1-rule">
          <img src="/images/experiences/miami-aerial.webp" alt={msg("Downtown Miami and Biscayne Bay from the air")} loading="lazy" width="960" height="720" className="h-full w-full object-cover" />
        </figure>
        <div className="grid gap-[18px]">
          <p className="font-g1sans text-[0.74rem] font-medium uppercase tracking-[0.2em] text-g1-soft">{copy.partnersEyebrow}</p>
          <h2 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] text-g1-ink [text-wrap:balance]">{copy.partners}</h2>
          <p className="max-w-[58ch] text-[1.08rem] text-g1-soft">{copy.partnersSub}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/partner" className={`${btn.base} ${btn.ink}`}>{copy.becomePartner}</Link>
            <Link href="/login" className={`${btn.base} ${btn.ghost}`}>{copy.partnerSignIn}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
