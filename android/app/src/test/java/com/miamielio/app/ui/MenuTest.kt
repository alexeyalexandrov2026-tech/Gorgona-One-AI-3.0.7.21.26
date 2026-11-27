package com.miamielio.app.ui

import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertContentDescriptionEquals
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.unit.dp
import com.miamielio.app.app.AppRouter
import com.miamielio.app.app.AppTab
import com.miamielio.app.app.ExternalOpener
import com.miamielio.app.app.WebPage
import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.RouteDecision
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.journeys.assertEveryControlIsNamed
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

private class MenuPage : WebPage {
    override var onRoute: ((url: String, decision: RouteDecision) -> Unit)? = null
    val loaded = mutableListOf<String>()

    override fun load(url: String) {
        loaded += url
    }

    override fun returnToStart() = Unit
}

private class MenuOutside : ExternalOpener {
    val opened = mutableListOf<String>()

    override fun openBrowser(url: String) {
        opened += url
    }

    override fun openSystem(url: String) {
        opened += url
    }
}

/** The menu on its own: what it lists, where each row goes, how it closes. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
class MenuTest {
    @get:Rule
    val compose = createAndroidComposeRule<ComponentActivity>()

    private val config = AppConfig.production
    private val explore = MenuPage()
    private val outside = MenuOutside()
    private val router = AppRouter(config, RoutePolicy(config), explore, MenuPage(), MenuPage(), outside)
    private val tab get() = router.selectedTab.value

    private var visible by mutableStateOf(true)
    private val chosen = mutableListOf<String>()
    private var closed = 0

    private fun show() {
        compose.setContent {
            MiamiElioTheme {
                MenuSheet(
                    visible = visible,
                    onClose = { closed++ },
                    onSelect = { entry ->
                        chosen += entry.id
                        entry.open(router)
                    },
                )
            }
        }
    }

    private fun choose(tag: String) {
        compose.onNodeWithTag(tag).performScrollTo().performClick()
    }

    private val mainIds = listOf("today", "catalog", "ai", "exclusive", "events", "trip", "profile")
    private val sectionIds = listOf(
        "travel", "exclusive", "stays", "yachts", "cars", "events", "privateJets", "experiences", "dining", "concierge",
    )

    @Test
    fun itListsTheAppsPlacesAndThenTheSitesSectionsInTheirOrder() {
        show()
        compose.onNodeWithTag("menu.sheet").assertExists()
        compose.onNodeWithText("Menu").assertExists()
        compose.onNodeWithText("SECTIONS").assertExists()

        val tags = mainIds.map { "menu.item.$it" } + sectionIds.map { "menu.item.section.$it" }
        val names = listOf("Today", "Catalog", "ELIO AI", "Exclusive Destinations", "Events", "My Trip", "Profile") +
            listOf(
                "Travel", "Exclusive Destinations", "Stays", "Yachts", "Cars", "Events", "Private Jets",
                "Experiences", "Dining & Nightlife", "ELIO AI",
            )
        // Where each one is laid out, on screen or below it in the scroll. The
        // sections stand two to a row, so the order is the reading order: row
        // by row, and from the start of a row.
        val places = tags.zip(names).map { (tag, name) ->
            // The position, not the bounds: those are clipped to nothing below the fold.
            val place = compose.onNodeWithTag(tag).assert(hasText(name)).fetchSemanticsNode().positionInRoot
            place.y to place.x
        }
        assertEquals(places.sortedWith(compareBy({ it.first }, { it.second })), places)
        assertEquals(places.size, places.toSet().size)
        // The sections come under their own heading.
        val heading = compose.onNodeWithText("SECTIONS").fetchSemanticsNode().positionInRoot.y
        assertTrue(places[mainIds.size - 1].first < heading && heading < places[mainIds.size].first)
    }

    @Test
    fun theAppsOwnPlacesOpenTheirTabsAndEvents() {
        show()
        router.show(AppTab.Account)

        choose("menu.item.today")
        assertEquals(AppTab.Today, tab)
        assertFalse(router.eventsOpen.value)
        choose("menu.item.catalog")
        assertEquals(AppTab.Catalog, tab)
        choose("menu.item.ai")
        assertEquals(AppTab.Concierge, tab)
        choose("menu.item.exclusive")
        assertEquals(AppTab.Exclusive, tab)
        choose("menu.item.events")
        assertTrue(router.eventsOpen.value)
        assertEquals(AppTab.Today, tab)
        choose("menu.item.trip")
        assertEquals(listOf("https://gorgona-one.com/trip"), explore.loaded)
        assertTrue(router.webLayer.value)
        choose("menu.item.profile")
        assertEquals(AppTab.Account, tab)
        assertFalse(router.eventsOpen.value)
        assertFalse(router.webLayer.value)

        assertEquals(mainIds, chosen)
        // Only My Trip opens a live site layer; none of them leaves the app.
        assertEquals(listOf("https://gorgona-one.com/trip"), explore.loaded)
        assertEquals(emptyList<String>(), outside.opened)
    }

    @Test
    fun theSitesSectionsOpenTheirPagesExceptThreeThatTheAppHasItself() {
        show()
        val pages = mapOf(
            "travel" to "/travel",
            "stays" to "/vacation-rentals",
            "yachts" to "/yachts",
            "cars" to "/rentals",
            "privateJets" to "/private-jets",
            "experiences" to "/experiences",
            "dining" to "/restaurants-nightlife",
        )
        for ((id, path) in pages) {
            router.show(AppTab.Today)
            explore.loaded.clear()
            choose("menu.item.section.$id")
            assertEquals(id, listOf("https://gorgona-one.com$path"), explore.loaded)
            assertTrue(id, router.webLayer.value)
            assertEquals(id, AppTab.Today, tab)
        }

        explore.loaded.clear()
        router.show(AppTab.Account)
        choose("menu.item.section.exclusive")
        assertEquals(AppTab.Exclusive, tab)

        router.show(AppTab.Account)
        choose("menu.item.section.events")
        assertTrue(router.eventsOpen.value)
        assertEquals(AppTab.Today, tab)

        router.show(AppTab.Account)
        choose("menu.item.section.concierge")
        assertEquals(AppTab.Concierge, tab)

        // Those three are not the site's pages: nothing was loaded for them.
        assertEquals(emptyList<String>(), explore.loaded)
        assertFalse(router.webLayer.value)
        assertEquals(emptyList<String>(), outside.opened)
        assertEquals(pages.keys.toList() + listOf("exclusive", "events", "concierge"), chosen.map { it.removePrefix("section.") })
    }

    @Test
    fun itClosesOnItsButtonOnATapOutsideAndOnBack() {
        show()
        compose.onNodeWithTag("menu.close").performClick()
        assertEquals(1, closed)

        // The dimmed screen beside the panel.
        compose.onNodeWithTag("menu.sheet").performTouchInput { click(Offset(centerRight.x - 8f, centerY)) }
        assertEquals(2, closed)

        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.waitForIdle()
        assertEquals(3, closed)
        assertEquals(emptyList<String>(), chosen)
    }

    @Test
    fun aTapOnTheEmptyPartOfThePanelDoesNotCloseIt() {
        show()
        // The title row, between the title and the close button.
        compose.onNodeWithTag("menu.sheet").performTouchInput { click(Offset(density * 230f, density * 30f)) }
        assertEquals(0, closed)
    }

    @Test
    fun itIsNotThereUntilItIsOpened() {
        visible = false
        show()
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
        visible = true
        compose.waitForIdle()
        compose.onNodeWithTag("menu.sheet").assertExists()
        visible = false
        compose.waitForIdle()
        compose.onNodeWithTag("menu.sheet").assertDoesNotExist()
    }

    @Test
    fun everyControlHasANameAndATargetOfAtLeast48Dp() {
        show()
        compose.assertEveryControlIsNamed()
        compose.onNodeWithTag("menu.close").assertContentDescriptionEquals("Close menu").assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp)
        for (tag in mainIds.map { "menu.item.$it" } + sectionIds.map { "menu.item.section.$it" }) {
            compose.onNodeWithTag(tag).assertHeightIsAtLeast(48.dp)
        }
    }

    @Test
    fun theButtonOnEveryScreenIsNamedAndBigEnough() {
        var clicks by mutableStateOf(0)
        compose.setContent { MiamiElioTheme { MenuButton(onClick = { clicks++ }) } }
        compose.onNodeWithTag("menu.open")
            .assertContentDescriptionEquals("Open menu")
            .assertWidthIsAtLeast(48.dp)
            .assertHeightIsAtLeast(48.dp)
            .performClick()
        assertEquals(1, clicks)
    }

    @Test
    @Config(sdk = [34], qualifiers = "iw-w411dp-h891dp")
    fun inHebrewThePanelComesFromTheRightAndReadsFromTheRight() {
        show()
        compose.onNodeWithTag("menu.item.today").assert(hasText("היום"))
        val root = compose.onRoot().fetchSemanticsNode().boundsInRoot
        val panel = compose.onNodeWithTag("menu.item.today").fetchSemanticsNode().boundsInRoot
        // The cards stand 16 dp in from the panel's edge, which is the screen's.
        val margin = with(compose.density) { 24.dp.toPx() }
        assertTrue("panel $panel in root $root", panel.right > root.right - margin && panel.left > root.width * 0.1f)
        compose.onNodeWithTag("menu.close").assertContentDescriptionEquals("סגור תפריט")
        // The scrim is the part that is left, on the left: a tap there closes it.
        compose.onNodeWithTag("menu.sheet").performTouchInput { click(Offset(8f, centerY)) }
        assertEquals(1, closed)
    }
}

/** Draws the menu for real, in English and in Hebrew, beside the screen it opens over. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MenuSnapshotTest {
    @get:Rule
    val compose = createComposeRule()

    private fun menu(name: String) {
        compose.setContent { MiamiElioTheme { MenuSheet(visible = true, onClose = {}, onSelect = {}) } }
        compose.mainClock.advanceTimeBy(1_000)
        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
    fun english() = menu("menu-sheet-en.png")

    @Test
    @Config(sdk = [34], qualifiers = "iw-w360dp-h740dp-xhdpi")
    fun hebrew() = menu("menu-sheet-he.png")
}
