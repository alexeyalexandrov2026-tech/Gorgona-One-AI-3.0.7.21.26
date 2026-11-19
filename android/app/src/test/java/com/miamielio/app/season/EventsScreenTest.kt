package com.miamielio.app.season

import android.Manifest
import android.app.Application
import android.app.NotificationManager
import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.miamielio.app.ui.MiamiElioTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/** The Events tab: the Miami season, reminders, and planning a week with the concierge. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
class EventsScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private val app = ApplicationProvider.getApplicationContext<Application>()
    private val beforeArtBasel = Clock.fixed(Instant.parse("2026-11-20T15:00:00Z"), ZoneOffset.UTC)
    private val planned = mutableListOf<String>()

    private fun show() {
        val reminders = SeasonReminders(app, beforeArtBasel)
        compose.setContent { MiamiElioTheme { EventsScreen(reminders, onPlan = { planned += it }) } }
    }

    @Test
    fun planningAnEventFillsTheConciergeAndOpensIt() {
        show()
        compose.onNodeWithText("Art Basel Miami Beach").assertExists()
        compose.onAllNodesWithTag("season.plan")[0].performClick()
        assertEquals(1, planned.size)
        assertTrue(planned.single().contains("Art Basel Miami Beach"))
    }

    @Test
    fun remindersStillNeedPermission() {
        shadowOf(app).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
        shadowOf(app.getSystemService(NotificationManager::class.java)).setNotificationsEnabled(false)
        show()
        compose.onAllNodesWithTag("season.remind")[0].performClick()
        compose.waitForIdle()
        compose.onNodeWithText("Notifications for Miami Elio are off", substring = true).assertExists()
    }
}

/** Draws the Events tab for real and keeps the picture in `build/outputs/snapshots`. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class EventsSnapshotTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
    fun english() {
        val clock = Clock.fixed(Instant.parse("2026-11-20T15:00:00Z"), ZoneOffset.UTC)
        val reminders = SeasonReminders(ApplicationProvider.getApplicationContext(), clock)
        compose.setContent { MiamiElioTheme { EventsScreen(reminders, onPlan = {}) } }
        compose.mainClock.advanceTimeBy(1_000)
        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, "events-en.png").outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
