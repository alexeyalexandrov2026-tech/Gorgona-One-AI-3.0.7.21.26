import Link from 'next/link';

// Placeholder page without content of its own yet: kept out of search
// results and out of app/sitemap.js until it has some.
export const metadata = { robots: { index: false, follow: true } };

export default function BestShoppingDealsPage() {
  return (
    <main className="flex-1 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Shopping deals</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Best shopping deals curated for premium savings</h1>
        <p className="mt-4 max-w-2xl text-zinc-400">Discover the latest verified offers across fashion, electronics, home, travel, and beauty.</p>
        <Link href="/stores" className="mt-6 inline-flex rounded-full bg-brand-gold px-4 py-2 font-medium text-black">Browse Stores</Link>
      </div>
    </main>
  );
}
