package com.miamielio.app.ui

import androidx.compose.material3.Text
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.intl.Locale
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.toUpperCase
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.miamielio.app.R
import com.miamielio.app.core.SiteLocale

private val Jost = FontFamily(
    Font(R.font.jost_regular, FontWeight.Normal),
    Font(R.font.jost_medium, FontWeight.Medium),
    Font(R.font.jost_semibold, FontWeight.SemiBold),
)
private val BodoniModa = FontFamily(Font(R.font.bodoni_moda_medium, FontWeight.Medium))
private val DmMono = FontFamily(Font(R.font.dm_mono_medium, FontWeight.Medium))

/**
 * The website's typefaces, so the native screens read as the same product
 * as the pages beside them. Headings and text are both set in Jost, as on
 * the site's home page: one geometric family, with headings large, medium
 * weight and tightly tracked. Bodoni Moda and DM Mono appear only in the
 * "MIAMI Elio" wordmark. The files are in `res/font`, under the SIL Open
 * Font License kept in `assets/licenses`.
 *
 * Jost does not cover every script the app is translated into, and a line
 * set half in Jost and half in a substitute face looks broken. So it is
 * used only for languages it can set completely; every other language gets
 * the system sans, which covers all of them.
 *
 * Sizes are in sp, so everything follows the reader's font size setting.
 */
@Immutable
class AppType private constructor(val setsText: Boolean) {
    private val family: FontFamily = if (setsText) Jost else FontFamily.Default

    /**
     * Everything that is read rather than looked at. The direction of each
     * line follows its own words, as in the iPhone app: an English yacht
     * name in the Hebrew app still reads "80 ft", not "ft 80".
     */
    fun text(size: Float, weight: FontWeight = FontWeight.Normal): TextStyle =
        TextStyle(fontFamily = family, fontWeight = weight, fontSize = size.sp, textDirection = TextDirection.Content)

    /** Headings: the text family at medium weight, letters pulled together as on the site. */
    fun display(size: Float): TextStyle =
        text(size, FontWeight.Medium).copy(letterSpacing = (-0.03).em, lineHeight = 1.15.em)

    /** Latin letters and figures only. */
    fun mono(size: Float): TextStyle =
        TextStyle(fontFamily = DmMono, fontWeight = FontWeight.Medium, fontSize = size.sp)

    /** The brand name is always written in Latin letters, so always in Bodoni. */
    fun wordmark(size: Float): TextStyle =
        TextStyle(fontFamily = BodoniModa, fontWeight = FontWeight.Medium, fontSize = size.sp)

    val hero = display(36f)
    val title = display(27f)
    val cardTitle = display(20f)

    /** A suggested request, or a row's name in a list. */
    val rowTitle = text(18f, FontWeight.Medium)
    val body = text(17f).copy(lineHeight = 1.4.em)
    val bodyMedium = text(17f, FontWeight.Medium).copy(lineHeight = 1.4.em)
    val detail = text(15f).copy(lineHeight = 1.35.em)
    val detailMedium = text(15f, FontWeight.Medium).copy(lineHeight = 1.35.em)
    val button = text(16f, FontWeight.SemiBold)

    /** The small, widely spaced capitals the site sets above its headings. */
    val eyebrow = text(12f, FontWeight.Medium).copy(letterSpacing = 2.2.sp)
    val tabLabel = text(10.5f, FontWeight.Medium)

    /** The same roles for Material components that pick their own style. */
    val material = Typography(
        displayLarge = hero,
        displayMedium = hero,
        displaySmall = title,
        headlineLarge = hero,
        headlineMedium = title,
        headlineSmall = cardTitle,
        titleLarge = text(17f, FontWeight.SemiBold),
        titleMedium = rowTitle,
        titleSmall = detailMedium,
        bodyLarge = body,
        bodyMedium = detail,
        bodySmall = text(13f),
        labelLarge = button,
        labelMedium = text(12f, FontWeight.Medium),
        labelSmall = tabLabel,
    )

    companion object {
        /**
         * Jost sets the Latin-script languages and Russian. Its Cyrillic
         * lacks the Ukrainian letters.
         */
        val jostLanguages = setOf("en", "es", "pt", "de", "tr", "it", "fr", "pl", "ru")

        private val withJost = AppType(setsText = true)
        private val withSystem = AppType(setsText = false)

        /** `language` is the language the app's own strings are showing in. */
        fun forLanguage(language: String): AppType {
            val code = SiteLocale.normalize(language) ?: SiteLocale.fallback
            return if (code in jostLanguages) withJost else withSystem
        }
    }
}

val LocalAppType = staticCompositionLocalOf { AppType.forLanguage(SiteLocale.fallback) }

/** The app's type roles: `AppFont.body`, `AppFont.title`. */
val AppFont: AppType
    @Composable get() = LocalAppType.current

/** A line of eyebrow text: small capitals, widely spaced. */
@Composable
fun Eyebrow(text: String, modifier: Modifier = Modifier, color: Color = Theme.soft) {
    Text(
        text = text.toUpperCase(Locale.current),
        modifier = modifier,
        color = color,
        style = AppFont.eyebrow,
    )
}
