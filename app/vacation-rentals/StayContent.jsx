'use client';

import { useLocale } from '../components/LocaleProvider';
import { getWorldsCopy, largeImage } from '../../lib/worldsCopy';
import { getStay22Copy } from '../../lib/stay22Copy';
import { WorldHero, SectionHead, Steps } from '../components/g1/ui';
import Stay22Browse from './Stay22Browse';

// Keep this view mounted across locale changes: no route refresh, no locale
// keys and no conditional wrapper around either supplier iframe.
// Stay22 is the whole stay catalogue: there are no homes of our own to list.
export default function StayContent() {
  const locale = useLocale();
  const copy = getWorldsCopy(locale);
  const stay22 = getStay22Copy(locale);
  // The eyebrow without the count it used to carry ("Stays · {n} · Miami" → "Stays · Miami").
  const eyebrow = copy.stays.eyebrow.split('·').map((part) => part.trim()).filter((part) => part && !part.includes('{n}')).join(' · ');

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <WorldHero
        eyebrow={eyebrow}
        title={copy.stays.title}
        lede={copy.stays.lede}
        img={largeImage('/images/home/worlds/stay-miami-beach.jpg')}
        alt={copy.stays.title}
      />

      <section className="border-t border-g1-rule py-[clamp(36px,5vw,72px)]" aria-label={stay22.title}>
        <SectionHead title={stay22.title} sub={stay22.description} />
        <div className="rounded-[30px] border border-[#d4af37]/25 bg-[linear-gradient(180deg,rgba(1,33,44,0.84),rgba(1,16,24,0.92))] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-5">
          <Stay22Browse labels={stay22} />
        </div>
        <p className="mt-3 max-w-[75ch] text-[0.8rem] leading-relaxed text-g1-soft">{stay22.disclosure}</p>
      </section>

      <Steps title={copy.howItWorks} steps={copy.stays.steps} />
    </main>
  );
}
