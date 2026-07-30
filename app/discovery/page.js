export const metadata = {
  title: 'Discovery Room | GORGONA ONE',
  description: 'The Discovery Room — an AI-guided way to explore verified offers across the GORGONA ONE ecosystem. Coming soon.'
};

// Placeholder route for "The Discovery Room". The Header, Footer, AiDock and
// ecosystem navigation all link here, and /concierge redirects here, so this
// page has to exist for those links to resolve.
export default function DiscoveryPage() {
  return (
    <main className="flex flex-1 items-center justify-center py-20">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-premium sm:p-14">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Discovery Room</p>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Coming soon
        </h1>

        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-400">
          An AI-guided way to explore verified offers, premium experiences and hidden deals
          across the GORGONA ONE ecosystem. We are putting the finishing touches on it.
        </p>

        <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent" />

        <a
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-brand-gold/60 px-6 py-3 text-sm font-semibold text-brand-gold transition hover:bg-brand-gold/10"
        >
          Back to home
        </a>
      </div>
    </main>
  );
}
