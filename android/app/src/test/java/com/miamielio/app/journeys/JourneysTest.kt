package com.miamielio.app.journeys

import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteractionsProvider
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTextInput
import com.miamielio.app.app.AppRouter
import com.miamielio.app.app.AppTab
import com.miamielio.app.app.ExternalOpener
import com.miamielio.app.app.WebPage
import com.miamielio.app.concierge.ConciergeScreen
import com.miamielio.app.concierge.ConciergeViewModel
import com.miamielio.app.concierge.Replies
import com.miamielio.app.concierge.ScriptedTransport
import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.PlanClient
import com.miamielio.app.core.RouteDecision
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.core.SearchClient
import com.miamielio.app.favorites.FavoriteChange
import com.miamielio.app.favorites.FavoritesPage
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.favorites.MemoryFavorites
import com.miamielio.app.favorites.guestFavorites
import com.miamielio.app.search.SearchScreen
import com.miamielio.app.search.SearchViewModel
import com.miamielio.app.ui.MiamiElioTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

internal const val YACHTS = """{"results":[
  {"href":"/yachts/azimut-55","title":"Azimut 55","world":"yachts","subtitle":"MIAMI ELIO Fleet","location":"Sunny Isles Beach","price":"from ${'$'}2,400"},
  {"href":"/yachts/sunseeker-76","title":"Sunseeker 76","world":"yachts","category":"Yacht","location":"Miami Beach"}]}"""

