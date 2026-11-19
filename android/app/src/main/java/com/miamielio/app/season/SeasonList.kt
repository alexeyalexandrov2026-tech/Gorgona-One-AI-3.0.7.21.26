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
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.filled
import com.miamielio.app.ui.pressable
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import java.time.LocalDate
import androidx.compose.foundation.layout.height
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.miamielio.app.ui.Ocean
import java.time.Instant
import java.time.format.DateTimeFormatter

@Composable
internal fun SeasonList(
    reminders: SeasonReminders,
    onPrepare: (String) -> Unit,
    photo: (SeasonEvent) -> String? = { null },
) {
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
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            stringResource(R.string.season_title).uppercase(LocalLocale.current.platformLocale),
            style = AppFont.eyebrow.copy(brush = Ocean.champagne),
        )
        Text(
            stringResource(R.string.tab_events),
            Modifier.semantics { heading() },
            color = Ocean.pearl,
            style = AppFont.hero,
        )
        Text(stringResource(R.string.season_lede), Modifier.padding(bottom = 6.dp), color = Ocean.pearl.copy(alpha = 0.72f), style = AppFont.detail)
        if (blocked) {
            Text(stringResource(R.string.season_blocked), color = Ocean.pearl.copy(alpha = 0.72f), style = AppFont.detail)
            TextButton(onClick = { openNotificationSettings(context) }) {
                Text(stringResource(R.string.action_settings), color = Theme.accent)
            }
        }
        if (scheduleFailed) Text(stringResource(R.string.error_generic), color = Ocean.pearl.copy(alpha = 0.72f), style = AppFont.detail)
        if (events.isEmpty()) Text(stringResource(R.string.season_empty), color = Ocean.pearl.copy(alpha = 0.72f), style = AppFont.body)
        for (event in events) {
            val scheduled = reminders.scheduled(event)?.takeIf { it.isAfter(now) }
            SeasonRow(event, scheduled, canRemind = Season.reminder(event, now) != null, photo = photo(event), onPrepare = {
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
    photo: String?,
    onPrepare: () -> Unit,
    onToggle: () -> Unit,
) {
    val locale = LocalLocale.current.platformLocale
    val shape = RoundedCornerShape(26.dp)
    // Frosted glass over the sea, with the event's photograph across the top.
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Ocean.glass)
            .border(1.dp, Ocean.glassEdge, shape),
    ) {
        Box(Modifier.fillMaxWidth().height(132.dp)) {
            // Without a photograph (or until it arrives) the top is a band of sea.
            Box(Modifier.matchParentSize().background(Brush.linearGradient(listOf(Color(0xFF0B4A52), Ocean.deep))))
            if (photo != null) {
                AsyncImage(photo, contentDescription = null, modifier = Modifier.matchParentSize(), contentScale = ContentScale.Crop)
            }
            Box(Modifier.matchParentSize().background(Brush.verticalGradient(0.4f to Color.Transparent, 1f to Color(0xE6011A22))))
            DateBlock(event, locale, Modifier.align(Alignment.BottomStart).padding(14.dp))
            if (scheduled != null || canRemind) {
                val on = scheduled != null
                // A white bell on glass; on a sunset while the reminder is set.
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp)
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(if (on) Ocean.sunset else SolidColor(Color(0x66011A22)))
                        .border(1.dp, if (on) SolidColor(Color.Transparent) else Ocean.glassEdge, CircleShape)
                        .pressable(onClick = onToggle)
                        .testTag("season.remind")
                        .semantics { selected = on },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        painterResource(R.drawable.ic_bell),
                        contentDescription = stringResource(if (on) R.string.season_reminder_off else R.string.season_remind),
                        modifier = Modifier.size(20.dp),
                        tint = Color.White,
                    )
                }
            }
        }
        Column(
            Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(event.name, color = Ocean.pearl, style = AppFont.cardTitle)
            Text(event.place, color = Ocean.aqua, style = AppFont.detail)
            if (scheduled != null) {
                val pattern = DateFormat.getBestDateTimePattern(locale, "MMMd")
                val day = DateTimeFormatter.ofPattern(pattern, locale).withZone(Season.zone).format(scheduled)
                Text(stringResource(R.string.season_reminder_on).filled("date" to day), color = Ocean.champagneMid, style = AppFont.detail)
            }
            Row(
                Modifier
                    .padding(top = 10.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Ocean.champagne)
                    .pressable(onClick = onPrepare)
                    .testTag("season.plan")
                    .padding(horizontal = 18.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(stringResource(R.string.season_plan), color = Ocean.champagneInk, style = AppFont.button.copy(fontSize = 14.sp))
                // The drawable mirrors itself for right-to-left languages.
                Icon(painterResource(R.drawable.ic_arrow_forward), null, Modifier.size(14.dp), tint = Ocean.champagneInk)
            }
        }
    }
}

/** The days, large in champagne, over the month: a medallion on the photograph. */
@Composable
private fun DateBlock(event: SeasonEvent, locale: java.util.Locale, modifier: Modifier = Modifier) {
    val start = runCatching { LocalDate.parse(event.start) }.getOrNull() ?: return
    val end = runCatching { LocalDate.parse(event.end) }.getOrNull()
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier
            .clip(shape)
            .background(Color(0x99011A22))
            .border(1.dp, Ocean.champagne, shape)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        val days = if (end == null || end == start) "${start.dayOfMonth}" else "${start.dayOfMonth}–${end.dayOfMonth}"
        Text(days, style = AppFont.title.copy(fontSize = 22.sp, brush = Ocean.champagne), maxLines = 1)
        Text(
            DateTimeFormatter.ofPattern("LLL", locale).format(start).uppercase(locale).trimEnd('.'),
            color = Ocean.aqua,
            style = AppFont.eyebrow.copy(fontSize = 10.sp),
        )
    }
}

private fun openNotificationSettings(context: Context) {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    if (intent.resolveActivity(context.packageManager) != null) context.startActivity(intent)
    else context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)))
}
