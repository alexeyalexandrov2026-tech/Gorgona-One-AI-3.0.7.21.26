'use client';

import { GTProvider } from 'gt-next';
import { useLocaleController } from '../components/LocaleProvider';
import Fixture from './fixtures/Fixture';

export default function GTBoundary({ snapshots }) {
  const { locale, setLocale } = useLocaleController();
  // Controlled locale from the existing selector; no locale key, navigation
  // or refresh around the supplier catalogues.
  return (
    <GTProvider locale={locale} translations={snapshots} dictionaries={{}}
      _reload={(next) => setLocale(next.locale)}>
      <Fixture />
    </GTProvider>
  );
}
