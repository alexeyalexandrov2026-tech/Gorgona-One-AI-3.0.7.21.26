import { savedTree } from './savedCopy.js';

// English source for the restaurant table request; all target copy lives in
// i18n/locales under the 'deals' namespace, kept so saved translations stay valid.
export const DEALS_COPY = {
  en: {
    requestTable: 'Request a table',
    tablePrompt: 'Please request a table at {name}. Date, time and group size: '
  }
};

export function getDealsCopy(locale) {
  return savedTree('deals', DEALS_COPY.en, locale);
}
