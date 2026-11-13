package com.miamielio.app.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.miamielio.app.R
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.core.PlanItem
import com.miamielio.app.core.PlanRequest
import com.miamielio.app.core.PlanSection
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.AppIcon
import com.miamielio.app.ui.Chip
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.FavoriteHeart
import com.miamielio.app.ui.RemotePhoto
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.filled
import com.miamielio.app.ui.pressable
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/**
 * "Your plan" under the conversation: one card per section the guest asked
 * for, each a real catalogue item. Another option, remove, and one request
 * for everything left - the same plan the website shows (PlanBoard.jsx).
 */
@Composable
fun PlanBoard(
    draft: PlanDraft,
    model: ConciergeViewModel,
    favorites: FavoritesStore,
    sending: Boolean,
    open: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var requesting by rememberSaveable { mutableStateOf(false) }
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .testTag("plan.board")
            .background(Theme.card, shape)
            .border(BorderStroke(1.dp, Theme.gold.copy(alpha = 0.35f)), shape)
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        val receipt = draft.receipt
        if (receipt != null) {
            Text(
                stringResource(R.string.plan_sent),
                modifier = Modifier.testTag("plan.sent").semantics { heading() },
                color = Theme.ink,
                style = AppFont.cardTitle,
            )
            Text(
                stringResource(R.string.plan_sent_text).filled("count" to receipt.bookingIds.size),
                color = Theme.soft,
                style = AppFont.detail,
            )
            Text(
                stringResource(R.string.plan_new),
                modifier = Modifier
                    .testTag("plan.new")
                    .pressable { model.clearPlan() }
                    .padding(vertical = 12.dp),
                color = Theme.accent,
                style = AppFont.detailMedium,
            )
            return@Column
        }

        Eyebrow(stringResource(R.string.plan_title), modifier = Modifier.semantics { heading() }, color = Theme.gold)
        Text(stringResource(R.string.plan_lede), color = Theme.soft, style = AppFont.detail)

        draft.plan.sections.filter { it.href !in draft.removed }.forEach { section ->
            PlanItemRow(section, draft.item(section), model, favorites, open)
        }

        val removed = draft.plan.sections.filter { it.href in draft.removed }
        if (removed.isNotEmpty()) {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                removed.forEach { section ->
                    Chip(
                        stringResource(R.string.plan_add_back).filled("section" to section.label),
                        modifier = Modifier.testTag("plan.restore"),
                    ) { model.restoreToPlan(section) }
                }
            }
        }

        if (draft.items.isEmpty()) {
            Text(
                stringResource(R.string.plan_empty),
                modifier = Modifier.testTag("plan.empty"),
                color = Theme.soft,
                style = AppFont.detail,
            )
        } else if (draft.plan.requestable) {
            Text(
                stringResource(R.string.plan_send),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("plan.send")
                    .background(Theme.gold, RoundedCornerShape(50))
                    .pressable { requesting = true }
                    .padding(horizontal = 18.dp, vertical = 14.dp),
                color = Color.Black,
                style = AppFont.button,
                textAlign = TextAlign.Center,
            )
        }
    }

    if (requesting && draft.receipt == null) {
        PlanRequestSheet(draft = draft, model = model, sending = sending, close = { requesting = false })
    }
}

/** One item of the plan with its section, photo and the two ways to change it. */
@Composable
private fun PlanItemRow(
    section: PlanSection,
    item: PlanItem,
    model: ConciergeViewModel,
    favorites: FavoritesStore,
    open: (String) -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("plan.item")
            .background(Theme.paper, shape)
            .border(BorderStroke(1.dp, Theme.rule), shape)
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        RemotePhoto(item.image, Modifier.size(64.dp), corner = 10.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Eyebrow(section.label)
            Text(
                item.title,
                modifier = Modifier.testTag("plan.item.title").pressable { open(item.href) },
                color = Theme.ink,
                style = AppFont.rowTitle,
            )
            item.subtitle?.let { Text(it, color = Theme.soft, style = AppFont.detail) }
            Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                if (section.candidates.size > 1) {
                    val another = stringResource(R.string.plan_another)
                    Text(
                        another,
                        modifier = Modifier
                            .testTag("plan.another")
                            .semantics { contentDescription = "$another: ${section.label}" }
                            .pressable { model.showAnotherOption(section) }
                            .padding(vertical = 12.dp),
                        color = Theme.accent,
                        style = AppFont.detailMedium,
                    )
                }
                val remove = stringResource(R.string.plan_remove)
                Text(
                    remove,
                    modifier = Modifier
                        .testTag("plan.remove")
                        .semantics { contentDescription = "$remove: ${section.label}" }
                        .pressable { model.removeFromPlan(section) }
                        .padding(vertical = 12.dp),
                    color = Theme.soft,
                    style = AppFont.detailMedium,
                )
            }
        }
        FavoriteRef.of(item)?.let { FavoriteHeart(it, favorites) }
    }
}

