package com.miamielio.app.concierge

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.miamielio.app.R
import com.miamielio.app.app.AppRouter
import com.miamielio.app.core.ConciergeCard
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.season.SeasonList
import com.miamielio.app.season.SeasonStore
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.AppIcon
import com.miamielio.app.ui.Chip
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.OrbActivity
import com.miamielio.app.ui.SettingsNotice
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.TopBar
import com.miamielio.app.ui.arrives
import com.miamielio.app.ui.pressable
import kotlinx.coroutines.launch

/**
 * The AI concierge as a native conversation. It speaks to the same
 * `/api/chat` the website uses; anything it points to opens in Home.
 * A request can be typed or spoken; the concierge answers in text.
 */
@Composable
fun ConciergeScreen(
    model: ConciergeViewModel,
    router: AppRouter,
    favorites: FavoritesStore,
    season: SeasonStore,
    voice: Voice,
    modifier: Modifier = Modifier,
) {
    val state by model.state.collectAsState()
    val heard by voice.state.collectAsState()
    val focus = LocalFocusManager.current
    val context = LocalContext.current
    val list = rememberLazyListState()
    var reporting by remember { mutableStateOf<String?>(null) }

    // Another tab, or the app put away: the microphone goes off, and what
    // was heard so far stays in the composer.
    DisposableEffect(voice) { onDispose { voice.stop() } }
    LifecycleEventEffect(Lifecycle.Event.ON_STOP) { voice.stop() }

    // Sends the draft, or a ready-made prompt. A microphone still on is put
    // down first, so nothing it hears afterwards refills the composer.
    val send: (String?) -> Unit = { prompt ->
        voice.cancel()
        voice.clearNotice()
        model.send(prompt)
    }

    val listen = {
        focus.clearFocus()
        // What is heard joins whatever the guest had already typed.
        val typed = model.state.value.draft.trim()
        val lead = if (typed.isEmpty()) "" else "$typed "
        voice.start(model.language) { words -> model.setDraft(lead + words) }
    }
    val microphone = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) listen() else voice.denied()
    }
    val toggleMicrophone = {
        when {
            heard.isListening -> voice.stop()
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED -> listen()
            else -> microphone.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    val rows = state.entries.size + (if (state.plan != null) 1 else 0) + (if (state.isSending) 1 else 0)
    LaunchedEffect(state.entries.size, state.isSending) {
        if (state.entries.isNotEmpty()) list.animateScrollToItem(rows)
    }

    Column(modifier.fillMaxSize().background(Theme.paper)) {
        TopBar {
            val enabled = state.entries.isNotEmpty()
            val label = stringResource(R.string.concierge_new)
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .testTag("concierge.new")
                    .semantics { contentDescription = label }
                    .pressable(enabled = enabled) {
                        voice.cancel()
                        model.reset()
                    },
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(R.drawable.ic_new_chat, tint = if (enabled) Theme.ink else Theme.rule, size = 22.dp)
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth().testTag("concierge.thread"),
            state = list,
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(26.dp),
        ) {
            if (state.entries.isEmpty()) {
                item(key = "welcome") {
                    ConciergeWelcome(
                        listening = heard.isListening,
                        level = heard.level,
                        season = season,
                        ask = { send(it) },
                    )
                }
            }
            items(state.entries, key = { it.id }) { entry ->
                ConciergeEntryView(
                    entry = entry,
                    isNewest = entry.id == state.entries.lastOrNull()?.id,
                    canReport = model.canReport,
                    open = router::open,
                    openReference = router::openReference,
                    retry = model::retry,
                    report = { reporting = entry.id },
                    modifier = Modifier.arrives(),
                )
            }
            // Real catalogue items for a multi-section request, sent as one request.
            state.plan?.let { draft ->
                item(key = "plan") {
                    PlanBoard(
                        draft = draft,
                        model = model,
                        favorites = favorites,
                        sending = state.isSendingPlan,
                        open = router::openReference,
                        modifier = Modifier.arrives(),
                    )
                }
            }
            if (state.isSending) {
                item(key = "typing") { TypingIndicator(Modifier.arrives()) }
            }
            item(key = "bottom") { Spacer(Modifier.size(1.dp)) }
        }

        Composer(
            draft = state.draft,
            canSend = state.canSend,
            voice = heard,
            onDraft = model::setDraft,
            onSend = { send(null) },
            onMicrophone = toggleMicrophone,
        )
    }

    reporting?.let { id ->
        ReportDialog(
            send = { note -> model.report(id, note) },
            close = { reporting = null },
        )
    }
}

// region Composer

@Composable
private fun Composer(
    draft: String,
    canSend: Boolean,
    voice: VoiceState,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    onMicrophone: () -> Unit,
) {
    var composing by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth().background(Theme.paper)) {
        Hairline()
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            voice.notice?.let { notice ->
                SettingsNotice(
                    stringResource(if (notice == VoiceNotice.Denied) R.string.voice_denied else R.string.voice_unavailable),
                    modifier = Modifier.testTag("voice.notice"),
                    offersSettings = notice == VoiceNotice.Denied,
                )
            }
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                val shape = RoundedCornerShape(24.dp)
                val placeholder = if (voice.isListening) {
                    stringResource(R.string.voice_listening) + "…"
                } else {
                    stringResource(R.string.concierge_placeholder)
                }
                BasicTextField(
                    value = draft,
                    onValueChange = onDraft,
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 48.dp)
                        .background(Theme.card, shape)
                        .border(
                            BorderStroke(
                                1.dp,
                                if (composing || voice.isListening) Theme.accent.copy(alpha = 0.6f) else Theme.rule,
                            ),
                            shape,
                        )
                        .onFocusChanged { composing = it.isFocused }
                        .testTag("concierge.input")
                        .semantics { contentDescription = placeholder },
                    textStyle = AppFont.body.copy(color = Theme.ink),
                    cursorBrush = SolidColor(Theme.accent),
                    maxLines = 5,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Sentences,
                        imeAction = ImeAction.Default,
                    ),
                    decorationBox = { field ->
                        Box(
                            Modifier.padding(horizontal = 18.dp, vertical = 12.dp),
                            contentAlignment = Alignment.CenterStart,
                        ) {
                            if (draft.isEmpty()) {
                                Text(
                                    placeholder,
                                    modifier = Modifier.clearAndSetSemantics { },
                                    color = Theme.soft,
                                    style = AppFont.body,
                                    maxLines = 1,
                                )
                            }
                            field()
                        }
                    },
                )

                // Speak instead of type. While it listens, the button becomes
                // the concierge's orb, swelling with the guest's voice; a tap
                // stops it.
                val micLabel = stringResource(if (voice.isListening) R.string.voice_stop else R.string.voice_speak)
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .testTag("concierge.mic")
                        .semantics { contentDescription = micLabel }
                        .pressable(onClick = onMicrophone),
                    contentAlignment = Alignment.Center,
                ) {
                    if (voice.isListening) {
                        ConciergeMark(diameter = 46.dp, activity = OrbActivity.Listening, level = voice.level)
                        AppIcon(R.drawable.ic_stop, tint = Color.Black.copy(alpha = 0.7f), size = 16.dp)
                    } else {
                        Box(
                            Modifier.size(46.dp).border(BorderStroke(1.dp, Theme.rule), CircleShape),
                            contentAlignment = Alignment.Center,
                        ) { AppIcon(R.drawable.ic_mic) }
                    }
                }

                val sendLabel = stringResource(R.string.concierge_send)
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .testTag("concierge.send")
                        .semantics { contentDescription = sendLabel }
                        .pressable(enabled = canSend, onClick = onSend),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        Modifier
                            .size(46.dp)
                            .background(if (canSend) Theme.accent else Theme.card, CircleShape)
                            .border(BorderStroke(1.dp, if (canSend) Color.Transparent else Theme.rule), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) { AppIcon(R.drawable.ic_arrow_up, tint = if (canSend) Theme.onAccent else Theme.soft) }
                }
            }
        }
    }
}

