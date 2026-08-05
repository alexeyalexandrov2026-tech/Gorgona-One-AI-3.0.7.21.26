import { notFound } from 'next/navigation';
import { getRentalBySlug } from '../../../lib/rentalsData';
import { rentalDescriptions, getContentText } from '../../../lib/contentTranslations';
import { getServerTranslation } from '../../../lib/serverLocale';
import BookingForm from '../../components/BookingForm';

export const dynamic = 'force-dynamic';

export default function RentalDetailPage({ params }) {
  const rental = getRentalBySlug(params.slug);

  if (!rental) {
    notFound();
  }

  const { t, locale } = getServerTranslation();

  return (
    <main className="flex-1 py-10">
      <div className="market-shell overflow-hidden rounded-[2rem]">
        <img src={rental.image} alt={rental.title} className="h-72 w-full object-cover" />
        <div className="p-8">
          <p className="market-pill">{rental.category}</p>
          <h1 className="market-title mt-4">{rental.title}</h1>
          <p className="market-subtitle">{getContentText(rentalDescriptions, locale, rental.id, rental.description)}</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="market-card rounded-[1.5rem] p-6">
              <div className="grid gap-4 text-sm text-zinc-300 sm:grid-cols-2">
                <div><p className="text-zinc-500">{t.rentals.company}</p><p className="mt-1 text-white">{rental.company}</p></div>
                <div><p className="text-zinc-500">{t.rentals.location}</p><p className="mt-1 text-white">{rental.location}</p></div>
                <div><p className="text-zinc-500">{t.rentals.daily}</p><p className="mt-1 text-brand-gold">{rental.dailyPrice}</p></div>
                <div><p className="text-zinc-500">{t.rentals.weekly}</p><p className="mt-1 text-white">{rental.weeklyPrice}</p></div>
                <div><p className="text-zinc-500">Monthly Price</p><p className="mt-1 text-white">{rental.monthlyPrice}</p></div>
                <div><p className="text-zinc-500">Security Deposit</p><p className="mt-1 text-white">{rental.securityDeposit}</p></div>
              </div>
            </div>
            <div className="market-card rounded-[1.5rem] p-6">
              <h2 className="text-xl font-semibold text-white">Reserve request</h2>
              <BookingForm rentalSlug={rental.slug} rentalTitle={rental.title} />
            </div>
          </div>

          {/* Gallery for cars that ship their own photography. The tiles use the
              source 3:2 ratio, so nothing is cropped. */}
          {rental.gallery?.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-white">Gallery</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rental.gallery.map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${rental.title} — ${index + 1}`}
                    loading="lazy"
                    className="aspect-[3/2] w-full rounded-[1.25rem] object-cover"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
