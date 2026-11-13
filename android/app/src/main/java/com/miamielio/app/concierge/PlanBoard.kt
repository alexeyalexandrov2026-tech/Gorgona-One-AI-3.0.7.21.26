package com.miamielio.app.concierge

import android.text.format.DateFormat
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.core.PlanItem
import com.miamielio.app.core.PlanRequest
import com.miamielio.app.core.PlanSection
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.filled
import com.miamielio.app.ui.pressable
import java.text.NumberFormat
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/**
 * "Your plan" under the conversation: one card per section the guest asked
 * for, each a real catalogue item. Another option, remove, and one request
 * for everything left - the same plan the website shows (PlanBoard.jsx).
 */
@Composable
internal fun PlanBoard(
    draft: PlanDraft,
    isSending: Boolean,
    problem: PlanProblem?,
    model: ConciergeViewModel,
    onOpen: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var requesting by rememberSaveable { mutableStateOf(false) }
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Theme.card)
            .border(1.dp, Theme.gold.copy(alpha = 0.35f), shape)
            .padding(18.dp)
            .testTag("plan.board"),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        val receipt = draft.receipt
        if (receipt != null) {
            Text(
                stringResource(R.string.plan_sent),
                Modifier.semantics { heading() },
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
                Modifier
                    .pressable(onClick = model::clearPlan)
                    .padding(vertical = 4.dp)
                    .testTag("plan.new"),
                color = Theme.accent,
                style = AppFont.detailMedium,
            )
        } else {
            Eyebrow(stringResource(R.string.plan_title), Modifier.semantics { heading() }, color = Theme.gold)
            Text(stringResource(R.string.plan_lede), color = Theme.soft, style = AppFont.detail)

            draft.plan.sections.filter { it.href !in draft.removed }.forEach { section ->
                PlanItemRow(
                    section = section,
                    item = draft.item(section),
                    onOpen = onOpen,
                    onAnother = { model.showAnotherOption(section) },
                    onRemove = { model.removeFromPlan(section) },
                )
            }

            val removed = draft.plan.sections.filter { it.href in draft.removed }
            if (removed.isNotEmpty()) {
                val addBack = stringResource(R.string.plan_add_back)
                Row(
                    Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    removed.forEach { section ->
                        Chip(addBack.filled("section" to section.label)) { model.restoreToPlan(section) }
                    }
                }
            }

            if (draft.items.isEmpty()) {
                Text(stringResource(R.string.plan_empty), color = Theme.soft, style = AppFont.detail)
            } else if (draft.plan.requestable) {
                GoldButton(
                    text = stringResource(R.string.plan_send),
                    tag = "plan.send",
                    onClick = {
                        model.clearPlanProblem()
                        requesting = true
                    },
                )
            }
        }
    }

    if (requesting) {
        PlanRequestForm(
            draft = draft,
            isSending = isSending,
            problem = problem,
            onSubmit = model::sendPlan,
            onDismiss = { requesting = false },
        )
    }
}

/** One item of the plan with its section, photo and the two ways to change it. */
@Composable
private fun PlanItemRow(
    section: PlanSection,
    item: PlanItem,
    onOpen: (String) -> Unit,
    onAnother: () -> Unit,
    onRemove: () -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    val another = stringResource(R.string.plan_another)
    val remove = stringResource(R.string.plan_remove)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Theme.paper)
            .border(1.dp, Theme.rule, shape)
            .padding(12.dp)
            .testTag("plan.item"),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        AsyncImage(
            model = item.image,
            contentDescription = null,
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Theme.rule.copy(alpha = 0.5f)),
            contentScale = ContentScale.Crop,
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Eyebrow(section.label)
            Text(
                item.title,
                Modifier.pressable { onOpen(item.href) },
                color = Theme.ink,
                style = AppFont.rowTitle,
            )
            item.subtitle?.let { Text(it, color = Theme.soft, style = AppFont.detail) }
            Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                if (section.candidates.size > 1) {
                    Text(
                        another,
                        Modifier
                            .pressable(onClick = onAnother)
                            .semantics { contentDescription = "$another: ${section.label}" }
                            .testTag("plan.another"),
                        color = Theme.accent,
                        style = AppFont.detailMedium,
                    )
                }
                Text(
                    remove,
                    Modifier
                        .pressable(onClick = onRemove)
                        .semantics { contentDescription = "$remove: ${section.label}" }
                        .testTag("plan.remove"),
                    color = Theme.soft,
                    style = AppFont.detailMedium,
                )
            }
        }
        // Favourite hearts join here with favourites (handoff, item 9).
    }
}

