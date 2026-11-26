package com.miamielio.app.concierge

import android.graphics.Bitmap
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTextInput
import com.miamielio.app.core.AnswerReport
import com.miamielio.app.core.AnswerReporter
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.PlanClient
import com.miamielio.app.core.PlanRequest
import com.miamielio.app.core.jsonBody
import com.miamielio.app.favorites.guestFavorites
import com.miamielio.app.ui.MiamiElioTheme
import kotlinx.serialization.json.int
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
import java.time.LocalDate

/** The concierge screen against a scripted server: what a guest sees and can do. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
class ConciergeScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private val chat = ScriptedTransport()
    private val plans = ScriptedTransport()
    private val opened = mutableListOf<String>()
    private var menus = 0

    private fun show(reporter: AnswerReporter? = null, voicePlayback: VoicePlayback? = null): ConciergeViewModel {
        val model = ConciergeViewModel(
            client = ConciergeClient(transport = chat),
            planClient = PlanClient(transport = plans),
            reporter = reporter,
            locale = { "en" },
        )
        val favorites = guestFavorites()
        compose.setContent {
            MiamiElioTheme {
                ConciergeScreen(
                    model = model,
                    favorites = favorites,
                    onOpen = { opened += it },
                    onMenu = { menus++ },
                    voicePlayback = voicePlayback,
                )
            }
        }
        return model
    }

    private fun scrollTo(tag: String) {
        compose.onNodeWithTag("concierge.conversation").performScrollToNode(hasTestTag(tag))
    }

    @Test
    fun theMenuButtonOpensTheMenu() {
        show()
        compose.onNodeWithTag("menu.open").performClick()
        assertEquals(1, menus)
        assertTrue(opened.isEmpty())
    }

    @Test
    fun aPlanHeartFollowsTheListingWhenOptionsChange() {
        chat.reply(Replies.withPlan())
        show()
        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.waitForIdle()
        scrollTo("plan.item")

        val yacht = compose.onAllNodesWithTag("favorite.heart")[0]
        yacht.assertIsNotSelected().performClick()
        yacht.assertIsSelected()
        assertTrue(opened.isEmpty())

        val next = compose.onNodeWithTag("plan.another")
        next.performClick()
        compose.onNodeWithText("Black Coupe").assertExists()
        yacht.assertIsNotSelected()

        next.performClick()
        compose.onNodeWithText("White SUV").assertExists()
        yacht.assertIsSelected()
    }

    @Test
    fun aReadyMadeRequestGetsAReplyWhoseCardsAndChipsOpenTheSite() {
        chat.reply(Replies.withCardAndSuggestion)
        show()
        compose.onNodeWithText("Your private concierge").assertExists()
        compose.onNodeWithTag("concierge.new").assertIsNotEnabled()

        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.waitForIdle()

        compose.onNodeWithText("Plan a weekend in Miami").assertExists()
        compose.onNodeWithText("Try a sunset cruise.").assertExists()
        compose.onNodeWithTag("concierge.title").assertDoesNotExist()
        assertEquals("Plan a weekend in Miami", chat.requests.single().jsonBody()["messages"]!!.jsonArray.single()
            .jsonObject["content"]!!.jsonPrimitive.content)

        compose.onNodeWithTag("concierge.card").performClick()
        compose.onNodeWithText("Dinner after").performClick()
        assertEquals(listOf("/yachts", "/restaurants-nightlife"), opened)
        // No delivery for reports yet: the action is not offered.
        compose.onNodeWithTag("concierge.report").assertDoesNotExist()
    }

    @Test
    fun suggestionsSitAboveTheComposer() {
        chat.reply(Replies.withCardAndSuggestion)
        show()
        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.waitForIdle()

        compose.onNode(hasText("Dinner after") and hasAnyAncestor(hasTestTag("concierge.suggestions"))).assertExists()
        val chip = compose.onNodeWithText("Dinner after").fetchSemanticsNode().boundsInRoot
        val card = compose.onNodeWithTag("concierge.card").fetchSemanticsNode().boundsInRoot
        val input = compose.onNodeWithTag("concierge.input").fetchSemanticsNode().boundsInRoot
        assertTrue(chip.top >= card.bottom)
        assertTrue(chip.bottom <= input.top)
    }

    @Test
    fun catalogueRowsShowTheirPriceAndOpenTheListing() {
        chat.reply(Replies.withListings)
        show()
        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.waitForIdle()

        compose.onAllNodesWithTag("concierge.listing").assertCountEquals(2)
        compose.onNodeWithText("From \$2,400").assertExists()
        compose.onNodeWithText("Sample 72").performClick()
        compose.onNodeWithTag("concierge.card").performClick()
        assertEquals(listOf("/rentals/sample-72", "/yachts"), opened)
    }

    @Test
    fun theLiveManagerOpensTelegram() {
        show()
        compose.onNodeWithContentDescription("Message a live manager on Telegram").assertExists()
        compose.onNodeWithTag("concierge.manager").performClick()
        assertEquals(listOf("https://t.me/alexeyalexand07"), opened)
    }

    @Test
    fun theOrbWaitsWithTheGuestThenAFailureCanBeRetried() {
        val held = chat.hold()
        show()
        compose.onNodeWithTag("concierge.send").assertIsNotEnabled()
        compose.onNodeWithTag("concierge.input").performTextInput("Hi there")
        compose.onNodeWithTag("concierge.send").assertIsEnabled().performClick()
        compose.waitForIdle()

        compose.onNodeWithTag("concierge.typing").assertExists()
        compose.onNodeWithTag("concierge.send").assertIsNotEnabled()

        held.release(ScriptedTransport.Answer.Offline)
        compose.waitForIdle()
        compose.onNodeWithTag("concierge.typing").assertDoesNotExist()
        compose.onNodeWithText("Something went wrong").assertExists()

        chat.reply(Replies.text("Back with you"))
        compose.onNodeWithTag("concierge.retry").performClick()
        compose.waitForIdle()
        compose.onNodeWithText("Back with you").assertExists()
        compose.onNodeWithTag("concierge.retry").assertDoesNotExist()
        assertEquals(2, chat.requests.size)
    }

    @Test
    fun aNewConversationReturnsToTheWelcome() {
        chat.reply(Replies.text("Hello"))
        show()
        compose.onAllNodesWithTag("concierge.starter")[1].performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("concierge.new").assertIsEnabled().performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("concierge.title").assertExists()
        compose.onNodeWithText("Hello").assertDoesNotExist()
    }

    @Test
    fun thePlanIsChangedAndSentAsOneRequest() {
        chat.reply(Replies.withPlan())
        plans.reply(Replies.receipt)
        show()
        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.waitForIdle()
        scrollTo("plan.board")

        compose.onNodeWithText("White SUV").assertExists()
        compose.onNodeWithTag("plan.another").performClick()
        compose.onNodeWithText("Black Coupe").assertExists()

        compose.onAllNodesWithTag("plan.remove")[1].performClick()
        compose.onNodeWithText("Komodo").assertDoesNotExist()
        compose.onNodeWithText("Add back: Dining").performClick()
        compose.onNodeWithText("Komodo").assertExists()

        // The title opens the item on the site.
        compose.onNodeWithText("Komodo").performClick()
        assertEquals(listOf("/restaurants-nightlife/komodo-miami"), opened)

        scrollTo("plan.send")
        compose.onNodeWithTag("plan.send").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("plan.form").assertExists()
        // The party size the guest named comes from the plan.
        compose.onNodeWithTag("plan.guests").assertExists().assert(hasText("4"))
        compose.onNodeWithTag("plan.more").performClick()

        // Nothing typed yet: the form says so and sends nothing.
        compose.onNodeWithTag("plan.submit").performScrollTo().performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("plan.problem").assertExists()
        assertTrue(plans.requests.isEmpty())

        compose.onNodeWithTag("plan.name").performScrollTo().performTextInput("Demo Guest")
        compose.onNodeWithTag("plan.phone").performScrollTo().performTextInput("+13055550123")
        compose.onNodeWithTag("plan.email").performScrollTo().performTextInput("guest@example.com")
        compose.onNodeWithTag("plan.submit").performScrollTo().performClick()
        compose.waitForIdle()

        compose.onNodeWithTag("plan.form").assertDoesNotExist()
        compose.onNodeWithText("Plan request sent").assertExists()

        val sent = plans.requests.single()
        val body = sent.jsonBody()
        val today = LocalDate.now()
        assertEquals(PlanRequest.day(today.plusDays(3)), body["start"]!!.jsonPrimitive.content)
        assertEquals(PlanRequest.day(today.plusDays(5)), body["end"]!!.jsonPrimitive.content)
        assertEquals(5, body["guests"]!!.jsonPrimitive.int)
        assertEquals("20:00", body["time"]!!.jsonPrimitive.content)
        assertEquals(
            listOf("car" to "black-coupe", "dining" to "komodo-miami"),
            body["items"]!!.jsonArray.map { it.jsonObject["kind"]!!.jsonPrimitive.content to it.jsonObject["slug"]!!.jsonPrimitive.content },
        )
        assertTrue(sent.headers["Idempotency-Key"].orEmpty().isNotEmpty())

        compose.onNodeWithTag("plan.new").performClick()
        compose.onNodeWithTag("plan.board").assertDoesNotExist()
    }

    @Test
    fun anAnswerCanBeReportedOnceThereIsSomewhereToSendIt() {
        val reports = mutableListOf<AnswerReport>()
        chat.reply(Replies.text("A doubtful answer"))
        show(reporter = { reports += it })
        compose.onAllNodesWithTag("concierge.starter")[2].performClick()
        compose.waitForIdle()

        compose.onNodeWithText("Report this answer").performClick()
        compose.onNodeWithTag("report.note").performTextInput("The restaurant is closed")
        compose.onNodeWithTag("report.send").performClick()
        compose.waitForIdle()

        compose.onNodeWithTag("concierge.reported").assertExists()
        compose.onNodeWithTag("concierge.report").assertDoesNotExist()
        assertEquals("The restaurant is closed", reports.single().note)
        assertEquals("A doubtful answer", reports.single().answer)
    }

    @Test
    fun listingsShowLiveAvailabilityAndMultiDayEstimateAndRepliesCanBeSpoken() {
        val fakePlayer = FakeVoicePlayback()
        chat.reply(
            """
            {
              "reply": "Rolls-Royce Ghost is ready for your weekend.",
              "replyLocale": "en",
              "sessionId": "s-wave2",
              "listings": [
                {
                  "href": "/rentals/rolls-royce-ghost",
                  "title": "Rolls-Royce Ghost",
                  "label": "Car",
                  "price": "${'$'}1,200/day",
                  "availabilityStatus": "available",
                  "estimatedTotal": "${'$'}3,600 for 3 days",
                  "perGuest": "${'$'}900 / guest"
                }
              ]
            }
            """.trimIndent(),
        )
        val model = show(voicePlayback = fakePlayer)
        compose.onAllNodesWithTag("concierge.starter")[0].performClick()
        compose.waitForIdle()

        compose.onNodeWithTag("concierge.listing.availability", useUnmergedTree = true).assertExists()
        compose.onNodeWithText("Available on your dates", useUnmergedTree = true).assertExists()
        compose.onNodeWithTag("concierge.listing.estimate", useUnmergedTree = true).assertExists()
        compose.onNodeWithText("${'$'}3,600 for 3 days · ${'$'}900 / guest", useUnmergedTree = true).assertExists()

        // Opt-in Listen button plays the reply and toggles to Stop audio.
        compose.onNodeWithTag("concierge.listen").performClick()
        compose.waitForIdle()
        assertEquals(1, fakePlayer.spoken.size)
        assertEquals("en", fakePlayer.spoken.single().second)
        compose.onNodeWithText("Stop audio").assertExists()

        // Live Voice bar supports 1-tap barge-in interrupt and clean exit.
        compose.runOnUiThread { model.setLiveVoice(true) }
        compose.waitForIdle()
        compose.onNodeWithTag("concierge.liveVoiceBar").assertExists()
        compose.onNodeWithTag("concierge.liveVoiceBar").performClick()
        compose.waitForIdle()
        assertEquals(PlaybackState.Idle, fakePlayer.state)

        compose.onNodeWithTag("concierge.liveVoiceStop").performClick()
        compose.waitForIdle()
        assertFalse(model.state.value.liveVoice)
        compose.onNodeWithTag("concierge.liveVoiceBar").assertDoesNotExist()
    }
}

private class FakeVoicePlayback : VoicePlayback {
    override var state by mutableStateOf(PlaybackState.Idle)
    override var speakingEntryId by mutableStateOf<Long?>(null)
    val spoken = mutableListOf<Pair<String, String>>()

    override fun speak(entryId: Long, text: String, locale: String, onEnded: (() -> Unit)?) {
        spoken += text to locale
        speakingEntryId = entryId
        state = PlaybackState.Speaking
    }

    override fun stop() {
        state = PlaybackState.Idle
        speakingEntryId = null
    }

    override fun release() = stop()
}

/** Draws the concierge for real and keeps the pictures in `build/outputs/snapshots`. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ConciergeSnapshotTest {
    @get:Rule
    val compose = createComposeRule()

    private fun conversation(locale: String, ask: String) {
        val chat = ScriptedTransport()
        val model = ConciergeViewModel(
            client = ConciergeClient(transport = chat),
            planClient = PlanClient(transport = ScriptedTransport()),
            reporter = null,
            locale = { locale },
        )
        val favorites = guestFavorites()
        compose.setContent { MiamiElioTheme { ConciergeScreen(model, favorites, onOpen = {}, onMenu = {}) } }
        compose.mainClock.advanceTimeBy(2_000)
        save("concierge-welcome-$locale.png")
        chat.reply(Replies.withPlan(reply = "A **sunset cruise**, then dinner at [Komodo](/restaurants-nightlife/komodo-miami)."))
        compose.runOnUiThread { model.send(ask) }
        compose.mainClock.advanceTimeBy(2_000)
        compose.onNodeWithTag("concierge.conversation").performScrollToNode(hasTestTag("plan.item"))
        compose.onAllNodesWithTag("favorite.heart")[0].performClick()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
    fun englishConversationWithAPlan() {
        conversation("en", "A yacht and dinner for four on Saturday")
        save("concierge-plan-en.png")
    }

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
    fun englishReplyWithCatalogueRows() {
        val chat = ScriptedTransport().reply(Replies.withListings)
        val model = ConciergeViewModel(
            client = ConciergeClient(transport = chat),
            planClient = PlanClient(transport = ScriptedTransport()),
            reporter = null,
            locale = { "en" },
        )
        compose.setContent { MiamiElioTheme { ConciergeScreen(model, guestFavorites(), onOpen = {}, onMenu = {}) } }
        compose.runOnUiThread { model.send("A yacht for eight guests") }
        compose.mainClock.advanceTimeBy(2_000)
        save("concierge-listings-en.png")
    }

    @Test
    @Config(sdk = [34], qualifiers = "iw-w360dp-h740dp-xhdpi")
    fun hebrewRunsRightToLeft() {
        conversation("he", "יאכטה וארוחת ערב לארבעה בשבת")
        compose.onNodeWithText("התוכנית שלך").assertExists()
        save("concierge-plan-he.png")
    }

    private fun save(name: String) {
        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
