package com.miamielio.app.season

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.miamielio.app.MainActivity
import com.miamielio.app.R
import com.miamielio.app.core.DeepLink
import com.miamielio.app.core.Season
import com.miamielio.app.core.SeasonEvent
import com.miamielio.app.ui.filled
import java.time.Clock
import java.time.Instant

internal fun SeasonEvent.prompt(context: Context): String =
    context.getString(R.string.season_ask).filled("name" to name, "dates" to Season.range(this))

internal class SeasonReminders(
    context: Context,
    private val clock: Clock = Clock.systemUTC(),
) {
    private val app = context.applicationContext
    private val preferences = app.getSharedPreferences("miami-elio-season", Context.MODE_PRIVATE)
    private val alarms = app.getSystemService(AlarmManager::class.java)
    private val notifications = app.getSystemService(NotificationManager::class.java)

    val events: List<SeasonEvent> by lazy {
        app.assets.open("season.json").bufferedReader().use { Season.decode(it.readText()) }
    }

    fun scheduled(event: SeasonEvent): Instant? {
        val epochMillis = preferences.all[event.id] as? Long ?: return null
        return Instant.ofEpochMilli(epochMillis)
    }

    fun notificationsAllowed(): Boolean {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(app, android.Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) return false
        return notifications.areNotificationsEnabled() &&
            notifications.getNotificationChannel(CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE
    }

    fun schedule(event: SeasonEvent): Instant? {
        if (!notificationsAllowed()) return null
        val time = Season.reminder(event, clock.instant()) ?: return null
        setAlarm(event.id, time)
        preferences.edit().putLong(event.id, time.toEpochMilli()).apply()
        return time
    }

    fun cancel(event: SeasonEvent) = cancel(event.id)

    private fun cancel(id: String) {
        alarms.cancel(alarmIntent(id))
        preferences.edit().remove(id).apply()
    }

    /** Android clears alarms at shutdown. Restore reminders that still precede the event. */
    fun restore() {
        val now = clock.instant()
        val byId = events.associateBy(SeasonEvent::id)
        for ((id, value) in preferences.all) {
            val event = byId[id]
            if (event == null || value !is Long || !event.isBeforeStart(now)) {
                cancel(id)
            } else {
                setAlarm(id, maxOf(now, Instant.ofEpochMilli(value)))
            }
        }
    }

    @SuppressLint("MissingPermission") // Checked immediately before posting.
    fun deliver(id: String) {
        val event = events.find { it.id == id } ?: return
        val due = scheduled(event) ?: return
        val now = clock.instant()
        if (now.isBefore(due)) {
            setAlarm(id, due)
            return
        }
        if (!event.isBeforeStart(now) || !notificationsAllowed()) {
            cancel(id)
            return
        }
        notifications.createNotificationChannel(
            NotificationChannel(CHANNEL, app.getString(R.string.season_title), NotificationManager.IMPORTANCE_DEFAULT),
        )
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(DeepLink.seasonUrl(id)), app, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val open = PendingIntent.getActivity(app, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(app, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(event.name)
            .setContentText(Season.range(event) + " · " + event.place)
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        try {
            notifications.notify(id, 0, notification)
        } catch (_: SecurityException) {
            // Permission may be revoked while the alarm callback is running.
        } finally {
            cancel(id)
        }
    }

    private fun SeasonEvent.isBeforeStart(now: Instant): Boolean =
        Season.day(start)?.atStartOfDay(Season.zone)?.toInstant()?.isAfter(now) == true

    private fun setAlarm(id: String, time: Instant) =
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time.toEpochMilli(), alarmIntent(id))

    private fun alarmIntent(id: String): PendingIntent {
        val data = Uri.Builder().scheme(DeepLink.SCHEME).authority("season-reminder").appendPath(id).build()
        val intent = Intent(app, SeasonReminderReceiver::class.java).setData(data).setAction(REMINDER)
        return PendingIntent.getBroadcast(app, 0, intent, PendingIntent.FLAG_IMMUTABLE)
    }

    companion object {
        const val REMINDER = "com.miamielio.app.SEASON_REMINDER"
        private const val CHANNEL = "miami-season"
    }
}

class SeasonReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val reminders = SeasonReminders(context)
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> reminders.restore()
            SeasonReminders.REMINDER -> intent.data?.lastPathSegment?.let(reminders::deliver)
        }
    }
}
