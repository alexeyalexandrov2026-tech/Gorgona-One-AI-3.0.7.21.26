'use client';
import {useLocale} from '../components/LocaleProvider';
import {btn} from '../components/g1/ui';
import {getPrivateJetsCopy} from '../../lib/privateJetsCopy.mjs';
import {PRIVATE_JETS,PRIVATE_JET_WIDGET_DOCUMENT} from '../../lib/privateJets.mjs';

export default function PrivateJetsContent(){
 const copy=getPrivateJetsCopy(useLocale());
 return <main className="min-w-0 flex-1 pb-12 font-g1sans text-g1-ink">
  <header className="grid items-center gap-8 py-10 sm:py-14 md:grid-cols-[1.2fr_1fr]">
   <div className="grid justify-items-start gap-5">
    <h1 className="g1-display font-g1display text-[clamp(2.8rem,6vw,5.5rem)] font-medium leading-none">{copy.nav}</h1>
    <p className="max-w-[48ch] text-lg text-g1-soft">{copy.description}</p>
    <a href={PRIVATE_JETS.href} target="_blank" rel="sponsored noopener noreferrer" className={`${btn.base} ${btn.ink} max-w-full text-center leading-snug`}>{copy.open}<span aria-hidden="true">↗</span></a>
   </div>
   <img src="/images/home/worlds/travel-wing.jpg" alt="" width="900" height="600" className="aspect-[3/2] w-full rounded-2xl object-cover"/>
  </header>
  <section aria-labelledby="private-jet-search" className="border-t border-g1-rule pt-8">
   <h2 id="private-jet-search" className="font-g1display text-3xl sm:text-4xl">{copy.search}</h2>
   <p className="mb-6 mt-3 max-w-[70ch] text-sm leading-relaxed text-g1-soft">{copy.language}</p>
   <iframe title={copy.search+' · PrivateJetFinder'} srcDoc={PRIVATE_JET_WIDGET_DOCUMENT} referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" className="block h-[780px] w-full rounded-2xl border border-g1-rule bg-white [color-scheme:light] sm:h-[630px] lg:h-[560px]"/>
  </section>
  <aside className="mt-7 border-t border-g1-rule pt-6 text-sm leading-relaxed text-g1-soft">
   <p>{copy.disclosure}</p>
   <a href={PRIVATE_JETS.href} target="_blank" rel="sponsored noopener noreferrer" className="mt-4 inline-flex min-h-[44px] items-center gap-2 underline underline-offset-4">{copy.open}<span aria-hidden="true">↗</span></a>
  </aside>
 </main>;
}
