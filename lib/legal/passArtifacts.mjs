// Zero-dependency ELIO+ Reservation Pass utilities:
// 1. Standards-compliant ISO/IEC 18004 QR Code (Byte Mode, ECC Level L, Versions 1..6)
//    so any smartphone camera scans the Confirmed Reservation Pass URL directly.
// 2. RFC 5545 .ics calendar pass generator (Apple Calendar / Google Calendar / Outlook).

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data, ecCount) {
  const gen = rsGenerator(ecCount);
  const res = new Uint8Array(ecCount);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.copyWithin(0, 1);
    res[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let i = 0; i < ecCount; i += 1) {
        res[i] ^= gfMul(gen[i + 1], factor);
      }
    }
  }
  return res;
}

// QR Versions 1..6, ECC Level L (single-block for v1-v5, 2-block for v6)
const QR_VERSIONS = [
  { version: 1, size: 21, dataBytes: 19, ecBytes: 7, blocks: 1, align: [] },
  { version: 2, size: 25, dataBytes: 34, ecBytes: 10, blocks: 1, align: [6, 18] },
  { version: 3, size: 29, dataBytes: 55, ecBytes: 15, blocks: 1, align: [6, 22] },
  { version: 4, size: 33, dataBytes: 80, ecBytes: 20, blocks: 1, align: [6, 26] },
  { version: 5, size: 37, dataBytes: 108, ecBytes: 26, blocks: 1, align: [6, 30] },
  { version: 6, size: 41, dataBytes: 136, ecBytes: 18, blocks: 2, align: [6, 34] }
];

// Format info bits for ECC Level L (01) and Mask 0 (000) -> 0x77c4 (MSB first)
const FORMAT_BITS_L_M0 = 0x77c4;

