# Native Today Screen and Site-Style Concierge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Android 1.2.0 (code 4): a native "Today" home with the website's hero concierge, the concierge restyled in the site's gold, a five-slot menu (Today · Catalog · AI · Events · Profile), and site pages opening as a layer over the tabs.

**Architecture:** Compose screens on the existing `AppServices`/`AppRouter`. The Explore `WebTabController` stays alive and loads at launch, invisibly; the router shows it as an overlay layer instead of a tab. The hero is drawn natively from bundled assets and strings imported from the website's own translation catalog.

**Tech Stack:** Kotlin 2.4, Jetpack Compose (BOM 2026.09.00), Material 3, Coil 3, Robolectric 4.17 (`@Config(sdk=[34])`), Node for the strings script.

**Spec:** `docs/superpowers/specs/2026-11-18-native-home-design.md` (mockups in `docs/superpowers/specs/2026-11-18-native-home/`).

## Global Constraints

- Work in `C:\Users\alexa\Documents\ChatGPT\Miami Elio\miami-elio-android-agent`, branch `claude/android-app-agent-rr0ij5`. Before each push: `git fetch origin claude/android-app-agent-rr0ij5` and HEAD must equal FETCH_HEAD; never force-push, rebase or reset. Commit files by name (never `git add -A`: `.claude/`, `.anchor/`, `hs_err_pid*` must stay out).
- No change to the website (`main`) in this plan.
- No new libraries. Strings only through `android/strings.json` → `node android/scripts/build-strings.mjs`; `--check` must pass. Every new string in all 16 languages.
- Hero texts come from the site: English from `origin/main:i18n/locales/en.js`, others from `origin/main:i18n/locales/<lang>.js` (keys below). Never translate them by hand; a missing key falls back to English and is listed in the task report.
- No intro ("Horizon") animation and no rotating showcase card.
- `versionCode = 4`, `versionName = "1.2.0"`. Signing via `android/keystore.properties`. **No Play Console upload** — the owner approves uploads separately.
- Every snapshot listed in Task 7 is sent to the owner for approval before the release bundle is built.
- Build on Windows: `$env:JAVA_HOME = "C:\Users\alexa\android-toolchain\jdk-17.0.21+9"; cd android; .\gradlew.bat testDebugUnitTest assembleDebug lintDebug` → BUILD SUCCESSFUL, 0 test failures, 0 lint errors.
- Gold values (site): line `#61D4AF37` (rgba(212,175,55,.38)), button `#E8C440`, button text `#1B1404`, gold text `#D4AF37`. The site's hero "Ask" button stays pink (`Theme.accent`).

## Review Focus

1. **Right-to-left (he, ar, fa):** hero chips and pick row scroll from the right, arrows mirror, the clock pill stays readable — covered by the Hebrew snapshot in Task 4.
2. **Large text (font scale 2.0):** the glass panel and pick buttons must not clip or overlap — covered by `todayFitsAtDoubleFontScale` in Task 4.
3. **No network at launch:** Today renders completely from bundled assets; asking shows the concierge's existing offline failure — covered by `todayNeedsNoNetwork` in Task 4.
4. **Back with a layer open:** back walks the web page's history, then closes the layer, then (on a non-Today tab) returns to Today — covered by `backClosesTheLayerBeforeTheTab` in Task 3.
5. **Double tap while sending:** a hero chip tapped while a reply is coming sends nothing — covered by `heroIsInertWhileTheConciergeAnswers` in Task 4.

---

### Task 1: Hero and menu strings

**Files:**
- Create: `android/scripts/import-home-copy.mjs`
- Modify: `android/strings.json`, generated `android/app/src/main/res/values*/strings.xml`

**Interfaces:**
- Produces string resources (imported): `home_chip_1`…`home_chip_5`, `home_prompt_1`…`home_prompt_5`, `home_pick_yachts`, `home_pick_villas`, `home_pick_cars`, `home_pick_jets`, `home_pick_dining`, `home_pick_events`, `home_pick_adventures`, `home_ask_jets`, `home_ask_adventures`, `home_concierge_label`, `home_ask`, `home_beach`; (app-owned) `tab_today`, `tab_catalog`, `tab_events`, `tab_profile`, `concierge_online`, `concierge_manager`, `home_next_event` (placeholder `{name}`), `web_back`.

