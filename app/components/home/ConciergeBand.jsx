"use client";

import { useEffect, useState } from 'react';
import { useAskConcierge } from './shared';
import { getConciergeSample } from '../../../lib/conciergeSample';
import { getLanguageDir, isSupportedLanguage } from '../../../lib/languages';
import { btn } from '../g1/ui';
import Icon from '../g1/icons';

// Sample conversations in the five core languages. Every car, yacht and
// venue named here is in the site's listings.
const SAMPLES = {
  EN: { me: 'Landing at MIA on Friday at 3 PM, four of us. Something fun for Saturday?', them: 'Welcome to Miami! For four with luggage from MIA, a Mercedes-Maybach GLS or Range Rover fits comfortably, followed by a private Biscayne Bay yacht charter on Saturday afternoon and dinner at Komodo in Brickell.', plan: ['Maybach GLS · MIA', 'Biscayne Bay yacht · Sat', 'Komodo · Brickell'] },
  ES: { me: 'Llegamos el viernes, somos cuatro. ¿Un yate el sábado?', them: '¡Perfecto! Podemos combinar un chárter privado por Biscayne Bay el sábado por la tarde con una cena en Komodo en Brickell y enlace directo para reservar mesa.', plan: ['Yate Biscayne Bay · sáb', 'Komodo · Brickell'] },
  PT: { me: 'Chegamos na sexta, somos quatro. Um iate no sábado?', them: 'Perfeito! Podemos combinar um passeio de iate privado em Biscayne Bay no sábado à tarde com jantar no Komodo em Brickell e link direto de reserva.', plan: ['Iate Biscayne Bay · sáb', 'Komodo · Brickell'] },
  RU: { me: 'Прилетаем в пятницу, нас четверо. Хотим яхту в субботу и ужин.', them: 'Отличный план. На субботу днём подберём частную яхту по Бискейн-Бей, вечером — Komodo в Brickell с прямой ссылкой на бронь, а от аэропорта MIA удобно взять Maybach GLS или Range Rover.', plan: ['Maybach GLS · MIA', 'Яхта Бискейн-Бей · сб', 'Komodo · Brickell'] },
  HE: { me: 'נוחתים ביום שישי, ארבעה אנשים. יאכטה בשבת?', them: 'בשמחה! לשבת אחר הצהריים אפשר לשלב יאכטה פרטית במפרץ ביסקיין וארוחת ערב ב־Komodo בבריקל עם קישור ישיר להזמנת שולחן.', plan: ['יאכטה ביסקיין · שבת', 'Komodo · Brickell'] }
};

const sampleCode = locale => isSupportedLanguage(locale) ? locale.toUpperCase() : 'EN';

export default function ConciergeBand({ copy, locale }) {
  const ask = useAskConcierge();
  const [lang, setLang] = useState(sampleCode(locale));
  const sample = SAMPLES[lang] || getConciergeSample(lang.toLowerCase());

  // The site language is known only after mount; show the sample in it.
  useEffect(() => {
    setLang(sampleCode(locale));
  }, [locale]);

  return (
    <section aria-labelledby="g1-concierge-title" className="g1-bleed bg-g1-band text-g1-on-band">
      <div className="grid items-center gap-[clamp(26px,4vw,56px)] py-[clamp(52px,7vw,110px)] md:grid-cols-2">
        <div className="grid gap-5">
          <p className="font-g1sans text-[0.74rem] font-medium uppercase tracking-[0.2em] text-[var(--g1-band-soft)]">{copy.conciergeEyebrow}</p>
          <h2 id="g1-concierge-title" className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] [text-wrap:balance]">
            {copy.concierge}
          </h2>
          <p className="max-w-[54ch] text-[1.08rem] text-[var(--g1-band-soft)]">{copy.conciergeSub}</p>
          <div>
            <button type="button" className={`${btn.base} ${btn.primary}`} onClick={() => ask('')}>
              {copy.open} <Icon name="arrow" className="g1-flip h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid min-w-0 content-start gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={copy.exampleLanguage}>
            {Object.keys(SAMPLES).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={code === lang}
                onClick={() => setLang(code)}
                className="inline-flex min-h-[38px] items-center rounded-full border border-[var(--g1-band-rule)] px-4 text-[0.9rem] font-medium transition hover:border-g1-on-band aria-pressed:border-g1-on-band aria-pressed:bg-g1-on-band aria-pressed:text-g1-band"
              >
                {code}
              </button>
            ))}
          </div>
          <div className="grid gap-3" dir={getLanguageDir(lang.toLowerCase())} lang={lang.toLowerCase()}>
            <p className="g1-bubble me">{sample.me}</p>
            <p className="g1-bubble them">{sample.them}</p>
            <div className="flex flex-wrap gap-2">
              {sample.plan.map((step) => (
                <span key={step} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--g1-band-rule)] px-3 py-1.5 text-[0.82rem]">
                  <Icon name="check" className="h-4 w-4 text-[var(--g1-ok)]" />
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
