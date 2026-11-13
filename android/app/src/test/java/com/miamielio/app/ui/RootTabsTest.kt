package com.miamielio.app.ui

import android.graphics.Bitmap
import android.webkit.CookieManager
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import com.miamielio.app.BuildConfig
import com.miamielio.app.MainActivity
import com.miamielio.app.app.AppTab
import com.miamielio.app.web.LoadFailure
import com.miamielio.app.web.LoadFailureView
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
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
    fun theSplashGivesWayToTheFourTabs() {
        compose.onNodeWithTag("splash").assertExists()
        pastTheSplash()

        compose.onNodeWithTag("tab.Explore").assertIsSelected()
        for (tab in listOf(AppTab.Concierge, AppTab.Search, AppTab.Account)) {
            compose.onNodeWithTag("tab.${tab.name}").assertIsNotSelected()
        }
        // Each tab is read by its name.
        for (label in listOf("Home", "Concierge", "Search", "My Miami")) {
            compose.onNodeWithText(label).assertExists()
        }
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
        compose.onNodeWithText("Your private concierge").assertExists()

        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("tab.Explore").assertIsSelected()
    }

    @Test
    fun aDeepLinkOpensItsTabOrItsPage() {
        pastTheSplash()

        compose.runOnUiThread { services.router.handle("miamielio://search") }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("tab.Search").assertIsSelected()

        compose.runOnUiThread { services.router.handle("miamielio://open?path=/yachts") }
        compose.mainClock.advanceTimeBy(500)
        compose.onNodeWithTag("tab.Explore").assertIsSelected()
        assertEquals(BuildConfig.BASE_URL + "/yachts", shadowOf(services.explore.webView).lastLoadedUrl)
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
    fun theConciergeTabAndTheBar() {
        compose.mainClock.advanceTimeBy(4_000)
        compose.onNodeWithTag("tab.Concierge").performClick()
        compose.mainClock.advanceTimeBy(2_000)
        save(compose.onRoot().captureToImage().asAndroidBitmap(), "tabs-concierge.png")
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
