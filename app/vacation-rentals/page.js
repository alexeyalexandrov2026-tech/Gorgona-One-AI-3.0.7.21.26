import { getVacationRentals } from '../../lib/vacationRentalsData';
import { getServerTranslation } from '../../lib/serverLocale';
import { getWorldsCopy, displayValue, largeImage } from '../../lib/worldsCopy';
import { fill } from '../../lib/homeCopy';
import { WorldHero, ListingCard, SectionHead, Steps } from '../components/g1/ui';


const STAY22_COPY = {
  en: {
    title: 'Explore more places to stay in Miami',
    description: 'Browse live partner listings on the map. Search starts in Miami, Florida.',
    disclosure: 'Affiliate disclosure: Gorgona One may earn a commission from bookings made through this map. Reservations and payments are handled by third-party booking providers.'
  },
  ru: {
    title: 'Больше вариантов жилья в Майами',
    description: 'Найдите жильё на карте партнёров. Поиск начинается с Майами, Флорида.',
    disclosure: 'Партнёрская информация: Gorgona One может получить комиссию за бронирование через эту карту. Оформление брони и оплата происходят на стороне партнёрских сервисов.'
  },
  es: {
    title: 'Descubre más alojamientos en Miami',
    description: 'Explora alojamientos de nuestros socios en el mapa. La búsqueda comienza en Miami, Florida.',
    disclosure: 'Aviso de afiliación: Gorgona One puede recibir una comisión por reservas realizadas mediante este mapa. Los proveedores externos gestionan las reservas y los pagos.'
  },
  pt: {
    title: 'Explore mais hospedagens em Miami',
    description: 'Encontre hospedagens de parceiros no mapa. A pesquisa começa em Miami, Flórida.',
    disclosure: 'Aviso de afiliado: Gorgona One pode receber uma comissão por reservas feitas neste mapa. As reservas e os pagamentos são processados pelos fornecedores parceiros.'
  },
  he: {
    title: 'עוד מקומות אירוח במיאמי',
    description: 'גלו מקומות אירוח של שותפים במפה. החיפוש מתחיל במיאמי, פלורידה.',
    disclosure: 'גילוי נאות: Gorgona One עשויה לקבל עמלה על הזמנות דרך המפה. ההזמנות והתשלומים מתבצעים אצל ספקי הזמנות חיצוניים.'
  }
};

export const dynamic = 'force-dynamic';

export default function VacationRentalsPage() {
  const stays = getVacationRentals();
  const { t, locale } = getServerTranslation();
  const copy = getWorldsCopy(locale);
  const stay22 = STAY22_COPY[locale] || STAY22_COPY.en;
  const hero = stays.find((s) => s.featured) || stays[0];

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <WorldHero
        eyebrow={fill(copy.stays.eyebrow, { n: stays.length })}
        title={copy.stays.title}
        lede={copy.stays.lede}
        img={largeImage(hero.image)}
        alt={hero.title}
      />

      <section className="border-t border-g1-rule py-[clamp(36px,5vw,72px)]" aria-label={stay22.title}>
        <SectionHead title={stay22.title} sub={stay22.description} />
        <div className="overflow-hidden rounded-[26px] border border-g1-rule bg-g1-card">
          <iframe
            id="stay22-widget"
            title={stay22.title}
            src="https://www.stay22.com/embed/6ad7137bf9e9fcb545c96a7f"
            width="100%"
            height="428"
            loading="lazy"
            className="block h-[428px] w-full border-0 sm:h-[560px]"
          />
        </div>
        <p className="mt-3 max-w-[75ch] text-[0.8rem] leading-relaxed text-g1-soft">{stay22.disclosure}</p>
      </section>

      <section className="pb-10" aria-label={t.vacationRentals.pill}>
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {stays.map((stay, i) => (
            <ListingCard
              key={stay.slug}
              href={`/vacation-rentals/${stay.slug}`}
              img={stay.image}
              alt={stay.title}
              title={stay.title}
              meta={`${stay.location} · ${t.vacationRentals.bedrooms}: ${stay.bedrooms}`}
              note={stay.description}
              rate={`${t.vacationRentals.nightlyRate}: ${displayValue(stay.nightlyRate, copy)}`}
              priority={i < 3}
            />
          ))}
        </div>
      </section>

      <Steps title={copy.howItWorks} steps={copy.stays.steps} />
    </main>
  );
}
