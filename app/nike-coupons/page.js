// Placeholder page without content of its own yet: kept out of search
// results and out of app/sitemap.js until it has some.
export const metadata = { robots: { index: false, follow: true } };

export default function NikeCouponsPage() {
  return (
    <main className="flex-1 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Promo codes</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Nike coupons and premium athlete essentials</h1>
        <p className="mt-4 text-zinc-400">Explore verified Nike offers, seasonal drops, and premium apparel discounts.</p>
      </div>
    </main>
  );
}
