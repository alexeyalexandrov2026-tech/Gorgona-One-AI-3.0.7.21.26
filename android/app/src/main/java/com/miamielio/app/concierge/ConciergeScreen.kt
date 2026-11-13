package com.miamielio.app.concierge

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.miamielio.app.R
import com.miamielio.app.core.AnswerReport
import com.miamielio.app.core.ConciergeCard
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.LocalReduceMotion
import com.miamielio.app.ui.OrbActivity
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.season.SeasonList
import com.miamielio.app.season.SeasonReminders
import com.miamielio.app.ui.arrives
import com.miamielio.app.ui.pressable
import com.miamielio.app.ui.rememberKeyboardDismissal

/**
 * The AI concierge as a native conversation. It speaks to the same
 * `/api/chat` the website uses; anything it points to opens in Home
 * through [onOpen]. Mirrors the iPhone app's `ConciergeView`.
 */
@Composable
internal fun ConciergeScreen(
    model: ConciergeViewModel,
    favorites: FavoritesStore,
    onOpen: (String) -> Unit,
    modifier: Modifier = Modifier,
    season: SeasonReminders? = null,
) {
    val state by model.state.collectAsStateWithLifecycle()
    val open by rememberUpdatedState(onOpen)
    val list = rememberLazyListState()
    val focus = LocalFocusManager.current
    val haptics = LocalHapticFeedback.current
    val reduceMotion = LocalReduceMotion.current

    // Brings the newest row into view: the start of a reply that has just
    // arrived (its plan follows below it), or the end while one is coming.
    // On returning to the tab it jumps there without animating.
    val count = state.entries.size
    var settled by remember { mutableStateOf(false) }
    LaunchedEffect(count, state.isSending) {
        if (count > 0) {
            // Rows: the entries, then the plan if there is one, then the orb that waits.
            val rows = count + (if (state.plan != null) 1 else 0) + (if (state.isSending) 1 else 0)
            val target = if (state.isSending) rows - 1 else count - 1
            if (!settled || reduceMotion) list.scrollToItem(target) else list.animateScrollToItem(target)
        }
        settled = true
    }

    // A light tap under the finger when a message goes or a reply lands.
    var seen by remember { mutableIntStateOf(count) }
    LaunchedEffect(count) {
        if (count > seen) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        seen = count
    }

    Column(
        modifier
            .fillMaxSize()
            .background(Theme.paper),
    ) {
        TopBar(
            canReset = state.entries.isNotEmpty(),
            onReset = {
                focus.clearFocus()
                model.reset()
            },
        )
        LazyColumn(
            state = list,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .nestedScroll(rememberKeyboardDismissal())
                .testTag("concierge.conversation"),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(26.dp),
        ) {
            if (state.entries.isEmpty()) {
                item(key = "welcome") { Welcome(onAsk = { model.send(it) }) }
                if (season != null) {
                    item(key = "season") { SeasonList(season, onPrepare = model::prepare) }
                }
            }
            items(state.entries, key = { it.id }) { entry ->
                EntryRow(
                    entry = entry,
                    isNewest = entry.id == state.entries.last().id,
                    canReport = model.canReport,
                    onOpen = { open(it) },
                    onRetry = model::retry,
                    onReport = { note -> model.report(entry.id, note) },
                    modifier = Modifier.arrives(),
                )
            }
            // Real catalogue items for a multi-section request, sent as one request.
            state.plan?.let { plan ->
                item(key = "plan") {
                    PlanBoard(
                        favorites = favorites,
                        draft = plan,
                        isSending = state.isSendingPlan,
                        problem = state.planProblem,
                        model = model,
                        onOpen = { open(it) },
                        modifier = Modifier.arrives(),
                    )
                }
            }
            if (state.isSending) {
                item(key = "typing") { TypingIndicator(Modifier.arrives()) }
            }
        }
        Composer(
            draft = state.draft,
            canSend = state.canSend,
            onDraft = model::setDraft,
            onSend = { model.send() },
            dictationLanguage = model::speechLanguage,
            readingReply = state.isSending,
        )
    }
}

@Composable
private fun TopBar(canReset: Boolean, onReset: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .heightIn(min = 56.dp)
            .padding(start = 20.dp, end = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Wordmark(size = 22f)
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onReset, enabled = canReset, modifier = Modifier.testTag("concierge.new")) {
            Icon(
                painter = painterResource(R.drawable.ic_new_conversation),
                contentDescription = stringResource(R.string.concierge_new),
                tint = if (canReset) Theme.ink else Theme.soft.copy(alpha = 0.4f),
            )
        }
    }
}