export function generateQrMatrix(text) {
  const bytes = new TextEncoder().encode(String(text || '').slice(0, 130));
  const spec = QR_VERSIONS.find((v) => bytes.length + 2 <= v.dataBytes) || QR_VERSIONS[QR_VERSIONS.length - 1];
  const payload = bytes.slice(0, Math.max(1, spec.dataBytes - 2));

  // Build bitstream: mode 0100 (byte), 8-bit length, payload, terminator, pad bytes
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(payload.length, 8);
  for (const b of payload) pushBits(b, 8);
  const maxBits = spec.dataBytes * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx += 1;
  }

  const dataCodewords = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < spec.dataBytes; i += 1) {
    let val = 0;
    for (let b = 0; b < 8; b += 1) val = (val << 1) | bits[i * 8 + b];
    dataCodewords[i] = val;
  }

  // Compute ECC & interleave blocks
  const blockLen = spec.dataBytes / spec.blocks;
  const dataBlocks = [];
  const ecBlocks = [];
  for (let b = 0; b < spec.blocks; b += 1) {
    const slice = dataCodewords.slice(b * blockLen, (b + 1) * blockLen);
    dataBlocks.push(slice);
    ecBlocks.push(rsRemainder(slice, spec.ecBytes));
  }
  const finalBytes = [];
  for (let i = 0; i < blockLen; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) finalBytes.push(dataBlocks[b][i]);
  }
  for (let i = 0; i < spec.ecBytes; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) finalBytes.push(ecBlocks[b][i]);
  }

  const n = spec.size;
  const grid = Array.from({ length: n }, () => new Uint8Array(n));
  const reserved = Array.from({ length: n }, () => new Uint8Array(n));

  const setMod = (r, c, dark, isReserved = true) => {
    if (r < 0 || c < 0 || r >= n || c >= n) return;
    grid[r][c] = dark ? 1 : 0;
    if (isReserved) reserved[r][c] = 1;
  };

  // Finder patterns + separators
  const drawFinder = (tr, tc) => {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const rr = tr + r;
        const cc = tc + c;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark = inside && (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        );
        setMod(rr, cc, dark, true);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);

  // Alignment patterns
  for (const ar of spec.align) {
    for (const ac of spec.align) {
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= n - 9) || (ar >= n - 9 && ac <= 8)) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setMod(ar + dr, ac + dc, dark, true);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < n - 8; i += 1) {
    setMod(6, i, i % 2 === 0, true);
    setMod(i, 6, i % 2 === 0, true);
  }

  // Dark module
  setMod(n - 8, 8, true, true);

  // Format info (ECC L, Mask 0)
  const fmtBits = [];
  for (let i = 14; i >= 0; i -= 1) fmtBits.push((FORMAT_BITS_L_M0 >> i) & 1);
  const fmtCoordsA = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  const fmtCoordsB = [
    [n - 1, 8], [n - 2, 8], [n - 3, 8], [n - 4, 8], [n - 5, 8], [n - 6, 8], [n - 7, 8],
    [8, n - 8], [8, n - 7], [8, n - 6], [8, n - 5], [8, n - 4], [8, n - 3], [8, n - 2], [8, n - 1]
  ];
  for (let i = 0; i < 15; i += 1) {
    setMod(fmtCoordsA[i][0], fmtCoordsA[i][1], fmtBits[i] === 1, true);
    setMod(fmtCoordsB[i][0], fmtCoordsB[i][1], fmtBits[i] === 1, true);
  }

  // Place data bits in upward/downward 2-column zigzag with Mask 0: (r + c) % 2 === 0
  let bitIdx = 0;
  const totalBits = finalBytes.length * 8;
  let upward = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < n; step += 1) {
      const r = upward ? n - 1 - step : step;
      for (const c of [col, col - 1]) {
        if (reserved[r][c]) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          bit = (finalBytes[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
          bitIdx += 1;
        }
        const masked = ((r + c) % 2 === 0) ? (bit ^ 1) : bit;
        grid[r][c] = masked;
      }
    }
    upward = !upward;
  }

  return { size: n, grid };
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatIcsUtc(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildReservationIcs(quote, passUrl = 'https://gorgona-one.com') {
  const now = new Date();
  // Try parsing first ISO or human date from serviceDates; fallback to tomorrow 14:00 UTC.
  const isoMatch = String(quote?.serviceDates || '').match(/(\d{4}-\d{2}-\d{2})/);
  const start = isoMatch ? new Date(`${isoMatch[1]}T16:00:00Z`) : new Date(now.getTime() + 24 * 3600 * 1000);
  const end = new Date(start.getTime() + 4 * 3600 * 1000);

  const lines = [
    `Reference: ${quote?.referenceCode || 'ELIO'}`,
    `Supplier: ${quote?.supplierName || 'Miami Elio Partner'}`,
    `Dates: ${quote?.serviceDates || 'Confirmed'}`,
    quote?.flightNumber ? `Flight Sync: ${quote.flightNumber}${quote.arrivalAirport ? ` (${quote.arrivalAirport})` : ''}${quote.arrivalTime ? ` · ${quote.arrivalTime}` : ''}` : null,
    quote?.deliveryLocation ? `Handover Location: ${quote.deliveryLocation}` : null,
    quote?.kycStatus === 'verified' ? 'Online KYC: Verified (Stripe Identity)' : null,
    quote?.weatherShieldEnabled !== false ? 'NOAA Weather Shield: Active (Free Reschedule or 100% Refund)' : null,
    'ELIO+ Shield & Care 24/7: Active',
    `Digital Pass: ${passUrl}`
  ].filter(Boolean);

  const location = quote?.deliveryLocation || quote?.arrivalAirport || 'Miami, FL';
  const uid = `${(quote?.referenceCode || 'elio-pass').toLowerCase().replace(/[^a-z0-9-]/g, '')}@gorgona-one.com`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MIAMI ELIO//ELIO+ Reservation Pass//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(now)}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(`MIAMI ELIO · ${quote?.itemTitle || 'Confirmed Reservation'}`)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(lines.join('\n'))}`,
    `URL:${passUrl}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}