- [ ] **Step 1: Write `import-home-copy.mjs`.** For each of the 16 language codes in `lib/languages.js` (`SUPPORTED_LANGUAGES`), read `git show origin/main:i18n/locales/<code>.js` into a temp `.mjs` file in the OS temp dir, import its default export (a flat object of dotted keys), and set `strings.json` entries from this map (catalog key → app key):

```
home.chips.0..4            → home_chip_1..5
home.prompts.0..4          → home_prompt_1..5
home.worldItems.yachts.0   → home_pick_yachts      home.picks.villas        → home_pick_villas
home.worldItems.cars.0     → home_pick_cars        home.picks.jets          → home_pick_jets
home.picks.dining          → home_pick_dining      home.worldItems.events.0 → home_pick_events
home.picks.adventures      → home_pick_adventures  home.picksAsk.jets       → home_ask_jets
home.picksAsk.adventures   → home_ask_adventures   ui.0f7664c62a90fb50      → home_concierge_label
home.searchGo              → home_ask              home.beach               → home_beach
```
Missing key in a language → English value, printed as `missing <code> <key>`. Insert new keys after `concierge_live_manager`, keep 2-space JSON formatting, preserve the trailing newline. Print the count written (21).

- [ ] **Step 2: Run it and the generator.**
Run: `node android/scripts/import-home-copy.mjs && node android/scripts/build-strings.mjs && node android/scripts/build-strings.mjs --check`
Expected: "21 keys", a (possibly empty) `missing` list, "Android strings are up to date (16 languages, 99 strings)".

- [ ] **Step 3: Add the 8 app-owned strings in all 16 languages** (en / ru given; translate the other 14 consistently with existing `tab_*` strings, and note in the report that a native speaker has not reviewed them):
`tab_today` Today / Сегодня · `tab_catalog` Catalog / Каталог · `tab_events` Events / События · `tab_profile` Profile / Профиль · `concierge_online` concierge online / консьерж онлайн · `concierge_manager` Manager / Менеджер · `home_next_event` Next: {name} / Ближайшее: {name} · `web_back` Back / Назад.
Run: `node android/scripts/build-strings.mjs && node android/scripts/build-strings.mjs --check` → up to date, 107 strings.

- [ ] **Step 4: Commit**
```bash
git add android/scripts/import-home-copy.mjs android/strings.json android/app/src/main/res/values*/strings.xml
git commit -m "feat(android): import the site's hero copy and add menu strings"
```

---

### Task 2: Tabs and the web layer in the router

**Files:**
- Modify: `android/app/src/main/java/com/miamielio/app/app/AppRouter.kt`
- Test: `android/app/src/test/java/com/miamielio/app/app/AppRouterTest.kt`

**Interfaces:**
- Produces: `enum class AppTab { Today, Catalog, Concierge, Events, Account }`; `AppRouter.webLayer: StateFlow<Boolean>`; `AppRouter.closeLayer()`; `select(tab)` / `show(tab)` / `open(reference)` / `handle(deepLink)` keep their signatures. Initial tab `Today`.

- [ ] **Step 1: Rewrite the router tests for the new tabs.** Replace `Explore` with `Today` and `Search` with `Catalog` in existing expectations. In `linksAPageHandsOverGoTheSameWay`, after `account.onRoute?.invoke("https://gorgona-one.com/yachts", RouteDecision.Web)` assert `explore.loaded == listOf("https://gorgona-one.com/yachts")`, `router.webLayer.value == true` and `tab == AppTab.Account` (the tab underneath does not change). Add:

