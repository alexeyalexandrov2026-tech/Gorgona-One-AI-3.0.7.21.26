package com.miamielio.app.today

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import com.miamielio.app.R
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/** How long each letter of the typing hint takes, as on the site's hero. */
internal const val TYPE_MILLIS = 42L

/** How long a finished hint stays before the next one starts. */
internal const val HOLD_MILLIS = 1_600L

/**
 * The hint the hero's field is typing [elapsedMillis] after it started:
 * one prompt at a time, letter by letter, a pause, then the next, round and round.
 */
internal fun ghostText(prompts: List<String>, elapsedMillis: Long): String {
    if (prompts.isEmpty()) return ""
    val cycle = prompts.sumOf { it.length * TYPE_MILLIS + HOLD_MILLIS }
    var left = elapsedMillis.coerceAtLeast(0) % cycle
    for (prompt in prompts) {
        val typing = prompt.length * TYPE_MILLIS
        if (left < typing + HOLD_MILLIS) return prompt.take((left / TYPE_MILLIS).toInt().coerceAtMost(prompt.length))
        left -= typing + HOLD_MILLIS
    }
    return ""
}

/** The time in Miami, the way the guest's language writes it. */
internal fun miamiClock(now: Instant, locale: Locale): String =
    DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale).format(now.atZone(MIAMI))

internal val MIAMI: ZoneId = ZoneId.of("America/New_York")

/** A section button under the hero's field and the question it asks. */
internal data class Pick(@StringRes val label: Int, @StringRes val ask: Int, @DrawableRes val icon: Int)

/** The same buttons, in the same order and asking the same, as `picks` in the site's HomeHero.jsx. */
internal val PICKS: List<Pick> = listOf(
    Pick(R.string.home_pick_yachts, R.string.home_chip_1, R.drawable.ic_pick_yacht),
    Pick(R.string.home_pick_villas, R.string.home_chip_4, R.drawable.ic_pick_villa),
    Pick(R.string.home_pick_cars, R.string.home_chip_2, R.drawable.ic_pick_car),
    Pick(R.string.home_pick_jets, R.string.home_ask_jets, R.drawable.ic_pick_jet),
    Pick(R.string.home_pick_dining, R.string.home_chip_5, R.drawable.ic_pick_dine),
    Pick(R.string.home_pick_events, R.string.home_chip_3, R.drawable.ic_pick_ticket),
    Pick(R.string.home_pick_adventures, R.string.home_ask_adventures, R.drawable.ic_pick_peak),
)

/** The site's ready-made requests above the glass. */
internal val CHIPS = listOf(R.string.home_chip_1, R.string.home_chip_2, R.string.home_chip_3, R.string.home_chip_4, R.string.home_chip_5)

/** The hints the field types out. */
internal val PROMPTS = listOf(R.string.home_prompt_1, R.string.home_prompt_2, R.string.home_prompt_3, R.string.home_prompt_4, R.string.home_prompt_5)
