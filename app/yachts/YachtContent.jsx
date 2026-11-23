'use client';
import { useLocale } from '../components/LocaleProvider';
import { useAiDock } from '../components/ai/AiDockProvider';
import { getTranslation } from '../../lib/i18n';
import { getYatrCopy } from '../../lib/yatrCopy';
import { configuredManagerTelegram, configuredManagerWhatsApp } from '../../lib/managerContact.mjs';
import { btn } from '../components/g1/ui';
import YatrCatalog from './YatrCatalog';
import ViatorYachts from './ViatorYachts';
import { seoHeading } from '../../lib/seo.mjs';

const managerTelegram = configuredManagerTelegram();
const managerWhatsApp = configuredManagerWhatsApp();

export default function YachtContent() {
  const locale = useLocale();
  const copy = getYatrCopy(locale);
  const t = getTranslation(locale);
  const { open: openAiDock } = useAiDock();

  return (
    <main className="min-w-0 flex-1 pb-10 font-g1sans text-g1-ink">
      <header className="grid gap-4 pb-7 pt-6 sm:pb-9 sm:pt-10">
        <h1 className="g1-display max-w-[22ch] font-g1display text-[clamp(2.1rem,3.6vw+1rem,4.6rem)] font-medium leading-none">
          {seoHeading(locale,'yachts',copy.title)}
        </h1>
        <p className="max-w-[64ch] text-[1.06rem] text-g1-soft">{copy.description}</p>
      </header>

      <section
        aria-labelledby="elio-shield-heading"
        className="mb-8 border-y border-g1-rule py-6 sm:py-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1.5">
            <p className="font-g1mono text-[0.72rem] uppercase tracking-[0.22em] text-g1-accent">
              {copy.shieldEyebrow}
            </p>
            <h2 id="elio-shield-heading" className="font-g1display text-2xl font-medium leading-snug text-g1-ink sm:text-[1.75rem]">
              {copy.shieldTitle}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={openAiDock} className={`${btn.base} ${btn.ink} ${btn.sm}`}>
              {copy.shieldAskElio}
            </button>
            {managerTelegram && (
              <a href={managerTelegram} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ghost} ${btn.sm}`}>
                {t.ai?.liveManager}
                <span aria-hidden="true">↗</span>
              </a>
            )}
            {managerWhatsApp && (
              <a href={managerWhatsApp} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ghost} ${btn.sm}`}>
                {t.ai?.liveManagerWhatsApp}
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>
        <div className="mt-5 grid gap-5 border-t border-g1-rule pt-5 md:grid-cols-3 md:gap-6">
          <div className="grid content-start gap-1.5">
            <p className="text-sm font-medium text-g1-ink">{copy.shieldPillar1Title}</p>
            <p className="text-sm leading-relaxed text-g1-soft">{copy.shieldPillar1Body}</p>
          </div>
          <div className="grid content-start gap-1.5 md:border-l md:border-g1-rule md:pl-6">
            <p className="text-sm font-medium text-g1-ink">{copy.shieldPillar2Title}</p>
            <p className="text-sm leading-relaxed text-g1-soft">{copy.shieldPillar2Body}</p>
          </div>
          <div className="grid content-start gap-1.5 md:border-l md:border-g1-rule md:pl-6">
            <p className="text-sm font-medium text-g1-ink">{copy.shieldPillar3Title}</p>
            <p className="text-sm leading-relaxed text-g1-soft">{copy.shieldPillar3Body}</p>
          </div>
        </div>
      </section>

      <YatrCatalog copy={copy} />
      <ViatorYachts />
    </main>
  );
}
