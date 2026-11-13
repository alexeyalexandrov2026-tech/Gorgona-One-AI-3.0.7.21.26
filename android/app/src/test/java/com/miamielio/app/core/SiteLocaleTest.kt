package com.miamielio.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SiteLocaleTest {
    @Test
    fun matchesTheLanguagesTheSiteShips() {
        // Same codes, same order as SUPPORTED_LANGUAGES in lib/languages.js.
        assertEquals(
            listOf("en", "ru", "es", "he", "zh", "pt", "uk", "ja", "ko", "de", "ar", "tr", "fa", "it", "fr", "pl"),
            SiteLocale.supported,
        )
        assertEquals(setOf("he", "ar", "fa"), SiteLocale.rightToLeft)
        assertEquals("gorgona-locale", SiteLocale.storageKey)
    }

    @Test
    fun normalizesDeviceIdentifiers() {
        assertEquals("ru", SiteLocale.normalize("ru-RU"))
        assertEquals("en", SiteLocale.normalize("en_US"))
        assertEquals("zh", SiteLocale.normalize("zh-Hans-CN"))
        assertEquals("zh", SiteLocale.normalize("zh-Hant-TW"))
        assertEquals("pt", SiteLocale.normalize("pt-BR"))
        assertEquals("he", SiteLocale.normalize("he-IL"))
        assertEquals("he", SiteLocale.normalize("iw"))
        assertEquals("he", SiteLocale.normalize("iw-IL"))
        assertEquals("fa", SiteLocale.normalize("FA"))
        assertNull(SiteLocale.normalize("sv-SE"))
        assertNull(SiteLocale.normalize(""))
    }

    @Test
    fun picksTheFirstPreferredLanguageTheSiteHas() {
        assertEquals("uk", SiteLocale.resolve(listOf("sv-SE", "uk-UA", "en-US")))
        assertEquals("es", SiteLocale.resolve(listOf("es-419")))
        assertEquals("en", SiteLocale.resolve(listOf("sv-SE", "fi-FI")))
        assertEquals("en", SiteLocale.resolve(emptyList()))
    }

    @Test
    fun knowsWritingDirection() {
        assertTrue(SiteLocale.isRightToLeft("ar"))
        assertTrue(SiteLocale.isRightToLeft("he"))
        assertFalse(SiteLocale.isRightToLeft("ru"))
    }

    @Test
    fun hearsEveryLanguageWithItsRegion() {
        assertEquals(SiteLocale.supported.toSet(), SiteLocale.speechLocales.keys)
        assertEquals("ru-RU", SiteLocale.speechLocale("ru"))
        assertEquals("zh-CN", SiteLocale.speechLocale("zh-Hans-CN"))
        assertEquals("pt-BR", SiteLocale.speechLocale("pt"))
        assertEquals("en-US", SiteLocale.speechLocale("sv"))
    }

    @Test
    fun turnsMicrophoneLoudnessIntoAnOrbLevel() {
        assertEquals(0.0, VoiceLevel.normalized(0f), 0.0)
        // -60 dB: a quiet room.
        assertEquals(0.0, VoiceLevel.normalized(0.001f), 0.0)
        // -40 dB and -20 dB.
        assertEquals(0.25, VoiceLevel.normalized(0.01f), 0.0001)
        assertEquals(0.75, VoiceLevel.normalized(0.1f), 0.0001)
        // -10 dB and louder: the orb at its fullest.
        assertEquals(1.0, VoiceLevel.normalized(0.32f), 0.0)
        assertEquals(1.0, VoiceLevel.normalized(1f), 0.0)
        assertEquals(0.0, VoiceLevel.normalized(Float.NaN), 0.0)
    }

    @Test
    fun readsTheLoudnessAndroidReports() {
        assertEquals(0.0, VoiceLevel.fromRecognizer(-2f), 0.0)
        assertEquals(0.5, VoiceLevel.fromRecognizer(4f), 0.0001)
        assertEquals(1.0, VoiceLevel.fromRecognizer(12f), 0.0)
        assertEquals(0.0, VoiceLevel.fromRecognizer(Float.NaN), 0.0)
    }
}
