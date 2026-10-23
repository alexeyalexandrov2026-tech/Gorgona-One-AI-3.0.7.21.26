# Кандидат для публикации только автопарка

23 октября 2026. Ветка `release/miami-fleet-only` создана от свежего `origin/main`, `5fcd0fa18cca537ea079a9a88a05b8109290d151`. Публичный сайт и общий staging этой веткой не изменялись.

## Состав

Только 30 карточек автомобилей, локальные фотографии, уменьшенные обложки, 16 языков, исправление неверного G-Class URL и инструменты передачи. Белый и серый BMW X5 раздельны; CLE53/CLE300 и GLS с разными салонами разделены. Белый G550 источника исключён. Числовые цены источника не публикуются.

Прежние компоненты ListingCard, Gallery, Specs и BookingForm сохранены. Каталог и детали в main прямо читают lib/rentalsData.js; SQL seed для этого переноса выполнять не нужно. Файлы app/, Auth/API, миграции, package/lock, GitHub workflows, Wrangler config и AI router относительно main не меняются.

Основные изменённые файлы: lib/rentalsData.js, lib/miamiFleetImport.js, lib/homeData.js, lib/data/listings.js, next.config.js, словари i18n/, public/images/rentals/, tests/content/fleet-import.test.mjs и fleet-browser.mjs. Сбор и упаковка — scripts/import/. Необязательный SQL seed подготовлен, но не выполнен.

Независимая проверка подтвердила совпадение всех 30 записей и 293 используемых изображений/thumbnail с ранее проверенной hosted-интеграцией. Совпадение контента не заменяет отдельную проверку полного production candidate.

## Свежая локальная проверка этой ветки

| Проверка | Результат |
|---|---|
| Content/i18n | PASS: 70 тестов, 0 failures/skips, exit 0 |
| Словари | PASS: 16 языков по 933 сообщения, 0 пропусков, exit 0 |
| Next production-mode build | PASS, exit 0 |
| OpenNext package | PASS: 1 handler, 81 referenced client assets, exit 0 |
| Production-config dry-run | PASS: 699 assets, exit 0, upload/deploy не выполнялся |
| Chrome | PASS: 30 страниц, 16 локализаций, 1440/390px, галереи, редирект, 0 JS errors, exit 0 |
| Архив | Проверяет SHA-256 каждого элемента, применение patch к чистому main и совпадение перенесённых файлов |

Журналы вне Git в родительской папке: fleet-production-only-tests.log, fleet-production-only-i18n.log, fleet-production-only-build.log, fleet-production-only-worker.log, fleet-production-only-browser.log и fleet-production-only-dry-run.log. Скриншоты: outputs/fleet-production-only-qa/.

Полный штатный managed `npm run build`, Linux CI, запуск данного main-only candidate на hosted staging, production rollout, настоящая отправка заявки и внешние уведомления — NOT TESTED. Вложенный ai-router находится в Git, но исключён из локального sparse checkout; отсутствие локального каталога не означает ошибку managed сборки. Не изменять его зависимости и сборку в рамках переноса автомобилей.

## Архив передачи

Из чистой сохранённой ветки:

```powershell
python scripts/import/package-miami.py --base origin/main --archive-name miami-fleet-production-2026-10-23.zip
```

Архив содержит patch существующих файлов, files/ с новыми, TRANSFER.md и SHA256SUMS.json с baseCommit. Именной receipt хранит SHA-256 ZIP и результаты integrity/cleanBaseTransfer. Проверка пути запрещает директории и альтернативные Windows streams в имени архива. Прежний v2 не перезаписывается.

Применять только к чистому указанному main в отдельной ветке. Проверить baseCommit в SHA256SUMS.json. Партнёрский архив v2 относительно ba93717 не является main-based production package.

## Границы публикации

Свежая проверка выявила production wildcard trigger e85bb453-81a3-41d1-9158-96cb8e571ce6: он включает все ветки и исключает только main и feat/partner-listing-publication. Push этой release-ветки может запустить production. Перед push требуется отдельное разрешённое исключение ровно release/miami-fleet-only; основной main trigger не менять.

По CLAUDE.md PR создаёт или одобряет пользователь; напрямую main не изменяется. Этот кандидат не включает разрешение на push, PR, trigger change, merge или deployment. После разрешения проверить exact-head CI и путь managed сборки до публикации.

Общий staging одновременно обновляется задачей «Исправить Cloudflare deployment». На проверенном 68c14db там нет импортированного флита, хотя ранняя версия 51014da проходила hosted acceptance. Не перезаписывать текущий staging без согласования единого источника и владельца публикации. Исторические PASS не выдавать за текущее содержимое staging.

Не подтверждены VIN двух белых фотонаборов, точные комплектации/годы/коды краски и коммерческая доступность. Два белых набора объединены как вариант каталога без утверждения об одном VIN.
