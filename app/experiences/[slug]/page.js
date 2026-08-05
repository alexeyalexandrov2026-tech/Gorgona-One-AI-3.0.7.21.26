import { notFound } from 'next/navigation';
import { getExperienceBySlug } from '../../../lib/experiencesData';
import { getServerTranslation } from '../../../lib/serverLocale';
import BookingForm from '../../components/BookingForm';

export const dynamic = 'force-dynamic';

export default function ExperienceDetailPage({ params }) {
  const experience = getExperienceBySlug(params.slug);

  if (!experience) {
    notFound();
  }

  const { t } = getServerTranslation();

  return (
    <main className="flex-1 py-10">
      <div className="market-shell overflow-hidden rounded-[2rem]">
        <img src={experience.image} alt={experience.title} className="h-72 w-full object-cover" />
        <div className="p-8">
          <p className="market-pill">{experience.location}</p>
          <h1 className="market-title mt-4">{experience.title}</h1>
          <p className="market-subtitle">{experience.description}</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="market-card rounded-[1.5rem] p-6">
              <div className="grid gap-4 text-sm text-zinc-300 sm:grid-cols-2">
                <div><p className="text-zinc-500">{t.experiences.location}</p><p className="mt-1 text-white">{experience.location}</p></div>
                <div><p className="text-zinc-500">{t.experiences.duration}</p><p className="mt-1 text-white">{experience.duration}</p></div>
                <div><p className="text-zinc-500">{t.experiences.price}</p><p className="mt-1 text-brand-gold">{experience.price}</p></div>
              </div>
            </div>
            <div className="market-card rounded-[1.5rem] p-6">
              <h2 className="text-xl font-semibold text-white">{t.experiences.book}</h2>
              <BookingForm rentalSlug={experience.slug} rentalTitle={experience.title} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
