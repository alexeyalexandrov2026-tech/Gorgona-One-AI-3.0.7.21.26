// Thematic masthead for the Concerts & Live Shows pillar. It sits inside the
// existing gazette container on /events/category/concerts and gives that view
// its own identity next to Sports, without touching the frame around it.
//
// The artwork is drawn locally rather than loaded from a photo CDN so the panel
// always renders. It is layered rather than one canvas: the rig and its beams
// hang from the top edge, the crowd is pinned to the bottom edge and scales
// with the width, so nothing important is ever cropped at any panel height.

const LAMPS = [190, 432, 772, 1016];

const BEAMS = [
  { points: '190,22 62,300 318,300', fill: 'url(#liveBeamGold)' },
  { points: '432,22 258,300 606,300', fill: 'url(#liveBeamViolet)' },
  { points: '772,22 604,300 940,300', fill: 'url(#liveBeamGold)' },
  { points: '1016,22 884,300 1148,300', fill: 'url(#liveBeamViolet)' }
];

const BOKEH = [
  { cx: 140, cy: 84, r: 5 }, { cx: 318, cy: 54, r: 3.4 }, { cx: 500, cy: 106, r: 4.2 },
  { cx: 690, cy: 62, r: 3 }, { cx: 868, cy: 96, r: 5.2 }, { cx: 1042, cy: 50, r: 3.6 },
  { cx: 1150, cy: 118, r: 4.4 }, { cx: 236, cy: 138, r: 2.6 }, { cx: 940, cy: 150, r: 3 }
];

// x positions and radii for the silhouetted heads along the bottom edge
const HEADS = [
  { x: 18, r: 17 }, { x: 66, r: 13 }, { x: 112, r: 19 }, { x: 164, r: 14 },
  { x: 210, r: 17 }, { x: 260, r: 12 }, { x: 304, r: 18 }, { x: 356, r: 14 },
  { x: 402, r: 16 }, { x: 452, r: 13 }, { x: 498, r: 19 }, { x: 550, r: 14 },
  { x: 596, r: 17 }, { x: 646, r: 12 }, { x: 690, r: 18 }, { x: 742, r: 15 },
  { x: 788, r: 17 }, { x: 838, r: 13 }, { x: 884, r: 19 }, { x: 936, r: 14 },
  { x: 982, r: 17 }, { x: 1032, r: 12 }, { x: 1076, r: 18 }, { x: 1128, r: 15 },
  { x: 1176, r: 17 }
];

const ARMS = [
  { x: 88, tilt: -13 }, { x: 236, tilt: 9 }, { x: 380, tilt: -8 },
  { x: 526, tilt: 12 }, { x: 668, tilt: -11 }, { x: 812, tilt: 7 },
  { x: 958, tilt: -9 }, { x: 1104, tilt: 11 }
];

export function LiveShowsBanner() {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-villa-obsidian/15 bg-[#0a0512] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]">
      {/* Rig, beams and house lights — hung from the top edge */}
      <svg
        viewBox="0 0 1200 300"
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="liveSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0c2b" />
            <stop offset="55%" stopColor="#0d0619" />
            <stop offset="100%" stopColor="#07030d" />
          </linearGradient>
          <linearGradient id="liveBeamGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd071" stopOpacity="0.52" />
            <stop offset="70%" stopColor="#ffd071" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ffd071" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="liveBeamViolet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c08cff" stopOpacity="0.44" />
            <stop offset="70%" stopColor="#c08cff" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#c08cff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="1200" height="300" fill="url(#liveSky)" />
        {BEAMS.map((beam) => (
          <polygon key={beam.points} points={beam.points} fill={beam.fill} />
        ))}
        {BOKEH.map((dot) => (
          <circle key={`${dot.cx}-${dot.cy}`} {...dot} fill="#ffe3a8" opacity="0.45" />
        ))}
        <rect x="0" y="14" width="1200" height="3" fill="#ffffff" opacity="0.14" />
        {LAMPS.map((x) => (
          <g key={`lamp-${x}`}>
            <circle cx={x} cy="22" r="14" fill="#ffcf6b" opacity="0.16" />
            <circle cx={x} cy="22" r="6.5" fill="#ffe6b0" opacity="0.9" />
          </g>
        ))}
      </svg>

      {/* Footlight wash behind the crowd */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(58%_100%_at_50%_100%,rgba(255,203,110,0.22),transparent_72%)]" />

      {/* Crowd — pinned to the bottom edge, scales with the panel width */}
      <svg
        viewBox="0 0 1200 150"
        className="absolute inset-x-0 bottom-0 w-full"
        aria-hidden="true"
      >
        <g fill="#050209">
          {ARMS.map((arm) => (
            <rect
              key={`arm-${arm.x}`}
              x={arm.x - 5}
              y="34"
              width="10"
              height="100"
              rx="5"
              transform={`rotate(${arm.tilt} ${arm.x} 120)`}
            />
          ))}
          {HEADS.map((head) => (
            <circle key={`head-${head.x}`} cx={head.x} cy={118 - head.r} r={head.r} />
          ))}
          <rect x="0" y="112" width="1200" height="38" />
        </g>
      </svg>

      {/* Legibility scrim for the copy block */}
      <div className="absolute inset-0 bg-[linear-gradient(96deg,rgba(6,3,10,0.93)_0%,rgba(6,3,10,0.76)_38%,rgba(6,3,10,0.2)_68%,rgba(6,3,10,0.5)_100%)]" />

      <div className="relative px-7 py-12 sm:px-11 sm:py-14 lg:px-14 lg:py-16">
        <p className="lux-eyebrow">Live on stage</p>
        <h3 className="mt-5 max-w-xl font-serif text-4xl italic leading-[1.02] text-white sm:text-5xl">
          Concerts &amp; <span className="text-brand-gold">Live Shows</span>
        </h3>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-300/90">
          Front-row seats, pit access and private boxes for the tours, festivals and stage
          productions worth travelling for.
        </p>
      </div>
    </div>
  );
}