@Composable
private fun GoldButton(text: String, tag: String, enabled: Boolean = true, onClick: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(CircleShape)
            .background(Theme.gold)
            .alpha(if (enabled) 1f else 0.6f)
            .pressable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp)
            .testTag(tag),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = Color.Black, style = AppFont.button, textAlign = TextAlign.Center)
    }
}

// region Request form

private enum class Picking { First, Last, Dinner }

private const val DAY_MILLIS = 86_400_000L

/** Dates, party and contact details for the one request. */
@Composable
private fun PlanRequestForm(
    draft: PlanDraft,
    isSending: Boolean,
    problem: PlanProblem?,
    onSubmit: (PlanRequest) -> Unit,
    onDismiss: () -> Unit,
) {
    // Sent: the board now shows the receipt.
    LaunchedEffect(draft.receipt) {
        if (draft.receipt != null) onDismiss()
    }

    val today = remember { LocalDate.now() }
    var first by rememberSaveable { mutableLongStateOf(today.plusDays(3).toEpochDay()) }
    var last by rememberSaveable { mutableLongStateOf(today.plusDays(5).toEpochDay()) }
    var guests by rememberSaveable { mutableIntStateOf(draft.plan.guests ?: 2) }
    var dinner by rememberSaveable { mutableIntStateOf(20 * 60) }
    var name by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var note by rememberSaveable { mutableStateOf("") }
    var picking by rememberSaveable { mutableStateOf<Picking?>(null) }

    val locale = LocalConfiguration.current.locales[0]
    val dates = remember(locale) { DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale) }
    val times = remember(locale) { DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale) }
    val numbers = remember(locale) { NumberFormat.getIntegerInstance(locale) }

    Dialog(
        onDismissRequest = { if (!isSending) onDismiss() },
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
            dismissOnBackPress = !isSending,
            dismissOnClickOutside = false,
        ),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .background(Theme.paper)
                .systemBarsPadding()
                .imePadding()
                .testTag("plan.form"),
        ) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            ) {
                TextButton(onClick = onDismiss, enabled = !isSending, modifier = Modifier.align(Alignment.CenterStart)) {
                    Text(stringResource(R.string.action_cancel), color = Theme.accent, style = AppFont.detailMedium)
                }
                Text(
                    stringResource(R.string.plan_title),
                    Modifier
                        .align(Alignment.Center)
                        .padding(horizontal = 96.dp)
                        .semantics { heading() },
                    color = Theme.ink,
                    style = AppFont.rowTitle,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                )
            }
            Hairline()
            Column(
                Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ChoiceRow(stringResource(R.string.plan_first_day), dates.format(LocalDate.ofEpochDay(first)), "plan.first") {
                    picking = Picking.First
                }
                ChoiceRow(stringResource(R.string.plan_last_day), dates.format(LocalDate.ofEpochDay(last)), "plan.last") {
                    picking = Picking.Last
                }
                GuestsRow(guests, numbers::format) { guests = it.coerceIn(1, 99) }
                if (draft.hasRestaurant) {
                    ChoiceRow(
                        stringResource(R.string.plan_dinner_time),
                        times.format(LocalTime.of(dinner / 60, dinner % 60)),
                        "plan.dinner",
                    ) { picking = Picking.Dinner }
                }

                Spacer(Modifier.height(4.dp))
                FormField(name, { name = it }, stringResource(R.string.plan_name), "plan.name",
                    KeyboardOptions(capitalization = KeyboardCapitalization.Words, keyboardType = KeyboardType.Text))
                FormField(phone, { phone = it }, stringResource(R.string.plan_phone), "plan.phone",
                    KeyboardOptions(keyboardType = KeyboardType.Phone))
                FormField(email, { email = it }, stringResource(R.string.plan_email), "plan.email",
                    KeyboardOptions(keyboardType = KeyboardType.Email, autoCorrectEnabled = false))
                FormField(note, { note = it.take(1000) }, stringResource(R.string.plan_note), "plan.note",
                    KeyboardOptions(capitalization = KeyboardCapitalization.Sentences), singleLine = false)

                problem?.let {
                    Text(
                        stringResource(
                            when (it) {
                                PlanProblem.BadDates -> R.string.plan_bad_dates
                                PlanProblem.Check -> R.string.plan_check
                                PlanProblem.Failed -> R.string.plan_failed
                            },
                        ),
                        Modifier.testTag("plan.problem"),
                        color = Theme.accent,
                        style = AppFont.detail,
                    )
                }

                Spacer(Modifier.height(4.dp))
                GoldButton(
                    text = stringResource(if (isSending) R.string.plan_sending else R.string.plan_submit),
                    tag = "plan.submit",
                    enabled = !isSending,
                ) {
                    onSubmit(
                        PlanRequest(
                            name = name,
                            email = email,
                            phone = phone,
                            start = PlanRequest.day(LocalDate.ofEpochDay(first)),
                            end = PlanRequest.day(LocalDate.ofEpochDay(last)),
                            guests = guests,
                            time = if (draft.hasRestaurant) PlanRequest.clock(LocalTime.of(dinner / 60, dinner % 60)) else null,
                            note = note,
                            items = draft.items.map { PlanRequest.Item(it.kind, it.slug) },
                        ),
                    )
                }
                Text(stringResource(R.string.plan_charge), color = Theme.soft, style = AppFont.detail)
            }
        }
    }

    when (picking) {
        Picking.First -> DayPicker(first, earliest = today.toEpochDay(), onDismiss = { picking = null }) {
            first = it
            if (last < it) last = it
        }
        Picking.Last -> DayPicker(last, earliest = first, onDismiss = { picking = null }) { last = it }
        Picking.Dinner -> DinnerPicker(dinner, onDismiss = { picking = null }) { dinner = it }
        null -> Unit
    }
}

