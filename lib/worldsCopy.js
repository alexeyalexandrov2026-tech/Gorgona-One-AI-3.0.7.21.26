import { savedTree } from './savedCopy.js';

// Copy for the car, yacht and stay pages and their request form, in the
// English source. Saved catalogs cover all sixteen languages.
// Field labels that already exist in lib/i18n.js (daily, weekly, length...)
// come from there, so they stay translated in all sixteen languages.
export const WORLDS_COPY = {
  en: {
    onRequest: 'On request',
    all: 'All',
    seeAll: 'See all',
    howItWorks: 'How it works',
    photos: 'Photos',
    photoOf: 'Photo {n} of {total}',
    showPhoto: 'Show photo {n} of {total}',
    categories: { SUVs: 'SUVs', Convertibles: 'Convertibles', Sedans: 'Sedans' },
    cars: {
      eyebrow: 'Cars · {n} cars · Sunny Isles Beach',
      title: 'Our own fleet, delivered to your door.',
      lede: 'Every car here is ours, photographed in Miami. We deliver to hotels, villas, marinas and both airports, and confirm the rate, deposit and documents with you before anything is booked.',
      filterLabel: 'Body type',
      delivery: 'Delivery: Miami Beach · Brickell · Downtown · Fisher Island · Key Biscayne · MIA · FLL',
      ourFleet: 'Miami Elio fleet · {place}',
      more: 'More from the fleet',
      steps: [
        ['Pick a car', 'Browse the fleet or ask the concierge for a match.'],
        ['Request dates', 'Choose dates and where the car should meet you.'],
        ['We confirm', 'Rate, deposit and documents are confirmed with you.'],
        ['Keys at your door', 'Delivered on time, picked up when you are done.']
      ]
    },
    yachts: {
      eyebrow: 'Yachts · {n} charters · Miami marinas',
      title: 'Crewed charters from Miami marinas.',
      lede: 'Half days, full days and sunset runs on Biscayne Bay, with captain and crew. Tell us the date and group size, and we confirm the yacht, the marina and the rate.',
      more: 'More charters',
      steps: [
        ['Pick a yacht', 'Or tell the concierge the group size and the mood.'],
        ['Request a date', 'Choose the day, how long, and how many guests.'],
        ['We confirm', 'Captain, marina, rate and deposit are confirmed with you.'],
        ['Board', 'Meet the crew at the marina. Drinks and food on request.']
      ]
    },
    stays: {
      eyebrow: 'Stays · {n} homes · Miami',
      title: 'Villas and residences in Miami.',
      lede: 'Private homes from Miami Beach to Key Biscayne. Send your dates and group size, and we confirm availability, the rate and the house rules.',
      more: 'More homes',
      steps: [
        ['Pick a home', 'Or describe the stay and let the concierge match it.'],
        ['Request dates', 'Choose check-in, check-out and how many guests.'],
        ['We confirm', 'Availability, rate, deposit and house rules, in writing.'],
        ['Arrive', 'Check-in details arrive before your trip. Add a car or a yacht.']
      ]
    },
    form: {
      title: { car: 'Request this car', yacht: 'Request this charter', stay: 'Request these dates', experience: 'Request this experience' },
      pickup: 'Pick-up',
      return: 'Return',
      date: 'Date',
      duration: 'How long',
      durations: ['4 hours', '6 hours', '8 hours', 'Full day'],
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      guests: 'Guests',
      deliveryTo: 'Delivery to',
      places: ['Sunny Isles Beach (our garage)', 'Miami Beach', 'Brickell', 'Downtown Miami', 'MIA airport', 'FLL airport', 'Fisher Island', 'Key Biscayne', 'Another address'],
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      submit: 'Send request',
      sending: 'Sending…',
      note: 'Nothing is charged now. Our team confirms the rate, deposit and requirements with you first.',
      badDates: 'The end date must be after the start date.',
      failed: 'The request did not go through. Please try again, or ask the concierge.',
      sentTitle: 'Request sent',
      sentText: 'Our team will contact you shortly to confirm the details.',
      again: 'Send another request'
    }
  }
};

export function getWorldsCopy(locale) {
  return savedTree('worlds', WORLDS_COPY.en, locale);
}

// Data records say 'On request' in English; show it in the reader's language.
export function displayValue(value, copy) {
  return value === 'On request' ? copy.onRequest : value;
}

// Listing photos from the image CDN are 900px wide; heroes ask for 1600px.
export function largeImage(src) {
  return src.replace('w=900', 'w=1600');
}

// The trip in one line for /api/book's `dates` field (at most 120 characters).
// It is written in English so the team reads every request the same way.
export function summarizeRequest(kind, trip) {
  if (kind === 'yacht') return `${trip.from} · ${WORLDS_COPY.en.form.durations[trip.duration]} · ${trip.guests} guests`;
  if (kind === 'stay') return `${trip.from} → ${trip.to} · ${trip.guests} guests`;
  if (kind === 'experience') return `${trip.from} · ${trip.guests} guests`;
  return `${trip.from} → ${trip.to} · Delivery: ${WORLDS_COPY.en.form.places[trip.place]}`;
}
