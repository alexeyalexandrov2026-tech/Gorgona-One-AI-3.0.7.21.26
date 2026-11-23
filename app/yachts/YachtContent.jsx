'use client';
import {useLocale} from '../components/LocaleProvider';
import {getYatrCopy} from '../../lib/yatrCopy';
import YatrCatalog from './YatrCatalog';
import ViatorYachts from './ViatorYachts';
import {seoHeading} from '../../lib/seo.mjs';
export default function YachtContent(){
 const locale=useLocale(),copy=getYatrCopy(locale);
 return <main className="min-w-0 flex-1 pb-10 font-g1sans text-g1-ink">
  <header className="grid gap-4 pb-7 pt-6 sm:pb-9 sm:pt-10"><h1 className="g1-display max-w-[22ch] font-g1display text-[clamp(2.1rem,3.6vw+1rem,4.6rem)] font-medium leading-none">{seoHeading(locale,'yachts',copy.title)}</h1><p className="max-w-[64ch] text-[1.06rem] text-g1-soft">{copy.description}</p></header>
  <YatrCatalog copy={copy}/>
  <ViatorYachts/>
 </main>;
}
