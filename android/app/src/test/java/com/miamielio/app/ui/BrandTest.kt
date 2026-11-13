package com.miamielio.app.ui

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BrandTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun jostSetsOnlyTheLanguagesItCovers() {
        for (language in listOf("en", "es", "pt", "de", "tr", "it", "fr", "pl", "ru", "ru-RU")) {
            assertTrue(language, AppType.forLanguage(language).setsText)
        }
        // Ukrainian letters, and every script that is not Latin or Cyrillic.
        for (language in listOf("uk", "he", "iw", "zh", "ja", "ko", "ar", "fa")) {
            assertFalse(language, AppType.forLanguage(language).setsText)
        }
        // A language the site does not speak shows the English strings.
        assertSame(AppType.forLanguage("en"), AppType.forLanguage("sv"))
    }

    @Test
    fun theWordmarkIsReadAsTheBrandNameNotAsTwoWords() {
        compose.setContent { MiamiElioTheme { Wordmark() } }

        compose.onNodeWithContentDescription("Miami Elio")
            .assertExists()
            .assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading))
        compose.onNodeWithText("MIAMI").assertDoesNotExist()
        compose.onNodeWithText("Elio").assertDoesNotExist()
    }

    @Test
    fun theOrbKeepsItsSizeInEveryState() {
        var activity by mutableStateOf(OrbActivity.Resting)
        var level by mutableStateOf(0.0)
        var still by mutableStateOf(false)
        compose.setContent {
            MiamiElioTheme {
                CompositionLocalProvider(LocalReduceMotion provides still) {
                    ConciergeMark(
                        diameter = 64.dp,
                        modifier = Modifier.testTag("orb"),
                        breathes = true,
                        activity = activity,
                        level = level,
                        glintsOnArrival = true,
                    )
                }
            }
        }

        for (reduceMotion in listOf(false, true)) {
            still = reduceMotion
            for (state in OrbActivity.entries) {
                activity = state
                level = if (state == OrbActivity.Listening) 2.5 else 0.0
                compose.mainClock.advanceTimeBy(600)
                compose.onNodeWithTag("orb").assertWidthIsEqualTo(64.dp).assertHeightIsEqualTo(64.dp)
            }
        }
    }

    @Test
    fun theSplashIsReadAsTheBrandName() {
        compose.setContent { MiamiElioTheme { SplashView() } }
        compose.mainClock.advanceTimeBy(1_000)
        compose.onNodeWithContentDescription("Miami Elio").assertExists()
    }
}
