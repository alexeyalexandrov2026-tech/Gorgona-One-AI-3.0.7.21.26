
import { LocalizedText } from "../components/LocalizedText";
export default function AIRReadyPage() {
  return (
    <main className="flex-1 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold"><LocalizedText source="AI Ready" /></p>
        <h1 className="mt-2 text-3xl font-semibold text-white"><LocalizedText source="Future AI assistant infrastructure" /></h1>
        <p className="mt-4 max-w-2xl text-zinc-400"><LocalizedText source="The deal database is structured for future AI recommendations, natural-language search, and conversational deal discovery." /></p>
      </div>
    </main>
  );
}
