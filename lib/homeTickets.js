import { getEventCategoryBySlug } from './mockEventsData.js';

// Tickets that take turns on the home page, right after "Miami season".
// Each one is an Events subcategory: "Get tickets" opens its page with the
// live TicketNetwork calendar. The line under the name lives in
// HOME_COPY.en.tickets.lines, keyed by the same id. No dates, prices or
// availability here: the calendar is the only place that knows them.
const SLIDES = [
  { id: 'nba', image: '/images/home/tickets/basketball.jpg' },
  { id: 'theater', category: 'theater-broadway', image: '/images/home/tickets/theater.jpg' },
  { id: 'mls', image: '/images/events/sports-pass.jpg' },
  { id: 'festivals', image: '/images/events/festival-pass.jpg' },
  { id: 'tennis', image: '/images/home/tickets/tennis.jpg' },
  { id: 'hiphop', category: 'hip-hop-rnb', image: '/images/events/stage-pass.jpg' }
];

export const HOME_TICKETS = SLIDES.map((slide) => {
  const category = getEventCategoryBySlug(slide.category || slide.id);
  if (!category) throw new Error(`Unknown events subcategory for home ticket: ${slide.id}`);
  return { ...slide, label: category.label, group: category.group, href: `/events/category/${category.slug}` };
});
