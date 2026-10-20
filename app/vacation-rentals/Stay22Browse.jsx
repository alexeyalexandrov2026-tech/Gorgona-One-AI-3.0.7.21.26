'use client';

import { useLocale } from '../components/LocaleProvider';

// Scoped to Vacation Rentals only. Do not enable Stay22's global link rewriting:
// existing CJ Vrbo and TicketNetwork affiliate links must remain untouched.
const MAP_URL = 'https://www.stay22.com/embed/6ad7137bf9e9fcb545c96a7f';
const LIST_URL = 'https://www.stay22.com/embed/gm?aid=gorgonaone&address=Miami%2C+FL%2C+USA&viewmode=listview&showhotels=false&rentalsapi=vrbo&campaign=gorgona_miami_rentals_list';

const SECTION_TITLES = {
  en: ['Map', 'List with photos'],
  ru: ['Карта', 'Список с фото'],
  es: ['Mapa', 'Lista con fotos'],
  he: ['מפה', 'רשימה עם תמונות'],
  zh: ['地图', '图片列表'],
  pt: ['Mapa', 'Lista com fotos'],
  uk: ['Карта', 'Список з фото'],
  ja: ['地図', '写真付きリスト'],
  ko: ['지도', '사진 목록'],
  de: ['Karte', 'Liste mit Fotos'],
  ar: ['الخريطة', 'قائمة بالصور'],
  tr: ['Harita', 'Fotoğraflı liste'],
  fa: ['نقشه', 'فهرست همراه با عکس'],
  it: ['Mappa', 'Elenco con foto'],
  fr: ['Carte', 'Liste avec photos'],
  pl: ['Mapa', 'Lista ze zdjęciami']
};

export default function Stay22Browse({ labels }) {
  const locale = useLocale();
  const [mapHeading, listHeading] = SECTION_TITLES[locale] || SECTION_TITLES.en;

  return (
    <div className="grid gap-10 lg:gap-14">
      <section aria-label={mapHeading} className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-g1display text-[clamp(1.5rem,1.5vw+1rem,2.1rem)] font-medium text-g1-ink">
            {mapHeading}
          </h3>
          <p className="text-[0.85rem] text-g1-soft">{labels.location}</p>
        </div>
        <div className="overflow-hidden rounded-[26px] border border-g1-rule bg-g1-card">
          <iframe
            id="stay22-map-widget"
            title={labels.mapTitle}
            src={MAP_URL}
            width="100%"
            height="600"
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block h-[500px] w-full border-0 sm:h-[600px]"
          />
        </div>
      </section>

      <section aria-label={listHeading} className="grid gap-4">
        <h3 className="font-g1display text-[clamp(1.5rem,1.5vw+1rem,2.1rem)] font-medium text-g1-ink">
          {listHeading}
        </h3>
        <div className="overflow-hidden rounded-[26px] border border-g1-rule bg-g1-card">
          <iframe
            id="stay22-list-widget"
            title={labels.listTitle}
            src={LIST_URL}
            width="100%"
            height="820"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block h-[700px] w-full border-0 sm:h-[820px]"
          />
        </div>
        <p className="max-w-[75ch] text-[0.8rem] leading-relaxed text-g1-soft">
          {labels.scopeNotice}
        </p>
      </section>
    </div>
  );
}
