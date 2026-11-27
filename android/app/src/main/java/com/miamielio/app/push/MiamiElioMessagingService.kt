package com.miamielio.app.push

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.miamielio.app.MainActivity
import com.miamielio.app.R
import com.miamielio.app.core.DeepLink
import com.miamielio.app.core.PushClient

/**
 * Receives first-party Miami Elio push notifications (ESIGN quotes ready,
 * payment confirmations, booking status updates) and opens the matching page
 * cleanly inside [MainActivity].
 */
class MiamiElioMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        PushRegistration.storeToken(applicationContext, token)
    }

    @SuppressLint("MissingPermission")
    override fun onMessageReceived(message: RemoteMessage) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        val notifications = getSystemService(NotificationManager::class.java) ?: return
        if (!notifications.areNotificationsEnabled()) return

        notifications.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.push_channel_trip),
                NotificationManager.IMPORTANCE_HIGH,
            ),
        )

        val title = message.notification?.title?.trim()?.takeIf { it.isNotEmpty() }
            ?: message.data["title"]?.trim()?.takeIf { it.isNotEmpty() }
            ?: "Miami Elio"
        val body = message.notification?.body?.trim()?.takeIf { it.isNotEmpty() }
            ?: message.data["body"]?.trim().orEmpty()
        val safePath = PushClient.safeNotificationPath(message.data["path"])
        val deepLinkUri = Uri.Builder()
            .scheme(DeepLink.SCHEME)
            .authority("open")
            .appendQueryParameter("path", safePath)
            .build()

        val intent = Intent(Intent.ACTION_VIEW, deepLinkUri, this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val open = PendingIntent.getActivity(
            this,
            safePath.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(open)
            .setAutoCancel(true)

        runCatching {
            notifications.notify(safePath.hashCode(), builder.build())
        }
    }

    companion object {
        const val CHANNEL_ID = "miami-elio-trip"
    }
}
