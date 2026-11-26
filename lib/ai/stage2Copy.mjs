// Page-context resolver backed by the ecosystem index, plus re-exports of
// lightweight Stage 2 helpers from lib/ai/stage2Core.mjs.
import { getEcosystemIndex } from './ecosystemIndex.js';
import { normalizePagePath } from './pagePath.mjs';
import { getStage2Copy } from './stage2Core.mjs';

export {
  getStage2Copy,
  askAboutCarCopy,
  enrichPartnerBookingUrl,
  buildManagerHandoffUrl
} from './stage2Core.mjs';

/**
 * Resolve the active page entity/section and 4 situational starter prompts
 * synchronously from the canonical ecosystem index.
 */
export function getPageContext(pathname, locale = 'en') {
  const clean = normalizePagePath(pathname);
  if (!clean || clean === '/' || clean === '/discovery') return null;

  const copy = getStage2Copy(locale);
  const index = getEcosystemIndex();
  const exact = index.find((item) => item?.href === clean);

  if (exact && exact.type === 'Car') {
    const carSubtitle = exact.subtitle && exact.price && exact.subtitle.includes(exact.price)
      ? exact.subtitle
      : [exact.price, exact.subtitle].filter(Boolean).join(' · ');
    return {
      kind: 'car',
      title: exact.title,
      subtitle: carSubtitle,
      href: exact.href,
      image: exact.image || null,
      prompts: copy.carContextPrompts.map((p) => p.replace('{name}', exact.title))
    };
  }

  if (exact && (exact.type === 'Restaurant' || exact.type === 'Nightlife')) {
    return {
      kind: exact.type === 'Nightlife' ? 'nightlife' : 'dining',
      title: exact.title,
      subtitle: [exact.neighborhood || exact.subtitle, exact.price].filter(Boolean).join(' · '),
      href: exact.href,
      image: exact.image || null,
      prompts: copy.venueContextPrompts.map((p) => p.replace('{name}', exact.title))
    };
  }

  const root = '/' + clean.replace(/^\/+/, '').split('/')[0];
  const sectionPrompts = copy.sectionPrompts[root];
  if (sectionPrompts) {
    const label = exact?.title || index.find((item) => item?.href === root && item.type === 'Section')?.title || root.slice(1).replace(/-/g, ' ');
    return {
      kind: 'section',
      title: label,
      subtitle: exact?.price || '',
      href: clean,
      image: exact?.image || null,
      prompts: sectionPrompts
    };
  }

  return null;
}
