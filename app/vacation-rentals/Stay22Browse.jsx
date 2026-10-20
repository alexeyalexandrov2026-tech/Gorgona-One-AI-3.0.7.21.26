// These two embeds are deliberately confined to the Vacation Rentals page.
// Never load the global Stay22 Let Me Allez converter: direct CJ referral
// links elsewhere on the site must keep their own attribution.
const MAP_URL = 'https://www.stay22.com/embed/6ad7137bf9e9fcb545c96a7f';
const LIST_URL = 'https://www.stay22.com/embed/gm?aid=gorgonaone&address=Miami%2C+FL%2C+USA&viewmode=listview&showhotels=false&rentalsapi=vrbo&campaign=gorgona_miami_rentals_list';

export default function Stay22Browse({ labels }) {
  return (
    <div className="grid gap-8 sm:gap-12">
      <section aria-label={labels.mapTitle} className="grid gap-3">
        <div className="grid gap-1">
          <h3 className="font-g1display text-[clamp(1.45rem,1.4vw+1rem,2rem)] font-medium text-g1-ink">
            {labels.mapTab}
          </h3>
          <p className="text-[0.85rem] text-g1-soft">{labels.location}</p>
        </div>
        <div className="overflow-hidden rounded-[26px] border border-g1-rule bg-g1-card">
          <iframe
            id="stay22-map"
            title={labels.mapTitle}
            src={MAP_URL}
            width="100%"
            height="540"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block h-[440px] w-full border-0 sm:h-[540px]"
          />
        </div>
      </section>

      <section aria-label={labels.listTitle} className="grid gap-3 border-t border-g1-rule pt-8 sm:pt-10">
        <h3 className="font-g1display text-[clamp(1.45rem,1.4vw+1rem,2rem)] font-medium text-g1-ink">
          {labels.listTab}
        </h3>
        <div className="overflow-hidden rounded-[26px] border border-g1-rule bg-g1-card">
          <iframe
            id="stay22-list"
            title={labels.listTitle}
            src={LIST_URL}
            width="100%"
            height="900"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block h-[760px] w-full border-0 sm:h-[900px]"
          />
        </div>
        <p className="max-w-[75ch] text-[0.8rem] leading-relaxed text-g1-soft">
          {labels.scopeNotice}
        </p>
      </section>
    </div>
  );
}
