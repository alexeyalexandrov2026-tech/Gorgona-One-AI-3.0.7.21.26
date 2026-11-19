package com.miamielio.app.season

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.text.format.DateFormat
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLocale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.miamielio.app.R
import com.miamielio.app.core.Season
import com.miamielio.app.core.SeasonEvent
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.filled
import com.miamielio.app.ui.pressable
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import java.time.LocalDate
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import java.time.Instant
import java.time.format.DateTimeFormatter

@Composable
internal fun SeasonList(reminders: SeasonReminders, onPrepare: (String) -> Unit) {
    val context = LocalContext.current
    var now by remember { mutableStateOf(reminders.now()) }
    val events = remember(reminders, now) { Season.upcoming(reminders.events, now) }
    var requestedId by rememberSaveable { mutableStateOf<String?>(null) }
    var blocked by rememberSaveable { mutableStateOf(false) }
    var scheduleFailed by rememberSaveable { mutableStateOf(false) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val event = events.find { it.id == requestedId }
        requestedId = null
        blocked = !granted || !reminders.notificationsAllowed()
        scheduleFailed = !blocked && event != null && reminders.schedule(event) == null
        now = reminders.now()
    }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        now = reminders.now()
        if (reminders.notificationsAllowed()) blocked = false
    }

    Column(
        Modifier.fillMaxWidth().testTag("season.list"),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Eyebrow(stringResource(R.string.season_title), color = Theme.goldText)
        Text(
            stringResource(R.string.tab_events),
            Modifier.semantics { heading() },
            color = Theme.ink,
            style = AppFont.hero,
        )
        Text(stringResource(R.string.season_lede), Modifier.padding(bottom = 6.dp), color = Theme.soft, style = AppFont.detail)
        if (blocked) {
            Text(stringResource(R.string.season_blocked), color = Theme.soft, style = AppFont.detail)
            TextButton(onClick = { openNotificationSettings(context) }) {
                Text(stringResource(R.string.action_settings), color = Theme.accent)
            }
        }
        if (scheduleFailed) Text(stringResource(R.string.error_generic), color = Theme.soft, style = AppFont.detail)
        if (events.isEmpty()) Text(stringResource(R.string.season_empty), color = Theme.soft, style = AppFont.body)
        for (event in events) {
            val scheduled = reminders.scheduled(event)?.takeIf { it.isAfter(now) }
            SeasonRow(event, scheduled, canRemind = Season.reminder(event, now) != null, onPrepare = {
                onPrepare(event.prompt(context))
            }) {
                scheduleFailed = false
                if (scheduled != null) {
                    reminders.cancel(event)
                    now = reminders.now()
                } else if (reminders.notificationsAllowed()) {
                    scheduleFailed = reminders.schedule(event) == null
                    now = reminders.now()
                } else if (Build.VERSION.SDK_INT >= 33 &&
                    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED &&
                    !blocked
                ) {
                    requestedId = event.id
                    permission.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    blocked = true
                }
            }
        }
    }
}

@Composable
private fun SeasonRow(
    event: SeasonEvent,
    scheduled: Instant?,
    canRemind: Boolean,
    onPrepare: () -> Unit,
    onToggle: () -> Unit,
) {
    val locale = LocalLocale.current.platformLocale
    val shape = RoundedCornerShape(18.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Brush.linearGradient(listOf(Theme.goldText.copy(alpha = 0.09f), Color.White.copy(alpha = 0.02f))))
            .border(1.dp, Theme.goldLine, shape)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        DateBlock(event, locale)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(event.name, color = Theme.ink, style = AppFont.rowTitle)
            Text(event.place, color = Theme.soft, style = AppFont.detail)
            if (scheduled != null) {
                val pattern = DateFormat.getBestDateTimePattern(locale, "MMMd")
                val day = DateTimeFormatter.ofPattern(pattern, locale).withZone(Season.zone).format(scheduled)
                Text(stringResource(R.string.season_reminder_on).filled("date" to day), color = Theme.goldText, style = AppFont.detail)
            }
            Text(
                stringResource(R.string.season_plan) + if (LocalLayoutDirection.current == LayoutDirection.Rtl) " ←" else " →",
                Modifier
                    .padding(top = 4.dp)
                    .pressable(onClick = onPrepare)
                    .testTag("season.plan"),
                color = Theme.goldButton,
                style = AppFont.detailMedium,
            )
        }
        if (scheduled != null || canRemind) {
            val on = scheduled != null
            Box(
                Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(if (on) Theme.goldButton else Color.Transparent)
                    .border(1.dp, if (on) Theme.goldButton else Theme.goldLine, CircleShape)
                    .pressable(onClick = onToggle)
                    .testTag("season.remind")
                    .semantics { selected = on },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painterResource(R.drawable.ic_bell),
                    contentDescription = stringResource(if (on) R.string.season_reminder_off else R.string.season_remind),
                    modifier = Modifier.size(20.dp),
                    tint = if (on) Theme.goldInk else Theme.goldLight,
                )
            }
        }
    }
}

/** The days of the week, large, over the month: "4–6 / DEC". */
@Composable
private fun DateBlock(event: SeasonEvent, locale: java.util.Locale) {
    val start = runCatching { LocalDate.parse(event.start) }.getOrNull()
    val end = runCatching { LocalDate.parse(event.end) }.getOrNull()
    Column(
        Modifier.width(62.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (start == null) return@Column
        val days = if (end == null || end == start) "${start.dayOfMonth}" else "${start.dayOfMonth}–${end.dayOfMonth}"
        Text(days, color = Theme.ink, style = if (days.length > 3) AppFont.cardTitle else AppFont.title, maxLines = 2)
        Text(
            DateTimeFormatter.ofPattern("LLL", locale).format(start).uppercase(locale).trimEnd('.'),
            color = Theme.goldText,
            style = AppFont.eyebrow,
        )
    }
}

private fun openNotificationSettings(context: Context) {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    if (intent.resolveActivity(context.packageManager) != null) context.startActivity(intent)
    else context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)))
}
