package com.miamielio.app.core

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Registers and unregisters the device's Firebase Cloud Messaging (FCM) token
 * with `/api/push/register` for first-party trip updates (ESIGN quote ready,
 * payment confirmed, booking status changes). Strictly authenticated via Bearer
 * JWT and sent only to Miami Elio's own HTTPS hosts.
 */
class PushClient(
    private val config: AppConfig = AppConfig.production,
    private val transport: HttpTransport,
) {
    fun makeRegisterRequest(
        pushToken: String,
        authToken: String,
        locale: String,
        appVersion: String? = null,
    ): HttpRequest {
        val cleanPush = pushToken.trim()
        val cleanAuth = authToken.trim()
        val url = config.resolve("/api/push/register")
        val host = url?.let(WebAddress::parse)?.host
        if (!isValidPushToken(cleanPush) || !isValidAuthToken(cleanAuth) ||
            url == null || !url.startsWith("https://", ignoreCase = true) ||
            host == null || host !in config.internalHosts
        ) {
            throw ApiError.InvalidRequest
        }
        val lang = SiteLocale.normalize(locale) ?: SiteLocale.fallback
        val body = buildJsonObject {
            put("token", cleanPush)
            put("platform", "android")
            put("locale", lang)
            appVersion?.trim()?.takeIf { it.isNotEmpty() }?.take(32)?.let { put("appVersion", it) }
        }.toString().toByteArray(Charsets.UTF_8)

        return HttpRequest(
            method = "POST",
            url = url,
            headers = mapOf(
                "Content-Type" to "application/json",
                "Accept" to "application/json",
                "User-Agent" to config.userAgentToken,
                "Authorization" to "Bearer $cleanAuth",
            ),
            body = body,
        )
    }

    fun makeUnregisterRequest(pushToken: String, authToken: String): HttpRequest {
        val cleanPush = pushToken.trim()
        val cleanAuth = authToken.trim()
        val url = config.resolve("/api/push/register")
        val host = url?.let(WebAddress::parse)?.host
        if (!isValidPushToken(cleanPush) || !isValidAuthToken(cleanAuth) ||
            url == null || !url.startsWith("https://", ignoreCase = true) ||
            host == null || host !in config.internalHosts
        ) {
            throw ApiError.InvalidRequest
        }
        val body = buildJsonObject {
            put("token", cleanPush)
        }.toString().toByteArray(Charsets.UTF_8)

        return HttpRequest(
            method = "DELETE",
            url = url,
            headers = mapOf(
                "Content-Type" to "application/json",
                "Accept" to "application/json",
                "User-Agent" to config.userAgentToken,
                "Authorization" to "Bearer $cleanAuth",
            ),
            body = body,
        )
    }

    suspend fun register(
        pushToken: String,
        authToken: String,
        locale: String,
        appVersion: String? = null,
    ): Boolean {
        val response = transport.send(makeRegisterRequest(pushToken, authToken, locale, appVersion))
        return response.status in 200..299
    }

    suspend fun unregister(pushToken: String, authToken: String): Boolean {
        val response = transport.send(makeUnregisterRequest(pushToken, authToken))
        return response.status in 200..299
    }

    companion object {
        private val TOKEN_RE = Regex("^[A-Za-z0-9:._-]{32,512}$")

        fun isValidPushToken(token: String): Boolean = TOKEN_RE.matches(token.trim())

        private fun isValidAuthToken(token: String): Boolean =
            token.length >= 20 && !token.any(Char::isWhitespace)

        /** Ensures a server push payload path can only open a safe Miami Elio relative route. */
        fun safeNotificationPath(raw: String?): String {
            val trimmed = raw?.trim().orEmpty()
            if (!trimmed.startsWith("/") || trimmed.startsWith("//") ||
                trimmed.contains('\\') || trimmed.any { it.isWhitespace() || it.isISOControl() }
            ) {
                return "/trip"
            }
            return trimmed.take(200)
        }
    }
}
