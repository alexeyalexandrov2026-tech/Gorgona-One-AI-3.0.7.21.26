import { getEventCategoryBySlug } from './mockEventsData.js';

// Tickets that take turns on the home page, right after "Miami season".
// Each one is an Events subcategory: "Get tickets" opens its page with the
// live TicketNetwork calendar. The line under the name lives in
// HOME_COPY.en.tickets.lines, keyed by the same id. No dates, prices or
// availability here: the calendar is the only place that knows them.
// `size` is the JPEG's own width and height. Next to every JPEG lies a
// 1100px WebP (same name, -1100.webp) that phones get instead: six of them
// weigh about 280 KB, against 930 KB for the JPEGs.
const SLIDES = [
  { id: 'nba', image: '/images/home/tickets/basketball.jpg', size: [1600, 1000] },
  { id: 'theater', category: 'theater-broadway', image: '/images/home/tickets/theater.jpg', size: [1600, 1000] },
  { id: 'mls', image: '/images/events/sports-pass.jpg', size: [1600, 1000] },
  { id: 'festivals', image: '/images/events/festival-pass.jpg', size: [1200, 1200] },
  { id: 'tennis', image: '/images/home/tickets/tennis.jpg', size: [1600, 1000] },
  { id: 'hiphop', category: 'hip-hop-rnb', image: '/images/events/stage-pass.jpg', size: [1200, 1200] }
];
export const smallPhoto = (image) => image.replace(/\.jpg$/, '-1100.webp');

// A ticket whose subcategory no longer exists is left out rather than
// breaking the home page; tests/content/home-tickets.test.mjs fails on it.
export const HOME_TICKET_IDS = SLIDES.map((slide) => slide.id);
export const HOME_TICKETS = SLIDES.flatMap((slide) => {
  const category = getEventCategoryBySlug(slide.category || slide.id);
  if (!category) return [];
  return [{
    ...slide,
    category: category.slug,
    label: category.label,
    group: category.group,
    href: `/events/category/${category.slug}`,
    srcSet: `${smallPhoto(slide.image)} 1100w, ${slide.image} ${slide.size[0]}w`
  }];
});
