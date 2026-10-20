import { getVacationRentals } from '../../lib/vacationRentalsData';
import { getServerTranslation } from '../../lib/serverLocale';
import { getWorldsCopy, displayValue, largeImage } from '../../lib/worldsCopy';
import { fill } from '../../lib/homeCopy';
import { WorldHero, ListingCard, SectionHead, Steps } from '../components/g1/ui';
import Stay22Browse from './Stay22Browse';


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


const STAY22_UI = {
  en: {
    location: 'Miami, Florida · Partner stays',
    modeLabel: 'Browse accommodation',
    listTab: 'List with photos',
    mapTab: 'Map',
    listTitle: 'Miami accommodation with photos and booking links',
    mapTitle: 'Stay22 Miami accommodation map',
    scopeNotice: 'Partner results may include villas, apartments and hotels. Availability, prices and booking terms are set by the providers.'
  },
  ru: {
    location: 'Майами, Флорида · Жильё партнёров',
    modeLabel: 'Просмотр вариантов жилья',
    listTab: 'Список с фото',
    mapTab: 'Карта',
    listTitle: 'Жильё Майами с фотографиями и ссылками для бронирования',
    mapTitle: 'Карта жилья Stay22 в Майами',
    scopeNotice: 'Среди предложений партнёров могут быть виллы, апартаменты и отели. Доступность, цены и условия бронирования устанавливают поставщики.'
  },
  es: {
    location: 'Miami, Florida · Alojamientos asociados',
    modeLabel: 'Explorar alojamientos',
    listTab: 'Lista con fotos',
    mapTab: 'Mapa',
    listTitle: 'Alojamientos en Miami con fotos y enlaces de reserva',
    mapTitle: 'Mapa Stay22 de alojamientos en Miami',
    scopeNotice: 'Los resultados pueden incluir villas, apartamentos y hoteles. La disponibilidad, los precios y las condiciones dependen de los proveedores.'
  },
  pt: {
    location: 'Miami, Flórida · Hospedagens parceiras',
    modeLabel: 'Explorar hospedagens',
    listTab: 'Lista com fotos',
    mapTab: 'Mapa',
    listTitle: 'Hospedagens em Miami com fotos e links para reservas',
    mapTitle: 'Mapa Stay22 de hospedagens em Miami',
    scopeNotice: 'Os resultados podem incluir vilas, apartamentos e hotéis. Disponibilidade, preços e condições são definidos pelos fornecedores.'
  },
  he: {
    location: 'מיאמי, פלורידה · אירוח שותפים',
    modeLabel: 'עיון במקומות אירוח',
    listTab: 'רשימה עם תמונות',
    mapTab: 'מפה',
    listTitle: 'אירוח במיאמי עם תמונות וקישורי הזמנה',
    mapTitle: 'מפת האירוח של Stay22 במיאמי',
    scopeNotice: 'התוצאות עשויות לכלול וילות, דירות ומלונות. הספקים קובעים את הזמינות, המחירים ותנאי ההזמנה.'
  }
};

export const dynamic = 'force-dynamic';

export default function VacationRentalsPage() {
  const stays = getVacationRentals();
  const { t, locale } = getServerTranslation();
  const copy = getWorldsCopy(locale);
  const stay22 = { ...(STAY22_COPY[locale] || STAY22_COPY.en), ...(STAY22_UI[locale] || STAY22_UI.en) };
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
        <Stay22Browse labels={stay22} />
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
              booked={stay.availability === 'booked'}
            />
          ))}
        </div>
      </section>

      <Steps title={copy.howItWorks} steps={copy.stays.steps} />
    </main>
  );
}
