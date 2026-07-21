import { notFound } from 'next/navigation';
import { getYachtBySlug } from '../../../lib/yachtsData';
import { getServerTranslation } from '../../../lib/serverLocale';

export const dynamic = 'force-dynamic';

export default function YachtDetailPage({ params }) {
  const yacht = getYachtBySlug(params.slug);

  if (!yacht) {
    notFound();
  }

  const { t } = getServerTranslation();

  return (
    <main className="flex-1 py-10">
      <div className="market-shell overflow-hidden rounded-[2rem]">
        <img src={yacht.image} alt={yacht.title} className="h-72 w-full object-cover" />
        <div className="p-8">
          <p className="market-pill">{yacht.length}</p>
          <h1 className="market-title mt-4">{yacht.title}</h1>
          <p className="market-subtitle">{yacht.description}</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="market-card rounded-[1.5rem] p-6">
              <div className="grid gap-4 text-sm text-zinc-300 sm:grid-cols-2">
                <div><p className="text-zinc-500">{t.yachts.company}</p><p className="mt-1 text-white">{yacht.company}</p></div>
                <div><p className="text-zinc-500">{t.yachts.location}</p><p className="mt-1 text-white">{yacht.location}</p></div>
                <div><p className="text-zinc-500">{t.yachts.capacity}</p><p className="mt-1 text-white">{yacht.capacity} {t.yachts.guests}</p></div>
                <div><p className="text-zinc-500">{t.yachts.length}</p><p className="mt-1 text-white">{yacht.length}</p></div>
                <div><p className="text-zinc-500">{t.yachts.price}</p><p className="mt-1 text-brand-gold">{yacht.price}</p></div>
              </div>
            </div>
            <div className="market-card rounded-[1.5rem] p-6">
              <h2 className="text-xl font-semibold text-white">{t.yachts.reserve}</h2>
              <div className="mt-4 space-y-3">
                <input className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none" placeholder="Name" />
                <input className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none" placeholder="Phone number" />
                <input className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none" placeholder="Email" />
                <input className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none" placeholder="Preferred dates" />
                <button className="market-button w-full">Submit reservation request</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
