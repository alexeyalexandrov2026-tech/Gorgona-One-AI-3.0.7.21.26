// Server-side catalog initialization. Imported only through serverLocale
// (which already depends on next/headers), never from a Client Component.
import ru from '../i18n/locales/ru.js';
import es from '../i18n/locales/es.js';
import he from '../i18n/locales/he.js';
import zh from '../i18n/locales/zh.js';
import pt from '../i18n/locales/pt.js';
import uk from '../i18n/locales/uk.js';
import ja from '../i18n/locales/ja.js';
import ko from '../i18n/locales/ko.js';
import de from '../i18n/locales/de.js';
import ar from '../i18n/locales/ar.js';
import tr from '../i18n/locales/tr.js';
import fa from '../i18n/locales/fa.js';
import it from '../i18n/locales/it.js';
import fr from '../i18n/locales/fr.js';
import pl from '../i18n/locales/pl.js';
import { registerSavedMessages } from './savedCopy.js';
registerSavedMessages({ ru, es, he, zh, pt, uk, ja, ko, de, ar, tr, fa, it, fr, pl });
