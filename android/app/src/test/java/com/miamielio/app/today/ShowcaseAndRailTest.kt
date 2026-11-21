package com.miamielio.app.today

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertContentDescriptionEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.miamielio.app.core.HomeSection
import com.miamielio.app.core.HomeSections
import com.miamielio.app.core.ShowcaseCategory
import com.miamielio.app.core.ShowcaseFeed
import com.miamielio.app.core.ShowcaseItem
import com.miamielio.app.ui.LocalReduceMotion
import com.miamielio.app.ui.MiamiElioTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** The section rail and the floating showcase card on their own: what they show and where a tap goes. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w360dp-h740dp")
class ShowcaseAndRailTest {
    @get:Rule
    val compose = createComposeRule()

    private val tapped = mutableListOf<HomeSection>()
    private val opened = mutableListOf<String>()

    private fun rail(still: Boolean = false) {
        compose.setContent {
            MiamiElioTheme {
                CompositionLocalProvider(LocalReduceMotion provides still) {
                    SectionRail(onSection = { tapped += it }, resolve = { "https://gorgona-one.com$it" })
                }
            }
        }
    }

    @Test
    fun theRailHasTheTenSectionsAndTheirTapsGoToThem() {
        rail()
        HomeSections.all.forEach { section -> compose.onNodeWithTag("rail.tile.${section.id}").assertExists() }
        compose.onNodeWithTag("rail.tile.travel").performClick()
        compose.onNodeWithTag("rail.tile.exclusive").performClick()
        assertEquals(listOf("travel", "exclusive"), tapped.map { it.id })
    }

    @Test
    fun thePauseButtonSaysWhatItWillDo() {
        rail()
        compose.onNodeWithTag("rail.pause").assertContentDescriptionEquals("Pause").performClick()
        compose.onNodeWithTag("rail.pause").assertContentDescriptionEquals("Play")
    }

    @Test
    fun withoutAnimationsTheRailStandsStillAndHasNoPauseButton() {
        rail(still = true)
        compose.onNodeWithTag("rail.tile.dining").assertExists()
        compose.onNodeWithTag("rail.pause").assertDoesNotExist()
    }

    private val yacht = ShowcaseItem(
        ShowcaseCategory.Yacht, "/yachts/azimut-55", "Azimut 55", "https://gorgona-one.com/y.jpg", length = "55 ft",
    )
    private val car = ShowcaseItem(
        ShowcaseCategory.Car, "/rentals/urus", "Lamborghini Urus", "https://gorgona-one.com/c.jpg", price = "$1,800",
    )

    private fun showcase(feed: ShowcaseFeed, still: Boolean = false) {
        compose.setContent {
            MiamiElioTheme {
                CompositionLocalProvider(LocalReduceMotion provides still) {
                    Box(Modifier.fillMaxWidth().height(400.dp)) {
                        HeroShowcase(feed = feed, onOpen = { opened += it }, random = { 0.0 })
                    }
                }
            }
        }
    }

    @Test
    fun withoutCardsThereIsNothing() {
        showcase(ShowcaseFeed())
        compose.onNodeWithTag("showcase").assertDoesNotExist()
    }

    @Test
    fun theCardSaysWhatItIsAndATapOpensIt() {
        showcase(ShowcaseFeed(listOf(car, yacht)))
        compose.mainClock.advanceTimeBy(1_000)
        // random 0 picks the first kind: the car, with its price per day. A screen reader hears the card as one.
        compose.onNodeWithContentDescription("Car, Our fleet, Lamborghini Urus, $1,800 / day").assertExists()
        compose.onNodeWithTag("showcase").performClick()
        assertEquals(listOf("/rentals/urus"), opened)
    }

    @Test
    fun withoutAnimationsTheFirstCardStandsStill() {
        showcase(ShowcaseFeed(listOf(yacht, car)), still = true)
        compose.onNodeWithContentDescription("Yacht, 55 ft, Azimut 55, Charter on request").assertExists()
    }
}