// endregion

// region Empty conversation

@Composable
private fun ConciergeWelcome(listening: Boolean, level: Double, season: SeasonStore, ask: (String) -> Unit) {
    val starters = listOf(
        stringResource(R.string.concierge_starter_1),
        stringResource(R.string.concierge_starter_2),
        stringResource(R.string.concierge_starter_3),
    )
    Column(Modifier.fillMaxWidth()) {
        ConciergeMark(
            diameter = 68.dp,
            modifier = Modifier.padding(top = 28.dp, bottom = 30.dp).arrives(0),
            breathes = true,
            activity = if (listening) OrbActivity.Listening else OrbActivity.Resting,
            level = level,
        )
        Eyebrow("Miami Elio AI", modifier = Modifier.padding(bottom = 12.dp).arrives(1), color = Theme.accent)
        Text(
            stringResource(R.string.concierge_title),
            modifier = Modifier
                .padding(bottom = 28.dp)
                .testTag("concierge.title")
                .semantics { heading() }
                .arrives(2),
            color = Theme.ink,
            style = AppFont.hero,
        )
        // Ready-made requests, listed the way the site lists its sections:
        // one per line between hairlines.
        starters.forEachIndexed { index, prompt ->
            Hairline(Modifier.arrives(3 + index))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("concierge.starter")
                    .pressable { ask(prompt) }
                    .padding(vertical = 17.dp)
                    .arrives(3 + index),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Text(prompt, modifier = Modifier.weight(1f), color = Theme.ink, style = AppFont.rowTitle)
                AppIcon(R.drawable.ic_arrow_outward, tint = Theme.accent, size = 18.dp)
            }
        }
        Hairline(Modifier.arrives(3 + starters.size))

        // The weeks that sell out first, each a request and a reminder away.
        SeasonList(season = season, ask = ask, order = 4 + starters.size, modifier = Modifier.padding(top = 40.dp))
    }
}