// region Empty conversation

@Composable
private fun Welcome(onAsk: (String) -> Unit) {
    val starters = listOf(
        stringResource(R.string.concierge_starter_1),
        stringResource(R.string.concierge_starter_2),
        stringResource(R.string.concierge_starter_3),
    )
    Column(Modifier.fillMaxWidth()) {
        ConciergeMark(
            diameter = 68.dp,
            modifier = Modifier
                .padding(top = 28.dp, bottom = 30.dp)
                .arrives(0),
            breathes = true,
        )
        Eyebrow(
            text = "Miami Elio AI",
            modifier = Modifier
                .padding(bottom = 12.dp)
                .arrives(1),
            color = Theme.accent,
        )
        Text(
            text = stringResource(R.string.concierge_title),
            modifier = Modifier
                .padding(bottom = 28.dp)
                .arrives(2)
                .semantics { heading() }
                .testTag("concierge.title"),
            color = Theme.ink,
            style = AppFont.hero,
        )
        // Ready-made requests, listed the way the site lists its sections:
        // one per line between hairlines.
        starters.forEachIndexed { index, prompt ->
            Hairline(Modifier.arrives(3 + index))
            Row(
                Modifier
                    .fillMaxWidth()
                    .arrives(3 + index)
                    .pressable { onAsk(prompt) }
                    .padding(vertical = 17.dp)
                    .testTag("concierge.starter"),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(prompt, Modifier.weight(1f), color = Theme.ink, style = AppFont.rowTitle)
                Spacer(Modifier.width(8.dp))
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_up_forward),
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = Theme.accent,
                )
            }
        }
        Hairline(Modifier.arrives(3 + starters.size))
    }
}

// endregion

// region Conversation rows

@Composable
private fun EntryRow(
    entry: ConciergeEntry,
    isNewest: Boolean,
    canReport: Boolean,
    onOpen: (String) -> Unit,
    onRetry: () -> Unit,
    onReport: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    when (entry.kind) {
        ConciergeEntry.Kind.Guest -> GuestRow(entry.text, modifier)
        ConciergeEntry.Kind.Concierge -> ReplyRow(entry, isNewest, canReport, onOpen, onReport, modifier)
        ConciergeEntry.Kind.Failed -> FailedRow(onRetry, modifier)
    }
}

@Composable
private fun GuestRow(text: String, modifier: Modifier) {
    val shape = RoundedCornerShape(22.dp)
    Box(
        modifier
            .fillMaxWidth()
            .padding(start = 56.dp),
        contentAlignment = Alignment.CenterEnd,
    ) {
        SelectionContainer {
            Text(
                text = text,
                modifier = Modifier
                    .clip(shape)
                    .background(Theme.accentWash)
                    .border(1.dp, Theme.accent.copy(alpha = 0.4f), shape)
                    .padding(horizontal = 17.dp, vertical = 12.dp)
                    .testTag("concierge.guest"),
                color = Theme.ink,
                style = AppFont.body,
            )
        }
    }
}

/**
 * The concierge speaks in plain type beside its orb, like an editor's
 * reply, rather than from a second chat bubble.
 */
@Composable
private fun ReplyRow(
    entry: ConciergeEntry,
    isNewest: Boolean,
    canReport: Boolean,
    onOpen: (String) -> Unit,
    onReport: (String) -> Unit,
    modifier: Modifier,
) {
    val open by rememberUpdatedState(onOpen)
    val text = remember(entry.text) {
        ReplyText.annotated(
            entry.text,
            link = SpanStyle(color = Theme.accent, textDecoration = TextDecoration.Underline),
            onLink = { open(it) },
        )
    }
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        ConciergeMark(diameter = 22.dp, modifier = Modifier.padding(top = 2.dp), glintsOnArrival = isNewest)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            SelectionContainer {
                Text(text, Modifier.testTag("concierge.reply"), color = Theme.ink, style = AppFont.body)
            }
            entry.cards.forEach { card -> CardView(card) { open(card.href) } }
            if (entry.suggestions.isNotEmpty()) {
                Row(
                    Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    entry.suggestions.forEach { link -> Chip(link.label) { open(link.href) } }
                }
            }
            if (canReport) ReportAction(entry.report, onReport)
        }
    }
}

