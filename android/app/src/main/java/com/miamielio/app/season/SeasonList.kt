package com.miamielio.app.season

import android.Manifest
import android.icu.text.RelativeDateTimeFormatter
import android.icu.util.ULocale
import android.os.Build
import android.text.format.DateFormat
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.miamielio.app.R
import com.miamielio.app.core.Season
import com.miamielio.app.core.SeasonEvent
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.AppIcon
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.SettingsNotice
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.arrives
import com.miamielio.app.ui.filled
import com.miamielio.app.ui.pressable
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Miami's season under the concierge's ready-made prompts: the weeks that
 * sell out first, soonest first - the same list, in the same English, as
 * the website's home page. A tap on a week asks the concierge to plan it;
 * the bell beside it sets a reminder ahead of it.
 */
@Composable
fun SeasonList(season: SeasonStore, ask: (String) -> Unit, order: Int, modifier: Modifier = Modifier) {
    val state by season.state.collectAsState()
    val now = season.now()
    val events = season.upcoming()
    val locale = LocalConfiguration.current.locales[0] ?: Locale.ENGLISH

    // What is still scheduled, read back: a reminder that has gone off, or
    // notifications turned off in Settings meanwhile.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { season.refresh() }

    // Android asks the guest the first time only; after that their answer stands.
    var waiting by remember { mutableStateOf<SeasonEvent?>(null) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val event = waiting
        waiting = null
        if (granted && event != null) season.remind(event) else if (!granted) season.refused()
    }
    val toggle: (SeasonEvent) -> Unit = { event ->
        when {
            season.hasReminder(event) -> season.cancel(event)
            Build.VERSION.SDK_INT >= 33 && !season.notificationsAllowed() -> {
                waiting = event
                permission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            season.notificationsAllowed() -> season.remind(event)
            else -> season.refused()
        }
    }

    Column(modifier.fillMaxWidth().arrives(order)) {
        Eyebrow(
            stringResource(R.string.season_title),
            modifier = Modifier
                .padding(bottom = 10.dp)
                .testTag("season.title")
                .semantics { heading() },
            color = Theme.gold,
        )
        Text(
            stringResource(R.string.season_lede),
            modifier = Modifier.padding(bottom = 14.dp),
            color = Theme.soft,
            style = AppFont.detail,
        )
        if (events.isEmpty()) {
            Text(
                stringResource(R.string.season_empty),
                modifier = Modifier.testTag("season.empty"),
                color = Theme.soft,
                style = AppFont.detail,
            )
        } else {
            events.forEach { event ->
                Hairline()
                SeasonRow(
                    event = event,
                    now = now,
                    reminder = state.reminders[event.id],
                    canRemind = season.canRemind(event),
                    locale = locale,
                    ask = ask,
                    toggle = { toggle(event) },
                )
            }
            Hairline()
        }
        if (state.blocked) {
            SettingsNotice(
                stringResource(R.string.season_blocked),
                modifier = Modifier.padding(top = 14.dp).testTag("season.blocked"),
            )
        }
    }
}

/** One week: its date, name and place, how soon it is, and the bell. */
@Composable
private fun SeasonRow(
    event: SeasonEvent,
    now: Instant,
    reminder: Instant?,
    canRemind: Boolean,
    locale: Locale,
    ask: (String) -> Unit,
    toggle: () -> Unit,
) {
    val dates = Season.range(event)
    val request = stringResource(R.string.season_ask).filled("name" to event.name, "dates" to dates)
    val reminderLine = reminder?.let { stringResource(R.string.season_reminder_on).filled("date" to reminderDay(it, locale)) }
    val status = when {
        reminderLine != null -> "$dates · $reminderLine"
        else -> {
            val days = Season.daysUntil(event, now)
            val soon = when {
                days <= 0 -> stringResource(R.string.season_on_now)
                days == 1 -> stringResource(R.string.season_tomorrow)
                else -> inDays(days, locale)
            }
            "$dates · $soon"
        }
    }

    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier
                .weight(1f)
                .testTag("season.event")
                .pressable(onClickLabel = stringResource(R.string.season_plan)) { ask(request) }
                .padding(vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            DateStub(Season.monthStub(event), Season.dayStub(event))
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(event.name, color = Theme.ink, style = AppFont.rowTitle)
                if (event.place.isNotEmpty()) Text(event.place, color = Theme.soft, style = AppFont.detail)
                Text(status, color = if (reminder == null) Theme.soft else Theme.gold, style = AppFont.detail)
            }
        }
        if (canRemind) {
            val label = stringResource(if (reminder == null) R.string.season_remind else R.string.season_reminder_off)
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .testTag("season.remind")
                    .border(
                        BorderStroke(1.dp, if (reminder == null) Theme.rule else Theme.gold.copy(alpha = 0.6f)),
                        CircleShape,
                    )
                    .semantics {
                        contentDescription = "$label: ${event.name}"
                        if (reminderLine != null) stateDescription = reminderLine
                    }
                    .pressable(onClick = toggle),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    if (reminder == null) R.drawable.ic_bell else R.drawable.ic_bell_filled,
                    tint = if (reminder == null) Theme.soft else Theme.gold,
                )
            }
        }
    }
}

/** The torn-ticket date the site prints beside each week: month over day. */
@Composable
private fun DateStub(month: String, day: String) {
    val shape = RoundedCornerShape(12.dp)
    Column(
        modifier = Modifier
            .widthIn(min = 52.dp)
            .background(Theme.card, shape)
            .border(BorderStroke(1.dp, Theme.rule), shape)
            .padding(vertical = 8.dp, horizontal = 6.dp)
            .clearAndSetSemantics { },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(month, color = Theme.accent, style = AppFont.mono(11f))
        Text(day, color = Theme.ink, style = AppFont.display(24f))
    }
}

/** "in 23 days", "через 23 дня". */
private fun inDays(days: Int, locale: Locale): String = try {
    RelativeDateTimeFormatter.getInstance(ULocale.forLocale(locale)).format(
        days.toDouble(),
        RelativeDateTimeFormatter.Direction.NEXT,
        RelativeDateTimeFormatter.RelativeUnit.DAYS,
    )
} catch (_: Exception) {
    days.toString()
}

/** "November 13", "13 ноября": the day of a reminder, on Miami's calendar. */
private fun reminderDay(at: Instant, locale: Locale): String = try {
    DateTimeFormatter.ofPattern(DateFormat.getBestDateTimePattern(locale, "dMMMM"), locale)
        .format(at.atZone(Season.zone))
} catch (_: Exception) {
    at.atZone(Season.zone).toLocalDate().toString()
}
