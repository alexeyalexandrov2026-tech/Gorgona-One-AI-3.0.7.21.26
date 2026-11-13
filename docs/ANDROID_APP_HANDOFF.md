# Передача дел: приложение Miami Elio для Android

Состояние на 13 ноября 2026. Сначала прочитайте `CLAUDE.md` в корне: правила оттуда действуют и здесь.

## Коротко

- **Ветка:** `claude/android-app-agent-rr0ij5`, создана от `main` на коммите `477e39b3` (Merge pull request #50). Всё лежит в папке `android/` и в этом файле. Сайт, `ios/` и ветка №43 не тронуты.
- **Готово:** каркас проекта Gradle, ядро приложения (логика без экранов) и модульные тесты к нему.
- **Не готово:** все экраны, веб-вью, голос, напоминания, переводы, иконка, CI, сборка AAB. Приложение пока показывает одну строку текста — это заглушка для проверки сборки.
- **Проверено:** пробный debug-APK собирается (`./gradlew assembleDebug`). Результат запуска модульных тестов — в разделе «Что проверено» ниже.
- **Pull request не открыт** — владелец не просил.

## Что случилось с предыдущей попыткой

До этой сессии над приложением работал другой агент (сессия «Miami Elio Android приложение»). Он упёрся в лимит и **ничего не закоммитил**: на GitHub от него нет ни ветки, ни папки `android/`. Его код недоступен, поэтому работа начата заново. Вывод для следующего агента: **коммитить и пушить после каждого законченного куска**, а не в конце.

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
| Манифест-заглушка и `MainActivity`-заглушка | `app/src/main/AndroidManifest.xml`, `app/src/main/java/com/miamielio/app/MainActivity.kt` |
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

### Модульные тесты (`app/src/test/java/com/miamielio/app/core/`)

Написаны: `RoutePolicyTest.kt` (вместе с `AppConfigTest`), `SiteLocaleTest.kt`, `FavoritesTest.kt`, `SeasonTest.kt`, вспомогательный `MockTransport.kt`.

**Ещё не написаны** тесты для `SearchApi`, `ConciergeApi`, `PlanApi`. Их нужно перенести из `ios/MiamiElioKit/Tests/MiamiElioKitTests/` (`SearchAPITests.swift`, `ConciergeAPITests.swift`, `PlanAPITests.swift`) — случаи там готовые.

## Что проверено

| Проверка | Результат |
|---|---|
| `./gradlew assembleDebug` на заглушке (до добавления ядра) | собралось, `app/build/outputs/apk/debug/app-debug.apk`, 14 МБ |
| `./gradlew testDebugUnitTest` (ядро и тесты) | см. последний коммит этой ветки: результат записан в его сообщении. Если там сказано «не запускались» — ядро ещё ни разу не компилировалось, начните с этой команды |
| Боевой сайт `gorgona-one.com`: `/api/search`, `/`, `/profile` | отвечают 200 |
| Боевой сайт: `/api/plan` | **404** — в `main` этого адреса нет |
| Тестовый сайт ветки iOS: `/api/search`, `/`, `/profile` | отвечают 200 |
| Тестовый сайт: `/api/plan` | 503 «Plan requests are not enabled» — адрес есть, приём заявок выключен |

Не проверено ничего, что требует экранов. Эмулятор здесь запустить нельзя (нет `/dev/kvm`), настоящего телефона нет.

## Важно знать о сервере

В `main` (боевой сайт) **нет** того, на что опирается приложение для iPhone: `/api/plan`, `FavoritesProvider.jsx` (избранное), правила `html[data-app] [data-app-hidden]` в `app/globals.css`, `lib/ai/appPersona.mjs`. Всё это есть только в ветке №43. Поэтому:

- С боевым сайтом план поездки и синхронизация избранного не заработают, пока №43 не слит. Приложение должно спокойно переживать их отсутствие: ответ чата без `plan` — обычный ответ; избранное хранится на телефоне.
- Debug-сборка смотрит на тестовый сайт ветки №43, где это есть.
- Сайт узнаёт приложение по `MiamiElioApp/` в User-Agent — это подходит и для Android.
- **Избранное, обратное направление.** `FavoritesProvider.jsx` сообщает список приложению только при `data-app="ios"` и только через `window.webkit.messageHandlers.miamiElio`. Задуманное решение для Android: ставить `data-app="android"`, давать странице совместимую прокладку `window.webkit.messageHandlers.miamiElio.postMessage` поверх `WebViewCompat.addWebMessageListener`, а список избранного хранить на телефоне (`SharedPreferences`) как запасной вариант. Изменения от приложения к сайту (`window.__miamiFavorite` или очередь `gorgona-favorites-pending`) работают без правок сайта. Чтобы сайт сообщал список Android-приложению, в ветке №43 нужна правка в одну строку: в `tellApp` принимать `data-app` со значением `android`. Эту правку должен одобрить владелец — ветку №43 трогать без спроса нельзя.

## Что осталось сделать (по порядку)

Образец для каждого пункта — одноимённый файл в `ios/MiamiElio/` ветки `claude/miami-elio-app-home-twt06c`. Посмотреть: `git fetch origin claude/miami-elio-app-home-twt06c && git show origin/claude/miami-elio-app-home-twt06c:ios/MiamiElio/<путь>`.

1. **Запустить `./gradlew testDebugUnitTest`**, починить ошибки компиляции ядра, дописать тесты поиска, чата и плана. Закоммитить.
2. **Сетевой транспорт** на OkHttp (зависимость уже добавлена): `HttpTransport` через `enqueue` и `suspendCancellableCoroutine`, отмена вызова при отмене корутины, без cookie и кэша, тайм-ауты 20 с (поиск), 45 с (чат), 30 с (план).
3. **Тема и бренд:** цвета из `Support/Theme.swift` (фон `#0A1218`, карточка `#111D25`, текст `#EDF2F3`, приглушённый `#9AAAB2`, линия `#22323C`, акцент `#FF6E93`, золото `#C9A45C` / `#F3E2B8` / `#7A5C24`, фон реплики гостя `#3A1623`); шрифты по `Support/Typography.swift` (Jost только для en, es, pt, de, tr, it, fr, pl, ru; остальным — системный); логотип и шар консьержа по `Support/Brand.swift`; появление содержимого по `Support/Motion.swift`. Только тёмная тема.
4. **Тексты на 16 языках:** перевести `ios/MiamiElio/Resources/*.lproj/Localizable.strings` в `res/values-*/strings.xml`. Китайский — `values-zh`, иврит — `values-iw`. Строку `voice.unavailable` переписать без слова «iPhone». Добавить строку «Пожаловаться на ответ» на всех языках. В манифесте `android:supportsRtl="true"`.
5. **Веб-вкладки** по `Web/WebViewModel.swift`: два `WebView` («/» и «/profile»), живущие всё время работы Activity; User-Agent с `MiamiElioApp/1.0`; cookie `gorgona-locale` до первой загрузки; скрипт начала документа через `WebViewCompat.addDocumentStartJavaScript` с правилами происхождения только для своих хостов; мост через `addWebMessageListener` (не `addJavascriptInterface`); маршрутизация ссылок через `RoutePolicy` в `shouldOverrideUrlLoading`, `onCreateWindow` и `doUpdateVisitedHistory`; полоса загрузки; экран ошибки и «нет сети» с повтором; обновление жестом вниз (`SwipeRefreshLayout`); перезагрузка при смене входа в другой вкладке; выбор файлов; разрешение микрофона только своим страницам; кнопка «назад» листает историю веб-вью.
6. **Навигация** по `App/AppRouter.swift` и `App/RootTabView.swift`: четыре вкладки, повторное нажатие на веб-вкладку возвращает к началу; чужие сайты — в Custom Tabs; телефон, почта, WhatsApp — системе; глубокие ссылки `miamielio://open?path=/yachts`, `miamielio://concierge`, `miamielio://search`, `miamielio://account`. Заставка по `App/SplashView.swift`.
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

## Открытые вопросы к владельцу

1. **Куда отправлять жалобу на ответ консьержа?** Google Play требует от приложений с ИИ возможность пожаловаться на ответ, не выходя из приложения. На сайте нет ни адреса почты для обращений, ни серверного адреса для жалоб. Нужен либо адрес почты, либо решение завести приём жалоб на сервере.
2. **Правка в ветке №43** для избранного (одна строка в `FavoritesProvider.jsx`, см. выше) — разрешить или оставить запасное хранение на телефоне.
3. **Полный текст исходного задания** — если есть, прислать следующему агенту.
4. **Ключ подписи** для выпуска в Google Play и аккаунт разработчика Google Play.
5. Ресурсы (шрифты, фотографии, а дальше — переводы, иконка, список сезона) взяты из ветки `claude/miami-elio-app-home-twt06c`, как того требует задание «повторить приложение для iPhone». `CLAUDE.md` просит спрашивать перед тем, как брать код из веток `claude/*`, — сообщаю об этом явно.
