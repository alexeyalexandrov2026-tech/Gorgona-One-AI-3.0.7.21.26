'use client';

import ErrorPage from 'next/error';
import { useSavedText } from './components/LocalizedText';
import { useClientLocaleRoute } from './components/LocaleProvider';

export default function NotFound() {
  useClientLocaleRoute();
  const msg = useSavedText();
  return <ErrorPage statusCode={404} title={msg('This page could not be found.')} />;
}
