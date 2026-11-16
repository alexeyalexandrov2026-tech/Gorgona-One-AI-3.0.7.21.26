// Pure showcase planning. Live inventory is loaded in lib/heroShowcaseData.js
// and passed in, so this module can run in the browser and in tests.

export const SHOWCASE_LIMITS = { car: 8, yacht: 6, stay: 6 };
export const SHOWCASE_INTERVAL_MS = 6500;
export const DESKTOP_CORNERS = ['tr', 'bl', 'tl', 'br', 'mr', 'ml'];
export const MOBILE_CORNERS = ['tl', 'tr'];
const ENTERS = ['swing', 'rise', 'focus', 'slide'];
const EXITS = ['outUp', 'outDown', 'outFade', 'outSide'];

export function showcasePrice(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!/\$\s?\d/.test(text) || /request|enquir|inquir/i.test(text)) return null;
  return text;
}

export function usablePhoto(src) {
  return typeof src === 'string' && (/^https?:\/\//i.test(src) || src.startsWith('/images/'));
}

// `diskReady` is false on the Cloudflare Worker: public/ is an asset, not a
// Node directory, so existsSync cannot see it. Deployed files are then decided
// by `shipped` (the asset binding). A path in neither place is dropped.
export function localPhotoPresent(src, { diskReady = false, onDisk = () => false, shipped = null } = {}) {
  if (!usablePhoto(src)) return false;
  const clean = src.split(/[?#]/)[0];
  if (clean.includes('..') || clean.includes('\\') || clean.includes('\0')) return false;
  if (!clean.startsWith('/')) return true;
  if (diskReady) return onDisk(clean);
  return shipped instanceof Set && shipped.has(clean);
}

function take(items, limit, imageOf, idOf) {
  const ranked = [...items.filter((item) => item.featured), ...items.filter((item) => !item.featured)];
  const picked = [];
  const seen = new Set();
  for (const item of ranked) {
    const image = imageOf(item);
    const id = idOf(item);
    if (!usablePhoto(image) || !id || seen.has(id)) continue;
    seen.add(id);
    picked.push(item);
    if (picked.length === limit) break;
  }
  return picked;
}

function bedroomsOf(stay) {
  const count = Number(stay.bedrooms);
  return Number.isFinite(count) && count > 0 ? count : null;
}

export function assembleShowcase({ rentals = [], yachts = [], stays = [], tickets = [], jetImage = '' } = {}) {
  const own = rentals.filter((car) => car.supplier !== 'Sunset Exotics');
  const priced = rentals.filter((car) => car.supplier === 'Sunset Exotics' && showcasePrice(car.dailyPrice));
  const cars = [
    ...take(own, 4, (car) => car.thumbnail || car.image, (car) => car.slug),
    ...take(priced.length ? priced : rentals.filter((car) => car.supplier === 'Sunset Exotics'), 4, (car) => car.thumbnail || car.image, (car) => car.slug)
  ];
  const cards = [
    ...cars.map((car) => ({
      cat: 'car',
      id: car.id || car.slug,
      href: `/rentals/${car.slug}`,
      image: car.thumbnail || car.image,
      title: car.title,
      company: car.company || '',
      category: car.category || '',
      location: car.location || '',
      price: showcasePrice(car.dailyPrice)
    })),
    ...take(yachts, SHOWCASE_LIMITS.yacht, (yacht) => yacht.image, (yacht) => yacht.slug).map((yacht) => ({
      cat: 'yacht',
      id: yacht.id || yacht.slug,
      href: `/yachts/${yacht.slug}`,
      image: yacht.image,
      title: yacht.title,
      company: yacht.company || '',
      length: yacht.length || '',
      location: yacht.location || ''
    })),
    ...take(stays, SHOWCASE_LIMITS.stay, (stay) => stay.image, (stay) => stay.slug).map((stay) => ({
      cat: 'stay',
      id: stay.id || stay.slug,
      href: `/vacation-rentals/${stay.slug}`,
      image: stay.image,
      title: stay.title,
      location: stay.location || '',
      bedrooms: bedroomsOf(stay)
    }))
  ];
  if (usablePhoto(jetImage)) {
    cards.push({
      cat: 'jet',
      id: 'private-jets',
      href: '/private-jets',
      image: jetImage,
      title: 'Private Jets'
    });
  }
  for (const ticket of tickets) {
    if (!ticket?.href || !usablePhoto(ticket.image)) continue;
    cards.push({
      cat: 'event',
      id: ticket.id,
      lineId: ticket.id,
      href: ticket.href,
      image: ticket.image,
      title: ticket.label || '',
      kicker: ticket.label || ''
    });
  }
  const seen = new Set();
  return cards.filter((card) => {
    if (!card.href || seen.has(card.href)) return false;
    seen.add(card.href);
    return true;
  });
}

export function cornerSide(corner) {
  return corner.endsWith('l') ? 'L' : 'R';
}

export function nextShowcaseStep(pool, state, rnd = Math.random, mobile = false) {
  if (!pool.length) return null;
  const used = new Set(state?.used || []);
  if (pool.every((item) => used.has(item.href))) used.clear();
  const available = pool.filter((item) => !used.has(item.href));
  const source = available.length ? available : pool;
  let categories = [...new Set(source.map((item) => item.cat))].filter((cat) => cat !== state?.lastCat);
  if (!categories.length) categories = [...new Set(source.map((item) => item.cat))];
  const cat = categories[Math.floor(rnd() * categories.length)];
  const items = source.filter((item) => item.cat === cat);
  const item = items[Math.floor(rnd() * items.length)];
  used.add(item.href);

  const corners = (mobile ? MOBILE_CORNERS : DESKTOP_CORNERS).filter((corner) => {
    if (!state?.lastCorner) return true;
    return corner !== state.lastCorner && cornerSide(corner) !== cornerSide(state.lastCorner);
  });
  const corner = (corners.length ? corners : (mobile ? MOBILE_CORNERS : DESKTOP_CORNERS))[Math.floor(rnd() * (corners.length || (mobile ? 2 : 6)))];
  const enters = ENTERS.filter((name) => name !== state?.lastEnter);
  const enter = enters[Math.floor(rnd() * enters.length)];
  const exit = EXITS[Math.floor(rnd() * EXITS.length)];
  const side = cornerSide(corner);
  const rot = `${((rnd() * 7) + 2) * (side === 'L' ? -1 : 1)}deg`;
  return {
    item,
    corner,
    enter: enter === 'slide' ? (side === 'L' ? 'slideL' : 'slideR') : enter,
    exit: exit === 'outSide' ? (side === 'L' ? 'outL' : 'outR') : exit,
    rot,
    state: { lastCat: cat, lastCorner: corner, lastEnter: enter, used }
  };
}