/** A detail chosen from a picker: its name, and its value in the accent colour. */
@Composable
private fun ChoiceRow(label: String, value: String, tag: String, onClick: () -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Theme.card)
            .border(1.dp, Theme.rule, shape)
            .pressable(onClickLabel = label, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 15.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, Modifier.weight(1f), color = Theme.ink, style = AppFont.body)
        Text(value, color = Theme.accent, style = AppFont.body)
    }
}

@Composable
private fun GuestsRow(guests: Int, format: (Long) -> String, onChange: (Int) -> Unit) {
    val label = stringResource(R.string.plan_guests)
    val shape = RoundedCornerShape(14.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Theme.card)
            .border(1.dp, Theme.rule, shape)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, Modifier.weight(1f), color = Theme.ink, style = AppFont.body)
        StepButton("−", "$label −", enabled = guests > 1, tag = "plan.fewer") { onChange(guests - 1) }
        Text(
            format(guests.toLong()),
            Modifier
                .widthIn(min = 40.dp)
                .testTag("plan.guests"),
            color = Theme.ink,
            style = AppFont.bodyMedium,
            textAlign = TextAlign.Center,
        )
        StepButton("+", "$label +", enabled = guests < 99, tag = "plan.more") { onChange(guests + 1) }
    }
}

@Composable
private fun StepButton(symbol: String, description: String, enabled: Boolean, tag: String, onClick: () -> Unit) {
    Box(
        Modifier
            .size(40.dp)
            .clip(CircleShape)
            .border(1.dp, Theme.rule, CircleShape)
            .alpha(if (enabled) 1f else 0.4f)
            .pressable(enabled = enabled, onClick = onClick)
            .semantics { contentDescription = description }
            .testTag(tag),
        contentAlignment = Alignment.Center,
    ) {
        Text(symbol, color = Theme.ink, style = AppFont.rowTitle)
    }
}

@Composable
private fun FormField(
    value: String,
    onChange: (String) -> Unit,
    label: String,
    tag: String,
    keyboard: KeyboardOptions,
    singleLine: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier
            .fillMaxWidth()
            .testTag(tag),
        label = { Text(label) },
        textStyle = AppFont.body,
        singleLine = singleLine,
        minLines = if (singleLine) 1 else 2,
        maxLines = if (singleLine) 1 else 5,
        keyboardOptions = keyboard,
        colors = fieldColors(),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DayPicker(day: Long, earliest: Long, onDismiss: () -> Unit, onPick: (Long) -> Unit) {
    val state = rememberDatePickerState(
        initialSelectedDateMillis = day * DAY_MILLIS,
        selectableDates = object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long) = Math.floorDiv(utcTimeMillis, DAY_MILLIS) >= earliest

            override fun isSelectableYear(year: Int) = year >= LocalDate.ofEpochDay(earliest).year
        },
    )
    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    state.selectedDateMillis?.let { onPick(Math.floorDiv(it, DAY_MILLIS)) }
                    onDismiss()
                },
            ) { Text(stringResource(R.string.action_ok)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_cancel)) }
        },
    ) {
        DatePicker(state = state)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DinnerPicker(minutes: Int, onDismiss: () -> Unit, onPick: (Int) -> Unit) {
    val context = LocalContext.current
    val state = rememberTimePickerState(
        initialHour = minutes / 60,
        initialMinute = minutes % 60,
        is24Hour = DateFormat.is24HourFormat(context),
    )
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    onPick(state.hour * 60 + state.minute)
                    onDismiss()
                },
            ) { Text(stringResource(R.string.action_ok)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_cancel)) }
        },
        text = { TimePicker(state = state) },
    )
}

// endregion
