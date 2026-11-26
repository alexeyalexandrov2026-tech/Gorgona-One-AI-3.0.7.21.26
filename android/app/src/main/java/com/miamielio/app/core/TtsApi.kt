package com.miamielio.app.core

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Fetches warm female spoken audio (ElevenLabs via `/api/tts`) for an ELIO+
 * reply. Strictly opt-in: called only when the guest taps Listen or turns on
 * Live Voice mode.
 */
class TtsClient(
    private val config: AppConfig = AppConfig.production,
    private val transport: HttpTransport,
) {
    fun makeRequest(text: String, locale: String, fast: Boolean = true): HttpRequest {
        val clean = text.trim()
        val url = config.resolve("/api/tts")
        if (clean.isEmpty() || url == null) throw ApiError.InvalidRequest
        val language = SiteLocale.normalize(locale) ?: SiteLocale.fallback
        val body = buildJsonObject {
            put("text", clipped(clean))
            put("locale", language)
            if (fast) put("fast", true)
        }.toString().toByteArray(Charsets.UTF_8)
        return HttpRequest(
            method = "POST",
            url = url,
            headers = mapOf(
                "Content-Type" to "application/json",
                "Accept" to "audio/mpeg",
                "Origin" to config.baseUrl,
                "User-Agent" to config.userAgentToken,
            ),
            body = body,
        )
    }

    /** Returns MP3 bytes when server audio succeeds, or null to fall back cleanly. */
    suspend fun speak(text: String, locale: String, fast: Boolean = true): ByteArray? {
        val request = try {
            makeRequest(text, locale, fast)
        } catch (_: ApiError) {
            return null
        }
        val response = transport.send(request)
        if (response.status != 200 || response.body.size <= MIN_AUDIO_BYTES) return null
        return response.body
    }

    companion object {
        const val maxTextLength = 1200
        const val MIN_AUDIO_BYTES = 256

        /** Cuts at [maxTextLength] UTF-16 units without splitting a surrogate pair. */
        fun clipped(text: String): String {
            if (text.length <= maxTextLength) return text
            var end = maxTextLength
            if (Character.isHighSurrogate(text[end - 1])) end -= 1
            return text.substring(0, end)
        }
    }
}