```kotlin
@Test fun closingTheLayerKeepsTheTab() {
    router.select(AppTab.Events); router.open("/yachts")
    assertTrue(router.webLayer.value); router.closeLayer()
    assertFalse(router.webLayer.value); assertEquals(AppTab.Events, tab)
}
@Test fun sitePagesWithTheirOwnTabSwitchTabs() {
    router.open("/profile"); assertEquals(AppTab.Account, tab); assertFalse(router.webLayer.value)
    router.open("/search?q=yacht"); assertEquals(AppTab.Catalog, tab); assertFalse(router.webLayer.value)
}
@Test fun selectingATabClosesTheLayer() {
    router.open("/yachts"); router.select(AppTab.Concierge)
    assertFalse(router.webLayer.value)
}
```
In `deepLinksReachTabsAndSitePagesOnly`: `miamielio://search` → `AppTab.Catalog`; `miamielio://open?path=/yachts` → loaded and `webLayer == true`.

- [ ] **Step 2: Run** `.\gradlew.bat :app:testDebugUnitTest --tests "com.miamielio.app.app.AppRouterTest"` → FAIL (unresolved `Today`, `webLayer`).

- [ ] **Step 3: Implement.** `follow(RouteDecision.Web)`: if the URL's path (lower-cased, trailing slash and query removed) is `/profile` → `show(Account)`; `/search` → `show(Catalog)`; otherwise `explore.load(url)` and `webLayer = true`. `select(tab)` closes the layer; re-selecting `Account` still calls `account.returnToStart()`; re-selecting `Today` does nothing. `DeepLink.Search` → `Catalog`.

- [ ] **Step 4: Run the same command** → PASS. `RootTabs` will not compile until Task 3; if the module fails to compile, finish Task 3 and commit both together.

- [ ] **Step 5: Commit** (with Task 3 if needed)
```bash
git add android/app/src/main/java/com/miamielio/app/app/AppRouter.kt android/app/src/test/java/com/miamielio/app/app/AppRouterTest.kt
git commit -m "feat(android): five tabs and site pages as a layer in the router"
```

---

### Task 3: Root layout — menu with the orb, web layer, back, splash

**Files:**
- Modify: `android/app/src/main/java/com/miamielio/app/ui/RootTabs.kt`, `android/app/src/main/java/com/miamielio/app/ui/Theme.kt`
- Create: `android/app/src/main/java/com/miamielio/app/web/WebLayer.kt`, `android/app/src/main/res/drawable/ic_tab_events.xml` (bell, same stroke style as `ic_tab_home`)
- Test: the existing tab UI test that writes `tabs-concierge.png` (`grep -rl "tabs-concierge" android/app/src/test`); add `RootLayoutTest.kt` beside it if that file is not a fit.

**Interfaces:**
- Consumes: Task 2's `AppTab`, `webLayer`, `closeLayer()`.
- Produces: `Theme.goldLine = Color(0x61D4AF37)`, `Theme.goldButton = Color(0xFFE8C440)`, `Theme.goldInk = Color(0xFF1B1404)`, `Theme.goldText = Color(0xFFD4AF37)`; `@Composable fun WebLayer(controller: WebTabController, onClose: () -> Unit, modifier: Modifier = Modifier)`. Tab tags stay `tab.<AppTab.name>`; layer tag `web.layer`, its back button `web.back`. Content tags `content.Today`, `content.Events` (screens arrive in Tasks 4–5; until then an empty `Box` with the tag).

