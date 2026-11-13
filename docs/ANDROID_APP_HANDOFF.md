# Передача дел: приложение Miami Elio для Android

Состояние на 13 ноября 2026, конец второй сессии. Сначала прочитайте `CLAUDE.md` в корне: правила оттуда действуют и здесь.

## Коротко

- **Ветка:** `claude/android-app-agent-rr0ij5`, создана от `main` на коммите `477e39b3` (Merge pull request #50). Всё лежит в папке `android/` и в этом файле. Сайт, `ios/` и ветка №43 не тронуты.
- **Готово:** каркас проекта Gradle, ядро приложения (логика без экранов), сетевой транспорт, тема и бренд (цвета, шрифты, логотип, шар консьержа), тексты на 16 языках, две веб-вкладки («Главная» и «Моё Майами»), панель из четырёх вкладок, заставка, внешние и глубокие ссылки, тесты ко всему этому.
- **Не готово:** нативные экраны «Консьерж» и «Поиск» (сейчас заглушки), план поездки, избранное, сезон и напоминания, голос, иконка, CI, подпись выпуска.
- **Проверено** (13 ноября, компьютер владельца, Windows): `testDebugUnitTest assembleDebug lintDebug bundleRelease` проходят — 100 тестов в 18 классах, 0 сбоев; Lint 0 ошибок; debug-APK 14,2 МБ; неподписанный release-AAB 2,6 МБ. **На телефоне и в эмуляторе приложение не запускалось ни разу.** Подробности — в разделе «Что проверено».
- **Pull request не открыт** — владелец не просил.

## С чего начать следующему агенту

1. **В ветку пишет одна сессия.** Перед первой правкой и перед каждой отправкой: `git fetch origin claude/android-app-agent-rr0ij5` и `git status -sb`. Локальная ветка должна совпадать с GitHub. Если там появились чужие коммиты — не делать force-push и не сливать их молча: показать владельцу и спросить (так уже было, см. «Параллельная облачная сессия»).
2. **Исходная точка.** Рабочее дерево — версия второй сессии: пункты 1–6 из списка «Что осталось сделать» готовы. В истории ветки есть коммит `462f0170` с чужой версией пунктов 5–12; его файлов в дереве **нет**, это только черновик для чтения.
3. **Убедиться, что всё собирается**, до своих правок: команды в разделе «Как собрать…». Ожидаемо: 100 тестов в 18 классах, 0 сбоев; Lint 0 ошибок; `node android/scripts/verify-web-bridge.cjs` — 13 проверок.
4. **Следующая работа — пункт 7 (консьерж)**, дальше по порядку до 15. Экраны «Консьерж» и «Поиск» ставятся на место заглушки `ComingTab` в `ui/RootTabs.kt`.
5. **Коммит и отправка после каждого законченного куска**, этот файл обновлять вместе с кодом. Владелец уже дважды упирался в лимит использования посреди работы — несохранённое пропадает.
6. **Pull request не открывать**, пока владелец не попросит. Ветку №43, `main`, `ios/` и остальные рабочие папки `miami-elio-*` не трогать.
7. Вопросы, на которые владелец ещё не ответил, — в конце файла. Пункт 7 упирается в первый из них (куда слать жалобу на ответ): экран и кнопку можно сделать, отправку — только после ответа.

## Что случилось с предыдущей попыткой

До этой сессии над приложением работал другой агент (сессия «Miami Elio Android приложение»). Он упёрся в лимит и **ничего не закоммитил**: на GitHub от него нет ни ветки, ни папки `android/`. Его код недоступен, поэтому работа начата заново. Вывод для следующего агента: **коммитить и пушить после каждого законченного куска**, а не в конце.

**Уточнение (вторая сессия, на компьютере владельца).** Часть той попытки нашлась на диске: рабочая папка `Documents\ChatGPT\Miami Elio\miami-elio-android` (ветка `feat/android-app` от коммита `e70b7477`, PR №48) с неотслеживаемой папкой `android/`. В ней только каркас: настройки Gradle, манифест, ресурсы темы, заготовка иконки (`res/drawable-nodpi/launcher_foreground.png`, `res/mipmap-anydpi-v26/ic_launcher.xml`, `res/drawable/ic_notification.xml`, `ic_splash_orb.xml`) и два скрипта (`scripts/build-strings.mjs`, `scripts/build-season.mjs`). Кода на Kotlin там нет. Папка не тронута; заготовки иконки и `build-season.mjs` могут пригодиться в пунктах 10 и 12.

**Параллельная облачная сессия (13 ноября).** Пока вторая сессия делала пункты 5–6, облачная сессия Claude отправила в эту же ветку коммит `462f0170` со своей версией пунктов 5–12 (веб-вкладки, консьерж, поиск, план, избранное, сезон, голос, иконка; около 4800 строк, без тестов к ним). Владелец выбрал версию второй сессии. Коммит слияния `b533935c` берёт все файлы из неё, а `462f0170` оставляет только в истории: **в рабочем дереве его кода нет**. Его можно читать как черновик при работе над пунктами 7–12 (`git show 462f0170:android/app/src/main/java/com/miamielio/app/<путь>`), но переносить только с тестами и под нынешние `AppRouter`, `AppServices` и `WebTabController`. Вывод: в эту ветку должна писать одна сессия; перед каждой отправкой — `git fetch` и сверка.

Что лежит в `462f0170` и может пригодиться как черновик: `concierge/ConciergeScreen.kt`, `ConciergeViewModel.kt`, `PlanBoard.kt`, `Dictation.kt` (пункты 7 и 11); `search/SearchScreen.kt`, `SearchViewModel.kt` (пункт 8); `favorites/FavoritesStore.kt` (пункт 9); `season/SeasonStore.kt`, `SeasonList.kt`, `Reminders.kt`, `assets/season.json`, `android/scripts/build-season.mjs` (пункт 10); адаптивная иконка в `res/mipmap-*` (пункт 12); `core/ReportApi.kt` (жалоба на ответ — **куда он её отправляет, никто не проверял**, а владелец на этот вопрос не отвечал); `ui/Parts.kt`; четыре дополнительные строки на каждый язык в его `android/strings.json`. Этот коммит собирается и проходит прежние 77 тестов (проверено второй сессией), но его экраны никто не запускал и не тестировал.

Сама облачная сессия (`claude.ai/code/session_01GvhNbyHLcshC3eFRNgQswn`): владелец просил её удалить. В его аккаунте на claude.ai её нет — ссылка отвечает «This session couldn't be found». Удалена она или запущена под другим аккаунтом, выяснить не удалось. После `462f0170` она в ветку ничего не отправляла.

Полного текста исходного задания владельца в этой сессии нет — есть только его краткое изложение (скриншоты владельца). Оно приведено в разделе «Задание». Если владелец пришлёт полный текст, сверить с ним.

## Задание (изложение)

Рабочее приложение Android «Miami Elio», повторяющее приложение для iPhone (ветка `claude/miami-elio-app-home-twt06c`, черновик №43, коммит `ea94e447`).

1. **Проект:** ветка от `origin/main`; модуль `android/` на Kotlin, Jetpack Compose, Material 3, ViewModel, StateFlow; debug-сборка ходит на тестовый сайт по HTTPS, release — на боевой; `minSdk 26`, `applicationId com.miamielio.app`.
2. **Четыре вкладки:**
   - Главная — веб-вью с каталогом, бронированием и переходами к партнёрам; история страниц сохраняется при переключении вкладок.
   - Консьерж — нативный чат через `/api/chat`, ведение сессии, карточки и действия, которые присылает сервер.
   - Поиск — нативный, `/api/search`, с задержкой ввода, отменой прошлого запроса, состояниями «пусто» и «нет сети».
   - Моё Майами — веб-страница профиля, избранное синхронизируется с сайтом, для гостя — запасное хранение на телефоне.
3. **Функции:** показ плана поездки и отправка плана через `/api/plan` с ключом идемпотентности; распознавание речи средствами телефона; напоминания о событиях сезона (10:00 по Майами, за 21 день); тёмная тема, шрифт Jost, золотой шар консьержа, 16 языков с проверкой RTL и доступности; безопасный мост с веб-вью, действие «пожаловаться на ответ», запросы разрешений.
4. **Проверка и выпуск:** debug-APK, release-AAB; CI с Android Lint, модульными и UI-тестами; сквозные сценарии (поиск → карточка → заявка; консьерж → план → повтор; избранное гостя и вошедшего; восстановление сети); проверка на настоящем телефоне (голос, уведомления, глубокие ссылки); узкие экраны и RTL; отчёт о приёмке с путями к APK/AAB, командами сборки, версией сервера и временем.

## Что сделано

### Проект (`android/`)

| Что | Где |
|---|---|
| Настройки Gradle, каталог версий | `settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`, `gradle/libs.versions.toml` |
| Обёртка Gradle 9.9.1 | `gradlew`, `gradle/wrapper/` |
| Сборка приложения | `app/build.gradle.kts` |
| Манифест и `MainActivity` (настоящие, см. «Веб-вкладки и навигация») | `app/src/main/AndroidManifest.xml`, `app/src/main/java/com/miamielio/app/MainActivity.kt` |
| Шрифты сайта (Jost, Bodoni Moda, DM Mono) и их лицензии OFL | `app/src/main/res/font/`, `app/src/main/assets/licenses/` |
| Фотографии разделов для экрана «Поиск» | `app/src/main/res/drawable-nodpi/world_*.jpg` |

Версии: AGP 9.5.1, Gradle 9.9.1, Kotlin 2.4.21, Compose BOM 2026.09.00, `compileSdk 37`, `targetSdk 36`, `minSdk 26`. В AGP 9 поддержка Kotlin встроена: плагин `org.jetbrains.kotlin.android` **не нужен**, подключён только `org.jetbrains.kotlin.plugin.compose`.

В `app/build.gradle.kts` уже заложено:
- `BuildConfig.BASE_URL` и `BuildConfig.ADDITIONAL_HOSTS`. Debug → тестовый сайт ветки iOS `https://claude-miami-elio-app-home-twt06c-gorgonaoneai3072126.alexey-alexandrov2026.workers.dev`, release → `https://gorgona-one.com` (плюс `www.gorgona-one.com`). Меняются свойствами `-Pmiamielio.debugBaseUrl=…` и `-Pmiamielio.releaseBaseUrl=…`.
- У debug-сборки суффикс `.debug` и имя «Miami Elio Test», чтобы стоять на телефоне рядом с боевой.
- Подпись release читается из `android/keystore.properties` (в git не попадает) или из переменных `MIAMIELIO_KEYSTORE_FILE`, `MIAMIELIO_KEYSTORE_PASSWORD`, `MIAMIELIO_KEY_ALIAS`, `MIAMIELIO_KEY_PASSWORD`. Без них AAB собирается неподписанным.
- R8 и сжатие ресурсов для release, зависимости для тестов (JUnit, корутины, Robolectric, Compose UI test).

### Ядро (`app/src/main/java/com/miamielio/app/core/`)

Перенос `ios/MiamiElioKit` на Kotlin, без зависимостей от Android, чтобы тестировать на обычной JVM.

| Файл | Что делает | Образец в iOS |
|---|---|---|
| `AppConfig.kt` | адрес сайта, свои хосты, `resolve()` для ссылок из JSON, `secure()` (http → https для своих страниц), нестрогий разбор адресов `WebAddress` | `AppConfig.swift` |
| `RoutePolicy.kt` | куда идёт каждая ссылка: `Web`, `Browser`, `System`, `Restricted`, `Ignored`; список закрытых букмекерских путей | `RoutePolicy.swift` |
| `SiteLocale.kt` | 16 языков сайта, RTL, языки распознавания речи, `VoiceLevel` (громкость для шара) | `SiteLocale.swift` |
| `Http.kt` | `ApiError`, `HttpRequest/HttpResponse`, интерфейс `HttpTransport`, терпимый разбор JSON | `HTTPTransport.swift` |
| `SearchApi.kt` | `SearchResult`, `SearchClient` | `SearchAPI.swift` |
| `ConciergeApi.kt` | `ChatMessage`, `ConciergeReply`, `ConciergeClient` (12 реплик, 4000 знаков UTF-16, тело ≤ 32 768 байт) | `ConciergeAPI.swift` |
| `PlanApi.kt` | `PlanRules`, `ConciergePlan`, `PlanRequest`, `PlanReceipt`, `PlanClient` (заголовок `Idempotency-Key`) | `PlanAPI.swift` |
| `Favorites.kt` | `FavoriteRef`, скрипт передачи изменения странице, чтение списка от страницы | `Favorites.swift` |
| `Season.kt` | события сезона, «скоро», расчёт времени напоминания | `Season.swift` |

Отличия от iOS, сделанные намеренно:
- `RoutePolicy` считает системными хосты `play.google.com`, `maps.app.goo.gl`, `maps.google.com` вместо адресов Apple, и **игнорирует** схемы `intent:`, `content:`, `android-app:` — иначе страница могла бы запускать чужие приложения.
- `AppConfig.resolve()` отвергает ссылки с пробелами и управляющими символами.
- `VoiceLevel.fromRecognizer()` — Android отдаёт громкость сразу в децибелах.

### Сеть (`app/src/main/java/com/miamielio/app/net/`)

`OkHttpTransport.kt` — `HttpTransport` поверх OkHttp: `enqueue` + `suspendCancellableCoroutine`, отмена корутины обрывает запрос, cookie и кэша нет, срок на весь вызов (поиск 20 с, чат 45 с, план 30 с — `OkHttpTransport.search()`, `.chat()`, `.plan()`), переход с https на http по перенаправлению запрещён, ответ больше 2 МБ считается сбоем. Недоступный сервер и тайм-аут — `IOException`; негодный адрес — `ApiError.InvalidRequest`.

### Тема и бренд (`app/src/main/java/com/miamielio/app/ui/`)

| Файл | Что делает | Образец в iOS |
|---|---|---|
| `Theme.kt` | цвета сайта (`Theme.paper`, `card`, `ink`, `soft`, `rule`, `accent`, `accentWash`, золото), `MiamiElioTheme` (единственная тёмная схема Material 3), `LocalReduceMotion` (системная настройка «Убрать анимации») | `Support/Theme.swift` |
| `Typography.kt` | `AppFont` / `AppType`: Jost для en, es, pt, de, tr, it, fr, pl, ru, системный шрифт для остальных; роли `hero`, `title`, `cardTitle`, `rowTitle`, `body`, `detail`, `button`, `eyebrow`; `Eyebrow()` | `Support/Typography.swift` |
| `Brand.kt` | `Wordmark` («MIAMI Elio», читается экранным диктором как одно название), `ConciergeMark` (шар: покой, слушает, думает, вспышка при появлении ответа), `Hairline` | `Support/Brand.swift` |
| `Motion.kt` | `Modifier.arrives(order)` — появление содержимого по очереди; `Modifier.pressable { }` — нажатие с лёгким проседанием | `Support/Motion.swift` |
| `L10n.kt` | `String.filled("count" to 3)` — подстановка в переведённую строку | `Support/L10n.swift` |

Окно тёмное с первого кадра: `res/values/themes.xml` (`Theme.MiamiElio`), `res/values/colors.xml`.

Отличие от iOS: свечение шара нарисовано радиальным градиентом, а не размытием — размытие в Compose работает только с Android 12.

### Веб-вкладки и навигация

| Файл | Что делает | Образец в iOS |
|---|---|---|
| `web/WebTabController.kt` | один `WebView` на вкладку, живёт всё время работы Activity; метка `MiamiElioApp/1.0` в User-Agent; cookie `gorgona-locale` до первого запроса; скрипт начала документа и мост только для своих https-адресов (`addDocumentStartJavaScript`, `addWebMessageListener`; `addJavascriptInterface` не используется); все ссылки через `RoutePolicy` (`shouldOverrideUrlLoading`, `onCreateWindow`, `doUpdateVisitedHistory`); обновление жестом вниз; перезагрузка, если вход изменился в другой вкладке; выбор файлов; микрофон только своим страницам; новый `WebView`, если система забрала процесс страницы; состояние — `StateFlow<State>` | `Web/WebViewModel.swift` |
| `web/WebBootstrap.kt` | текст скрипта страницы и разбор её сообщений (`BridgeMessage`); без зависимостей от Android | там же |
| `web/LoadFailure.kt` | «нет сети» или «что-то пошло не так» по коду ошибки WebView | там же |
| `web/WebTab.kt` | экран вкладки: страница, полоса загрузки, экран ошибки с кнопкой повтора; «назад» листает историю вкладки | `Web/WebTab.swift` |
| `core/DeepLink.kt` | разбор `miamielio://concierge`, `…//search`, `…//account`, `…//open?path=/yachts`; только пути внутри сайта | `App/AppRouter.swift` |
| `app/AppRouter.kt` | выбранная вкладка (`StateFlow`), повторное нажатие возвращает веб-вкладку к началу, куда идёт каждая ссылка | `App/AppRouter.swift` |
| `app/ExternalLinks.kt` | чужие сайты — Custom Tabs в цветах приложения; `tel:` — набор номера, `mailto:` — почта, остальное — системе (только как ссылка из браузера) | `Support/SafariView.swift` |
| `app/AppServices.kt` | создаёт и связывает всё перечисленное; debug-сборка смотрит на тестовый сайт, release — на боевой | `App/AppServices.swift` |
| `ui/RootTabs.kt` | `AppRoot` (вкладки под заставкой), `SplashView`, `RootTabs`, `TabBar` | `App/RootTabView.swift`, `App/SplashView.swift` |
| `MainActivity.kt` | точка входа; выбор файлов и запрос микрофона для страниц; глубокие ссылки | `App/MiamiElioApp.swift` |
| `scripts/verify-web-bridge.cjs` | запускает скрипт страницы на подставной странице в Node и проверяет 13 его действий | `ios/scripts/verify-web-bridge.cjs` |

Как это устроено на Android и чем отличается от iOS:
- Страница получает объект `miamiElioNative` (мост) и поверх него ту же «дверь», что в iPhone: `window.webkit.messageHandlers.miamiElio.postMessage(...)`. Документ помечается `data-app="android"`.
- Activity не пересоздаётся при повороте и изменении размера окна (`android:configChanges` в манифесте) — иначе веб-вкладки теряли бы страницу и историю. При смене языка телефона пересоздаётся.
- Вкладки «Консьерж» и «Поиск» — пока заглушки (шар и заголовок); экраны делаются в пунктах 7 и 8.
- Системная кнопка «назад»: сначала история веб-вкладки, потом возврат на «Главную», потом выход из приложения.
- Окно без нажатия пользователя (всплывающее) не открывается вовсе.
- Диалоги страницы (`alert`, `confirm`, `prompt`) показывает сам WebView стандартным окном Android, отдельного кода нет.

**Не сделано в этих пунктах и не проверено:**
- На телефоне и в эмуляторе не запускалось. Robolectric подменяет WebView пустышкой: проверено, что вкладка просит нужный адрес с нужными настройками, но ни одна настоящая страница не загружалась. Скрипт страницы проверен в Node на подставной странице, а не в настоящем WebView.
- Связка «ошибка WebView → экран ошибки» тестом не покрыта (отдельно проверены разбор ошибки и сам экран).
- Съёмка фото из формы выбора файла (камера) не поддержана — только выбор готового файла. Полноэкранное видео со страницы не поддержано.
- `mediaPlaybackRequiresUserGesture` оставлен включённым: видео без звука на страницах может не запускаться само, в отличие от iOS. Проверить на телефоне и решить.
- Сохранение страниц при уничтожении процесса системой (`WebView.saveState`) не делается: после этого вкладки открываются с начала.
- Сторонние cookie в WebView выключены (как в iOS). Если встроенные формы партнёров перестанут работать — причина может быть здесь.

### Тексты на 16 языках

- `android/strings.json` — единственный источник: 73 строки × 16 языков. Слова взяты из готовых файлов приложения для iPhone (`ios/MiamiElio/Resources/*.lproj/Localizable.strings`, коммит `ea94e447`), то есть те же, что на сайте. Файл самодостаточный: от переводов сайта в ветке №43 не зависит.
- `android/scripts/build-strings.mjs` пишет `res/values/strings.xml` и `res/values-<язык>/strings.xml` (иврит — `values-iw`, китайский — `values-zh`); с `--check` проверяет, что файлы не устарели. Скрипт сверяет список языков с `lib/languages.js` и требует, чтобы подстановки `{name}` совпадали во всех языках.
- Имена ресурсов: ключ iOS `plan.addBack` → `plan_add_back`. В каждом файле есть `locale_code` — код языка сайта, по нему `MiamiElioTheme` выбирает шрифт.
- Изменено для Android: `voice_unavailable` — «на этом устройстве» вместо «на этом iPhone»; добавлена `concierge_report` («Пожаловаться на ответ»); название системных настроек во французском, португальском и украинском и слово «уведомления» в немецком приведены к принятым в Android. **Эти 16 переводов двух новых строк и правки написаны агентом, носитель языка их не проверял.**
- Не перенесены три строки из `InfoPlist.strings` (зачем приложению камера, микрофон и распознавание речи): в Android таких обязательных подписей нет. Понадобятся для объяснения перед запросом разрешения — взять из `ios/strings.json`, раздел `infoPlist`.
- `androidResources.generateLocaleConfig = true` и `res/resources.properties`: Android 13+ показывает выбор языка приложения в настройках телефона.

### Тесты (`app/src/test/java/com/miamielio/app/`)

| Файл | Что проверяет |
|---|---|
| `core/RoutePolicyTest.kt` (вместе с `AppConfigTest`), `core/SiteLocaleTest.kt`, `core/FavoritesTest.kt`, `core/SeasonTest.kt` | ядро, из первой сессии |
| `core/SearchApiTest.kt`, `core/ConciergeApiTest.kt`, `core/PlanApiTest.kt` | перенос тестов iOS плюс: сбой сети, ответ без плана, повтор заявки с тем же ключом идемпотентности |
| `net/OkHttpTransportTest.kt` | транспорт против локального сервера на сокете: заголовки и тело, 503 как ответ, cookie не сохраняются, отмена, тайм-аут, недоступный сервер, слишком большой ответ, негодный адрес |
| `ui/BrandTest.kt` | выбор шрифта по языку, подпись логотипа для доступности, шар во всех состояниях (Robolectric + Compose UI test) |
| `ui/BrandSnapshotTest.kt` | заставка отрисована по-настоящему: фон — цвет сайта, есть золотой шар и логотип; картинка сохраняется в `app/build/outputs/snapshots/brand.png` |
| `core/DeepLinkTest.kt` | глубокие ссылки: вкладки, страницы сайта, отказ вести на чужой сайт |
| `web/WebBootstrapTest.kt` | текст скрипта страницы (свои хосты, закрытые разделы, язык; чужой текст не становится кодом), разбор сообщений моста, «нет сети» против прочих ошибок; пишет скрипт в `app/build/outputs/web/bootstrap.js` |
| `app/AppRouterTest.kt` | повторное нажатие на вкладку, куда идёт каждая ссылка, глубокие ссылки — на подставных страницах, без Android |
| `ui/RootTabsTest.kt` | настоящая `MainActivity` под Robolectric: заставка уходит, четыре вкладки с названиями, «Главная» просит адрес сайта с меткой приложения и cookie языка, «Моё Майами» грузится только при первом открытии, «назад» возвращает на «Главную», глубокие ссылки; экран ошибки; снимки `tabs-concierge.png` и `offline.png` |
| `ui/StringsTest.kt` | у каждого из 16 языков свои строки, RTL для иврита, арабского и фарси, иврит находится под кодами `he` и `iw`, неизвестный язык получает английский, ни одной пустой строки и ни одного «iPhone», подстановки работают во всех языках |

Тесты интерфейса идут под Robolectric с `@Config(sdk = [34])` (Android 14): с этой версией Robolectric 4.17 работает на JDK 17 — проверено. Более новые версии Android в тестах не пробовали.

## Что проверено

| Проверка | Результат |
|---|---|
| `./gradlew assembleDebug` на заглушке (до добавления ядра) | собралось, `app/build/outputs/apk/debug/app-debug.apk`, 14 МБ |
| `gradlew testDebugUnitTest` (вторая сессия) | ядро скомпилировалось без правок; 100 тестов в 18 классах, 0 сбоев |
| `gradlew assembleDebug` (вторая сессия) | собралось, `app/build/outputs/apk/debug/app-debug.apk`, 14,2 МБ |
| `gradlew bundleRelease` (вторая сессия) | собралось с R8, `app/build/outputs/bundle/release/app-release.aab`, 2,6 МБ, **без подписи** (ключа нет). Сам AAB не устанавливали и не запускали — работает ли приложение после сжатия R8, неизвестно |
| `node android/scripts/verify-web-bridge.cjs` | 13 проверок скрипта страницы проходят (на подставной странице в Node) |
| Снимки тестом `TabsSnapshotTest`: вкладка «Консьерж» с панелью вкладок, экран «нет сети» | выглядят как задумано — картинки смотрел агент (`app/build/outputs/snapshots/tabs-concierge.png`, `offline.png`) |
| `gradlew lintDebug` (вторая сессия) | 0 ошибок; предупреждения: неиспользуемые строки (экранов ещё нет), «...» вместо «…» в строке `state_loading` (так на сайте), нет иконки приложения (пункт 12), `targetSdk` 36 не последний |
| `node android/scripts/build-strings.mjs --check` | 16 языков, 73 строки, файлы актуальны |
| Заставка отрисована тестом `BrandSnapshotTest` (360×740 dp) | фон `#0A1218`, золотой шар со свечением, логотип шрифтами DM Mono и Bodoni Moda — картинку смотрел агент |
| Боевой сайт `gorgona-one.com`: `/api/search`, `/`, `/profile` | отвечают 200 |
| Боевой сайт: `/api/plan` | **404** — в `main` этого адреса нет |
| Тестовый сайт ветки iOS: `/api/search`, `/`, `/profile` | отвечают 200 |
| Тестовый сайт: `/api/plan` | 503 «Plan requests are not enabled» — адрес есть, приём заявок выключен |

Не проверено ничего, что требует экранов. На телефоне и в эмуляторе приложение не запускали ни в одной из сессий: в облаке нет `/dev/kvm`, на компьютере владельца эмулятор не установлен (в SDK нет ни `emulator`, ни образов системы). Транспорт проверен только против локального сервера — к настоящему сайту приложение ещё не обращалось.

## Важно знать о сервере

В `main` (боевой сайт) **нет** того, на что опирается приложение для iPhone: `/api/plan`, `FavoritesProvider.jsx` (избранное), правила `html[data-app] [data-app-hidden]` в `app/globals.css`, `lib/ai/appPersona.mjs`. Всё это есть только в ветке №43. Поэтому:

- С боевым сайтом план поездки и синхронизация избранного не заработают, пока №43 не слит. Приложение должно спокойно переживать их отсутствие: ответ чата без `plan` — обычный ответ; избранное хранится на телефоне.
- Debug-сборка смотрит на тестовый сайт ветки №43, где это есть.
- Сайт узнаёт приложение по `MiamiElioApp/` в User-Agent — это подходит и для Android.
- **Избранное, обратное направление.** `FavoritesProvider.jsx` сообщает список приложению только при `data-app="ios"` и только через `window.webkit.messageHandlers.miamiElio`. Задуманное решение для Android: ставить `data-app="android"`, давать странице совместимую прокладку `window.webkit.messageHandlers.miamiElio.postMessage` поверх `WebViewCompat.addWebMessageListener`, а список избранного хранить на телефоне (`SharedPreferences`) как запасной вариант. Изменения от приложения к сайту (`window.__miamiFavorite` или очередь `gorgona-favorites-pending`) работают без правок сайта. Чтобы сайт сообщал список Android-приложению, в ветке №43 нужна правка в одну строку: в `tellApp` принимать `data-app` со значением `android`. Эту правку должен одобрить владелец — ветку №43 трогать без спроса нельзя.

## Что осталось сделать (по порядку)

Образец для каждого пункта — одноимённый файл в `ios/MiamiElio/` ветки `claude/miami-elio-app-home-twt06c`. Посмотреть: `git fetch origin claude/miami-elio-app-home-twt06c && git show origin/claude/miami-elio-app-home-twt06c:ios/MiamiElio/<путь>`.

Пункты 1–6 **сделаны** во второй сессии (см. «Что сделано»): тесты ядра, сетевой транспорт, тема и бренд, тексты на 16 языках, веб-вкладки, навигация с заставкой. Следующий — пункт 7. Экраны «Консьерж» и «Поиск» ставятся на место заглушки `ComingTab` в `ui/RootTabs.kt`; транспорт для них — `OkHttpTransport.chat()`, `.plan()`, `.search()`; язык ответов консьержа — `services.explore.currentSiteLocale()`.

7. **Консьерж** по `Concierge/ConciergeStore.swift`, `ConciergeView.swift`, `PlanBoardView.swift`: `ViewModel` со `StateFlow`; приветствие с шаром, готовыми запросами и сезоном; реплики, карточки, подсказки; повтор после сбоя; новый разговор; доска плана (другой вариант, убрать, вернуть); форма заявки с датами, гостями и временем ужина; один и тот же ключ идемпотентности при повторе той же заявки. Плюс действие «Пожаловаться на ответ» (см. открытые вопросы).
8. **Поиск** по `Search/SearchStore.swift`, `SearchView.swift`: задержка 350 мс, отмена прошлого запроса, состояния «плитки разделов / идёт поиск / результаты / пусто / ошибка / нет сети», сердечки избранного.
9. **Избранное** по `Favorites/FavoritesStore.swift`: очередь изменений, доставка странице по одному, запасное хранение на телефоне.
10. **Сезон и напоминания** по `Season/SeasonStore.swift`, `SeasonListView.swift`: `season.json` в `assets` (данные в `main` и в iOS совпадают — проверено; взять из `lib/seasonData.js` скриптом по образцу `ios/scripts/build-season.mjs`); `AlarmManager.setAndAllowWhileIdle` без особых разрешений; хранение расписания и восстановление после перезагрузки телефона; разрешение `POST_NOTIFICATIONS` спрашивать только при нажатии на колокольчик; нажатие на уведомление открывает консьержа с готовым запросом.
11. **Голос** по `Concierge/Dictation.swift`: `SpeechRecognizer`, на телефоне где возможно (`createOnDeviceSpeechRecognizer`, API 31+); язык из `SiteLocale.speechLocale`; частичные результаты в поле ввода; выключение через минуту, при уходе с вкладки и при отправке; ответы вслух не читать. В манифесте `RECORD_AUDIO` и `<queries>` для `android.speech.RecognitionService`.
12. **Иконка** из `ios/MiamiElio/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png` (золотой шар на тёмном фоне `#100D08`): адаптивная иконка и обычные размеры.
13. **UI-тесты** на Robolectric + Compose UI test (запускаются без эмулятора, в `testDebugUnitTest`): сценарии из задания с подставным транспортом, RTL, подписи для доступности.
14. **CI:** `.github/workflows/android.yml` — `lintDebug`, `testDebugUnitTest`, `assembleDebug`, `bundleRelease`, артефакты APK и AAB. Запускать при изменениях в `android/`.
15. **`android/README.md`** по образцу `ios/README.md` и отчёт о приёмке в конце этого файла.

## Как собрать здесь (облачная сессия Claude Code)

Контейнер каждый раз новый, SDK в нём нет. Порядок:

1. Хост `dl.google.com` уже добавлен в окружение `gorgona-one-ai` (владелец одобрил 13 ноября).
2. Скачать инструменты командной строки в `/opt/android-sdk/cmdline-tools/latest` (`https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip`).
3. **Лицензии Android SDK принимает владелец.** Автоматический режим не даёт агенту принять их самому: сначала спросить владельца (в этой сессии он ответил «да»), потом `yes | sdkmanager --licenses`.
4. `sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"`. Платформу 37 Gradle докачивает сам.
5. `echo "sdk.dir=/opt/android-sdk" > android/local.properties` (файл в git не попадает).
6. Maven Central через прокси отвечает **429**, если качать много сразу. Помогает файл `~/.gradle/gradle.properties`:
   ```
   org.gradle.workers.max=2
   org.gradle.parallel=false
   systemProp.org.gradle.internal.repository.max.retries=6
   systemProp.org.gradle.internal.repository.initial.backoff=1500
   ```
   и повтор команды 2–3 раза: скачанное остаётся в кэше, каждая попытка продвигается дальше.
7. Сборка: `cd android && ./gradlew assembleDebug`. Тесты: `./gradlew testDebugUnitTest`. Первая сборка — около 5 минут с докачкой.

## Как собрать на компьютере владельца (Windows)

Всё нужное уже стоит в `C:\Users\alexa\android-toolchain`: JDK 17 (`jdk-17.0.21+9`), Android SDK (`sdk`, платформа 36, build-tools 36.0.0, лицензии приняты). Платформу 37 Gradle докачал сам.

1. Рабочая папка ветки: `Documents\ChatGPT\Miami Elio\miami-elio-android-agent` (отдельный worktree; остальные папки `miami-elio-*` не трогать).
2. **В репозитории включён sparse checkout.** В новой рабочей папке `android/` не появится, пока её не добавить: `git sparse-checkout add android` (настройка действует только на эту папку).
3. `android/local.properties` (в git не попадает): `sdk.dir=C\:/Users/alexa/android-toolchain/sdk` — двоеточие после буквы диска экранировать обязательно, иначе Lint считает это ошибкой (`PropertyEscape`) и `lintDebug` падает. Lint запоминает прошлый результат: после правки этого файла пересчитать командой `.\gradlew.bat :app:lintAnalyzeDebug --rerun :app:lintReportDebug --rerun :app:lintDebug`.
4. В PowerShell:
   ```
   $env:JAVA_HOME = "C:\Users\alexa\android-toolchain\jdk-17.0.21+9"
   cd android
   .\gradlew.bat testDebugUnitTest assembleDebug lintDebug
   ```
   Первая сборка — около 3 минут; тесты интерфейса при первом запуске скачивают образ Android 14 для Robolectric.
5. Тексты: после правки `android/strings.json` запустить `node android/scripts/build-strings.mjs` (в CI — с `--check`).
6. Снимки экранов без эмулятора: `android/app/build/outputs/snapshots/` — `brand.png` (заставка), `tabs-concierge.png`, `offline.png`; их пишут тесты `BrandSnapshotTest` и `TabsSnapshotTest`.
7. Скрипт страницы: после `testDebugUnitTest` запустить `node android/scripts/verify-web-bridge.cjs`.
8. Выпуск: `.\gradlew.bat bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab` (без ключа — неподписанный).

Особенности этого компьютера, на которые вторая сессия потратила время:

- **Сессия в приложении Claude может стартовать в пустой папке**, а не в репозитории. Сначала перейти в рабочую папку ветки (пункт 1).
- **У владельца стоит проверка «Fact-Forcing Gate» (GateGuard).** Первая запись или правка каждого файла и первая команда в оболочке отклоняются всегда. Нужно написать в ответе, кто использует файл, что нет другого файла с той же ролью, какие данные он читает, и дословно привести указание владельца — затем повторить то же действие. Это его проверка, обходить её не надо. Счётчик сбрасывается после долгой паузы.
- **PowerShell 5.1 ломает многострочное сообщение коммита с кавычками.** Писать сообщение в файл (UTF-8 без BOM) и делать `git commit -F <файл>`.
- В комментариях Kotlin не писать `values*/strings.xml`: сочетание `*/` закрывает комментарий.
- Эмулятора и образов системы на компьютере нет. Проверка на телефоне возможна, только если владелец подключит телефон или поставит эмулятор.

## Открытые вопросы к владельцу

1. **Куда отправлять жалобу на ответ консьержа?** Google Play требует от приложений с ИИ возможность пожаловаться на ответ, не выходя из приложения. На сайте нет ни адреса почты для обращений, ни серверного адреса для жалоб. Нужен либо адрес почты, либо решение завести приём жалоб на сервере.
2. **Правка в ветке №43** для избранного (одна строка в `FavoritesProvider.jsx`, см. выше) — разрешить или оставить запасное хранение на телефоне.
3. **Полный текст исходного задания** — если есть, прислать следующему агенту.
4. **Ключ подписи** для выпуска в Google Play и аккаунт разработчика Google Play.
5. Ресурсы (шрифты, фотографии, а дальше — переводы, иконка, список сезона) взяты из ветки `claude/miami-elio-app-home-twt06c`, как того требует задание «повторить приложение для iPhone». `CLAUDE.md` просит спрашивать перед тем, как брать код из веток `claude/*`, — сообщаю об этом явно.
6. **Есть ли у владельца второй аккаунт Claude**, под которым могла работать облачная сессия, отправившая `462f0170`? Если да — удалить её там, иначе она может снова написать в ветку.
7. **Проверка на телефоне.** Ни одна сессия не запускала приложение на устройстве. Нужен либо телефон Android, подключённый к компьютеру, либо разрешение поставить эмулятор.
