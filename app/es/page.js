import LocaleHubView from '../components/g1/LocaleHubView';
import { HUB_HREFLANG, LOCALE_HUBS } from '../../lib/geo/localeHubData.mjs';
import { DEFAULT_IMAGE, SITE_NAME, SITE_URL } from '../../lib/seo.mjs';

export const revalidate = 3600;

const hub = LOCALE_HUBS.es;

export const metadata = {
  title: hub.metaTitle,
  description: hub.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/es`,
    languages: HUB_HREFLANG
  },
  openGraph: {
    title: hub.metaTitle,
    description: hub.metaDescription,
    url: '/es',
    siteName: SITE_NAME,
    locale: hub.ogLocale,
    images: [DEFAULT_IMAGE],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: hub.metaTitle,
    description: hub.metaDescription,
    images: [DEFAULT_IMAGE.url]
  }
};

export default function SpanishHubPage() {
  return <LocaleHubView hub={hub} />;
}
