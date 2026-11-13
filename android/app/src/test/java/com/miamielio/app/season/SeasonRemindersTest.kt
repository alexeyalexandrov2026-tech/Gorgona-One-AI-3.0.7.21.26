package com.miamielio.app.season

import android.Manifest
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SeasonRemindersTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val clock = Clock.fixed(Instant.parse("2026-11-13T12:00:00Z"), ZoneOffset.UTC)

    @Test
    fun scheduleSurvivesReopeningAndCanBeCancelled() {
        shadowOf(RuntimeEnvironment.getApplication()).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
        val reminders = SeasonReminders(context, clock)
        val event = reminders.events.single { it.id == "art-basel" }
        val time = Instant.parse("2026-11-13T15:00:00Z")
        assertEquals(time, reminders.schedule(event))
        val reopened = SeasonReminders(context, clock)
        assertEquals(time, reopened.scheduled(event))
        reopened.restore()
        reopened.cancel(event)
        assertNull(SeasonReminders(context, clock).scheduled(event))
    }
}
