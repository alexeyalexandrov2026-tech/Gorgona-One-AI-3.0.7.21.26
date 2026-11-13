package com.miamielio.app.core

import kotlin.math.log10

/**
 * The languages the website speaks, and how a phone's language maps onto
 * them. Mirrors `lib/languages.js`; a test pins the list so the two cannot
 * drift apart unnoticed.
 */
object SiteLocale {
    val supported = listOf(
        "en", "ru", "es", "he", "zh", "pt", "uk", "ja",
        "ko", "de", "ar", "tr", "fa", "it", "fr", "pl",
    )
    val rightToLeft = setOf("he", "ar", "fa")
    const val fallback = "en"

    /** Name of both the cookie and the localStorage key the site reads. */
    const val storageKey = "gorgona-locale"

    /**
     * "ru-RU" -> "ru", "zh-Hans-CN" -> "zh", "iw" -> "he"; null when the site
     * has no such language.
     */
    fun normalize(identifier: String): String? {
        val primary = identifier.lowercase().replace('_', '-').split('-').firstOrNull().orEmpty()
        if (primary.isEmpty()) return null
        // Android still reports Hebrew under its retired code.
        val code = if (primary == "iw") "he" else primary
        return code.takeIf { it in supported }
    }

    /** First of the guest's preferred languages the site supports. */
    fun resolve(preferred: List<String>): String =
        preferred.firstNotNullOfOrNull(::normalize) ?: fallback

    fun isRightToLeft(code: String): Boolean = code in rightToLeft

    /**
     * The language a spoken request is heard in, with its region: "ru" ->
     * "ru-RU". The same table as `SPEECH_LOCALES` in `lib/ai/locale.js`, so
     * the microphone on the site and in the app understand the same accent.
     */
    val speechLocales = mapOf(
        "en" to "en-US", "ru" to "ru-RU", "es" to "es-ES", "he" to "he-IL",
        "zh" to "zh-CN", "pt" to "pt-BR", "uk" to "uk-UA", "ja" to "ja-JP",
        "ko" to "ko-KR", "de" to "de-DE", "ar" to "ar-SA", "tr" to "tr-TR",
        "fa" to "fa-IR", "it" to "it-IT", "fr" to "fr-FR", "pl" to "pl-PL",
    )

    fun speechLocale(code: String): String =
        speechLocales[normalize(code) ?: fallback] ?: "en-US"
}

/** How loud the guest is speaking, for the orb that listens. */
object VoiceLevel {
    /**
     * The loudness of a stretch of microphone audio - the root mean square
     * of its samples, which run from -1 to 1 - as 0..1: a quiet room
     * (-50 dB and below) is 0, a voice close to the phone (-10 dB) is 1.
     */
    fun normalized(rms: Float): Double {
        if (!rms.isFinite() || rms <= 0f) return 0.0
        val decibels = 20 * log10(rms.toDouble())
        return ((decibels + 50) / 40).coerceIn(0.0, 1.0)
    }

    /**
     * Android's speech recogniser reports loudness already in decibels,
     * roughly -2 (silence) to 10 (a voice close to the phone).
     */
    fun fromRecognizer(rmsDb: Float): Double {
        if (!rmsDb.isFinite()) return 0.0
        return ((rmsDb + 2.0) / 12.0).coerceIn(0.0, 1.0)
    }
}
