import { YATR_REFERRAL_URL } from '../../lib/yatrCopy';

export default function YatrCatalog({ copy }) {
  return (
    <section aria-label={copy.catalogue} className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 className="text-base font-medium">{copy.catalogue}</h2>
        <a
          href={YATR_REFERRAL_URL}
          target="_blank"
          rel="sponsored noopener"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-g1-rule px-4 text-[0.9rem] font-medium hover:border-g1-accent hover:text-g1-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-g1-accent"
        >
          {copy.open}<span aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-g1-rule bg-white" dir="ltr">
        <iframe
          id="yatr-catalogue"
          title={copy.catalogue}
          src={YATR_REFERRAL_URL}
          width="100%"
          height="1000"
          allow="payment"
          referrerPolicy="strict-origin-when-cross-origin"
          className="block h-[860px] w-full border-0 [color-scheme:light] sm:h-[1000px]"
        />
      </div>

      <p className="max-w-[85ch] text-[0.82rem] leading-relaxed text-g1-soft">{copy.help}</p>
      <p className="max-w-[85ch] text-[0.82rem] leading-relaxed text-g1-soft">{copy.disclosure}</p>
    </section>
  );
}
