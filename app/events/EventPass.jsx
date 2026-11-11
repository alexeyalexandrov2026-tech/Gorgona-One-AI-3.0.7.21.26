import Link from 'next/link';
import { LocalizedText } from '../components/LocalizedText';
import { SubcategoryRibbon } from './SubcategoryRibbon';

const pad = (value) => String(value).padStart(2, '0');

// One Events pillar as a ticket: the photo part opens the pillar, the stub
// under the tear line carries its subcategories.
export function EventPass({ item, index, total, categories }) {
  return (
    <article className="ev-pass">
      <div className="ev-pass__main">
        <div className="ev-pass__media">
          <img src={item.image} alt="" width="1600" height="1000" loading="lazy" />
        </div>
        <div className="ev-pass__scrim" />
        <p className="ev-pass__no" aria-hidden="true">
          <b>{pad(index + 1)}</b>
          <i />
          <span>{pad(total)}</span>
        </p>
        <div className="relative grid gap-3">
          <p className="lux-caption-upper ev-pass__tag"><LocalizedText source={item.tag} /></p>
          <h3 className="font-serif text-[2rem] italic leading-[1.05] text-white sm:text-4xl">
            <Link id={`ev-pass-${item.group}`} href={item.href} className="ev-pass__link"><LocalizedText source={item.title} /></Link>
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-zinc-200/90"><LocalizedText source={item.copy} /></p>
          <span className="ev-pass__cta mt-2" aria-hidden="true">
            <LocalizedText source="View tickets" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
      <div className="ev-pass__stub">
        <SubcategoryRibbon categories={categories} labelledBy={`ev-pass-${item.group}`} />
      </div>
    </article>
  );
}