/** Dates, party and contact details for the one request. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlanRequestSheet(draft: PlanDraft, model: ConciergeViewModel, sending: Boolean, close: () -> Unit) {
    val today = remember { LocalDate.now() }
    var first by rememberSaveable { mutableStateOf(today.plusDays(3).toString()) }
    var last by rememberSaveable { mutableStateOf(today.plusDays(5).toString()) }
    var guests by rememberSaveable { mutableIntStateOf(draft.plan.guests ?: 2) }
    var dinner by rememberSaveable { mutableStateOf("20:00") }
    var name by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var note by rememberSaveable { mutableStateOf("") }
    var problem by remember { mutableStateOf<PlanProblem?>(null) }
    var picking by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val locale = LocalConfiguration.current.locales[0] ?: Locale.ENGLISH
    val dayFormat = remember(locale) { DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale) }
    val timeFormat = remember(locale) { DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale) }
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val submit = {
        val request = PlanRequest(
            name = name,
            email = email,
            phone = phone,
            start = first,
            end = last,
            guests = guests,
            time = if (draft.hasRestaurant) dinner else null,
            note = note,
            items = draft.items.map { PlanRequest.Item(it.kind, it.slug) },
        )
        problem = null
        scope.launch {
            val outcome = model.sendPlan(request)
            problem = outcome
            if (outcome == null) close()
        }
    }

    ModalBottomSheet(
        onDismissRequest = { if (!sending) close() },
        sheetState = sheet,
        containerColor = Theme.paper,
        contentColor = Theme.ink,
        modifier = Modifier.testTag("plan.sheet"),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                stringResource(R.string.plan_title),
                modifier = Modifier.semantics { heading() },
                color = Theme.ink,
                style = AppFont.title,
            )

            ValueRow(stringResource(R.string.plan_first_day), LocalDate.parse(first).format(dayFormat), "plan.first") { picking = "first" }
            ValueRow(stringResource(R.string.plan_last_day), LocalDate.parse(last).format(dayFormat), "plan.last") { picking = "last" }
            GuestStepper(guests) { guests = it.coerceIn(1, 99) }
            if (draft.hasRestaurant) {
                ValueRow(
                    stringResource(R.string.plan_dinner_time),
                    LocalTime.parse(dinner).format(timeFormat),
                    "plan.dinner",
                ) { picking = "dinner" }
            }

            Field(name, { name = it.take(120) }, R.string.plan_name, "plan.name", KeyboardType.Text, KeyboardCapitalization.Words)
            Field(phone, { phone = it.take(40) }, R.string.plan_phone, "plan.phone", KeyboardType.Phone)
            Field(email, { email = it.take(254) }, R.string.plan_email, "plan.email", KeyboardType.Email)
            Field(note, { note = it.take(1000) }, R.string.plan_note, "plan.note", KeyboardType.Text, KeyboardCapitalization.Sentences, lines = 2)

            problem?.let {
                Text(
                    stringResource(
                        when (it) {
                            PlanProblem.BadDates -> R.string.plan_bad_dates
                            PlanProblem.Check -> R.string.plan_check
                            PlanProblem.Failed -> R.string.plan_failed
                        },
                    ),
                    modifier = Modifier.testTag("plan.problem"),
                    color = Theme.accent,
                    style = AppFont.detailMedium,
                )
            }

            Text(
                stringResource(if (sending) R.string.plan_sending else R.string.plan_submit),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("plan.submit")
                    .background(if (sending) Theme.card else Theme.gold, RoundedCornerShape(50))
                    .pressable(enabled = !sending) { submit() }
                    .padding(vertical = 14.dp),
                color = if (sending) Theme.soft else Color.Black,
                style = AppFont.button,
                textAlign = TextAlign.Center,
            )
            Text(stringResource(R.string.plan_charge), color = Theme.soft, style = AppFont.detail)
            Text(
                stringResource(R.string.action_cancel),
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .testTag("plan.cancel")
                    .pressable(enabled = !sending, onClick = close)
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                color = Theme.soft,
                style = AppFont.button,
            )
        }
    }

    when (picking) {
        "first" -> DayDialog(LocalDate.parse(first), earliest = today, close = { picking = null }) { picked ->
            first = picked.toString()
            // The last day follows when the first moves past it.
            if (LocalDate.parse(last).isBefore(picked)) last = picked.toString()
        }
        "last" -> DayDialog(LocalDate.parse(last), earliest = LocalDate.parse(first), close = { picking = null }) { picked ->
            last = picked.toString()
        }
        "dinner" -> TimeDialog(LocalTime.parse(dinner), close = { picking = null }) { picked ->
            dinner = PlanRequest.clock(picked)
        }
    }
}

@Composable
private fun ValueRow(label: String, value: String, tag: String, onClick: () -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .testTag(tag)
            .background(Theme.card, shape)
            .border(BorderStroke(1.dp, Theme.rule), shape)
            .pressable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(label, modifier = Modifier.weight(1f), color = Theme.soft, style = AppFont.detail)
        Text(value, color = Theme.ink, style = AppFont.bodyMedium)
    }
}

@Composable
private fun GuestStepper(guests: Int, change: (Int) -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    val label = stringResource(R.string.plan_guests)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Theme.card, shape)
            .border(BorderStroke(1.dp, Theme.rule), shape)
            .padding(start = 16.dp, end = 4.dp, top = 2.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, modifier = Modifier.weight(1f), color = Theme.soft, style = AppFont.detail)
        StepButton(R.drawable.ic_minus, "$label −", "plan.guests.less", guests > 1) { change(guests - 1) }
        Text(
            guests.toString(),
            modifier = Modifier
                .padding(horizontal = 10.dp)
                .testTag("plan.guests")
                .semantics { stateDescription = "$label: $guests" },
            color = Theme.ink,
            style = AppFont.bodyMedium,
        )
        StepButton(R.drawable.ic_plus, "$label +", "plan.guests.more", guests < 99) { change(guests + 1) }
    }
}

@Composable
private fun StepButton(icon: Int, label: String, tag: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .testTag(tag)
            .semantics { contentDescription = label }
            .pressable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier.size(34.dp).border(BorderStroke(1.dp, Theme.rule), CircleShape),
            contentAlignment = Alignment.Center,
        ) { AppIcon(icon, tint = if (enabled) Theme.ink else Theme.rule, size = 18.dp) }
    }
}

@Composable
private fun Field(
    value: String,
    change: (String) -> Unit,
    label: Int,
    tag: String,
    keyboard: KeyboardType,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    lines: Int = 1,
) {
    OutlinedTextField(
        value = value,
        onValueChange = change,
        modifier = Modifier.fillMaxWidth().testTag(tag),
        label = { Text(stringResource(label), style = AppFont.detail) },
        textStyle = AppFont.body,
        singleLine = lines == 1,
        minLines = lines,
        maxLines = if (lines == 1) 1 else 5,
        shape = RoundedCornerShape(14.dp),
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboard,
            capitalization = capitalization,
            autoCorrectEnabled = keyboard == KeyboardType.Text,
        ),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DayDialog(shown: LocalDate, earliest: LocalDate, close: () -> Unit, pick: (LocalDate) -> Unit) {
    val floor = earliest.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    val state = rememberDatePickerState(
        initialSelectedDateMillis = shown.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli(),
        selectableDates = object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long): Boolean = utcTimeMillis >= floor

            override fun isSelectableYear(year: Int): Boolean = year >= earliest.year
        },
    )
    DatePickerDialog(
        onDismissRequest = close,
        confirmButton = {
            TextButton(onClick = {
                state.selectedDateMillis?.let { pick(Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate()) }
                close()
            }) { Text(stringResource(R.string.action_ok), style = AppFont.button) }
        },
        dismissButton = {
            TextButton(onClick = close) {
                Text(stringResource(R.string.action_cancel), color = Theme.soft, style = AppFont.button)
            }
        },
    ) { DatePicker(state = state) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeDialog(shown: LocalTime, close: () -> Unit, pick: (LocalTime) -> Unit) {
    val state = rememberTimePickerState(initialHour = shown.hour, initialMinute = shown.minute)
    Dialog(onDismissRequest = close) {
        Column(
            modifier = Modifier.background(Theme.card, RoundedCornerShape(28.dp)).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            TimePicker(state = state)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = close) {
                    Text(stringResource(R.string.action_cancel), color = Theme.soft, style = AppFont.button)
                }
                TextButton(onClick = {
                    pick(LocalTime.of(state.hour, state.minute))
                    close()
                }) { Text(stringResource(R.string.action_ok), style = AppFont.button) }
            }
        }
    }
}
