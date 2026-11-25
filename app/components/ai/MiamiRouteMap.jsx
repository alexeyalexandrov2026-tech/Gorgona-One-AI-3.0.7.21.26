"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  resolveMiamiRouteStops,
  projectMiamiCoord,
  haversineKm,
  getMiamiMapCopy
} from '../../../lib/ai/miamiMapData.mjs';

function buildRoutePath(stops) {
  if (!Array.isArray(stops) || stops.length < 2) return '';
  let d = `M ${stops[0].x} ${stops[0].y}`;
  for (let i = 1; i < stops.length; i += 1) {
    const prev = stops[i - 1];
    const curr = stops[i];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    // Gentle luxury curve toward Biscayne Bay
    const cx = mx - dy * 0.14;
    const cy = my + dx * 0.14;
    d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${curr.x} ${curr.y}`;
  }
  return d;
}

export function MiamiRouteMap({ messages = [], plan = null, listings = [], locale = 'en', streaming = false }) {
  const copy = getMiamiMapCopy(locale);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [zoom, setZoom] = useState(1);
  const [gpsState, setGpsState] = useState({ status: 'idle', lat: null, lng: null });
  const watchIdRef = useRef(null);

  const route = useMemo(
    () => resolveMiamiRouteStops({ messages, plan, listings, locale }),
    [messages, plan, listings, locale]
  );

  const visibleStops = useMemo(() => {
    if (filter === 'all') return route.stops;
    const matched = route.stops.filter((s) => s.kind === filter);
    return matched.length ? matched : route.stops;
  }, [route.stops, filter]);

  const activeStop = useMemo(
    () => visibleStops.find((s) => s.id === selectedId) || visibleStops[0] || null,
    [visibleStops, selectedId]
  );

  const routePath = useMemo(() => buildRoutePath(visibleStops), [visibleStops]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function toggleGps() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsState({ status: 'denied', lat: null, lng: null });
      return;
    }
    if (gpsState.status === 'active') {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setGpsState({ status: 'idle', lat: null, lng: null });
      return;
    }
    setGpsState({ status: 'locating', lat: null, lng: null });
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsState({
          status: 'active',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => {
        setGpsState({ status: 'denied', lat: null, lng: null });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  }

  const userPoint = useMemo(() => {
    if (gpsState.status !== 'active' || gpsState.lat === null || gpsState.lng === null) return null;
    return projectMiamiCoord(gpsState.lat, gpsState.lng);
  }, [gpsState]);

  const distanceToSelectedKm = useMemo(() => {
    if (gpsState.status !== 'active' || !activeStop || gpsState.lat === null) return null;
    return Math.round(haversineKm({ lat: gpsState.lat, lng: gpsState.lng }, activeStop) * 10) / 10;
  }, [gpsState, activeStop]);

  const filters = [
    { id: 'all', label: copy.filterAll },
    { id: 'car', label: copy.filterCar },
    { id: 'yacht', label: copy.filterYacht },
    { id: 'dining', label: copy.filterDining }
  ];

  const viewW = 480 / zoom;
  const viewH = 540 / zoom;
  const centerX = activeStop ? activeStop.x : 240;
  const centerY = activeStop ? activeStop.y : 270;
  const viewX = Math.max(0, Math.min(480 - viewW, centerX - viewW / 2));
  const viewY = Math.max(0, Math.min(540 - viewH, centerY - viewH / 2));

  return (
    <section
      data-miami-route-map="true"
      aria-label={copy.title}
      className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#061920]/90 shadow-premium"
    >
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-white">{copy.title}</span>
          <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-brand-gold">
            {copy.offlineBadge}
          </span>
          {streaming && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[0.65rem] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {copy.streamingLive}
            </span>
          )}
        </div>
        <button
          type="button"
          data-gps-toggle="true"
          onClick={toggleGps}
          className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-3 py-1 text-[0.68rem] font-medium transition ${
            gpsState.status === 'active'
              ? 'border-sky-400/60 bg-sky-400/20 text-sky-200'
              : 'border-white/15 bg-white/5 text-zinc-200 hover:border-brand-gold/50 hover:text-brand-gold'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${gpsState.status === 'active' ? 'animate-ping bg-sky-400' : 'bg-brand-gold'}`} />
          {gpsState.status === 'active'
            ? copy.gpsActive
            : gpsState.status === 'denied'
              ? copy.gpsDenied
              : copy.gpsButton}
        </button>
      </div>

      {/* Filter Pills + Transit Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-black/20 px-4 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-2.5 py-1 text-[0.68rem] font-medium transition ${
                filter === f.id
                  ? 'bg-brand-gold text-black'
                  : 'border border-white/10 bg-white/5 text-zinc-300 hover:border-brand-gold/40 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {route.totalDriveMin > 0 && (
            <span className="font-mono text-[0.66rem] text-zinc-300">
              {copy.totalTransit}: <strong className="text-brand-gold">{route.totalDriveMin} {copy.minUnit}</strong>
            </span>
          )}
          <div className="flex items-center overflow-hidden rounded-full border border-white/15 bg-black/40">
            <button
              type="button"
              aria-label="-"
              onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.35) * 100) / 100))}
              className="px-2 py-0.5 text-xs text-zinc-300 hover:text-white"
            >
              −
            </button>
            <button
              type="button"
              aria-label="+"
              onClick={() => setZoom((z) => Math.min(2.4, Math.round((z + 0.35) * 100) / 100))}
              className="border-l border-white/15 px-2 py-0.5 text-xs text-zinc-300 hover:text-white"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Offline Vector Greater Miami Map Canvas */}
      <div className="relative h-[300px] w-full select-none bg-[#05161d] sm:h-[360px] lg:h-[420px]">
        <svg
          viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
          className="h-full w-full"
          role="img"
          aria-label={copy.title}
        >
          <defs>
            <linearGradient id="elioOcean" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#04151c" />
              <stop offset="50%" stopColor="#072530" />
              <stop offset="100%" stopColor="#051922" />
            </linearGradient>
            <linearGradient id="elioRouteGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f3d689" />
              <stop offset="100%" stopColor="#d9b85b" />
            </linearGradient>
            <filter id="elioGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Deep Atlantic Ocean & Biscayne Bay */}
          <rect x="0" y="0" width="480" height="540" fill="url(#elioOcean)" />

          {/* Subtle Cartographic Grid */}
          <g stroke="#143a47" strokeWidth="0.6" opacity="0.45">
            {[60, 120, 180, 240, 300, 360, 420].map((gx) => (
              <line key={`gx-${gx}`} x1={gx} y1="0" x2={gx} y2="540" />
            ))}
            {[60, 120, 180, 240, 300, 360, 420, 480].map((gy) => (
              <line key={`gy-${gy}`} x1="0" y1={gy} x2="480" y2={gy} />
            ))}
          </g>

          {/* Miami Mainland Coastline (Opa-Locka, Design District, Wynwood, Downtown, Brickell, Coconut Grove) */}
          <path
            d="M 0 0 L 405 0 L 395 65 L 368 135 L 336 220 L 318 290 L 308 345 L 296 385 L 268 430 L 236 475 L 210 540 L 0 540 Z"
            fill="#0b2833"
            stroke="#1e5364"
            strokeWidth="1.2"
          />

          {/* Sunny Isles / Bal Harbour / Miami Beach Barrier Island */}
          <path
            d="M 432 0 L 446 0 L 444 95 L 445 190 L 442 285 L 424 358 L 410 364 L 401 344 L 409 275 L 421 180 L 425 85 Z"
            fill="#0e313e"
            stroke="#246276"
            strokeWidth="1.2"
          />

          {/* Venetian Islands & Star Island */}
          <ellipse cx="378" cy="348" rx="14" ry="7" fill="#133d4d" stroke="#2c758c" strokeWidth="0.9" />
          <ellipse cx="362" cy="322" rx="18" ry="5" fill="#113644" stroke="#246276" strokeWidth="0.8" />

          {/* Virginia Key & Key Biscayne */}
          <path
            d="M 382 400 L 402 415 L 396 435 L 372 426 Z"
            fill="#0e313e"
            stroke="#246276"
            strokeWidth="1"
          />
          <path
            d="M 366 444 L 385 452 L 378 520 L 352 512 L 355 462 Z"
            fill="#0e313e"
            stroke="#246276"
            strokeWidth="1.1"
          />

          {/* Iconic Miami Causeways & Highways (I-95, Julia Tuttle, Venetian, MacArthur, Rickenbacker) */}
          <g stroke="#2a6b7e" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.75">
            <line x1="295" y1="265" x2="430" y2="275" />
            <line x1="305" y1="318" x2="418" y2="322" />
            <line x1="300" y1="352" x2="412" y2="352" />
            <line x1="286" y1="398" x2="375" y2="418" />
            <path d="M 285 0 L 292 220 L 296 360 L 245 480" fill="none" strokeDasharray="none" strokeWidth="1.5" opacity="0.55" />
          </g>

          {/* Subtle Neighborhood Watermarks */}
          <g fill="#6ba0b0" fontFamily="monospace" fontSize="9" letterSpacing="1.6" opacity="0.7">
            <text x="86" y="102">OPF FBO</text>
            <text x="64" y="315">MIA INTL</text>
            <text x="200" y="275">WYNWOOD</text>
            <text x="218" y="378">BRICKELL</text>
            <text x="336" y="210" fill="#89c4d6" opacity="0.6">BISCAYNE BAY</text>
            <text x="394" y="310">MIAMI BEACH</text>
            <text x="348" y="366" fontSize="7.5">STAR ISLAND</text>
            <text x="334" y="492">KEY BISCAYNE</text>
          </g>

          {/* Glowing Golden Day Route Curve */}
          {routePath && (
            <>
              <path
                d={routePath}
                fill="none"
                stroke="#d9b85b"
                strokeWidth="4.5"
                strokeLinecap="round"
                opacity="0.28"
                filter="url(#elioGoldGlow)"
              />
              <path
                d={routePath}
                fill="none"
                stroke="url(#elioRouteGold)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Real Satellite GPS Live Dot (when active and inside Miami bounds) */}
          {userPoint && userPoint.inBounds && (
            <g transform={`translate(${userPoint.x}, ${userPoint.y})`}>
              <circle r="13" fill="#38bdf8" opacity="0.24" />
              <circle r="5.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* Numbered Interactive Route Pins */}
          {visibleStops.map((stop) => {
            const isSelected = activeStop?.id === stop.id;
            return (
              <g
                key={stop.id}
                transform={`translate(${stop.x}, ${stop.y})`}
                onClick={() => setSelectedId(stop.id)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${stop.number} ${stop.title}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(stop.id); }}
              >
                {isSelected && (
                  <circle r="19" fill="#d9b85b" opacity="0.22" filter="url(#elioGoldGlow)" />
                )}
                <circle
                  r={isSelected ? 13 : 11}
                  fill={isSelected ? '#d9b85b' : '#08232d'}
                  stroke="#d9b85b"
                  strokeWidth="2"
                />
                <text
                  textAnchor="middle"
                  dy="3.5"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="monospace"
                  fill={isSelected ? '#061920' : '#f3d689'}
                >
                  {stop.number}
                </text>
              </g>
            );
          })}
        </svg>

        {route.isSignaturePreview && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[0.65rem] text-zinc-300 backdrop-blur-sm">
            {copy.signaturePreviewHint}
          </div>
        )}
      </div>

      {/* Selected Stop Inspector + Free Navigation Deep-Links */}
      {activeStop && (
        <div className="grid gap-2.5 border-t border-white/10 bg-black/35 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-brand-gold">
                {activeStop.number} · {activeStop.time} · {activeStop.area}
                {activeStop.legMin > 0 ? ` · ${activeStop.legMin} ${copy.minUnit}` : ''}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">{activeStop.title}</p>
            </div>
            {distanceToSelectedKm !== null && (
              <span className="rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-0.5 font-mono text-[0.65rem] text-sky-200">
                {distanceToSelectedKm} {copy.kmUnit} {copy.distanceAway}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={activeStop.nav.appleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] text-zinc-200 transition hover:border-brand-gold/50 hover:text-white"
            >
              {copy.openAppleMaps} ↗
            </a>
            <a
              href={activeStop.nav.googleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] text-zinc-200 transition hover:border-brand-gold/50 hover:text-white"
            >
              {copy.openGoogleMaps} ↗
            </a>
            <a
              href={activeStop.nav.waze}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] text-zinc-200 transition hover:border-brand-gold/50 hover:text-white"
            >
              {copy.openWaze} ↗
            </a>
            {activeStop.href && (
              <Link
                href={activeStop.href}
                className="ml-auto rounded-full bg-brand-gold px-3 py-1 text-[0.68rem] font-semibold text-black transition hover:brightness-110"
              >
                {copy.openDetails} →
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
