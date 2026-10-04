"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CONSTELLATIONS,
  discoveryCategories,
  EXAMPLE_PROMPTS,
  matchCategories
} from '../../lib/discoveryCategories';

// ===========================================================================
// AI Discovery Sphere — the signature "Popular Categories" centerpiece.
//
// A living Canvas-2D particle field (no WebGL / no new dependencies) with the
// GORGONA AI Concierge at its core. The 19 categories are organized into the
// constellations from lib/discoveryCategories and surface from the field rather
// than sitting in a grid.
//
// Phase 1 (this file) is visual + interaction only: the microphone and the
// "AI understands your intent" behaviour are simulated on the client, and typed
// queries are routed by keyword match (matchCategories) to routes that already
// exist. No backend, no real speech recognition — that is Phase 2.
// ===========================================================================

const clusterColor = CONSTELLATIONS.reduce((acc, c) => {
  acc[c.id] = c.color;
  return acc;
}, {});

// Simulated transcript shown while the mic "listens" (Phase 1 UX only).
const SIM_TRANSCRIPT = 'Find me a yacht charter in Miami this weekend…';

export default function CategoryOrb() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const engineRef = useRef(null);

  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('resting'); // resting | listening | intent
  const [matches, setMatches] = useState([]);
  const [activeCluster, setActiveCluster] = useState(null);
  const [openCluster, setOpenCluster] = useState(null);
  const [placeholder, setPlaceholder] = useState(EXAMPLE_PROMPTS[0]);
  const listenTimer = useRef(null);

  const reduceMotion = usePrefersReducedMotion();

  // --- Rotating placeholder prompts (paused while the user is typing) --------
  useEffect(() => {
    if (query || phase !== 'resting') return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % EXAMPLE_PROMPTS.length;
      setPlaceholder(EXAMPLE_PROMPTS[i]);
    }, 3600);
    return () => clearInterval(id);
  }, [query, phase]);

  // --- Particle engine lifecycle -------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const engine = createParticleField(canvas, wrap, { reduceMotion });
    engineRef.current = engine;

    // Pause the animation loop while the section is off-screen.
    const io = new IntersectionObserver(
      (entries) => engine.setVisible(entries[0].isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(wrap);

    return () => {
      io.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [reduceMotion]);

  // --- Push interaction state into the engine ------------------------------
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setState({
      phase,
      activeClusterId: activeCluster
    });
  }, [phase, activeCluster]);

  // --- Query -> matches -> highlight ----------------------------------------
  function runQuery(value) {
    const found = matchCategories(value, 4);
    setMatches(found);
    if (found.length) {
      setPhase('intent');
      setActiveCluster(found[0].cluster);
    } else {
      setPhase('resting');
      setActiveCluster(null);
    }
  }

  function onChange(e) {
    const v = e.target.value;
    setQuery(v);
    if (phase === 'listening') return;
    if (v.trim()) runQuery(v);
    else {
      setMatches([]);
      setPhase('resting');
      setActiveCluster(null);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const found = matchCategories(query, 1);
    if (found.length) router.push(found[0].href);
  }

  // --- Simulated microphone (Phase 1) --------------------------------------
  function toggleMic() {
    if (phase === 'listening') {
      stopListening();
      return;
    }
    clearTimeout(listenTimer.current);
    setPhase('listening');
    setActiveCluster(null);
    setMatches([]);
    // Simulate a captured phrase, then resolve to matches.
    listenTimer.current = setTimeout(() => {
      setQuery(SIM_TRANSCRIPT.replace(/…$/, ''));
      runQuery(SIM_TRANSCRIPT);
    }, 2200);
  }

  function stopListening() {
    clearTimeout(listenTimer.current);
    setPhase(query.trim() ? 'intent' : 'resting');
  }

  useEffect(() => () => clearTimeout(listenTimer.current), []);

  // --- Constellation chip helpers ------------------------------------------
  const categoriesByCluster = useMemo(() => {
    const map = {};
    for (const cat of discoveryCategories) {
      (map[cat.cluster] = map[cat.cluster] || []).push(cat);
    }
    return map;
  }, []);

  const stateLine =
    phase === 'listening'
      ? 'Listening · EN · RU · ES · FR'
      : phase === 'intent' && matches.length
      ? `Surfacing · ${constellationName(matches[0].cluster)}`
      : 'Ask, tap to speak, or explore below';

  return (
    <div ref={wrapRef} className="orb-wrap">
      <canvas ref={canvasRef} className="orb-canvas" aria-hidden="true" />

      {/* Concierge core */}
      <div className={`orb-core ${phase === 'listening' ? 'is-listening' : ''}`}>
        <p className="orb-core__eyebrow">Gorgona AI Concierge</p>
        <form className="orb-core__bar" onSubmit={onSubmit} role="search">
          <input
            className="orb-core__input"
            type="text"
            value={query}
            onChange={onChange}
            placeholder={placeholder}
            aria-label="Ask the Gorgona AI Concierge"
            autoComplete="off"
          />
          <button
            type="button"
            className="orb-core__mic"
            onClick={toggleMic}
            aria-pressed={phase === 'listening'}
            aria-label={phase === 'listening' ? 'Stop listening' : 'Speak your request'}
          >
            <span className="orb-core__halo" aria-hidden="true" />
            <MicIcon />
          </button>
        </form>
        <p className="orb-core__state" aria-live="polite">
          {phase === 'listening' ? (
            <span className="orb-core__transcript">{SIM_TRANSCRIPT}</span>
          ) : (
            stateLine
          )}
        </p>

        {/* Intent matches — tappable, route to existing pages */}
        {phase === 'intent' && matches.length > 0 && (
          <div className="orb-core__matches">
            {matches.map((cat) => (
              <button
                key={cat.label + cat.href}
                type="button"
                className="orb-chip orb-chip--match"
                onClick={() => router.push(cat.href)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Constellation legend — guarantees access to all 19 categories.
          Tap a constellation to reveal its categories as routing chips. */}
      <div className="orb-legend">
        {CONSTELLATIONS.map((c) => {
          const isOpen = openCluster === c.id;
          return (
            <div key={c.id} className={`orb-legend__group ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="orb-legend__name"
                onClick={() => setOpenCluster(isOpen ? null : c.id)}
                onMouseEnter={() => setActiveCluster(c.id)}
                onMouseLeave={() => phase !== 'intent' && setActiveCluster(null)}
                aria-expanded={isOpen}
                style={{ '--c': `rgb(${c.color.join(',')})` }}
              >
                <span className="orb-legend__dot" />
                {c.name}
              </button>
              {isOpen && (
                <div className="orb-legend__items">
                  {(categoriesByCluster[c.id] || []).map((cat) => (
                    <button
                      key={cat.label + cat.href}
                      type="button"
                      className="orb-chip"
                      onClick={() => router.push(cat.href)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

function constellationName(id) {
  const c = CONSTELLATIONS.find((x) => x.id === id);
  return c ? c.name : '';
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2a2013" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

// ===========================================================================
// Canvas-2D particle field. Kept framework-agnostic (plain closure) so React
// only owns the interface layer; the field owns its own rAF loop.
// ===========================================================================
function createParticleField(canvas, wrap, { reduceMotion }) {
  const ctx = canvas.getContext('2d');
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  let DPR = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0;
  let H = 0;
  let cx = 0;
  let cy = 0;
  let R = 0;
  let count = 0;
  let pts = [];
  let nodes = [];

  let rot = 0;
  let raf = 0;
  let visible = true;
  let last = performance.now();
  let ambientT = 0;
  let ambientIdx = 0;

  const state = { phase: 'resting', activeClusterId: null };
  const mouse = { x: 0, y: 0, on: false };

  // FPS guard — shed particles if we can't hold ~50fps.
  let fpsAccum = 0;
  let fpsFrames = 0;

  function pickCount() {
    const area = W * H;
    const base = area < 150000 ? 1200 : area < 320000 ? 1800 : 2600;
    return reduceMotion ? Math.round(base * 0.4) : base;
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2;
    cy = H * 0.46;
    R = Math.min(W, H) * 0.34;
    const target = pickCount();
    if (target !== count) build(target);
  }

  function build(target) {
    count = target;
    pts = [];
    const clusterIds = CONSTELLATIONS.map((c) => c.id);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      pts.push({
        phi,
        theta,
        r: 0.84 + Math.random() * 0.24,
        drift: Math.random() * Math.PI * 2,
        spd: 0.4 + Math.random() * 0.8,
        cl: clusterIds[Math.floor(Math.random() * clusterIds.length)]
      });
    }
    // One label node per constellation, spread around the sphere.
    nodes = CONSTELLATIONS.map((c, i) => {
      const t = (i + 0.5) / CONSTELLATIONS.length;
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        phi: Math.acos(1 - 2 * t),
        theta: Math.PI * (1 + Math.sqrt(5)) * i * 3.1
      };
    });
  }

  function project(phi, theta, r) {
    const st = Math.sin(phi);
    return {
      x: r * st * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * st * Math.sin(theta)
    };
  }

  function frame(dt) {
    rot += dt * 0.055;
    ambientT += dt;
    if (state.phase === 'resting' && ambientT > 3.8) {
      ambientT = 0;
      ambientIdx = (ambientIdx + 1) % CONSTELLATIONS.length;
    }

    const breathe = 1 + Math.sin(rot * 0.9) * 0.03;
    const pull = state.phase === 'listening' ? 0.72 : 1;
    const intent = state.phase === 'intent';
    const activeId =
      intent ? state.activeClusterId
      : state.activeClusterId ? state.activeClusterId
      : state.phase === 'resting' ? CONSTELLATIONS[ambientIdx].id
      : null;

    ctx.clearRect(0, 0, W, H);

    const buf = [];
    for (let i = 0; i < count; i++) {
      const p = pts[i];
      const th = p.theta + rot + Math.sin(rot * p.spd + p.drift) * 0.05;
      const pr = project(p.phi, th, p.r * breathe * pull);
      const persp = 1 / (1.9 - pr.z * 0.5);
      let sx = cx + pr.x * R * persp;
      let sy = cy + pr.y * R * persp;

      if (mouse.on && finePointer) {
        const dx = sx - mouse.x;
        const dy = sy - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 100) {
          const f = ((100 - d) / 100) * 0.22;
          sx -= dx * f;
          sy -= dy * f;
        }
      }

      const depth = (pr.z + 1) / 2;
      const col = clusterColor[p.cl];
      let a;
      if (intent) {
        a = p.cl === activeId ? 0.3 + depth * 0.6 : 0.05 + depth * 0.07;
      } else {
        a = 0.12 + depth * 0.4;
      }
      const size = (0.5 + depth * 1.6) * (W < 340 ? 0.9 : 1);
      buf.push({ sx, sy, size, a, col, depth });
    }

    buf.sort((A, B) => A.depth - B.depth);
    for (let k = 0; k < buf.length; k++) {
      const b = buf[k];
      ctx.beginPath();
      ctx.fillStyle = `rgba(${b.col[0]},${b.col[1]},${b.col[2]},${b.a.toFixed(3)})`;
      ctx.arc(b.sx, b.sy, b.size, 0, 6.283);
      ctx.fill();
    }

    // Constellation labels (front-facing only, kept clear of the core band).
    ctx.font = `600 ${W < 340 ? 9 : 11}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    for (let n = 0; n < nodes.length; n++) {
      const nd = nodes[n];
      const npr = project(nd.phi, nd.theta + rot, 1.04);
      if (npr.z < -0.1) continue;
      const npersp = 1 / (1.9 - npr.z * 0.5);
      const lx = cx + npr.x * R * npersp;
      const ly = cy + npr.y * R * npersp;
      const front = (npr.z + 1) / 2;
      let la;
      if (intent) la = nd.id === activeId ? 0.95 : 0.05;
      else if (nd.id === activeId) la = 0.25 + 0.6 * front;
      else la = 0.1 * front;

      // Avoid drawing over the Concierge card in the middle band.
      if (Math.abs(ly - cy) < R * 0.5 && Math.abs(lx - cx) < R * 0.85) continue;
      ctx.fillStyle = `rgba(${nd.color[0]},${nd.color[1]},${nd.color[2]},${la.toFixed(3)})`;
      ctx.fillText(nd.name, lx, ly);
    }
  }

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum >= 1) {
      const fps = fpsFrames / fpsAccum;
      if (fps < 45 && count > 700) build(Math.round(count * 0.8));
      fpsAccum = 0;
      fpsFrames = 0;
    }

    frame(dt);
    if (visible && !reduceMotion) raf = requestAnimationFrame(loop);
  }

  function start() {
    if (raf || reduceMotion) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // Listeners
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.on = true;
  };
  const onLeave = () => {
    mouse.on = false;
  };
  const onResize = () => {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    resize();
  };

  if (finePointer) {
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
  }
  window.addEventListener('resize', onResize);

  resize();
  if (reduceMotion) frame(0); // single static paint
  else start();

  return {
    setState(next) {
      Object.assign(state, next);
      if (reduceMotion) frame(0);
    },
    setVisible(v) {
      visible = v;
      if (v) start();
      else stop();
    },
    destroy() {
      stop();
      window.removeEventListener('resize', onResize);
      if (finePointer) {
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerleave', onLeave);
      }
    }
  };
}

// ===========================================================================
// Scoped styles — warm ivory/editorial ground so the sphere continues the
// light homepage rather than cutting into a dark mode.
// ===========================================================================
const styles = `
  .orb-wrap {
    position: relative;
    width: 100%;
    min-height: 560px;
    height: 78vh;
    max-height: 760px;
    border-radius: 32px;
    overflow: hidden;
    background:
      radial-gradient(120% 90% at 50% 24%, #faf5ec 0%, #f1e7d3 52%, #e7d8bd 100%);
    border: 1px solid rgba(198, 160, 94, 0.18);
  }
  .orb-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .orb-core {
    position: absolute;
    left: 50%;
    top: 46%;
    transform: translate(-50%, -50%);
    width: min(88%, 440px);
    text-align: center;
    z-index: 3;
  }
  .orb-core__eyebrow {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 9px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #a9823f;
    margin: 0 0 10px;
  }
  .orb-core__bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px 8px 18px;
    border-radius: 999px;
    background: rgba(255, 253, 248, 0.74);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(198, 160, 94, 0.42);
    box-shadow: 0 20px 46px -20px rgba(60, 45, 12, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }
  .orb-core__input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: #2e2a22;
    font-family: inherit;
  }
  .orb-core__input::placeholder { color: #8a7f6c; }
  .orb-core__mic {
    flex: none;
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.55);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 34% 28%, #fffdf6 0%, #c6a05e 58%, #8a6528 100%);
    box-shadow: 0 6px 14px -4px rgba(138, 101, 40, 0.6),
      inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    transition: transform 0.2s ease;
  }
  .orb-core__mic:hover { transform: scale(1.05); }
  .orb-core__mic:focus-visible { outline: 2px solid #a9823f; outline-offset: 3px; }
  .orb-core__halo {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 1.5px solid #c6a05e;
    opacity: 0;
    pointer-events: none;
  }
  .is-listening .orb-core__halo { animation: orbHalo 1.6s ease-out infinite; }
  @keyframes orbHalo {
    0% { opacity: 0.6; transform: scale(0.85); }
    100% { opacity: 0; transform: scale(1.8); }
  }
  .orb-core__state {
    margin: 11px 0 0;
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6b6252;
    min-height: 12px;
  }
  .orb-core__transcript { color: #a9823f; text-transform: none; letter-spacing: 0.02em; font-size: 11px; }

  .orb-core__matches {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }

  .orb-chip {
    font-family: inherit;
    font-size: 12px;
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid rgba(198, 160, 94, 0.4);
    background: rgba(255, 253, 248, 0.6);
    color: #5b544a;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .orb-chip:hover { background: #dec088; border-color: #c6a05e; color: #2a2013; }
  .orb-chip--match {
    background: radial-gradient(circle at 40% 30%, #fffef9, #dec088);
    border-color: #c6a05e;
    color: #2a2013;
    box-shadow: 0 6px 16px -8px rgba(138, 101, 40, 0.5);
  }

  .orb-legend {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 20px;
    z-index: 3;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 10px;
    padding: 0 16px;
  }
  .orb-legend__group { position: relative; }
  .orb-legend__name {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #6b6252;
    background: rgba(255, 253, 248, 0.55);
    border: 1px solid rgba(198, 160, 94, 0.28);
    border-radius: 999px;
    padding: 7px 13px;
    cursor: pointer;
    transition: color 0.2s ease, border-color 0.2s ease;
  }
  .orb-legend__name:hover,
  .is-open .orb-legend__name {
    color: #2a2013;
    border-color: var(--c, #c6a05e);
  }
  .orb-legend__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c, #c6a05e);
  }
  .orb-legend__items {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    width: max-content;
    max-width: 68vw;
    padding: 10px;
    border-radius: 16px;
    background: rgba(252, 249, 242, 0.94);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(198, 160, 94, 0.32);
    box-shadow: 0 18px 40px -20px rgba(60, 45, 12, 0.5);
  }

  @media (min-width: 768px) {
    .orb-wrap { height: 640px; max-height: 720px; }
    .orb-core { width: min(70%, 420px); }
    .orb-core__input { font-size: 15px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .is-listening .orb-core__halo { animation: none; opacity: 0.4; }
  }
`;
