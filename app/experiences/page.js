import Link from 'next/link';
import { getExperiences } from '../../lib/experiencesData';
import { getServerTranslation } from '../../lib/serverLocale';

export const dynamic = 'force-dynamic';

export default function ExperiencesPage() {
  const experiences = getExperiences();
  const { t } = getServerTranslation();

  return (
    <main className="flex-1 py-10">
      <div className="market-shell mb-8 rounded-[2rem] p-8">
        <p className="market-pill">{t.experiences.pill}</p>
        <h1 className="market-title mt-4">{t.experiences.title}</h1>
        <p className="market-subtitle">{t.experiences.subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {experiences.map((item) => (
          <article key={item.id} className="market-card overflow-hidden rounded-[1.5rem]">
            <img src={item.image} alt={item.title} className="h-48 w-full object-cover" />
            <div className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">{item.location}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{item.title}</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">{item.duration}</span>
              </div>
              <p className="mt-4 text-sm text-zinc-400">{item.description}</p>
              <div className="mt-5 grid gap-2 text-sm text-zinc-300">
                <div className="flex items-center justify-between"><span>{t.experiences.location}</span><span className="text-white">{item.location}</span></div>
                <div className="flex items-center justify-between"><span>{t.experiences.duration}</span><span className="text-white">{item.duration}</span></div>
                <div className="flex items-center justify-between"><span>{t.experiences.price}</span><span className="text-brand-gold">{item.price}</span></div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/experiences/${item.slug}`} className="market-button">{t.common.viewDetails}</Link>
                <Link href="/partner" className="market-button-secondary">{t.experiences.book}</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