- [ ] **Step 1: Write failing UI tests** (Robolectric + Compose, same setup as the existing tab test):
  - `theMenuHasFiveSlotsWithTheOrbInTheMiddle`: `tab.Today`, `tab.Catalog`, `tab.Concierge`, `tab.Events`, `tab.Account` exist in that left-to-right order; `tab.Concierge` is taller than `tab.Today` (raised orb).
  - `backClosesTheLayerBeforeTheTab`: select Events, `router.open("/yachts")` → `web.layer` shown and `tab.Events` still selected; back (via the activity's `onBackPressedDispatcher`) with the controller unable to go back → layer gone, Events selected; back again → Today selected.
  - `theSplashNoLongerWaitsForTheSite`: with the explore state never settling, the `splash` node is gone after 1 300 ms of main-clock time.
- [ ] **Step 2: Run them** → FAIL.
- [ ] **Step 3: Implement.** `TabBar` iterates `AppTab.entries`; the `Concierge` slot draws `ConciergeMark(diameter = 54.dp)` lifted 22 dp above the bar with a 3 dp `Theme.paper` ring and the label "AI" in `Theme.goldButton`; selected icons and labels use `Theme.goldButton`. Labels: `tab_today`, `tab_catalog`, `tab_events`, `tab_profile`. Content: `Today` → `TodayScreen` (Task 4), `Catalog` → existing `SearchScreen`, `Concierge` → `ConciergeScreen`, `Events` → `EventsScreen` (Task 5), `Account` → `WebTab(services.account)`. When `webLayer` is true draw `WebLayer(services.explore, router::closeLayer)` over the content area; the menu stays visible below. `WebLayer` = a 52 dp header (back arrow `web.back` with `web_back` as description, `Wordmark(size = 20f)`) above `WebTab(controller)`. Back order: layer open → controller goes back if it can, else `closeLayer()`; no layer and tab ≠ Today → `show(Today)`; on Today → system default. Splash: keep the 1 200 ms delay, delete the wait on `services.explore.state`. `AppServices` keeps creating `explore` at launch (it loads `/` in the background; favorites sync and `currentSiteLocale()` depend on it).
- [ ] **Step 4: Run** `.\gradlew.bat :app:testDebugUnitTest` → all PASS.
- [ ] **Step 5: Commit**
```bash
git add android/app/src/main/java/com/miamielio/app/ui/RootTabs.kt android/app/src/main/java/com/miamielio/app/ui/Theme.kt android/app/src/main/java/com/miamielio/app/web/WebLayer.kt android/app/src/main/res/drawable/ic_tab_events.xml android/app/src/test/java/com/miamielio/app/ui/
git commit -m "feat(android): menu with the AI orb, site pages as a layer, no splash wait"
```

---

### Task 4: Today screen with the site's hero concierge

**Files:**
- Create: `android/app/src/main/java/com/miamielio/app/today/TodayScreen.kt`, `today/HeroCopy.kt`, `app/ManagerContact.kt`, `res/drawable-nodpi/hero_tower.webp` (from `git show origin/main:public/images/home/hero-tower.jpg`, 1080 px wide, WebP quality 80, ≤ 250 KB), pick icons `ic_pick_yacht/villa/car/jet/dine/ticket/peak.xml` and `ic_spark.xml` (paths from `ICONS` in `origin/main:app/components/home/HomeHero.jsx`).
- Modify: `concierge/ConciergeScreen.kt` (move `LIVE_MANAGER_URL` to `app/ManagerContact.kt` as `const val LIVE_MANAGER_URL`), `ui/RootTabs.kt`
- Test: `android/app/src/test/java/com/miamielio/app/today/HeroCopyTest.kt`, `TodayScreenTest.kt`, `TodaySnapshotTest.kt`

**Interfaces:**
- Consumes: `ConciergeViewModel.send(prompt)`, `.state` (`isSending`), `.speechLanguage()`; `rememberDictation(draft, language, onDraft, sending)`; Task 1 strings; Task 3 `Theme.gold*`; `Season.upcoming(events, now)`.
- Produces:
  - `internal fun ghostText(prompts: List<String>, elapsedMillis: Long): String` — 42 ms per character, then a 1 600 ms hold, then the next prompt, cycling.
  - `internal fun miamiClock(now: Instant, locale: Locale): String` — `DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale)` in `ZoneId.of("America/New_York")`.
  - `internal data class Pick(val label: Int, val ask: Int, val icon: Int)`; `internal val PICKS: List<Pick>` in this order, as `picks` in `HomeHero.jsx`: yachts (`home_pick_yachts` → `home_chip_1`), villas (→ `home_chip_4`), cars (→ `home_chip_2`), jets (→ `home_ask_jets`), dining (→ `home_chip_5`), events (→ `home_chip_3`), adventures (→ `home_ask_adventures`).
  - `@Composable internal fun TodayScreen(model: ConciergeViewModel, season: SeasonReminders?, onAsked: () -> Unit, onOpen: (String) -> Unit, onEvents: () -> Unit, modifier: Modifier = Modifier)`; tags `today.chip`, `today.input`, `today.ask`, `today.mic`, `today.pick`, `today.clock`, `today.nextEvent`, `today.manager`.

- [ ] **Step 1: Unit tests for the pure parts** (`HeroCopyTest`):
```kotlin
@Test fun theHintTypesThenHoldsThenMovesOn() {
    val p = listOf("Abc", "Xy")
    assertEquals("", ghostText(p, 0)); assertEquals("A", ghostText(p, 42)); assertEquals("Abc", ghostText(p, 126))
    assertEquals("Abc", ghostText(p, 126 + 1_599)); assertEquals("", ghostText(p, 126 + 1_600))
    assertEquals("X", ghostText(p, 126 + 1_600 + 42))
    val cycle = 126 + 1_600 + 84 + 1_600L; assertEquals("A", ghostText(p, cycle + 42))
}
@Test fun theClockShowsMiamiTime() =
    assertEquals("7:34 PM", miamiClock(Instant.parse("2026-11-19T00:34:00Z"), Locale.US).replace('\u202F', ' '))
@Test fun picksAskWhatTheSiteAsks() =
    assertEquals(listOf(R.string.home_chip_1, R.string.home_chip_4, R.string.home_chip_2, R.string.home_ask_jets,
        R.string.home_chip_5, R.string.home_chip_3, R.string.home_ask_adventures), PICKS.map { it.ask })
```
- [ ] **Step 2: Run** `--tests "com.miamielio.app.today.HeroCopyTest"` → FAIL; implement `HeroCopy.kt`; run → PASS.
- [ ] **Step 3: UI tests** (`TodayScreenTest`, using the concierge tests' `ScriptedTransport`; record `opened` URLs and an `asked` counter for `onAsked`):
  - `aChipAsksTheConciergeAndOpensIt`: tap the first `today.chip` → one request whose last user message is the English `home_chip_1` text; `asked == 1`.
  - `typingAndAskingSendsTheText`: `today.ask` disabled when empty; type "Yacht for 8" into `today.input`, tap `today.ask` → request content "Yacht for 8", `asked == 1`.
  - `heroIsInertWhileTheConciergeAnswers`: hold the transport, tap a chip, then another chip and a pick → still exactly one request; `today.ask` disabled.
  - `todayNeedsNoNetwork`: transport `offline()`; the hero label, chips and picks are shown; tapping a chip still calls `onAsked`.
  - `theManagerOpensTelegram`: tap `today.manager` → `opened == listOf(LIVE_MANAGER_URL)`.
  - `theNextEventLeadsToEvents`: `SeasonReminders` with a clock before Art Basel → `today.nextEvent` contains "Art Basel Miami Beach"; tap → `onEvents` called.
  - `todayFitsAtDoubleFontScale` (`w360dp-h740dp`, font scale 2.0 via `LocalDensity`): `today.ask` and the first `today.pick` are displayed and their bounds do not overlap.
- [ ] **Step 4: Run** → FAIL.
- [ ] **Step 5: Implement `TodayScreen`** per `home.png` and the spec: header (`Wordmark`; gold-outlined pill `ic_telegram` + `concierge_manager` → `onOpen(LIVE_MANAGER_URL)`); hero card with 16 dp side margins, 28 dp corners, `hero_tower` cropped, bottom gradient; chip row (`ic_spark` + `home_chip_n`, translucent dark pills); glass panel (`Theme.paper` at 78 % alpha, `Theme.goldLine` border, 22 dp corners): orb 24 dp + `home_concierge_label` in `Theme.goldText` with wide letter spacing, input showing `ghostText(prompts, elapsed)` over an empty field (static first prompt when `LocalReduceMotion` is true), mic from `rememberDictation`, pink "`home_ask` →" button, divider, horizontally scrolling `PICKS`; clock pill "● `home_beach` · `miamiClock`" refreshed every 30 s; below the card the `home_next_event` row from `Season.upcoming(...).firstOrNull()`. Asking: `model.send(text)` then `onAsked()`; every hero control is disabled while `state.isSending`. In `RootTabs`: `onAsked = { router.show(AppTab.Concierge) }`, `onEvents = { router.show(AppTab.Events) }`, `onOpen = router::open`.
- [ ] **Step 6: Snapshots** (`TodaySnapshotTest`, 360×740 xhdpi, `MiamiElioTheme`, into `build/outputs/snapshots/`): `today-en.png`, `today-ru.png` (qualifier `ru`), `today-he.png` (qualifier `iw`).
- [ ] **Step 7: Run** `.\gradlew.bat :app:testDebugUnitTest` → PASS; open the three PNGs and compare with `home.png` (photo, chips, glass, pink Ask, picks, clock; Hebrew mirrored).
- [ ] **Step 8: Commit**
```bash
git add android/app/src/main/java/com/miamielio/app/today/ android/app/src/main/java/com/miamielio/app/app/ManagerContact.kt android/app/src/main/java/com/miamielio/app/concierge/ConciergeScreen.kt android/app/src/main/java/com/miamielio/app/ui/RootTabs.kt android/app/src/main/res/drawable-nodpi/hero_tower.webp android/app/src/main/res/drawable/ic_pick_*.xml android/app/src/main/res/drawable/ic_spark.xml android/app/src/test/java/com/miamielio/app/today/
git commit -m "feat(android): Today screen with the site's hero concierge"
```

---

### Task 5: Events tab

**Files:**
- Create: `android/app/src/main/java/com/miamielio/app/season/EventsScreen.kt`
- Modify: `season/SeasonList.kt` (gold style only), `concierge/ConciergeScreen.kt` (remove the `season` item and parameter), `ui/RootTabs.kt`
- Test: `android/app/src/test/java/com/miamielio/app/season/EventsScreenTest.kt`

**Interfaces:**
- Consumes: `SeasonList(reminders, onPrepare)`, `ConciergeViewModel.prepare(text)`.
- Produces: `@Composable internal fun EventsScreen(reminders: SeasonReminders, onPlan: (String) -> Unit, modifier: Modifier = Modifier)`; in `RootTabs` `onPlan = { model.prepare(it); router.show(AppTab.Concierge) }`.

- [ ] **Step 1: Failing tests:** `planningAnEventFillsTheConciergeAndOpensIt` — with a clock before Art Basel, tap the plan action on the Art Basel row → `onPlan` text contains "Art Basel Miami Beach". `remindersStillNeedPermission` — with notifications disallowed, the `season_blocked` text is shown.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** per `events.png`: `season_title` as a gold eyebrow, a large display heading `tab_events`, lede `season_lede`; each event a card with `Theme.goldLine` border and faint gold gradient, a left date block (display-font day range, short month in gold mono), name, place, the existing plan action in gold with "→", the reminder control as a 40 dp round bell (filled `Theme.goldButton` with `Theme.goldInk` icon when on, gold outline when off). No logic change in `SeasonList`/`SeasonReminders`.
- [ ] **Step 4: Run** `.\gradlew.bat :app:testDebugUnitTest` → PASS (update concierge tests that expected the season list on the empty screen). Snapshot `events-en.png`.
- [ ] **Step 5: Commit**
```bash
git add android/app/src/main/java/com/miamielio/app/season/ android/app/src/main/java/com/miamielio/app/concierge/ConciergeScreen.kt android/app/src/main/java/com/miamielio/app/ui/RootTabs.kt android/app/src/test/java/com/miamielio/app/season/ android/app/src/test/java/com/miamielio/app/concierge/
git commit -m "feat(android): Events tab with the Miami season in gold"
```

---

### Task 6: Concierge in the site's gold

**Files:**
- Modify: `android/app/src/main/java/com/miamielio/app/concierge/ConciergeScreen.kt`, `concierge/PlanBoard.kt`
- Test: `android/app/src/test/java/com/miamielio/app/concierge/ConciergeScreenTest.kt` (existing tests keep passing; tags unchanged)

**Interfaces:**
- Consumes: Task 3 `Theme.gold*`, Task 4 `LIVE_MANAGER_URL`, Task 1 `concierge_online`, `concierge_manager`.
- Produces: new tag `concierge.suggestions` on the chip row above the composer.

- [ ] **Step 1: Failing test** `suggestionsSitAboveTheComposer`: with `Replies.withCardAndSuggestion`, the "Dinner after" chip is inside `concierge.suggestions`, below the last `concierge.card` and above `concierge.input`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** per `concierge.png`: header = orb 30 dp, "Miami Elio AI" over "● `concierge_online`" (dot `#3CCF8E`), gold-outlined pill `ic_telegram` + `concierge_manager` (`concierge.manager`, content description `concierge_live_manager`), new-conversation icon. Guest bubble: `Theme.goldButton` at 14 % fill, `Theme.goldLine` border, corners 20/20/6/20. `ListingRow` and `CardView`: `Theme.goldLine` border, gradient gold 10 % → white 2 %, label and price in gold. The newest reply's `suggestions` render in a row above the composer (`concierge.suggestions`); older replies show none. Composer: `Theme.goldLine` outline, send button filled `Theme.goldButton` with `Theme.goldInk` text `concierge_send`. Empty state: orb, `concierge_title`, starters as gold-outlined pills. `PlanBoard`: same border, gradient and button colours; no logic change.
- [ ] **Step 4: Run** `.\gradlew.bat :app:testDebugUnitTest` → PASS; regenerate `concierge-listings-en.png`, `concierge-plan-en.png`, `concierge-plan-he.png`, `concierge-welcome-en.png` and compare with `concierge.png`.
- [ ] **Step 5: Commit**
```bash
git add android/app/src/main/java/com/miamielio/app/concierge/ android/app/src/test/java/com/miamielio/app/concierge/
git commit -m "feat(android): concierge in the site's gold"
```

---

### Task 7: Owner review, release build, notes

**Files:**
- Modify: `android/app/build.gradle.kts` (`versionCode = 4`, `versionName = "1.2.0"`), `android/PLAY_CONSOLE.md` (release notes 1.2.0, English, ≤ 500 characters), `docs/ANDROID_APP_HANDOFF.md` (two rows in the check log, like the 18 November 1.1.0 rows)

- [ ] **Step 1: Full check.** `.\gradlew.bat clean testDebugUnitTest assembleDebug lintDebug` → BUILD SUCCESSFUL, 0 failures, lint 0 errors; `node android/scripts/build-strings.mjs --check` → up to date.
- [ ] **Step 2: Emulator check (API 36)** with the debug APK: airplane mode on → the app opens on Today with photo and texts; airplane mode off → a chip opens the concierge with an answer; a listing opens as a layer and back closes it; Profile shows "My Miami"; an Events reminder toggles. Record what was and was not checked.
- [ ] **Step 3: Send the owner** `today-en.png`, `today-ru.png`, `today-he.png`, `events-en.png`, `concierge-listings-en.png`, `concierge-welcome-en.png` and an emulator screenshot of a web layer. **Wait for approval**; apply changes in the owning task and re-run Step 1.
- [ ] **Step 4: Release notes** (PLAY_CONSOLE.md): "A new home screen: the Miami Elio AI concierge from our website, with quick requests for yachts, villas, cars, jets and dining. The concierge has a new gold look with photos and prices in its answers, and a live manager one tap away. New Events tab with the Miami season and reminders."
- [ ] **Step 5: Signed bundle.** Bump the version; `.\gradlew.bat bundleRelease`; `jarsigner -verify` → "jar verified", certificate SHA-256 `0C:50:70:A8:E3:15:58:D9:AF:E0:A5:15:77:C6:32:AD:55:66:86:C9:8F:94:C2:EA:83:0D:B3:3D:81:52:75:4C`; `bundletool dump manifest` → `versionCode="4" versionName="1.2.0" package="com.miamielio.app"`. Record size and SHA-256 in the handoff.
- [ ] **Step 6: Commit and push** (fetch first; HEAD must equal FETCH_HEAD):
```bash
git add android/app/build.gradle.kts android/PLAY_CONSOLE.md docs/ANDROID_APP_HANDOFF.md
git commit -m "release(android): 1.2.0 — Today, gold concierge, Events"
git push origin claude/android-app-agent-rr0ij5
```
- [ ] **Step 7:** Send the owner the signed `app-release.aab` and ask whether to upload it to Google Play. Do not upload without a yes.
