export default async function loadTranslations(locale) {
  const { locales, defaultLocale } = require('../../gt.config.json');
  if (locale !== defaultLocale && !locales.includes(locale)) {
    throw new Error('Unsupported translation locale');
  }
  return (await import(`./locales/${locale}.json`)).default;
}
