package com.miamielio.app.ui

import android.content.Context
import android.provider.Settings
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.miamielio.app.R

/**
 * The site's dark palette (`app/design-system.css`, `[data-theme="dark"]`),
 * so native screens and web pages read as one product. The same values as
 * `res/values/colors.xml`, which paints the window before Compose starts.
 */
object Theme {
    val paper = Color(0xFF0A1218)
    val card = Color(0xFF111D25)
    val ink = Color(0xFFEDF2F3)
    val soft = Color(0xFF9AAAB2)
    val rule = Color(0xFF22323C)
    val accent = Color(0xFFFF6E93)

    /** Text on an accent-coloured surface. */
    val onAccent = paper

    /** A deep tint of the accent, for the guest's own messages. */
    val accentWash = Color(0xFF3A1623)

    /** The gold of the app icon, for the concierge orb. */
    val gold = Color(0xFFC9A45C)
    val goldLight = Color(0xFFF3E2B8)
    val goldDeep = Color(0xFF7A5C24)
}

private val MiamiElioColors = darkColorScheme(
    primary = Theme.accent,
    onPrimary = Theme.onAccent,
    primaryContainer = Theme.accentWash,
    onPrimaryContainer = Theme.ink,
    secondary = Theme.gold,
    onSecondary = Theme.paper,
    secondaryContainer = Theme.card,
    onSecondaryContainer = Theme.ink,
    tertiary = Theme.goldLight,
    onTertiary = Theme.paper,
    background = Theme.paper,
    onBackground = Theme.ink,
    surface = Theme.paper,
    onSurface = Theme.ink,
    surfaceVariant = Theme.card,
    onSurfaceVariant = Theme.soft,
    surfaceContainerLowest = Theme.paper,
    surfaceContainerLow = Theme.paper,
    surfaceContainer = Theme.card,
    surfaceContainerHigh = Theme.card,
    surfaceContainerHighest = Theme.card,
    surfaceTint = Color.Transparent,
    outline = Theme.rule,
    outlineVariant = Theme.rule,
    scrim = Color.Black,
)

/**
 * True when the guest has switched animations off on the phone ("Remove
 * animations"). Nothing moves or changes size then; things only fade or
 * change brightness.
 */
val LocalReduceMotion = staticCompositionLocalOf { false }

private fun animationsRemoved(context: Context): Boolean =
    Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f

/**
 * Everything the app draws sits inside this: the one dark appearance, the
 * site's typefaces for the language on screen, and the motion preference.
 */
@Composable
fun MiamiElioTheme(content: @Composable () -> Unit) {
    val language = stringResource(R.string.locale_code)
    val type = remember(language) { AppType.forLanguage(language) }

    val context = LocalContext.current
    var reduceMotion by remember { mutableStateOf(animationsRemoved(context)) }
    // The setting lives outside the app; look again each time the guest returns.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { reduceMotion = animationsRemoved(context) }

    CompositionLocalProvider(
        LocalAppType provides type,
        LocalReduceMotion provides reduceMotion,
    ) {
        MaterialTheme(colorScheme = MiamiElioColors, typography = type.material, content = content)
    }
}
