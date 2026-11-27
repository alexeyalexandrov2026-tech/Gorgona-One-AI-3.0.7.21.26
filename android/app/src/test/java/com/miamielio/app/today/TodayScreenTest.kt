package com.miamielio.app.today

import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.unit.Density
import androidx.test.core.app.ApplicationProvider
import com.miamielio.app.app.ManagerContact
import com.miamielio.app.concierge.ConciergeViewModel
import com.miamielio.app.concierge.Replies
import com.miamielio.app.concierge.ScriptedTransport
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.PlanClient
import com.miamielio.app.core.ShowcaseCategory
import com.miamielio.app.core.ShowcaseFeed
import com.miamielio.app.core.ShowcaseItem
import com.miamielio.app.core.jsonBody
import com.miamielio.app.season.SeasonReminders
import com.miamielio.app.ui.MiamiElioTheme
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
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
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/** The home screen against a scripted concierge: what a guest sees and can do. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
class TodayScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private val chat = ScriptedTransport()
    private val opened = mutableListOf<String>()
    private var asked = 0
    private var events = 0
    private var menus = 0

    private val beforeArtBasel = Clock.fixed(Instant.parse("2026-11-20T15:00:00Z"), ZoneOffset.UTC)

    private fun show(fontScale: Float? = null): ConciergeViewModel {
        val model = ConciergeViewModel(
            client = ConciergeClient(transport = chat),
            planClient = PlanClient(transport = ScriptedTransport()),
            reporter = null,
            locale = { "en" },
        )
        val season = SeasonReminders(ApplicationProvider.getApplicationContext(), beforeArtBasel)
        val screen: @Composable () -> Unit = {
            TodayScreen(
                model = model,
                season = season,
                onAsked = { asked++ },
                onOpen = { opened += it },
                onEvents = { events++ },
                onMenu = { menus++ },
                now = { beforeArtBasel.instant() },
            )
        }
        compose.setContent {
            MiamiElioTheme {
                if (fontScale == null) {
                    screen()
                } else {
                    val density = LocalDensity.current
                    CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale)) { screen() }
                }
            }
        }
        return model
    }

    private fun lastQuestion(): String =
        chat.requests.last().jsonBody()["messages"]!!.jsonArray.last().jsonObject["content"]!!.jsonPrimitive.content

    @Test
    fun aChipAsksTheConciergeAndOpensIt() {
        chat.reply(Replies.text("Here are three yachts."))
        show()
        compose.onAllNodesWithTag("today.chip")[0].performClick()
        compose.waitForIdle()
        assertEquals("Yacht on Saturday", lastQuestion())
        assertEquals(1, asked)
    }

    @Test
    fun typingAndAskingSendsTheText() {
        chat.reply(Replies.text("Of course."))
        show()
        compose.onNodeWithTag("today.ask").assertIsNotEnabled()
        compose.onNodeWithTag("today.input").performTextInput("Yacht for 8")
        compose.onNodeWithTag("today.ask").assertIsEnabled().performClick()
        compose.waitForIdle()
        assertEquals("Yacht for 8", lastQuestion())
        assertEquals(1, asked)
    }

    @Test
    fun heroIsInertWhileTheConciergeAnswers() {
        chat.hold()
        show()
        compose.onAllNodesWithTag("today.chip")[0].performClick()
        compose.waitForIdle()
        compose.onAllNodesWithTag("today.chip")[1].performClick()
        compose.onAllNodesWithTag("today.pick")[0].performClick()
        compose.waitForIdle()
        assertEquals(1, chat.requests.size)
        compose.onNodeWithTag("today.ask").assertIsNotEnabled()
    }

    @Test
    fun todayNeedsNoNetwork() {
        chat.offline()
        show()
        compose.onNodeWithText("Miami Elio AI", substring = true, ignoreCase = true).assertExists()
        compose.onAllNodesWithTag("today.chip")[0].assertExists()
        compose.onAllNodesWithTag("today.pick")[0].assertExists()
        compose.onAllNodesWithTag("today.chip")[0].performClick()
        compose.waitForIdle()
        assertEquals(1, asked)
    }

    @Test
    fun theMenuButtonOpensTheMenu() {
        show()
        compose.onNodeWithTag("menu.open").performClick()
        assertEquals(1, menus)
    }

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h640dp")
    fun theHeaderHasRoomForTheMenuTheNameAndTheManagerOnTheNarrowestPhone() {
        show(fontScale = 1.3f)
        val width = compose.onRoot().fetchSemanticsNode().boundsInRoot.width
        val menu = compose.onNodeWithTag("menu.open").fetchSemanticsNode().boundsInRoot
        val manager = compose.onNodeWithTag("today.manager").fetchSemanticsNode().boundsInRoot
        assertTrue("menu $menu", menu.left >= 0f && menu.width >= 48f)
        assertTrue("manager $manager in $width", manager.right <= width + 0.5f)
        assertFalse("$menu overlaps $manager", menu.overlaps(manager))
    }

    @Test
    fun theManagerOpensTeamContactSheet() {
        show()
        compose.onNodeWithTag("today.manager").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("team.sheet").assertExists()
        compose.onNodeWithTag("team.whatsapp").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("today.manager").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("team.telegram").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("today.manager").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("team.phone").performClick()
        assertEquals(
            listOf(ManagerContact.WHATSAPP_URL, ManagerContact.TELEGRAM_URL, ManagerContact.PHONE_URL),
            opened,
        )
    }

    @Test
    fun theNextEventLeadsToEvents() {
        show()
        compose.onNodeWithText("Art Basel Miami Beach", substring = true).assertExists()
        compose.onNodeWithTag("today.nextEvent").performClick()
        assertEquals(1, events)
    }

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h740dp")
    fun todayFitsAtDoubleFontScale() {
        show(fontScale = 2f)
        compose.onNodeWithTag("today.ask").assertIsDisplayed()
        compose.onAllNodesWithTag("today.pick")[0].assertIsDisplayed()
        val ask = compose.onNodeWithTag("today.ask").fetchSemanticsNode().boundsInRoot
        val pick = compose.onAllNodesWithTag("today.pick")[0].fetchSemanticsNode().boundsInRoot
        assertFalse(ask.overlaps(pick))
    }
}

/** Draws Today for real and keeps the pictures in `build/outputs/snapshots`. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class TodaySnapshotTest {
    @get:Rule
    val compose = createComposeRule()

    private fun today(name: String, question: String) {
        val model = ConciergeViewModel(
            client = ConciergeClient(transport = ScriptedTransport()),
            planClient = PlanClient(transport = ScriptedTransport()),
            reporter = null,
            locale = { "en" },
        )
        val clock = Clock.fixed(Instant.parse("2026-11-20T00:34:00Z"), ZoneOffset.UTC)
        val season = SeasonReminders(ApplicationProvider.getApplicationContext(), clock)
        compose.setContent {
            MiamiElioTheme {
                TodayScreen(
                    model, season, onAsked = {}, onOpen = {}, onEvents = {}, onMenu = {}, now = { clock.instant() },
                    // One card of the site's showcase, as /api/showcase sends it (the photo does not load offline).
                    showcase = ShowcaseFeed(
                        listOf(
                            ShowcaseItem(
                                ShowcaseCategory.Car, "/rentals/lamborghini-urus-se", "Lamborghini Urus SE",
                                "https://gorgona-one.com/images/rentals/lamborghini-urus-se/cover.jpg",
                                price = "$1,800", company = "MIAMI ELIO Fleet",
                            ),
                        ),
                    ),
                    // The rail's pictures from the production site, as the release build resolves them.
                    resolve = { "https://gorgona-one.com$it" },
                )
            }
        }
        compose.mainClock.advanceTimeBy(1_500)
        // A question typed in, as on the approved mockup (the typing hint is an animation).
        compose.onNodeWithTag("today.input").performTextInput(question)
        compose.mainClock.advanceTimeBy(500)
        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
    fun english() = today("today-en.png", "A yacht for 8 guests on Saturday")

    @Test
    @Config(sdk = [34], qualifiers = "ru-w360dp-h740dp-xhdpi")
    fun russian() = today("today-ru.png", "Яхта на субботу для 8 гостей")

    @Test
    @Config(sdk = [34], qualifiers = "iw-w360dp-h740dp-xhdpi")
    fun hebrewRunsRightToLeft() = today("today-he.png", "יאכטה לשמונה בשבת")
}
