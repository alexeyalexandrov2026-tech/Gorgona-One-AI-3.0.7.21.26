package com.miamielio.app.ui

import android.graphics.Bitmap
import android.webkit.CookieManager
import androidx.activity.compose.setContent
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.SoftwareKeyboardController
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.lifecycle.Lifecycle
import com.miamielio.app.BuildConfig
import com.miamielio.app.MainActivity
import com.miamielio.app.app.AppTab
import com.miamielio.app.web.LoadFailure
import com.miamielio.app.web.LoadFailureView
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class RootTabsTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val services get() = compose.activity.services

    private fun pastTheSplash() {
        compose.mainClock.advanceTimeBy(4_000)
        compose.onNodeWithTag("splash").assertDoesNotExist()
    }

    @Test
    fun theSplashNoLongerWaitsForTheSite() {
        compose.onNodeWithTag("splash").assertExists()
        // The site underneath never finishes loading in this test.
        compose.mainClock.advanceTimeBy(1_300)
        compose.onNodeWithTag("splash").assertDoesNotExist()
    }

    @Test
    fun theBarHasFiveSlotsWithTheOrbInTheMiddle() {
        pastTheSplash()

        compose.onNodeWithTag("tab.Today").assertIsSelected()
        val order = listOf(AppTab.Today, AppTab.Catalog, AppTab.Concierge, AppTab.Exclusive, AppTab.Account)
        val bounds = order.map { compose.onNodeWithTag("tab.${it.name}").fetchSemanticsNode().boundsInRoot }
        assertEquals(bounds.sortedBy { it.left }, bounds)
        for (tab in order.drop(1)) compose.onNodeWithTag("tab.${tab.name}").assertIsNotSelected()
        // The orb is lifted above the bar.
        val orb = compose.onNodeWithTag("tab.orb", useUnmergedTree = true).fetchSemanticsNode().boundsInRoot
        assertTrue(orb.top < bounds[0].top)
        // Each tab is read by its name.
        for ((tab, label) in order.zip(listOf("Today", "Catalog", "AI", "Exclusive", "Profile"))) {
            compose.onNodeWithTag("tab.${tab.name}").assert(hasText(label))
        }
    }

    @Test
    fun theOrbLeavesTheTabContentUncovered() {
        pastTheSplash()

        // The concierge's field sits at the bottom of its tab, right above the
        // orb; the orb must not hide any of it.
        compose.onNodeWithTag("tab.Concierge").performClick()
        compose.mainClock.advanceTimeBy(500)
        val content = compose.onNodeWithTag("content.Concierge").fetchSemanticsNode().boundsInRoot
        val orb = compose.onNodeWithTag("tab.orb", useUnmergedTree = true).fetchSemanticsNode().boundsInRoot
        assertTrue("orb top ${orb.top} above content bottom ${content.bottom}", orb.top >= content.bottom)
    }

    @Test
    fun backClosesTheLayerBeforeTheTab() {
        pastTheSplash()

        compose.onNodeWithTag("tab.Exclusive").performClick()
        compose.runOnUiThread { services.router.open("/yachts") }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("web.layer").assertExists()
        compose.onNodeWithTag("tab.Exclusive").assertIsSelected()

        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("web.layer").assertDoesNotExist()
        compose.onNodeWithTag("tab.Exclusive").assertIsSelected()

        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("tab.Today").assertIsSelected()
    }

    @Test
    fun theHomeTabLoadsTheSiteAsTheApp() {
        pastTheSplash()

        val home = services.explore.webView
        assertEquals(BuildConfig.BASE_URL + "/", shadowOf(home).lastLoadedUrl)
        assertTrue(home.settings.userAgentString.endsWith("MiamiElioApp/1.0"))
        assertTrue(home.settings.javaScriptEnabled)
        // The language is chosen before the first request.
        assertTrue(CookieManager.getInstance().getCookie(BuildConfig.BASE_URL).orEmpty().contains("gorgona-locale=en"))

        // "My Miami" loads only when the guest first opens it.
        assertNull(shadowOf(services.account.webView).lastLoadedUrl)
        compose.onNodeWithTag("tab.Account").performClick()
        compose.mainClock.advanceTimeBy(500)
        assertEquals(BuildConfig.BASE_URL + "/profile", shadowOf(services.account.webView).lastLoadedUrl)
        compose.onNodeWithTag("tab.Account").assertIsSelected()
    }

    @Test
    fun aTabOpensOnATapAndBackReturnsHome() {
        pastTheSplash()

        compose.onNodeWithTag("tab.Concierge").performClick()
        compose.mainClock.advanceTimeBy(1_000)
        compose.onNodeWithTag("tab.Concierge").assertIsSelected()
        compose.onNodeWithText("Your Miami AI guide").assertExists()

        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("tab.Today").assertIsSelected()
    }

    @Test
    fun aDeepLinkOpensItsTabOrItsPage() {
        pastTheSplash()

        compose.runOnUiThread { services.router.handle("miamielio://search") }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("tab.Catalog").assertIsSelected()

        compose.runOnUiThread { services.router.handle("miamielio://open?path=/yachts") }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("tab.Catalog").assertIsSelected()
        compose.onNodeWithTag("web.layer").assertExists()
        assertEquals(BuildConfig.BASE_URL + "/yachts", shadowOf(services.explore.webView).lastLoadedUrl)
    }

    // --- The menu, Events and the Exclusive tab ---

    private fun goTo(tab: String) {
        compose.onNodeWithTag("tab.$tab").performClick()
        compose.mainClock.advanceTimeBy(500)
    }

    private fun openMenu() {
        compose.onNodeWithTag("menu.open").performClick()
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("menu.sheet").assertExists()
    }

    private fun choose(tag: String) {
        compose.onNodeWithTag(tag).performScrollTo().performClick()
        compose.mainClock.advanceTimeBy(500)
    }

    private fun pressBack() {
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.mainClock.advanceTimeBy(500)
    }

    @Test
    fun theExclusiveTabShowsItsPageOfTheSite() {
        pastTheSplash()

        // Like "My Miami", it loads only when the guest first opens it.
        assertNull(shadowOf(services.exclusive.webView).lastLoadedUrl)
        goTo("Exclusive")
        compose.onNodeWithTag("tab.Exclusive").assertIsSelected()
        compose.onNodeWithTag("content.Exclusive").assertExists()
        assertEquals(BuildConfig.BASE_URL + "/exclusive-destinations", shadowOf(services.exclusive.webView).lastLoadedUrl)

        // A link to it, from anywhere, lands in its tab rather than over another one.
        goTo("Catalog")
        compose.runOnUiThread { services.router.open("/exclusive-destinations") }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("tab.Exclusive").assertIsSelected()
        compose.onNodeWithTag("web.layer").assertDoesNotExist()
        assertEquals(BuildConfig.BASE_URL + "/", shadowOf(services.explore.webView).lastLoadedUrl)
    }

    @Test
    fun theMenuOpensFromTheTopOfTodayCatalogAiAndEventsAndBackClosesIt() {
        pastTheSplash()

        fun checkOn(screen: String, selected: String) {
            compose.onNodeWithTag(screen).assertExists()
            openMenu()
            pressBack()
            compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
            // "Back" put the menu away and did nothing else.
            compose.onNodeWithTag(screen).assertExists()
            compose.onNodeWithTag("tab.$selected").assertIsSelected()
        }

        checkOn("content.Today", "Today")
        goTo("Catalog")
        checkOn("content.Catalog", "Catalog")
        goTo("Concierge")
        checkOn("content.Concierge", "Concierge")
        compose.runOnUiThread { services.router.showEvents() }
        compose.mainClock.advanceTimeBy(500)
        checkOn("content.Events", "Today")

        // Its own button closes it too.
        openMenu()
        compose.onNodeWithTag("menu.close").performClick()
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
    }

    @Test
    fun aChoiceInTheMenuClosesItAndGoesThere() {
        pastTheSplash()

        openMenu()
        choose("menu.item.catalog")
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
        compose.onNodeWithTag("tab.Catalog").assertIsSelected()
        compose.onNodeWithTag("content.Catalog").assertExists()

        // A section of the site opens over the tab, as a link from the concierge would.
        openMenu()
        choose("menu.item.section.yachts")
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
        compose.onNodeWithTag("web.layer").assertExists()
        assertEquals(BuildConfig.BASE_URL + "/yachts", shadowOf(services.explore.webView).lastLoadedUrl)
        compose.onNodeWithTag("tab.Catalog").assertIsSelected()
        pressBack()
        compose.onNodeWithTag("web.layer").assertDoesNotExist()

        openMenu()
        choose("menu.item.ai")
        compose.onNodeWithTag("tab.Concierge").assertIsSelected()
        compose.onNodeWithText("Your Miami AI guide").assertExists()

        openMenu()
        choose("menu.item.today")
        compose.onNodeWithTag("tab.Today").assertIsSelected()
        compose.onNodeWithTag("content.Today").assertExists()

        openMenu()
        choose("menu.item.section.exclusive")
        compose.onNodeWithTag("tab.Exclusive").assertIsSelected()
        compose.onNodeWithTag("web.layer").assertDoesNotExist()

        goTo("Today")
        openMenu()
        choose("menu.item.profile")
        compose.onNodeWithTag("tab.Account").assertIsSelected()
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
    }

    @Test
    fun eventsIsAScreenOpenedFromTheMenuAndBackGoesToToday() {
        pastTheSplash()
        compose.onNodeWithTag("content.Events").assertDoesNotExist()

        openMenu()
        choose("menu.item.events")
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
        compose.onNodeWithTag("content.Events").assertExists()
        compose.onNodeWithTag("content.Today").assertDoesNotExist()
        // Events is no tab of the bar: Today stays the one that is lit.
        compose.onNodeWithTag("tab.Today").assertIsSelected()
        for (other in listOf("Catalog", "Concierge", "Exclusive", "Account")) compose.onNodeWithTag("tab.$other").assertIsNotSelected()

        // The menu is there too, and "back" puts it away before it leaves Events.
        openMenu()
        pressBack()
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
        compose.onNodeWithTag("content.Events").assertExists()

        pressBack()
        compose.onNodeWithTag("content.Events").assertDoesNotExist()
        compose.onNodeWithTag("content.Today").assertExists()
        compose.onNodeWithTag("tab.Today").assertIsSelected()
    }

    @Test
    fun theTodayTabAndTheOtherTabsLeaveEvents() {
        pastTheSplash()
        compose.runOnUiThread { services.router.showEvents() }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("content.Events").assertExists()

        goTo("Today")
        compose.onNodeWithTag("content.Events").assertDoesNotExist()
        compose.onNodeWithTag("content.Today").assertExists()

        compose.runOnUiThread { services.router.showEvents() }
        compose.mainClock.advanceTimeBy(500)
        goTo("Catalog")
        compose.onNodeWithTag("content.Events").assertDoesNotExist()
        compose.onNodeWithTag("content.Catalog").assertExists()
    }

    @Test
    fun theNextEventRowOnTodayOpensEvents() {
        pastTheSplash()
        // The row shows while the season has an event ahead; with the season over there is nothing to open.
        assumeTrue(compose.onAllNodesWithTag("today.nextEvent").fetchSemanticsNodes().isNotEmpty())

        compose.onNodeWithTag("today.nextEvent").performScrollTo().performClick()
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("content.Events").assertExists()

        pressBack()
        compose.onNodeWithTag("content.Today").assertExists()
    }

    @Test
    fun aLinkThatArrivesWhileTheMenuIsOpenPutsTheMenuAway() {
        pastTheSplash()

        openMenu()
        compose.runOnUiThread { services.router.handle("miamielio://account") }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
        compose.onNodeWithTag("tab.Account").assertIsSelected()

        goTo("Today")
        openMenu()
        compose.runOnUiThread { services.router.open("/yachts") }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
        compose.onNodeWithTag("web.layer").assertExists()
    }

    // --- The keyboard ---

    /** What the app asked of the focus and of the keyboard. */
    private class Hands {
        var focusCleared = 0
        var keyboardHidden = 0
    }

    /** The tabs again, with the focus and the keyboard replaced by ones that keep count. */
    private fun withCountedHands(): Hands {
        val hands = Hands()
        compose.runOnUiThread {
            compose.activity.setContent {
                val focus = LocalFocusManager.current
                val countingFocus = remember(focus) {
                    object : FocusManager by focus {
                        override fun clearFocus(force: Boolean) {
                            focus.clearFocus(force)
                            hands.focusCleared++
                        }
                    }
                }
                val keyboard = LocalSoftwareKeyboardController.current
                val countingKeyboard = remember(keyboard) {
                    object : SoftwareKeyboardController {
                        override fun show() {
                            keyboard?.show()
                        }

                        override fun hide() {
                            keyboard?.hide()
                            hands.keyboardHidden++
                        }
                    }
                }
                CompositionLocalProvider(
                    LocalFocusManager provides countingFocus,
                    LocalSoftwareKeyboardController provides countingKeyboard,
                ) { MiamiElioTheme { RootTabs(services) } }
            }
        }
        compose.mainClock.advanceTimeBy(1_000)
        return hands
    }

    private fun assertPutAway(hands: Hands, what: String, action: () -> Unit) {
        val cleared = hands.focusCleared
        val hidden = hands.keyboardHidden
        action()
        compose.mainClock.advanceTimeBy(500)
        assertTrue("$what: focus was not cleared", hands.focusCleared > cleared)
        assertTrue("$what: keyboard was not hidden", hands.keyboardHidden > hidden)
    }

    @Test
    fun everyTabChangePutsTheKeyboardAway() {
        val hands = withCountedHands()
        for (tab in listOf("Catalog", "Exclusive", "Account", "Concierge", "Today")) {
            assertPutAway(hands, "tab $tab") { compose.onNodeWithTag("tab.$tab").performClick() }
        }
    }

    @Test
    fun openingTheMenuOrEventsPutsTheKeyboardAway() {
        val hands = withCountedHands()
        assertPutAway(hands, "menu") { compose.onNodeWithTag("menu.open").performClick() }
        compose.onNodeWithTag("menu.close").performClick()
        compose.mainClock.advanceTimeBy(500)
        assertPutAway(hands, "Events") { compose.runOnUiThread { services.router.showEvents() } }
    }

    @Test
    fun comingBackToTheAppPutsTheKeyboardAway() {
        val hands = withCountedHands()
        val scenario = compose.activityRule.scenario
        assertPutAway(hands, "returning to the app") {
            scenario.moveToState(Lifecycle.State.STARTED)
            scenario.moveToState(Lifecycle.State.RESUMED)
        }
    }

    @Test
    fun aFieldThatHasTheFocusLosesItWhenTheMenuOpensAndWhenTheAppReturns() {
        pastTheSplash()
        goTo("Catalog")

        compose.onNodeWithTag("search.input").performClick()
        compose.onNodeWithTag("search.input").assertIsFocused()
        openMenu()
        compose.onNodeWithTag("search.input").assertIsNotFocused()
        pressBack()

        compose.onNodeWithTag("search.input").performClick()
        compose.onNodeWithTag("search.input").assertIsFocused()
        val scenario = compose.activityRule.scenario
        scenario.moveToState(Lifecycle.State.STARTED)
        scenario.moveToState(Lifecycle.State.RESUMED)
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("search.input").assertIsNotFocused()
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LoadFailureViewTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun noNetworkSaysSoAndOffersAnotherTry() {
        var retries by mutableIntStateOf(0)
        compose.setContent {
            MiamiElioTheme { LoadFailureView(LoadFailure("https://gorgona-one.com/", isOffline = true), onRetry = { retries++ }) }
        }
        compose.onNodeWithText("No internet connection").assertExists()
        compose.onNodeWithText("Check your connection and try again.").assertExists()
        compose.onNodeWithTag("web.retry").performClick()
        assertEquals(1, retries)
    }

    @Test
    fun anyOtherFailureIsNotBlamedOnTheNetwork() {
        compose.setContent {
            MiamiElioTheme { LoadFailureView(LoadFailure("https://gorgona-one.com/", isOffline = false), onRetry = {}) }
        }
        compose.onNodeWithText("Something went wrong").assertExists()
        compose.onNodeWithText("No internet connection").assertDoesNotExist()
        compose.onNodeWithText("Try again").assertExists()
    }
}

