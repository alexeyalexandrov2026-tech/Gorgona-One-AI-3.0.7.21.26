import { existsSync } from 'node:fs';
import path from 'node:path';
import { getRentals, getYachts, getVacationRentals } from './data/listings.js';
import { HOME_TICKETS, smallPhoto } from './homeTickets.js';
import { assembleShowcase, localPhotoPresent, usablePhoto } from './heroShowcase.js';

const JET_IMAGE = '/images/home/worlds/travel-wing.jpg';
const shippedCache = new Map();

function publicImagesOnDisk() {
  try {
    return existsSync(path.join(process.cwd(), 'public', 'images'));
  } catch {
    return false;
  }
}

function onDisk(src) {
  try {
    return existsSync(path.join(process.cwd(), 'public', src.replace(/^\//, '')));
  } catch {
    return false;
  }
}

async function rememberDeployed(srcs) {
  const pending = [...new Set(srcs)].filter((src) => !shippedCache.has(src));
  if (!pending.length) return;
  let assets = null;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    assets = getCloudflareContext().env?.ASSETS;
  } catch {
    assets = null;
  }
  if (!assets?.fetch) {
    for (const src of pending) shippedCache.set(src, false);
    return;
  }
  await Promise.all(pending.map(async (src) => {
    try {
      const response = await assets.fetch(new Request(`https://assets.local${src}`, { method: 'HEAD' }));
      await response.body?.cancel?.();
      shippedCache.set(src, response.ok);
    } catch {
      shippedCache.set(src, false);
    }
  }));
}

function shippedSet() {
  return new Set([...shippedCache.entries()].filter(([, ok]) => ok).map(([file]) => file));
}

async function keptSources(srcs) {
  const diskReady = publicImagesOnDisk();
  const local = srcs.filter((src) => usablePhoto(src) && src.startsWith('/images/'));
  if (!diskReady) await rememberDeployed(local.map((src) => src.split(/[?#]/)[0]));
  const shipped = shippedSet();
  return new Set(srcs.filter((src) => localPhotoPresent(src, { diskReady, onDisk, shipped })));
}

export async function buildHeroShowcase() {
  try {
    const [rentals, yachts, stays] = await Promise.all([getRentals(), getYachts(), getVacationRentals()]);
    const ticketChoices = HOME_TICKETS.map((ticket) => ({
      ticket,
      images: [smallPhoto(ticket.image), ticket.image]
    }));
    const draft = assembleShowcase({ rentals, yachts, stays, tickets: ticketChoices.map(({ ticket }) => ticket), jetImage: JET_IMAGE });
    const kept = await keptSources([
      JET_IMAGE,
      ...ticketChoices.flatMap((choice) => choice.images),
      ...draft.map((card) => card.image)
    ]);
    const tickets = ticketChoices.flatMap((choice) => {
      const image = choice.images.find((src) => kept.has(src));
      return image ? [{ ...choice.ticket, image }] : [];
    });
    return assembleShowcase({
      rentals,
      yachts,
      stays,
      tickets,
      jetImage: kept.has(JET_IMAGE) ? JET_IMAGE : ''
    }).filter((card) => kept.has(card.image));
  } catch (error) {
    console.error('hero showcase', error);
    return [];
  }
}
