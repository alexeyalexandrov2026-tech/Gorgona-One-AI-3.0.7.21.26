import { savedMessage } from './savedCopy.js';

export function getStay22Copy(locale) {
  return Object.fromEntries([
    ['title', 'stay22'], ['description', 'stay22'], ['disclosure', 'stay22'],
    ['location', 'stay22ui'], ['listTab', 'stay22ui'], ['mapTab', 'stay22ui'],
    ['listTitle', 'stay22ui'], ['mapTitle', 'stay22ui'], ['scopeNotice', 'stay22ui']
  ].map(([key, namespace]) => [key, savedMessage(locale, `${namespace}.${key}`)]));
}