/** Draws the tabs for real and keeps the pictures in `build/outputs/snapshots`. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
class TabsSnapshotTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    @Test
    fun theTodayTabAndTheBar() {
        compose.mainClock.advanceTimeBy(4_000)
        compose.onNodeWithTag("tab.Today").assertIsSelected()
        compose.mainClock.advanceTimeBy(2_000)
        save(compose.onRoot().captureToImage().asAndroidBitmap(), "tabs-today.png")
    }

    @Test
    fun theConciergeTabAndTheBar() {
        compose.mainClock.advanceTimeBy(4_000)
        compose.onNodeWithTag("tab.Concierge").performClick()
        compose.mainClock.advanceTimeBy(2_000)
        save(compose.onRoot().captureToImage().asAndroidBitmap(), "tabs-concierge.png")
    }

    @Test
    fun theCatalogTabAndTheBar() {
        compose.mainClock.advanceTimeBy(4_000)
        compose.onNodeWithTag("tab.Catalog").performClick()
        compose.mainClock.advanceTimeBy(2_000)
        save(compose.onRoot().captureToImage().asAndroidBitmap(), "tabs-catalog.png")
    }

    @Test
    fun theMenuOpenOverToday() = menuOver("menu-open-en.png")

    @Test
    @Config(sdk = [34], qualifiers = "iw-w360dp-h740dp-xhdpi")
    fun theMenuOpenOverTodayInHebrew() = menuOver("menu-open-he.png")

    private fun menuOver(name: String) {
        compose.mainClock.advanceTimeBy(4_000)
        compose.onNodeWithTag("menu.open").performClick()
        compose.mainClock.advanceTimeBy(1_000)
        compose.onNodeWithTag("menu.sheet").assertExists()
        save(compose.onRoot().captureToImage().asAndroidBitmap(), name)
    }

    /** The Events screen as Today leads to it: its next-event row calls `showEvents`. */
    @Test
    fun eventsFromToday() {
        compose.mainClock.advanceTimeBy(4_000)
        compose.runOnUiThread { compose.activity.services.router.showEvents() }
        compose.mainClock.advanceTimeBy(2_000)
        compose.onNodeWithTag("content.Events").assertExists()
        compose.onNodeWithTag("tab.Today").assertIsSelected()
        save(compose.onRoot().captureToImage().asAndroidBitmap(), "events-from-today-en.png")
    }

    @Test
    fun theOfflineScreen() {
        compose.mainClock.advanceTimeBy(4_000)
        compose.runOnUiThread {
            compose.activity.setContent {
                MiamiElioTheme { LoadFailureView(LoadFailure(null, isOffline = true), onRetry = {}) }
            }
        }
        compose.mainClock.advanceTimeBy(500)
        save(compose.onRoot().captureToImage().asAndroidBitmap(), "offline.png")
    }

    private fun save(picture: Bitmap, name: String) {
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
