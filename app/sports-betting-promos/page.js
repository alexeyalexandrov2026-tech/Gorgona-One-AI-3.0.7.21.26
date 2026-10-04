import { ResponsibleGamingNotice } from '../components/ResponsibleGamingNotice';

// Placeholder page without content of its own yet: kept out of search
// results and out of app/sitemap.js until it has some.
export const metadata = { robots: { index: false, follow: true } };

export default function SportsBettingPromosPage() {
  return (
    <main className="flex-1 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Sportsbook promos</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Sports betting promos and sportsbook offers</h1>
        <p className="mt-4 text-zinc-400">Discover premium sportsbook-related content, state availability, and responsible-gambling guidance.</p>
        <ResponsibleGamingNotice className="mt-6" />
      </div>
    </main>
  );
}
