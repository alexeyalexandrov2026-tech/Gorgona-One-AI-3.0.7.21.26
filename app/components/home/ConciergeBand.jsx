"use client";

import { useEffect, useState } from 'react';
import { useAskConcierge } from './shared';
import { btn } from '../g1/ui';
import Icon from '../g1/icons';

// Sample conversations in the five core languages. Every car, yacht and
// venue named here is in the site's listings.
const SAMPLES = {
  EN: { me: 'Landing at MIA on Friday at 3 PM, four of us. Something fun for Saturday?', them: 'Welcome to Miami! I can meet you at MIA in the Mercedes-Maybach GLS, then take you out on the Azimut 68 Fly from Star Island on Saturday afternoon. Shall I add a dinner table after?', plan: ['Maybach GLS · MIA', 'Azimut 68 Fly · Sat', 'Table request'] },
  ES: { me: 'Llegamos el viernes, somos cuatro. ¿Un yate el sábado?', them: '¡Perfecto! El Azimut 68 Fly sale de Star Island y lleva a tu grupo con comodidad. ¿Reservo también una mesa en Komodo para la noche?', plan: ['Azimut 68 Fly · sáb', 'Komodo · 20:30'] },
  PT: { me: 'Chegamos na sexta, somos quatro. Um iate no sábado?', them: 'Perfeito! O Azimut 68 Fly sai de Star Island e acomoda bem o seu grupo. Reservo também uma mesa no Komodo à noite?', plan: ['Azimut 68 Fly · sáb', 'Komodo · 20:30'] },
  RU: { me: 'Прилетаем в пятницу, нас четверо. Хотим яхту в субботу и ужин.', them: 'Отличный план. В субботу предлагаю Azimut 68 Fly от Star Island, а вечером стол в Komodo в Брикелле. Встретить вас в аэропорту на Maybach GLS?', plan: ['Maybach GLS · аэропорт', 'Azimut 68 Fly · сб', 'Komodo · 20:30'] },
  HE: { me: 'נוחתים ביום שישי, ארבעה אנשים. יאכטה בשבת?', them: 'בשמחה! ה־Azimut 68 Fly יוצאת מ־Star Island ומתאימה לקבוצה שלכם. להזמין גם שולחן לארוחת ערב ב־Komodo?', plan: ['Azimut 68 Fly · שבת', 'Komodo · 20:30'] }
};

const LOCALE_SAMPLE = { en: 'EN', es: 'ES', pt: 'PT', ru: 'RU', he: 'HE' };

export default function ConciergeBand({ copy, locale }) {
  const ask = useAskConcierge();
  const [lang, setLang] = useState(LOCALE_SAMPLE[locale] || 'EN');
  const sample = SAMPLES[lang];

  // The site language is known only after mount; show the sample in it.
  useEffect(() => {
    setLang(LOCALE_SAMPLE[locale] || 'EN');
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
          <div className="grid gap-3" dir={lang === 'HE' ? 'rtl' : 'ltr'} lang={lang.toLowerCase()}>
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
