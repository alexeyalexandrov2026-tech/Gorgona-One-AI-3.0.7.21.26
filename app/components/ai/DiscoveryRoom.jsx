"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAI } from './AIProvider';
import { useAITheme } from '../ThemeProvider';
import { useLocale } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import { useBodyScrollLock } from '../useBodyScrollLock';

// ===========================================================================
// The Discovery Room (Phase 3).
//
// A persistent workspace that lives INSIDE the ecosystem — a slide-in drawer,
// never a new browser tab or popup. Ask from anywhere, and revisit your recent
// searches, recommendations and saved results. Because the state lives in
// AIProvider (mounted in the layout), leaving the room to browse the site and
// returning later preserves everything. Theme-aware (Light = V1, Dark = V2).
// ===========================================================================

let providerPromise = null;
function loadProvider() {
  if (!providerPromise) providerPromise = import('../../../lib/ai/provider');
  return providerPromise;
}

export default function DiscoveryRoom() {
  const { history, saved, roomOpen, closeRoom, saveResult, removeSaved, clearHistory, recordQuery, isSaved } = useAI();
  const { theme } = useAITheme();
  const router = useRouter();
  const locale = useLocale();
  const t = getTranslation(locale);

  const [q, setQ] = useState('');
  const [askResults, setAskResults] = useState([]);
  const [busy, setBusy] = useState(false);

  // Prevents the mobile scroll-jump this dialog's own text input used to
  // trigger - see useBodyScrollLock for the root cause.
  useBodyScrollLock(roomOpen);

  // Close on Escape.
  useEffect(() => {
    if (!roomOpen) return;
    const onKey = (e) => e.key === 'Escape' && closeRoom();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roomOpen, closeRoom]);

  function go(entity) {
    router.push(entity.href);
    closeRoom();
  }

  async function onAsk(e) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    const { askEcosystem } = await loadProvider();
    const res = await askEcosystem({ query, locale });
    setAskResults(res.results);
    recordQuery({ query, world: res.world, lang: res.lang, results: res.results });
    setBusy(false);
  }

  function returnToAI() {
    closeRoom();
    router.push('/');
  }

  return (
    <div className={`dr ${roomOpen ? 'is-open' : ''}`} data-ai-theme={theme} aria-hidden={!roomOpen}>
      <div className="dr__scrim" onClick={closeRoom} />
      <aside className="dr__panel" role="dialog" aria-modal="true" aria-label="Discovery Room">
        <header className="dr__head">
          <div>
            <p className="dr__eyebrow">Gorgona One AI</p>
            <h2 className="dr__title">{t.ai?.discoveryRoom || 'Discovery Room'}</h2>
          </div>
          <button type="button" className="dr__close" onClick={closeRoom} aria-label={t.ai?.closeAI || "Close Discovery Room"}>✕</button>
        </header>

        <form className="dr__ask" onSubmit={onAsk} role="search">
          <input
            className="dr__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.ai?.askAnywhere || "Ask from anywhere…"}
            aria-label={t.ai?.askPlaceholder || "Ask Gorgona One AI"}
          />
          <button type="submit" className="dr__go" disabled={busy}>{busy ? '…' : (t.ai?.ask || 'Ask')}</button>
        </form>

        <div className="dr__body">
          {askResults.length > 0 && (
            <Section title={t.ai?.results || "Results"}>
              {askResults.map((r) => (
                <ResultRow key={r.id} r={r} onGo={go} onSave={saveResult} onUnsave={removeSaved} saved={isSaved(r.id)} t={t} />
              ))}
            </Section>
          )}

          <Section
            title={`${t.ai?.saved || 'Saved'}${saved.length ? ` · ${saved.length}` : ''}`}
            empty={saved.length === 0 ? (t.ai?.pinResults || 'Pin results to keep them here — they stay while you browse.') : null}
          >
            {saved.map((r) => (
              <ResultRow key={r.id} r={r} onGo={go} onUnsave={removeSaved} saved onSave={saveResult} t={t} />
            ))}
          </Section>

          <Section
            title={t.ai?.recentSearches || "Recent searches"}
            action={history.length ? { label: t.ai?.clear || 'Clear', onClick: clearHistory } : null}
            empty={history.length === 0 ? (t.ai?.searchesKept || 'Your searches appear here and are kept across the site.') : null}
          >
            {history.map((h) => (
              <div key={h.id} className="dr__hist">
                <button type="button" className="dr__histQ" onClick={() => setQ(h.query)} title={t.ai?.reuseSearch || "Reuse this search"}>
                  <span className="dr__histIcon" aria-hidden="true">↻</span>
                  {h.query}
                </button>
                {h.results?.length > 0 && (
                  <div className="dr__histResults">
                    {h.results.slice(0, 3).map((r) => (
                      <button key={r.id} type="button" className="dr__mini" onClick={() => go(r)} title={r.title}>
                        {r.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Section>
        </div>

        <footer className="dr__foot">
          <button type="button" className="dr__return" onClick={returnToAI}>{t.ai?.returnToAI || 'Return to Gorgona One AI'}</button>
        </footer>
      </aside>

    </div>
  );
}

function Section({ title, action, empty, children }) {
  return (
    <section className="dr__section">
      <div className="dr__sectionHead">
        <h3 className="dr__sectionTitle">{title}</h3>
        {action && <button type="button" className="dr__sectionAction" onClick={action.onClick}>{action.label}</button>}
      </div>
      {empty ? <p className="dr__empty">{empty}</p> : <div className="dr__list">{children}</div>}
    </section>
  );
}

function ResultRow({ r, onGo, onSave, onUnsave, saved, t }) {
  return (
    <div className="dr__row">
      <button type="button" className="dr__rowMain" onClick={() => onGo(r)}>
        <span className="dr__rowType">{r.type}</span>
        <span className="dr__rowTitle">{r.title}</span>
        {r.subtitle && <span className="dr__rowSub">{r.subtitle}</span>}
      </button>
      <button
        type="button"
        className={`dr__pin ${saved ? 'is-saved' : ''}`}
        onClick={() => (saved ? onUnsave(r.id) : onSave(r))}
        aria-label={saved ? (t?.ai?.removeFromSaved || 'Remove from saved') : (t?.ai?.save || 'Save')}
        title={saved ? (t?.ai?.saved || 'Saved') : (t?.ai?.save || 'Save')}
      >
        {saved ? '★' : '☆'}
      </button>
    </div>
  );
}

