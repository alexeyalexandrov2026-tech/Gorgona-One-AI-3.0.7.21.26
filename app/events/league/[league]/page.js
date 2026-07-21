import { notFound } from 'next/navigation';
import { getLeagueBySlug, getTeamsByLeague, getEventsByLeague, paginate } from '../../../../lib/eventsData';
import { Logo } from '../../../components/Logo';
import { EventGrid } from '../../EventGrid';
import { EventPagination } from '../../EventPagination';
import { getServerTranslations } from '../../../../lib/serverLocale';

export const dynamic = 'force-dynamic';

export default async function LeaguePage({ params, searchParams }) {
  const league = getLeagueBySlug(params.league);

  if (!league) {
    notFound();
  }

  const { t } = await getServerTranslations();
  const teams = getTeamsByLeague(params.league);
  const page = Number(searchParams?.page) || 1;
  const { items, currentPage, totalPages } = paginate(getEventsByLeague(params.league), page, 9);

  return (
    <main className="flex-1 py-10">
      <div className="market-shell mb-8 rounded-[2rem] p-8">
        <div className="flex items-center gap-4">
          <Logo slug={league.slug} alt={league.name} className="h-14 w-14 rounded-2xl bg-white/5 object-contain p-2" />
          <div>
            <p className="market-pill">{league.sport}</p>
            <h1 className="market-title mt-2">{league.name}</h1>
          </div>
        </div>
      </div>

      {teams.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white">{t.events.teams}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {teams.map((team) => (
              <div key={team.slug} className="market-card flex items-center gap-3 rounded-2xl p-4">
                <Logo slug={team.slug} alt={team.name} className="h-10 w-10 rounded-xl bg-white/5 object-contain p-1" />
                <div>
                  <p className="font-semibold text-white">{team.name}</p>
                  <p className="text-xs text-zinc-400">{team.city}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold text-white">{t.events.upcomingEvents}</h2>
        <div className="mt-4">
          <EventGrid events={items} emptyMessage={t.events.comingSoon} t={t} />
        </div>
        <EventPagination currentPage={currentPage} totalPages={totalPages} basePath={`/events/league/${params.league}`} t={t} />
      </section>
    </main>
  );
}
