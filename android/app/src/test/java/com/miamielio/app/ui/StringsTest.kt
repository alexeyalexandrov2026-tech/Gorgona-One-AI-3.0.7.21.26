package com.miamielio.app.ui

import android.content.Context
import android.content.res.Configuration
import android.view.View
import androidx.test.core.app.ApplicationProvider
import com.miamielio.app.R
import com.miamielio.app.core.HomeSections
import com.miamielio.app.core.SiteLocale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class StringsTest {
    /** The app as a phone set to `tag` ("ru-RU", "he-IL") would load it. */
    private fun appIn(tag: String): Context {
        val base = ApplicationProvider.getApplicationContext<Context>()
        val configuration = Configuration(base.resources.configuration)
        configuration.setLocale(Locale.forLanguageTag(tag))
        return base.createConfigurationContext(configuration)
    }

    private val everyString: List<Int> =
        R.string::class.java.fields.filter { it.type == Int::class.javaPrimitiveType }.map { it.getInt(null) }

    @Test
    fun everyLanguageOfTheSiteHasItsOwnStrings() {
        val english = appIn("en-US")
        for (code in SiteLocale.supported) {
            val app = appIn(SiteLocale.speechLocale(code))
            assertEquals(code, app.getString(R.string.locale_code))

            val rightToLeft = app.resources.configuration.layoutDirection == View.LAYOUT_DIRECTION_RTL
            assertEquals(code, SiteLocale.isRightToLeft(code), rightToLeft)

            if (code != "en") {
                // Whole sentences, which no two languages write alike.
                assertNotEquals(code, english.getString(R.string.offline_message), app.getString(R.string.offline_message))
                assertNotEquals(code, english.getString(R.string.plan_charge), app.getString(R.string.plan_charge))
            }
        }
    }

    @Test
    fun theBarsLabelsFitAFifthOfAPhoneInEveryLanguage() {
        val labels = listOf(R.string.tab_today, R.string.tab_catalog, R.string.tab_ai, R.string.tab_exclusive, R.string.tab_profile)
        for (code in SiteLocale.supported) {
            val app = appIn(SiteLocale.speechLocale(code))
            for (id in labels) {
                val text = app.getString(id)
                assertTrue("$code/${app.resources.getResourceEntryName(id)} \"$text\" is ${text.length} characters", text.length <= 12)
            }
        }
        // The site writes "AI" in Latin letters in every language, and so does the bar.
        for (code in SiteLocale.supported) assertEquals(code, "AI", appIn(SiteLocale.speechLocale(code)).getString(R.string.tab_ai))
    }

    @Test
    fun theSectionsAreNamedAsTheSiteNamesThem() {
        assertEquals(
            listOf(
                "Travel", "Exclusive Destinations", "Stays", "Yachts", "Cars", "Events",
                "Private Jets", "Experiences", "Adventures", "Dining & Nightlife", "AI Concierge",
            ),
            HomeSections.all.map { appIn("en-US").getString(it.label) },
        )
        for (code in SiteLocale.supported) {
            val app = appIn(SiteLocale.speechLocale(code))
            val names = HomeSections.all.map { app.getString(it.label) }
            assertEquals("$code: $names", names.size, names.toSet().size)
        }
        assertEquals("Эксклюзивные направления", appIn("ru-RU").getString(R.string.section_exclusive))
        assertEquals("יעדים בלעדיים", appIn("he-IL").getString(R.string.section_exclusive))
        assertEquals("特別な旅先", appIn("ja-JP").getString(R.string.section_exclusive))
        // The site's own word for its menu, and the short name of the tab it makes room for.
        assertEquals("Menu", appIn("en-US").getString(R.string.menu_title))
        assertEquals("Меню", appIn("ru-RU").getString(R.string.menu_title))
        assertEquals("Exclusive", appIn("en-US").getString(R.string.tab_exclusive))
    }

    @Test
    fun hebrewIsFoundUnderBothOfItsCodes() {
        assertEquals("he", appIn("he").getString(R.string.locale_code))
        assertEquals("he", appIn("iw").getString(R.string.locale_code))
    }

    @Test
    fun aLanguageTheSiteDoesNotSpeakGetsEnglish() {
        val app = appIn("sv-SE")
        assertEquals("en", app.getString(R.string.locale_code))
        assertEquals("Try again", app.getString(R.string.action_retry))
    }

    @Test
    fun noStringIsEmptyOrNamesAnotherPlatform() {
        for (code in SiteLocale.supported) {
            val app = appIn(SiteLocale.speechLocale(code))
            for (id in everyString) {
                val text = app.getString(id)
                val name = app.resources.getResourceEntryName(id)
                assertTrue("$code/$name is blank", text.isNotBlank())
                assertFalse("$code/$name: $text", text.contains("iPhone") || text.contains("iOS"))
            }
        }
    }

    @Test
    fun whatTheAppFillsInSurvivesEveryTranslation() {
        for (code in SiteLocale.supported) {
            val app = appIn(SiteLocale.speechLocale(code))

            val sent = app.getString(R.string.plan_sent_text).filled("count" to 3)
            assertTrue("$code: $sent", sent.contains("3"))
            assertFalse("$code: $sent", sent.contains("{"))

            val back = app.getString(R.string.plan_add_back).filled("section" to "Yachts")
            assertTrue("$code: $back", back.contains("Yachts"))
            assertFalse("$code: $back", back.contains("{"))

            val ask = app.getString(R.string.season_ask).filled("name" to "Art Basel", "dates" to "Dec 4-6")
            assertTrue("$code: $ask", ask.contains("Art Basel") && ask.contains("Dec 4-6"))
            assertFalse("$code: $ask", ask.contains("{"))

            val reminder = app.getString(R.string.season_reminder_on).filled("date" to "Nov 13")
            assertTrue("$code: $reminder", reminder.contains("Nov 13"))
            assertFalse("$code: $reminder", reminder.contains("{"))
        }
    }

    @Test
    fun fillingLeavesUnknownMarksAlone() {
        assertEquals("Add back: Cars", "Add back: {section}".filled("section" to "Cars"))
        assertEquals("{other} 2", "{other} {count}".filled("count" to 2))
    }
}
