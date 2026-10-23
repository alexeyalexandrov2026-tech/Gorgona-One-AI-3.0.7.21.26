'use client';

import ErrorPage from 'next/error';
import { useSavedText } from './components/LocalizedText';

export default function NotFound() {
  const msg = useSavedText();
  return <ErrorPage statusCode={404} title={msg('This page could not be found.')} />;
}
