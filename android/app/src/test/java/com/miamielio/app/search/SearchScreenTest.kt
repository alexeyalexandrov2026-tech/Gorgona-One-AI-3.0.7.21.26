package com.miamielio.app.search

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.assertContentDescriptionEquals
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTextInput
import com.miamielio.app.concierge.ScriptedTransport
import com.miamielio.app.core.SearchClient
import com.miamielio.app.ui.MiamiElioTheme
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

private val AZIMUT = """{"results":[
  {"href":"/yachts/azimut-55","title":"Azimut 55","world":"yachts","subtitle":"MIAMI ELIO Fleet","location":"Sunny Isles Beach","price":"from ${'$'}2,400"},
  {"href":"/yachts/sunseeker-76","title":"Sunseeker 76","world":"yachts","category":"Yacht","location":"Miami Beach"}]}"""

/** The search screen against a scripted server. Results carry no photos, so nothing goes to the real site. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
class SearchScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private val server = ScriptedTransport()
    private val online = MutableStateFlow(true)
    private val opened = mutableListOf<String>()

    private fun show() {
        // No typing pause here: the test clock does not run by itself.
        val model = SearchViewModel(SearchClient(transport = server), online, pauseMillis = 0)
        compose.setContent { MiamiElioTheme { SearchScreen(model, onOpen = { opened += it }) } }
    }

    @Test
    fun theSectionsOpenTheirPagesOnTheSite() {
        show()
        // An eyebrow: set in capitals, as on the site.
        compose.onNodeWithText("POPULAR SEARCHES").assertExists()
        compose.onNodeWithTag("world./yachts").performClick()
        compose.onNodeWithTag("search.content").performScrollToNode(hasTestTag("world./private-jets"))
        compose.onNodeWithTag("world./private-jets").performClick()
        assertEquals(listOf("/yachts", "/private-jets"), opened)
        compose.onNodeWithTag("search.cancel").assertDoesNotExist()
    }

    @Test
    fun typingFindsResultsThatOpenTheirPage() {
        server.reply(AZIMUT)
        show()
        compose.onNodeWithTag("search.input").performTextInput("yacht")
        compose.waitForIdle()

        compose.onNodeWithText("Azimut 55").assertExists()
        compose.onNodeWithText("MIAMI ELIO Fleet · Sunny Isles Beach").assertExists()
        compose.onNodeWithText("from \$2,400").assertExists()
        compose.onNodeWithText("POPULAR SEARCHES").assertDoesNotExist()
        assertEquals("yacht", server.requests.single().url.substringAfter("q=").substringBefore("&"))

        compose.onNodeWithText("Sunseeker 76").performClick()
        assertEquals(listOf("/yachts/sunseeker-76"), opened)

        // "Cancel" clears the query and brings the sections back.
        compose.onNodeWithTag("search.cancel").performClick()
        compose.onNodeWithText("POPULAR SEARCHES").assertExists()
    }

    @Test
    fun theHeartSavesAndRemovesWithoutOpeningTheListing() {
        server.reply(AZIMUT)
        show()
        compose.onNodeWithTag("search.input").performTextInput("azimut")
        compose.waitForIdle()

        val heart = compose.onAllNodesWithTag("favorite.heart")[0]
        heart.assertIsNotSelected().assertContentDescriptionEquals("Save to My Miami").performClick()
        heart.assertIsSelected().assertContentDescriptionEquals("Remove from My Miami")
        assertEquals(emptyList<String>(), opened)
        heart.performClick()
        heart.assertIsNotSelected().assertContentDescriptionEquals("Save to My Miami")
        compose.onNodeWithText("Azimut 55").performClick()
        assertEquals(listOf("/yachts/azimut-55"), opened)
    }

    @Test
    fun nothingFoundSaysSo() {
        server.reply("""{"results":[]}""")
        show()
        compose.onNodeWithTag("search.input").performTextInput("zeppelin")
        compose.waitForIdle()
        compose.onNodeWithText("No results found for your search.").assertExists()
        compose.onNodeWithTag("search.retry").assertDoesNotExist()
    }

    @Test
    fun noInternetOffersARetryAndClearsWhenTheConnectionReturns() {
        server.offline().reply("""{"error":"boom"}""", status = 500).reply(AZIMUT)
        show()
        compose.onNodeWithTag("search.input").performTextInput("azimut")
        compose.waitForIdle()
        compose.onNodeWithText("No internet connection").assertExists()
        compose.onNodeWithText("Check your connection and try again.").assertExists()

        compose.onNodeWithTag("search.retry").performClick()
        compose.waitForIdle()
        compose.onNodeWithText("Something went wrong").assertExists()
        compose.onNodeWithText("No internet connection").assertDoesNotExist()

        // Not offline any more: a connection coming back changes nothing...
        online.value = false
        compose.waitForIdle()
        online.value = true
        compose.waitForIdle()
        compose.onNodeWithText("Something went wrong").assertExists()
        // ...but the button still asks again.
        compose.onNodeWithTag("search.retry").performClick()
        compose.waitForIdle()
        compose.onNodeWithText("Azimut 55").assertExists()
        assertEquals(3, server.requests.size)
    }
}

/** Draws the search for real and keeps the pictures in `build/outputs/snapshots`. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class SearchSnapshotTest {
    @get:Rule
    val compose = createComposeRule()

    private fun show(server: ScriptedTransport = ScriptedTransport()): SearchViewModel {
        val model = SearchViewModel(SearchClient(transport = server), pauseMillis = 0)
        compose.setContent { MiamiElioTheme { SearchScreen(model, onOpen = {}) } }
        return model
    }

    /** The section photographs load off the main thread; give them a moment. */
    private fun settle() {
        repeat(30) {
            Thread.sleep(100)
            compose.mainClock.advanceTimeBy(100)
        }
        compose.waitForIdle()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
    fun theSections() {
        show()
        settle()
        save("search-sections-en.png")
    }

    @Test
    @Config(sdk = [34], qualifiers = "iw-w360dp-h740dp-xhdpi")
    fun theSectionsInHebrew() {
        show()
        settle()
        save("search-sections-he.png")
    }

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
    fun resultsAndNoInternet() {
        val server = ScriptedTransport().reply(AZIMUT).offline()
        val model = show(server)
        compose.runOnUiThread { model.setQuery("yacht") }
        settle()
        save("search-results-en.png")
        compose.runOnUiThread { model.setQuery("yachts") }
        settle()
        save("search-offline-en.png")
    }

    private fun save(name: String) {
        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
