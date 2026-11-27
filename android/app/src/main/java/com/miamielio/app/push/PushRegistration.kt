package com.miamielio.app.push

import android.content.Context
import androidx.core.content.edit
import com.google.firebase.messaging.FirebaseMessaging
import com.miamielio.app.BuildConfig
import com.miamielio.app.core.PushClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Keeps the device's FCM registration token synced with `/api/push/register`
 * whenever a guest is signed in. Deduplicates uploads and gracefully no-ops
 * in test environments where Firebase is not initialized.
 */
internal class PushRegistration(
    context: Context,
    private val client: PushClient,
    private val scope: CoroutineScope,
    private val authToken: () -> String?,
    private val locale: () -> String,
) {
    private val app = context.applicationContext
    private val prefs = app.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun refreshAndSync() {
        runCatching {
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                if (PushClient.isValidPushToken(token)) {
                    storeToken(app, token)
                    syncIfSignedIn()
                }
            }
        }
        syncIfSignedIn()
    }

    fun syncIfSignedIn() {
        val fcmToken = prefs.getString(KEY_TOKEN, null) ?: return
        val jwt = authToken() ?: return
        val lang = locale()
        val fingerprint = "${fcmToken.hashCode()}:${jwt.takeLast(16)}:$lang:${BuildConfig.VERSION_NAME}"
        if (prefs.getString(KEY_SYNCED, null) == fingerprint) return

        scope.launch(Dispatchers.IO) {
            val ok = runCatching {
                client.register(
                    pushToken = fcmToken,
                    authToken = jwt,
                    locale = lang,
                    appVersion = BuildConfig.VERSION_NAME,
                )
            }.getOrDefault(false)
            if (ok) {
                prefs.edit { putString(KEY_SYNCED, fingerprint) }
            }
        }
    }

    companion object {
        private const val PREFS_NAME = "miami-elio-push"
        private const val KEY_TOKEN = "fcm_token"
        private const val KEY_SYNCED = "last_synced"

        fun storeToken(context: Context, token: String) {
            if (!PushClient.isValidPushToken(token)) return
            context.applicationContext
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit {
                    putString(KEY_TOKEN, token.trim())
                    remove(KEY_SYNCED)
                }
        }
    }
}
