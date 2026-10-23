'use client';

import { createElement, Fragment } from 'react';
import { useLocale } from './LocaleProvider';
import { savedListing, savedMessage, savedSource, savedPrice } from '../../lib/savedCopy';

export function useSavedText() {
  const locale = useLocale();
  return (source, values) => savedSource(locale, source, values);
}

// No wrapper element: typography, layout and existing control/iframe nodes
// retain their identity. Named slots can carry React elements safely.
export function LocalizedText({ id, source, values = {} }) {
  const locale = useLocale();
  const template = id ? savedMessage(locale, id) : savedSource(locale, source);
  if (typeof template !== 'string') return template ?? null;
  return template.split(/(\{[A-Za-z][A-Za-z0-9_]*\})/g).map((part, index) => {
    const name = part.startsWith('{') && part.endsWith('}') ? part.slice(1, -1) : null;
    return <Fragment key={index}>{name && Object.hasOwn(values, name) ? values[name] : part}</Fragment>;
  });
}

// Native element with localized, site-owned accessible text. The same tag,
// children and functional props are retained when its text attributes change.
// Never use this wrapper for a supplier iframe.
export function LocalizedElement({ as, children, ...props }) {
  const locale = useLocale();
  for (const key of ['placeholder', 'aria-label', 'title', 'alt']) {
    if (typeof props[key] === 'string') props[key] = savedSource(locale, props[key]);
  }
  return createElement(as, props, children);
}

export function LocalizedListing({ itemId, source, field = 'description' }) {
  return savedListing(useLocale(), { id: itemId, [field]: source }, field);
}

export function LocalizedPrice({ source }) {
  return savedPrice(useLocale(), source);
}

// Translate the full heading, keeping its existing two-line presentation.
export function LocalizedTitle({ source }) {
  const text = savedSource(useLocale(), source);
  const [first, second] = text.split('{break}');
  return <>{first}<br/><span className="text-villa-ash/70">{second}</span></>;
}
