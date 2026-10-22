import { getServerLocale } from '../../lib/serverLocale';
import { getYatrCopy } from '../../lib/yatrCopy';
import YatrCatalog from './YatrCatalog';

export const dynamic = 'force-dynamic';

export default function YachtsPage() {
  const copy = getYatrCopy(getServerLocale());

  return (
    <main className="min-w-0 flex-1 pb-10 font-g1sans text-g1-ink">
      <header className="grid gap-4 pb-7 pt-6 sm:pb-9 sm:pt-10">
        <h1 className="g1-display max-w-[22ch] font-g1display text-[clamp(2.1rem,3.6vw+1rem,4.6rem)] font-medium leading-none tracking-[-0.015em] [text-wrap:balance]">
          {copy.title}
        </h1>
        <p className="max-w-[64ch] text-[clamp(1.02rem,0.35vw+1rem,1.16rem)] text-g1-soft">
          {copy.description}
        </p>
      </header>
      <YatrCatalog copy={copy} />
    </main>
  );
}