// endregion

// region Conversation rows

@Composable
private fun ConciergeEntryView(
    entry: ConciergeEntry,
    isNewest: Boolean,
    canReport: Boolean,
    open: (String) -> Unit,
    openReference: (String) -> Unit,
    retry: () -> Unit,
    report: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (entry.kind) {
        ConciergeEntry.Kind.Guest -> Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            val shape = RoundedCornerShape(22.dp)
            SelectionContainer(Modifier.padding(start = 56.dp)) {
                Text(
                    entry.text,
                    modifier = Modifier
                        .testTag("concierge.guest")
                        .background(Theme.accentWash, shape)
                        .border(BorderStroke(1.dp, Theme.accent.copy(alpha = 0.4f)), shape)
                        .padding(horizontal = 17.dp, vertical = 12.dp),
                    color = Theme.ink,
                    style = AppFont.body,
                )
            }
        }

        // The concierge speaks in plain type beside its orb, like an editor's
        // reply, rather than from a second chat bubble.
        ConciergeEntry.Kind.Concierge -> Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ConciergeMark(diameter = 22.dp, modifier = Modifier.padding(top = 2.dp), glintsOnArrival = isNewest)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (entry.degraded) {
                    Row(
                        modifier = Modifier.testTag("concierge.unavailable"),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        AppIcon(R.drawable.ic_warning, tint = Theme.gold, size = 18.dp)
                        Text(stringResource(R.string.concierge_unavailable), color = Theme.gold, style = AppFont.detailMedium)
                    }
                }
                SelectionContainer {
                    Text(
                        formatted(entry.text, open),
                        modifier = Modifier.testTag("concierge.reply"),
                        color = Theme.ink,
                        style = AppFont.body,
                    )
                }
                entry.cards.forEach { card -> ConciergeCardView(card) { openReference(card.href) } }
                if (entry.suggestions.isNotEmpty()) {
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        entry.suggestions.forEach { link ->
                            Chip(link.label, modifier = Modifier.testTag("concierge.suggestion")) { openReference(link.href) }
                        }
                    }
                }
                if (entry.reported) {
                    Text(
                        stringResource(R.string.report_sent),
                        modifier = Modifier.testTag("concierge.reported"),
                        color = Theme.soft,
                        style = AppFont.detail,
                    )
                } else if (canReport && !entry.degraded) {
                    Row(
                        modifier = Modifier
                            .testTag("concierge.report")
                            .pressable(onClick = report)
                            .heightIn(min = 44.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        AppIcon(R.drawable.ic_flag, size = 16.dp)
                        Text(stringResource(R.string.concierge_report), color = Theme.soft, style = AppFont.detail)
                    }
                }
            }
        }

        ConciergeEntry.Kind.Failed -> {
            val shape = RoundedCornerShape(16.dp)
            Row(
                modifier = modifier
                    .fillMaxWidth()
                    .testTag("concierge.failed")
                    .background(Theme.card, shape)
                    .border(BorderStroke(1.dp, Theme.rule), shape)
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                AppIcon(R.drawable.ic_warning, size = 18.dp)
                Text(
                    stringResource(R.string.error_generic),
                    modifier = Modifier.weight(1f),
                    color = Theme.soft,
                    style = AppFont.detail,
                )
                Text(
                    stringResource(R.string.action_retry),
                    modifier = Modifier
                        .testTag("concierge.retry")
                        .pressable(onClick = retry)
                        .padding(vertical = 14.dp),
                    color = Theme.accent,
                    style = AppFont.detailMedium,
                )
            }
        }
    }
}

