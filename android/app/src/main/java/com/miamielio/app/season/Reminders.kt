package com.miamielio.app.season

import android.Manifest
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
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.miamielio.app.MainActivity
import com.miamielio.app.R
import com.miamielio.app.core.Season
import com.miamielio.app.core.SeasonEvent
import java.time.Instant

/**
 * Season reminders kept by the phone. Each is an inexact alarm - no special
 * permission, and Android may deliver it a little late, which is fine for
 * "three weeks ahead, in the morning" - plus a line in the app's own storage
 * so the alarms can be set again after the phone restarts.
 */
class AlarmReminders(private val context: Context) : ReminderScheduler {
    private val store = context.getSharedPreferences(STORE, Context.MODE_PRIVATE)
    private val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    override fun scheduled(): Map<String, Instant> {
        val now = System.currentTimeMillis()
        val found = mutableMapOf<String, Instant>()
        val gone = mutableListOf<String>()
        for ((key, value) in store.all) {
            if (!key.startsWith(PREFIX)) continue
            val at = value as? Long
            // A little grace: an alarm due this minute may not have fired yet.
            if (at == null || at < now - GRACE_MILLIS) gone += key else found[key.removePrefix(PREFIX)] = Instant.ofEpochMilli(at)
        }
        if (gone.isNotEmpty()) store.edit().apply { gone.forEach(::remove) }.apply()
        return found
    }

    override fun schedule(event: SeasonEvent, at: Instant) {
        store.edit()
            .putLong(PREFIX + event.id, at.toEpochMilli())
            .putString(TITLE + event.id, "${event.name} · ${Season.range(event)}")
            .apply()
        arm(event.id, at.toEpochMilli())
    }

    override fun cancel(eventId: String) {
        alarms.cancel(alarmIntent(eventId))
        store.edit().remove(PREFIX + eventId).remove(TITLE + eventId).apply()
    }

    override fun notificationsAllowed(): Boolean {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
        return Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
    }

    override var refused: Boolean
        get() = store.getBoolean(REFUSED, false)
        set(value) = store.edit().putBoolean(REFUSED, value).apply()

    /** After a restart or an update of the app, when Android has forgotten every alarm. */
    fun rearm() {
        scheduled().forEach { (id, at) -> arm(id, at.toEpochMilli()) }
    }

    /** The alarm went off: show the reminder and forget it. */
    fun fire(eventId: String) {
        val title = store.getString(TITLE + eventId, null)
        store.edit().remove(PREFIX + eventId).remove(TITLE + eventId).apply()
        if (title == null || !notificationsAllowed()) return

        ensureChannel()
        val open = Intent(Intent.ACTION_VIEW, Uri.parse("miamielio://season?event=" + Uri.encode(eventId)))
            .setClass(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val tap = PendingIntent.getActivity(
            context,
            eventId.hashCode(),
            open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFFC9A45C.toInt())
            .setContentTitle(title)
            .setContentText(context.getString(R.string.season_lede))
            .setStyle(NotificationCompat.BigTextStyle().bigText(context.getString(R.string.season_lede)))
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(tap)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(eventId.hashCode(), notification)
        } catch (_: SecurityException) {
            // Permission was taken back between the check and the post.
        }
    }

    private fun arm(eventId: String, atMillis: Long) {
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, alarmIntent(eventId))
    }

    private fun alarmIntent(eventId: String): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            eventId.hashCode(),
            Intent(context, ReminderReceiver::class.java)
                .setAction(ReminderReceiver.ACTION_FIRE)
                .setData(Uri.parse("miamielio://reminder/" + Uri.encode(eventId)))
                .putExtra(ReminderReceiver.EXTRA_EVENT, eventId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun ensureChannel() {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // Creating a channel that exists only updates its name, here to the phone's current language.
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, context.getString(R.string.season_title), NotificationManager.IMPORTANCE_DEFAULT),
        )
    }

    private companion object {
        const val STORE = "season_reminders"
        const val PREFIX = "at."
        const val TITLE = "title."
        const val REFUSED = "refused"
        const val CHANNEL = "season"
        const val GRACE_MILLIS = 10 * 60 * 1000L
    }
}

/** Receives the alarm of a reminder, and the phone's restart. Not exported. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val reminders = AlarmReminders(context.applicationContext)
        when (intent.action) {
            ACTION_FIRE -> intent.getStringExtra(EXTRA_EVENT)?.let(reminders::fire)
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> reminders.rearm()
        }
    }

    companion object {
        const val ACTION_FIRE = "com.miamielio.app.action.SEASON_REMINDER"
        const val EXTRA_EVENT = "event"
    }
}