/** A section of the site the concierge is pointing to. */
@Composable
private fun CardView(card: ConciergeCard, onClick: () -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Theme.card)
            .border(1.dp, Theme.rule, shape)
            .pressable(onClick = onClick)
            .padding(18.dp)
            .testTag("concierge.card"),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(card.title, color = Theme.ink, style = AppFont.cardTitle)
        card.summary?.let { Text(it, color = Theme.soft, style = AppFont.detail) }
        Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Eyebrow(card.cta ?: stringResource(R.string.concierge_open), color = Theme.accent)
            Spacer(Modifier.width(8.dp))
            Icon(
                painter = painterResource(R.drawable.ic_arrow_forward),
                contentDescription = null,
                modifier = Modifier.size(14.dp),
                tint = Theme.accent,
            )
        }
    }
}

/** A compact way on, or back, under a reply or the plan. */
@Composable
internal fun Chip(label: String, onClick: () -> Unit) {
    Text(
        text = label,
        modifier = Modifier
            .clip(CircleShape)
            .border(1.dp, Theme.rule, CircleShape)
            .pressable(onClick = onClick)
            .padding(horizontal = 15.dp, vertical = 9.dp),
        color = Theme.ink,
        style = AppFont.detailMedium,
    )
}

@Composable
private fun FailedRow(onRetry: () -> Unit, modifier: Modifier) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Theme.card)
            .border(1.dp, Theme.rule, shape)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            painter = painterResource(R.drawable.ic_warning),
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = Theme.soft,
        )
        Text(stringResource(R.string.error_generic), Modifier.weight(1f), color = Theme.soft, style = AppFont.detail)
        Text(
            text = stringResource(R.string.action_retry),
            modifier = Modifier
                .pressable(onClick = onRetry)
                .padding(vertical = 4.dp)
                .testTag("concierge.retry"),
            color = Theme.accent,
            style = AppFont.detailMedium,
        )
    }
}

/** A reply on its way: the orb turns a light across itself. */
@Composable
private fun TypingIndicator(modifier: Modifier = Modifier) {
    val loading = stringResource(R.string.state_loading)
    Box(
        modifier
            .fillMaxWidth()
            .testTag("concierge.typing")
            .clearAndSetSemantics { contentDescription = loading },
    ) {
        ConciergeMark(diameter = 28.dp, activity = OrbActivity.Thinking)
    }
}

// endregion

// region Report

/**
 * "Report this answer", under every reply, once there is somewhere to send
 * the report. After it arrived, a thank-you takes its place.
 */
@Composable
private fun ReportAction(status: ReportStatus, onReport: (String) -> Unit) {
    var asking by rememberSaveable { mutableStateOf(false) }
    if (status == ReportStatus.Sent) {
        Text(
            stringResource(R.string.report_sent),
            Modifier.testTag("concierge.reported"),
            color = Theme.soft,
            style = AppFont.detail,
        )
    } else {
        Text(
            text = stringResource(R.string.concierge_report),
            modifier = Modifier
                .pressable(role = Role.Button) { asking = true }
                .padding(vertical = 4.dp)
                .testTag("concierge.report"),
            color = Theme.soft,
            style = AppFont.detail,
        )
    }
    if (asking) ReportDialog(status, onSend = onReport, onDismiss = { asking = false })
}

/**
 * The report, as a card over the conversation. The window spans the whole
 * screen and the card keeps clear of the keyboard itself - the same kind
 * of dialog as the plan request.
 */
