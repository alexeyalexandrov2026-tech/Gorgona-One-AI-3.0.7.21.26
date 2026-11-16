import { existsSync } from 'node:fs';
import path from 'node:path';
import { getRentals, getYachts, getVacationRentals } from './data/listings.js';
import { HOME_TICKETS, smallPhoto } from './homeTickets.js';
import { assembleShowcase, usablePhoto } from './heroShowcase.js';

const JET_IMAGE = '/images/home/worlds/travel-wing.jpg';

function photoExists(src) {
  if (!usablePhoto(src)) return false;
  if (!src.startsWith('/')) return true;
  return existsSync(path.join(process.cwd(), 'public', src));
}

export async function buildHeroShowcase() {
  try {
    const [rentals, yachts, stays] = await Promise.all([getRentals(), getYachts(), getVacationRentals()]);
    const tickets = HOME_TICKETS.flatMap((ticket) => {
      const image = [smallPhoto(ticket.image), ticket.image].find(photoExists);
      return image ? [{ ...ticket, image }] : [];
    });
    return assembleShowcase({
      rentals,
      yachts,
      stays,
      tickets,
      jetImage: photoExists(JET_IMAGE) ? JET_IMAGE : ''
    }).filter((card) => photoExists(card.image));
  } catch (error) {
    console.error('hero showcase', error);
    return [];
  }
}