/**
 * Whole journeys across screens, the router and the favorites store, against
 * scripted servers: what a guest does from the first tap to the end result.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
class JourneysTest {
    @get:Rule
    val compose = createComposeRule()

    private class Page : WebPage {
        override var onRoute: ((url: String, decision: RouteDecision) -> Unit)? = null
        val loaded = mutableListOf<String>()

        override fun load(url: String) {
            loaded += url
        }

        override fun returnToStart() = Unit
    }

    private class Outside : ExternalOpener {
        val opened = mutableListOf<String>()

        override fun openBrowser(url: String) {
            opened += url
        }

        override fun openSystem(url: String) {
            opened += url
        }
    }

    private val search = ScriptedTransport()
    private val online = MutableStateFlow(true)

    private fun searchScreen(favorites: FavoritesStore = guestFavorites(), onOpen: (String) -> Unit = {}) {
        val model = SearchViewModel(SearchClient(transport = search), online, pauseMillis = 0)
        compose.setContent { MiamiElioTheme { SearchScreen(model, favorites, onOpen = onOpen) } }
    }

    private fun find(query: String) {
        compose.onNodeWithTag("search.input").performTextInput(query)
        compose.waitForIdle()
    }

    @Test
    fun aSearchResultOpensItsPageInTheHomeTab() {
        val config = AppConfig.production
        val explore = Page()
        val outside = Outside()
        val router = AppRouter(config, RoutePolicy(config), explore, Page(), outside)
        router.select(AppTab.Search)
        search.reply(YACHTS)
        searchScreen(onOpen = router::open)

        find("yacht")
        compose.onNodeWithText("Sunseeker 76").performClick()

        assertEquals(AppTab.Explore, router.selectedTab.value)
        assertEquals(listOf("https://gorgona-one.com/yachts/sunseeker-76"), explore.loaded)
        assertTrue(outside.opened.isEmpty())
    }

    @Test
    fun aSearchWithoutInternetFinishesOnItsOwnWhenTheConnectionReturns() {
        search.offline().reply(YACHTS)
        searchScreen()
        find("azimut")
        compose.onNodeWithText("No internet connection").assertExists()

        online.value = false
        compose.waitForIdle()
        online.value = true
        compose.waitForIdle()

        compose.onNodeWithText("No internet connection").assertDoesNotExist()
        compose.onNodeWithText("Azimut 55").assertExists()
        assertEquals(2, search.requests.size)
    }

    @Test
    fun aGuestSaveFollowsTheGuestIntoTheirAccountAndLeavesWithThem() {
        val disk = MemoryFavorites()
        val delivered = mutableListOf<FavoriteChange>()
        var accepting = false
        val page = FavoritesPage { change -> accepting.also { if (it) delivered += change } }
        val favorites = FavoritesStore(disk, CoroutineScope(Dispatchers.Main.immediate), listOf(page))
        search.reply(YACHTS)
        searchScreen(favorites)
        find("yacht")
        val azimut = compose.onAllNodesWithTag("favorite.heart")[0]
        val sunseeker = compose.onAllNodesWithTag("favorite.heart")[1]

        // A guest: the site has sent no list and has not taken the change yet.
        azimut.performClick().assertIsSelected()
        assertEquals(setOf("yacht:azimut-55"), disk.snapshot.keys)
        assertEquals(1, disk.snapshot.pending.size)

        // The guest signs in on the site; the account already keeps Sunseeker.
        accepting = true
        compose.runOnUiThread { favorites.received(setOf("yacht:sunseeker-76"), page, "acct-1") }
        compose.waitForIdle()
        azimut.assertIsSelected()
        sunseeker.assertIsSelected()
        assertEquals("yacht:azimut-55", delivered.single().favorite.key)
        assertEquals("acct-1", delivered.single().owner)
        assertTrue(disk.snapshot.pending.isEmpty())

        // Signing out shows the next guest nothing of the account.
        compose.runOnUiThread { favorites.received(emptySet(), page, null) }
        compose.waitForIdle()
        azimut.assertIsNotSelected()
        sunseeker.assertIsNotSelected()
        assertTrue(disk.snapshot.keys.isEmpty())
    }

    @Test
    fun aPlanRequestLostOnTheWayIsSentAgainAsTheSameRequest() {
        val chat = ScriptedTransport().reply(Replies.withPlan())
        val plans = ScriptedTransport().offline().reply(Replies.receipt)
        val model = ConciergeViewModel(
            client = ConciergeClient(transport = chat),
            planClient = PlanClient(transport = plans),
            reporter = null,
            locale = { "en" },
        )
        compose.setContent { MiamiElioTheme { ConciergeScreen(model, guestFavorites(), onOpen = {}) } }
        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("concierge.conversation").performScrollToNode(hasTestTag("plan.send"))
        compose.onNodeWithTag("plan.send").performClick()
        compose.waitForIdle()

        compose.onNodeWithTag("plan.name").performScrollTo().performTextInput("Demo Guest")
        compose.onNodeWithTag("plan.phone").performScrollTo().performTextInput("+13055550123")
        compose.onNodeWithTag("plan.email").performScrollTo().performTextInput("guest@example.com")
        compose.onNodeWithTag("plan.submit").performScrollTo().performClick()
        compose.waitForIdle()

        // No connection: the form stays, says so, and keeps what was typed.
        compose.onNodeWithTag("plan.form").assertExists()
        compose.onNodeWithTag("plan.problem").assertExists()
        compose.onNodeWithText("Demo Guest").assertExists()

        compose.onNodeWithTag("plan.submit").performScrollTo().performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("plan.form").assertDoesNotExist()
        compose.onNodeWithText("Plan request sent").assertExists()

        assertEquals(2, plans.requests.size)
        val (first, second) = plans.requests
        assertTrue(first.headers["Idempotency-Key"].orEmpty().isNotEmpty())
        assertEquals(first.headers["Idempotency-Key"], second.headers["Idempotency-Key"])
        assertEquals(String(first.body!!, Charsets.UTF_8), String(second.body!!, Charsets.UTF_8))
    }

    @Test
    fun everyControlInSearchHasAName() {
        search.reply(YACHTS)
        searchScreen()
        compose.assertEveryControlIsNamed()
        find("yacht")
        compose.assertEveryControlIsNamed()
    }

    @Test
    fun everyControlInTheConciergeAndItsPlanHasAName() {
        val chat = ScriptedTransport().reply(Replies.withPlan())
        val model = ConciergeViewModel(
            client = ConciergeClient(transport = chat),
            planClient = PlanClient(transport = ScriptedTransport()),
            reporter = { },
            locale = { "en" },
        )
        compose.setContent { MiamiElioTheme { ConciergeScreen(model, guestFavorites(), onOpen = {}) } }
        compose.assertEveryControlIsNamed()

        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.waitForIdle()
        compose.assertEveryControlIsNamed()

        compose.onNodeWithTag("concierge.conversation").performScrollToNode(hasTestTag("plan.send"))
        compose.onNodeWithTag("plan.send").performClick()
        compose.waitForIdle()
        compose.assertEveryControlIsNamed()
    }
}

/**
 * The narrowest common phone (320 dp) with text at 130 %, in English and in the
 * two right-to-left scripts: nothing runs off the side, the hearts keep a full
 * 48 dp target. The pictures go to `build/outputs/snapshots`.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class NarrowLargeTextTest {
    @get:Rule
    val compose = createComposeRule()

    private fun large(content: @Composable () -> Unit) {
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale = 1.3f)) {
                MiamiElioTheme { content() }
            }
        }
    }

    private fun search(name: String) {
        val model = SearchViewModel(SearchClient(transport = ScriptedTransport().reply(YACHTS)), pauseMillis = 0)
        large { SearchScreen(model, guestFavorites(), onOpen = {}) }
        compose.runOnUiThread { model.setQuery("yacht") }
        compose.mainClock.advanceTimeBy(2_000)
        compose.waitForIdle()
        compose.onAllNodesWithTag("favorite.heart")[0].performClick()
        assertNothingRunsOffTheSide()
        assertHeartsCanBeTapped()
        save(name)
    }

    private fun concierge(locale: String, name: String) {
        val chat = ScriptedTransport().reply(Replies.withPlan())
        val model = ConciergeViewModel(
            client = ConciergeClient(transport = chat),
            planClient = PlanClient(transport = ScriptedTransport()),
            reporter = null,
            locale = { locale },
        )
        large { ConciergeScreen(model, guestFavorites(), onOpen = {}) }
        compose.mainClock.advanceTimeBy(2_000)
        compose.onNodeWithTag("concierge.send").assertIsDisplayed()
        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.mainClock.advanceTimeBy(2_000)
        compose.onNodeWithTag("concierge.conversation").performScrollToNode(hasTestTag("plan.item"))
        assertHeartsCanBeTapped()
        // The card's actions wrap to a new line rather than squeezing to a letter
        // per line: each stays a single line of text.
        val actions = (compose.onAllNodesWithTag("plan.another").fetchSemanticsNodes() +
            compose.onAllNodesWithTag("plan.remove").fetchSemanticsNodes())
        assertTrue(actions.isNotEmpty())
        val oneLine = with(compose.density) { 40.dp.toPx() }
        actions.forEach {
            assertTrue("${it.config.getOrNull(SemanticsProperties.ContentDescription)} is ${it.size.height}px tall", it.size.height < oneLine)
        }
        compose.onNodeWithTag("concierge.conversation").performScrollToNode(hasTestTag("plan.send"))
        compose.onNodeWithTag("plan.send").assertIsDisplayed()
        save(name)
    }

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h640dp-xhdpi")
    fun searchInEnglish() = search("narrow-search-en.png")

    @Test
    @Config(sdk = [34], qualifiers = "iw-w320dp-h640dp-xhdpi")
    fun searchInHebrew() = search("narrow-search-he.png")

    @Test
    @Config(sdk = [34], qualifiers = "ar-w320dp-h640dp-xhdpi")
    fun searchInArabic() = search("narrow-search-ar.png")

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h640dp-xhdpi")
    fun conciergeInEnglish() = concierge("en", "narrow-concierge-en.png")

    @Test
    @Config(sdk = [34], qualifiers = "iw-w320dp-h640dp-xhdpi")
    fun conciergeInHebrew() = concierge("he", "narrow-concierge-he.png")

    @Test
    @Config(sdk = [34], qualifiers = "ar-w320dp-h640dp-xhdpi")
    fun conciergeInArabic() = concierge("ar", "narrow-concierge-ar.png")

    /** Every piece of text stays inside the screen's width (search has no sideways scrolling). */
    private fun assertNothingRunsOffTheSide() {
        val width = compose.onRoot().fetchSemanticsNode().boundsInRoot.width
        val outside = compose.onAllNodes(hasAnyText()).fetchSemanticsNodes().filter {
            it.boundsInRoot.left < -0.5f || it.boundsInRoot.right > width + 0.5f
        }
        assertTrue(
            "Text past the edge: " + outside.joinToString { it.config.getOrNull(SemanticsProperties.Text).toString() },
            outside.isEmpty(),
        )
    }

    private fun assertHeartsCanBeTapped() {
        val hearts = compose.onAllNodesWithTag("favorite.heart")
        val count = hearts.fetchSemanticsNodes().size
        assertTrue("No hearts on screen", count > 0)
        repeat(count) { hearts[it].assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp) }
    }

    private fun hasAnyText() = SemanticsMatcher("has text") {
        it.config.getOrNull(SemanticsProperties.Text).orEmpty().any { text -> text.isNotBlank() }
    }

    private fun save(name: String) {
        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}

/**
 * Something a screen reader can announce on every control: its own text, a
 * description, or the label of a field. Walks the merged tree, as TalkBack does.
 */
internal fun SemanticsNodeInteractionsProvider.assertEveryControlIsNamed() {
    val controls = onAllNodes(hasClickAction()).fetchSemanticsNodes()
    assertTrue("No controls on screen", controls.isNotEmpty())
    val unnamed = controls.filter { node ->
        val c = node.config
        val described = c.getOrNull(SemanticsProperties.ContentDescription).orEmpty().any { it.isNotBlank() }
        val texted = c.getOrNull(SemanticsProperties.Text).orEmpty().any { it.text.isNotBlank() }
        !described && !texted
    }
    assertTrue(
        "Controls without a name: " + unnamed.joinToString { "#${it.id} ${it.config.getOrNull(SemanticsProperties.TestTag)}" },
        unnamed.isEmpty(),
    )
}
