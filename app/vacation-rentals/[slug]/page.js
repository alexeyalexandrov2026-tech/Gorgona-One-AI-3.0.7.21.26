import { notFound } from 'next/navigation';
import { getVacationRentalBySlug } from '../../../lib/vacationRentalsData';
import { getServerTranslation } from '../../../lib/serverLocale';
import BookingForm from '../../components/BookingForm';

export const dynamic = 'force-dynamic';

export default function VacationRentalDetailPage({ params }) {
  const property = getVacationRentalBySlug(params.slug);

  if (!property) {
    notFound();
  }

  const { t } = getServerTranslation();

  return (
    <main className="flex-1 py-10">
      <div className="market-shell overflow-hidden rounded-[2rem]">
        <img src={property.image} alt={property.title} className="h-72 w-full object-cover" />
        <div className="p-8">
          <p className="market-pill">{property.location}</p>
          <h1 className="market-title mt-4">{property.title}</h1>
          <p className="market-subtitle">{property.description}</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="market-card rounded-[1.5rem] p-6">
              <div className="grid gap-4 text-sm text-zinc-300 sm:grid-cols-2">
                <div><p className="text-zinc-500">{t.vacationRentals.location}</p><p className="mt-1 text-white">{property.location}</p></div>
                <div><p className="text-zinc-500">{t.vacationRentals.guests}</p><p className="mt-1 text-white">{property.guests}</p></div>
                <div><p className="text-zinc-500">{t.vacationRentals.bedrooms}</p><p className="mt-1 text-white">{property.bedrooms}</p></div>
                <div><p className="text-zinc-500">{t.vacationRentals.nightlyRate}</p><p className="mt-1 text-brand-gold">{property.nightlyRate}</p></div>
              </div>
            </div>
            <div className="market-card rounded-[1.5rem] p-6">
              <h2 className="text-xl font-semibold text-white">{t.vacationRentals.reserve}</h2>
              <BookingForm rentalSlug={property.slug} rentalTitle={property.title} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