/** A section of the site the concierge is pointing to. */
@Composable
private fun ConciergeCardView(card: ConciergeCard, action: () -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("concierge.card")
            .background(Theme.card, shape)
            .border(BorderStroke(1.dp, Theme.rule), shape)
            .pressable(onClick = action)
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(card.title, color = Theme.ink, style = AppFont.cardTitle)
        card.summary?.let { Text(it, color = Theme.soft, style = AppFont.detail) }
        Row(
            modifier = Modifier.padding(top = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Eyebrow(card.cta ?: stringResource(R.string.concierge_open), color = Theme.accent)
            AppIcon(R.drawable.ic_arrow_forward, tint = Theme.accent, size = 14.dp)
        }
    }
}

/**
 * A reply on its way: the orb turns a light across itself, where three dots
 * used to blink.
 */
@Composable
private fun TypingIndicator(modifier: Modifier = Modifier) {
    val loading = stringResource(R.string.state_loading)
    Row(modifier.fillMaxWidth().testTag("concierge.typing").clearAndSetSemantics { contentDescription = loading }) {
        ConciergeMark(diameter = 28.dp, activity = OrbActivity.Thinking)
    }
}

// endregion

/** Flags one answer for the team, without leaving the conversation. */
@Composable
private fun ReportDialog(send: suspend (String) -> Boolean, close: () -> Unit) {
    var note by rememberSaveable { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!sending) close() },
        modifier = Modifier.testTag("report.dialog"),
        containerColor = Theme.card,
        titleContentColor = Theme.ink,
        textContentColor = Theme.soft,
        title = { Text(stringResource(R.string.concierge_report), style = AppFont.cardTitle) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it.take(1000) },
                    modifier = Modifier.fillMaxWidth().testTag("report.note"),
                    label = { Text(stringResource(R.string.report_prompt), style = AppFont.detail) },
                    textStyle = AppFont.body,
                    minLines = 2,
                    maxLines = 5,
                    enabled = !sending,
                )
                if (failed) {
                    Text(
                        stringResource(R.string.plan_failed),
                        modifier = Modifier.testTag("report.failed"),
                        color = Theme.accent,
                        style = AppFont.detail,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    sending = true
                    failed = false
                    scope.launch {
                        val sent = send(note)
                        sending = false
                        if (sent) close() else failed = true
                    }
                },
                modifier = Modifier.testTag("report.send"),
                enabled = !sending,
            ) {
                Text(
                    stringResource(if (sending) R.string.plan_sending else R.string.report_send),
                    style = AppFont.button,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = close, enabled = !sending) {
                Text(stringResource(R.string.action_cancel), color = Theme.soft, style = AppFont.button)
            }
        },
    )
}

/**
 * Replies sometimes carry light Markdown (bold, italics, links); show it as
 * formatting rather than asterisks. Anything that does not parse stays as
 * the plain text it was. Links follow the same rules as every other link.
 */
internal fun formatted(text: String, open: (String) -> Unit): AnnotatedString = buildAnnotatedString {
    val pattern = Regex("""\*\*(.+?)\*\*|\[([^\]\n]+)]\(([^)\s]+)\)|(?<![*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*\w])""")
    var cursor = 0
    for (match in pattern.findAll(text)) {
        append(text.substring(cursor, match.range.first))
        val (bold, label, target, italic) = match.destructured
        when {
            bold.isNotEmpty() -> withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(bold) }
            label.isNotEmpty() -> withLink(
                LinkAnnotation.Clickable(
                    tag = target,
                    styles = TextLinkStyles(SpanStyle(color = Theme.accent, textDecoration = TextDecoration.Underline)),
                ) { open(target) },
            ) { append(label) }
            else -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(italic) }
        }
        cursor = match.range.last + 1
    }
    append(text.substring(cursor))
}