@Composable
private fun ReportDialog(status: ReportStatus, onSend: (String) -> Unit, onDismiss: () -> Unit) {
    var note by rememberSaveable { mutableStateOf("") }
    var tried by remember { mutableStateOf(false) }
    val sending = status == ReportStatus.Sending
    val dismiss = { if (!sending) onDismiss() }
    LaunchedEffect(status) {
        if (status == ReportStatus.Sent) onDismiss()
    }
    Dialog(
        onDismissRequest = dismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val shape = RoundedCornerShape(24.dp)
        Box(
            Modifier
                .fillMaxSize()
                // A tap beside the card puts it away, as outside any dialog.
                .clickable(interactionSource = null, indication = null, onClick = dismiss)
                .systemBarsPadding()
                .imePadding()
                .padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                Modifier
                    .widthIn(max = 480.dp)
                    .fillMaxWidth()
                    .clip(shape)
                    .background(Theme.card)
                    .border(1.dp, Theme.rule, shape)
                    // Taps on the card stay on the card.
                    .pointerInput(Unit) { detectTapGestures {} }
                    .padding(24.dp)
                    .testTag("report.dialog"),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    stringResource(R.string.concierge_report),
                    Modifier.semantics { heading() },
                    color = Theme.ink,
                    style = AppFont.cardTitle,
                )
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it.take(AnswerReport.maxNoteLength) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("report.note"),
                    placeholder = { Text(stringResource(R.string.report_prompt), style = AppFont.detail) },
                    textStyle = AppFont.body,
                    minLines = 3,
                    maxLines = 6,
                    colors = fieldColors(),
                )
                if (tried && status == ReportStatus.Failed) {
                    Text(stringResource(R.string.error_generic), color = Theme.accent, style = AppFont.detail)
                }
                Row(Modifier.align(Alignment.End), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = onDismiss, enabled = !sending) {
                        Text(stringResource(R.string.action_cancel), color = Theme.soft, style = AppFont.detailMedium)
                    }
                    TextButton(
                        onClick = {
                            tried = true
                            onSend(note)
                        },
                        enabled = !sending,
                        modifier = Modifier.testTag("report.send"),
                    ) {
                        Text(
                            stringResource(if (sending) R.string.state_loading else R.string.report_send),
                            color = Theme.accent,
                            style = AppFont.detailMedium,
                        )
                    }
                }
            }
        }
    }
}

// endregion

// region Composer

@Composable
private fun Composer(
    draft: String,
    canSend: Boolean,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    dictationLanguage: () -> String,
    readingReply: Boolean,
) {
    val placeholder = stringResource(R.string.concierge_placeholder)
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(24.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .background(Theme.paper),
    ) {
        val voice = rememberDictation(draft, dictationLanguage, onDraft, readingReply)
        Hairline()
        voice.feedback()
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            BasicTextField(
                value = draft,
                onValueChange = onDraft,
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 46.dp)
                    .onFocusChanged { focused = it.isFocused }
                    .semantics { contentDescription = placeholder }
                    .testTag("concierge.input"),
                textStyle = AppFont.body.copy(color = Theme.ink),
                cursorBrush = SolidColor(Theme.accent),
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Sentences,
                    imeAction = ImeAction.Send,
                ),
                keyboardActions = KeyboardActions(onSend = {
                    if (canSend) {
                        voice.cancel()
                        onSend()
                    }
                }),
                maxLines = 5,
                decorationBox = { field ->
                    Box(
                        Modifier
                            .clip(shape)
                            .background(Theme.card)
                            .border(1.dp, if (focused) Theme.accent.copy(alpha = 0.6f) else Theme.rule, shape)
                            .padding(horizontal = 18.dp, vertical = 12.dp),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        if (draft.isEmpty()) Text(placeholder, color = Theme.soft, style = AppFont.body, maxLines = 1)
                        field()
                    }
                },
            )
            voice.button(!readingReply)
            SendButton(enabled = canSend) {
                voice.cancel()
                onSend()
            }
        }
    }
}

@Composable
private fun SendButton(enabled: Boolean, onClick: () -> Unit) {
    val label = stringResource(R.string.concierge_send)
    Box(
        Modifier
            .size(46.dp)
            .clip(CircleShape)
            .background(if (enabled) Theme.accent else Theme.card)
            .border(1.dp, if (enabled) Theme.accent else Theme.rule, CircleShape)
            .pressable(enabled = enabled, onClick = onClick)
            .semantics { contentDescription = label }
            .testTag("concierge.send"),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painter = painterResource(R.drawable.ic_arrow_up),
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = if (enabled) Theme.onAccent else Theme.soft,
        )
    }
}

// endregion

/** Text fields in the app's colours: the concierge's report and the plan request. */
@Composable
internal fun fieldColors(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Theme.ink,
    unfocusedTextColor = Theme.ink,
    focusedContainerColor = Theme.card,
    unfocusedContainerColor = Theme.card,
    focusedBorderColor = Theme.accent,
    unfocusedBorderColor = Theme.rule,
    focusedLabelColor = Theme.accent,
    unfocusedLabelColor = Theme.soft,
    focusedPlaceholderColor = Theme.soft,
    unfocusedPlaceholderColor = Theme.soft,
    cursorColor = Theme.accent,
)
