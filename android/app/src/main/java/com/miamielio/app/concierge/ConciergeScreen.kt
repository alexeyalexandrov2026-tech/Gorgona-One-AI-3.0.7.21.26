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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.app.LIVE_MANAGER_URL
import com.miamielio.app.core.AnswerReport
import com.miamielio.app.core.ConciergeCard
import com.miamielio.app.core.ConciergeLink
import com.miamielio.app.core.ConciergeListing
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.LocalReduceMotion
import com.miamielio.app.ui.MenuButton
import com.miamielio.app.ui.Ocean
import com.miamielio.app.ui.OrbActivity
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark
import com.miamielio.app.ui.arrives
import com.miamielio.app.ui.oceanBackground
import com.miamielio.app.ui.painted
import com.miamielio.app.ui.pressable
import com.miamielio.app.ui.rememberKeyboardDismissal
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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
    onMenu: () -> Unit,
    modifier: Modifier = Modifier,
    voicePlayback: VoicePlayback? = null,
) {
    val state by model.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val player = voicePlayback ?: remember(context, model.ttsClient, scope) {
        AndroidVoicePlayer(context, model.ttsClient, scope)
    }
    val openPage by rememberUpdatedState(onOpen)
    val latestLiveVoice by rememberUpdatedState(state.liveVoice)
    val latestSending by rememberUpdatedState(state.isSending)
    val list = rememberLazyListState()
    val focus = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current
    val open: (String) -> Unit = { path ->
        focus.clearFocus()
        keyboard?.hide()
        openPage(path)
    }
    val haptics = LocalHapticFeedback.current
    val reduceMotion = LocalReduceMotion.current

    val voice = rememberDictation(
        draft = state.draft,
        language = model::speechLanguage,
        onDraft = model::setDraft,
        sending = state.isSending,
        liveVoice = state.liveVoice,
        onBeforeStart = { player.stop() },
        onLiveFinal = { spoken -> model.send(spoken, voiceMode = true) },
        onLiveSilentStop = { model.setLiveVoice(false) },
        onPermissionDenied = { model.setLiveVoice(false) },
    )

    LifecycleEventEffect(Lifecycle.Event.ON_PAUSE) {
        player.stop()
        model.setLiveVoice(false)
    }
    DisposableEffect(player, voicePlayback) {
        onDispose {
            if (voicePlayback == null) player.release() else player.stop()
        }
    }

    // Track the latest spoken entry so enabling Live Voice never replays older history.
    var lastSpokenId by remember { mutableStateOf<Long?>(null) }
    var wasLiveVoice by remember { mutableStateOf(false) }
    val newestEntry = state.entries.lastOrNull()
    LaunchedEffect(newestEntry?.id, state.isSending, state.liveVoice) {
        if (!state.liveVoice) {
            wasLiveVoice = false
            return@LaunchedEffect
        }
        if (!wasLiveVoice) {
            wasLiveVoice = true
            lastSpokenId = newestEntry?.id
            return@LaunchedEffect
        }
        if (state.isSending) return@LaunchedEffect
        val latest = newestEntry ?: return@LaunchedEffect
        if (latest.kind == ConciergeEntry.Kind.Concierge && !latest.degraded && latest.id != lastSpokenId) {
            lastSpokenId = latest.id
            voice.cancel()
            player.speak(latest.id, latest.text, latest.replyLocale ?: model.currentLocale()) {
                scope.launch {
                    delay(320)
                    if (latestLiveVoice && !latestSending && player.state == PlaybackState.Idle) {
                        voice.startListening()
                    }
                }
            }
        }
    }

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
            .oceanBackground(),
    ) {
        TopBar(
            canReset = state.entries.isNotEmpty(),
            onMenu = onMenu,
            onReset = {
                focus.clearFocus()
                player.stop()
                voice.cancel()
                lastSpokenId = null
                model.reset()
            },
            onManager = { open(LIVE_MANAGER_URL) },
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
            }
            items(state.entries, key = { it.id }) { entry ->
                val entryPlayback = if (player.speakingEntryId == entry.id) player.state else PlaybackState.Idle
                EntryRow(
                    entry = entry,
                    isNewest = entry.id == state.entries.last().id,
                    canReport = model.canReport,
                    playbackState = entryPlayback,
                    onToggleListen = {
                        if (entryPlayback != PlaybackState.Idle) {
                            player.stop()
                        } else {
                            voice.cancel()
                            player.speak(entry.id, entry.text, entry.replyLocale ?: model.currentLocale())
                        }
                    },
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
        if (state.liveVoice) {
            LiveVoiceBar(
                isListening = voice.isListening,
                level = voice.level,
                isSending = state.isSending,
                playbackState = player.state,
                onBargeIn = {
                    player.stop()
                    voice.startListening()
                },
                onStop = {
                    player.stop()
                    voice.cancel()
                    model.setLiveVoice(false)
                },
            )
        }
        Composer(
            suggestions = state.entries.lastOrNull()
                ?.takeIf { it.kind == ConciergeEntry.Kind.Concierge }
                ?.suggestions.orEmpty(),
            onOpen = { open(it) },
            draft = state.draft,
            canSend = state.canSend,
            onDraft = model::setDraft,
            onSend = {
                player.stop()
                model.send()
            },
            voice = voice,
            liveVoice = state.liveVoice,
            onToggleLiveVoice = {
                if (state.liveVoice) {
                    player.stop()
                    voice.cancel()
                    model.setLiveVoice(false)
                } else {
                    player.stop()
                    lastSpokenId = state.entries.lastOrNull()?.id
                    model.setLiveVoice(true)
                    voice.requestPermissionAndStart()
                }
            },
            readingReply = state.isSending,
        )
    }
}

@Composable
private fun TopBar(canReset: Boolean, onMenu: () -> Unit, onReset: () -> Unit, onManager: () -> Unit) {
    val managerLabel = stringResource(R.string.concierge_live_manager)
    Row(
        Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .heightIn(min = 60.dp)
            .padding(start = 4.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // The menu takes the orb's place here: the orb is already on the welcome
        // screen, beside every reply and in the bar, and the row has no room for both.
        MenuButton(onMenu)
        Spacer(Modifier.width(6.dp))
        Text(
            "Miami Elio AI",
            Modifier.weight(1f),
            color = Ocean.pearl,
            style = AppFont.bodyMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Row(
            Modifier
                .clip(CircleShape)
                .border(1.dp, Ocean.champagne, CircleShape)
                .pressable(onClick = onManager)
                .semantics { contentDescription = managerLabel }
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .testTag("concierge.manager"),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(painterResource(R.drawable.ic_telegram), null, Modifier.size(18.dp).painted(Ocean.champagne), tint = Color.White)
            Text(
                stringResource(R.string.concierge_manager),
                style = AppFont.detailMedium.copy(brush = Ocean.champagne),
                maxLines = 1,
            )
        }
        IconButton(onClick = onReset, enabled = canReset, modifier = Modifier.testTag("concierge.new")) {
            Icon(
                painter = painterResource(R.drawable.ic_new_conversation),
                contentDescription = stringResource(R.string.concierge_new),
                tint = if (canReset) Ocean.pearl else Ocean.pearl.copy(alpha = 0.35f),
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
            color = Ocean.champagneMid,
        )
        Text(
            text = stringResource(R.string.concierge_title),
            modifier = Modifier
                .padding(bottom = 28.dp)
                .arrives(2)
                .semantics { heading() }
                .testTag("concierge.title"),
            color = Ocean.pearl,
            style = AppFont.hero,
        )
        // Ready-made requests as gold pills, like the site's concierge.
        starters.forEachIndexed { index, prompt ->
            Row(
                Modifier
                    .padding(bottom = 10.dp)
                    .arrives(3 + index)
                    .clip(CircleShape)
                    .background(Ocean.glassDark)
                    .border(1.dp, Ocean.champagne, CircleShape)
                    .pressable { onAsk(prompt) }
                    .padding(horizontal = 18.dp, vertical = 13.dp)
                    .testTag("concierge.starter"),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(prompt, Modifier.weight(1f, fill = false), color = Ocean.pearl, style = AppFont.bodyMedium)
                Spacer(Modifier.width(8.dp))
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_up_forward),
                    contentDescription = null,
                    modifier = Modifier.size(18.dp).painted(Ocean.champagne),
                    tint = Color.White,
                )
            }
        }
    }
}

// endregion

// region Conversation rows

@Composable
private fun EntryRow(
    entry: ConciergeEntry,
    isNewest: Boolean,
    canReport: Boolean,
    playbackState: PlaybackState,
    onToggleListen: () -> Unit,
    onOpen: (String) -> Unit,
    onRetry: () -> Unit,
    onReport: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    when (entry.kind) {
        ConciergeEntry.Kind.Guest -> GuestRow(entry.text, modifier)
        ConciergeEntry.Kind.Concierge -> ReplyRow(entry, isNewest, canReport, playbackState, onToggleListen, onOpen, onRetry, onReport, modifier)
        ConciergeEntry.Kind.Failed -> FailedRow(onRetry, modifier)
    }
}

@Composable
private fun GuestRow(text: String, modifier: Modifier) {
    val shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp, bottomEnd = 6.dp, bottomStart = 20.dp)
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
                    .background(Ocean.sunset)
                    .padding(horizontal = 17.dp, vertical = 12.dp)
                    .testTag("concierge.guest"),
                color = Color.White,
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
    playbackState: PlaybackState,
    onToggleListen: () -> Unit,
    onOpen: (String) -> Unit,
    onRetry: () -> Unit,
    onReport: (String) -> Unit,
    modifier: Modifier,
) {
    val open by rememberUpdatedState(onOpen)
    val text = remember(entry.text) {
        ReplyText.annotated(
            entry.text,
            link = SpanStyle(color = Ocean.champagneMid, textDecoration = TextDecoration.Underline),
            onLink = { open(it) },
        )
    }
    val bubble = RoundedCornerShape(topStart = 6.dp, topEnd = 22.dp, bottomEnd = 22.dp, bottomStart = 22.dp)
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        ConciergeMark(diameter = 28.dp, modifier = Modifier.padding(top = 2.dp), glintsOnArrival = isNewest)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SelectionContainer {
                Text(
                    text,
                    Modifier
                        .clip(bubble)
                        .background(Ocean.glass)
                        .border(1.dp, Ocean.glassEdge, bubble)
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .testTag("concierge.reply"),
                    color = Ocean.pearl,
                    style = AppFont.body,
                )
            }
            // Real catalogue rows first, then the sections they belong to.
            entry.listings.forEach { listing -> ListingRow(listing) { open(listing.href) } }
            entry.cards.forEach { card -> CardView(card) { open(card.href) } }
            if (isNewest && entry.degraded) RetryAction(onRetry)
            if (!entry.degraded || canReport) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (!entry.degraded) ListenAction(playbackState, onToggleListen)
                    if (canReport) ReportAction(entry.report, onReport)
                }
            }
        }
    }
}

@Composable
private fun ListenAction(state: PlaybackState, onToggle: () -> Unit) {
    val active = state != PlaybackState.Idle
    val label = stringResource(
        when (state) {
            PlaybackState.Idle -> R.string.voice_listen
            PlaybackState.Loading -> R.string.voice_loading_audio
            PlaybackState.Speaking -> R.string.voice_stop_audio
        },
    )
    Row(
        modifier = Modifier
            .clip(CircleShape)
            .background(if (active) Ocean.glassDark else Color.Transparent)
            .border(1.dp, if (active) Ocean.champagne else SolidColor(Ocean.pearl.copy(alpha = 0.22f)), CircleShape)
            .pressable(role = Role.Button, onClick = onToggle)
            .padding(horizontal = 11.dp, vertical = 5.dp)
            .testTag("concierge.listen"),
        horizontalArrangement = Arrangement.spacedBy(5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            painter = painterResource(if (active) R.drawable.ic_stop else R.drawable.ic_volume),
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = if (active) Ocean.champagneMid else Ocean.pearl.copy(alpha = 0.78f),
        )
        Text(
            text = label,
            color = if (active) Ocean.champagneMid else Ocean.pearl.copy(alpha = 0.78f),
            style = AppFont.detailMedium,
        )
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
            .background(Ocean.glass)
            .border(1.dp, Ocean.glassEdge, shape)
            .pressable(onClick = onClick)
            .padding(18.dp)
            .testTag("concierge.card"),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(card.title, color = Ocean.pearl, style = AppFont.cardTitle)
        card.summary?.let { Text(it, color = Ocean.pearl.copy(alpha = 0.72f), style = AppFont.detail) }
        Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Eyebrow(card.cta ?: stringResource(R.string.concierge_open), color = Ocean.champagneMid)
            Spacer(Modifier.width(8.dp))
            Icon(
                painter = painterResource(R.drawable.ic_arrow_forward),
                contentDescription = null,
                modifier = Modifier.size(14.dp).painted(Ocean.champagne),
                tint = Color.White,
            )
        }
    }
}

/**
 * One yacht, villa, car or table the concierge found: photo, kind, name and
 * stored price, as the site's concierge shows them (`AiListingCards`).
 */
@Composable
private fun ListingRow(listing: ConciergeListing, onClick: () -> Unit) {
    val shape = RoundedCornerShape(18.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Ocean.glassDark)
            .border(1.dp, Ocean.glassEdge, shape)
            .pressable(onClick = onClick)
            .padding(10.dp)
            .testTag("concierge.listing"),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (listing.image != null) {
            AsyncImage(
                model = listing.image,
                contentDescription = null,
                modifier = Modifier
                    .size(width = 80.dp, height = 64.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Ocean.night),
                contentScale = ContentScale.Crop,
            )
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            listing.label?.let { Eyebrow(it, color = Ocean.aqua) }
            Text(listing.title, color = Ocean.pearl, style = AppFont.rowTitle)
            listing.price?.let { Text(it, style = AppFont.detailMedium.copy(brush = Ocean.champagne)) }
            listing.availabilityStatus?.let { status ->
                val available = status == "available"
                val tint = if (available) Ocean.aqua else Color(0xFFFF9B8A)
                Text(
                    text = stringResource(if (available) R.string.concierge_available_dates else R.string.concierge_busy_dates),
                    modifier = Modifier
                        .padding(top = 2.dp)
                        .clip(CircleShape)
                        .background(tint.copy(alpha = 0.14f))
                        .border(1.dp, tint.copy(alpha = 0.45f), CircleShape)
                        .padding(horizontal = 9.dp, vertical = 2.dp)
                        .testTag("concierge.listing.availability"),
                    color = tint,
                    style = AppFont.detailMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            val estimate = listOfNotNull(listing.estimatedTotal, listing.perGuest).joinToString(" · ")
            if (estimate.isNotEmpty()) {
                Text(
                    text = estimate,
                    modifier = Modifier.testTag("concierge.listing.estimate"),
                    color = Ocean.pearl.copy(alpha = 0.8f),
                    style = AppFont.detail,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Icon(
            painter = painterResource(R.drawable.ic_arrow_forward),
            contentDescription = null,
            modifier = Modifier.size(14.dp).painted(Ocean.champagne),
            tint = Color.White,
        )
    }
}

/** A compact way on, or back, under a reply or the plan. */
@Composable
internal fun Chip(label: String, onClick: () -> Unit) {
    Text(
        text = label,
        modifier = Modifier
            .clip(CircleShape)
            .border(1.dp, Ocean.champagne, CircleShape)
            .pressable(onClick = onClick)
            .padding(horizontal = 15.dp, vertical = 9.dp),
        style = AppFont.detailMedium.copy(brush = Ocean.champagne),
    )
}

@Composable
private fun FailedRow(onRetry: () -> Unit, modifier: Modifier) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Ocean.glass)
            .border(1.dp, Ocean.glassEdge, shape)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            painter = painterResource(R.drawable.ic_warning),
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = Ocean.aqua,
        )
        Text(stringResource(R.string.error_generic), Modifier.weight(1f), color = Ocean.pearl.copy(alpha = 0.8f), style = AppFont.detail)
        RetryAction(onRetry)
    }
}

@Composable
private fun RetryAction(onRetry: () -> Unit) {
    Text(
        text = stringResource(R.string.action_retry),
        modifier = Modifier
            .pressable(onClick = onRetry)
            .padding(vertical = 4.dp)
            .testTag("concierge.retry"),
        color = Ocean.champagneMid,
        style = AppFont.detailMedium,
    )
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
            color = Ocean.pearl.copy(alpha = 0.6f),
            style = AppFont.detail,
        )
    } else {
        Text(
            text = stringResource(R.string.concierge_report),
            modifier = Modifier
                .pressable(role = Role.Button) { asking = true }
                .padding(vertical = 4.dp)
                .testTag("concierge.report"),
            color = Ocean.pearl.copy(alpha = 0.6f),
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
                    Text(stringResource(R.string.error_generic), color = Theme.goldButton, style = AppFont.detail)
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
                            color = Theme.goldButton,
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
private fun LiveVoiceBar(
    isListening: Boolean,
    level: Double,
    isSending: Boolean,
    playbackState: PlaybackState,
    onBargeIn: () -> Unit,
    onStop: () -> Unit,
) {
    val canInterrupt = playbackState == PlaybackState.Speaking || playbackState == PlaybackState.Loading
    val label = stringResource(
        when {
            canInterrupt -> R.string.voice_live_speaking
            isSending -> R.string.voice_live_thinking
            isListening -> R.string.voice_live_listening
            else -> R.string.voice_live_ready
        },
    )
    val orbActivity = when {
        isSending -> OrbActivity.Thinking
        isListening -> OrbActivity.Listening
        else -> OrbActivity.Resting
    }
    val shape = RoundedCornerShape(18.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 4.dp)
            .clip(shape)
            .background(Ocean.glassField)
            .border(1.dp, Ocean.champagne, shape)
            .then(if (canInterrupt) Modifier.pressable(role = Role.Button, onClick = onBargeIn) else Modifier)
            .padding(horizontal = 14.dp, vertical = 8.dp)
            .semantics { liveRegion = LiveRegionMode.Polite }
            .testTag("concierge.liveVoiceBar"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        ConciergeMark(diameter = 20.dp, activity = orbActivity, level = level, breathes = canInterrupt)
        Text(
            text = label,
            modifier = Modifier.weight(1f),
            color = Ocean.pearl,
            style = AppFont.detailMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        val stopLabel = stringResource(R.string.voice_live_off)
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(CircleShape)
                .background(Ocean.glassDark)
                .pressable(role = Role.Button, onClick = onStop)
                .semantics { contentDescription = stopLabel }
                .testTag("concierge.liveVoiceStop"),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painter = painterResource(R.drawable.ic_close),
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = Ocean.pearl,
            )
        }
    }
}

@Composable
private fun Composer(
    suggestions: List<ConciergeLink>,
    onOpen: (String) -> Unit,
    draft: String,
    canSend: Boolean,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    voice: DictationControl,
    liveVoice: Boolean,
    onToggleLiveVoice: () -> Unit,
    readingReply: Boolean,
) {
    val placeholder = stringResource(R.string.concierge_placeholder)
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(24.dp)
    Column(Modifier.fillMaxWidth()) {
        // Where the conversation can go next, from the latest answer.
        if (suggestions.isNotEmpty()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(start = 14.dp, end = 14.dp, top = 10.dp)
                    .testTag("concierge.suggestions"),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                suggestions.forEach { link -> Chip(link.label) { onOpen(link.href) } }
            }
        }
        voice.feedback()
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
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
                textStyle = AppFont.body.copy(color = Ocean.pearl),
                cursorBrush = SolidColor(Ocean.aqua),
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
                            .background(Ocean.glassField)
                            .border(1.dp, if (focused) Ocean.champagne else Ocean.glassEdge, shape)
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        if (draft.isEmpty()) Text(placeholder, color = Ocean.pearl.copy(alpha = 0.55f), style = AppFont.body, maxLines = 1)
                        field()
                    }
                },
            )
            LiveVoiceButton(active = liveVoice, enabled = liveVoice || !readingReply, onClick = onToggleLiveVoice)
            voice.button(!readingReply)
            SendButton(enabled = canSend) {
                voice.cancel()
                onSend()
            }
        }
    }
}

@Composable
private fun LiveVoiceButton(active: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val label = stringResource(if (active) R.string.voice_live_off else R.string.voice_live_on)
    Box(
        Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(if (active) Ocean.sunset else SolidColor(Ocean.glassDark))
            .then(if (active) Modifier else Modifier.border(1.dp, Ocean.glassEdge, CircleShape))
            .pressable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label }
            .testTag("concierge.liveVoice"),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painter = painterResource(R.drawable.ic_live_voice),
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = if (active) Color.White else Ocean.pearl.copy(alpha = 0.85f),
        )
    }
}

/** "Ask": a circle of the sunset with an arrow, a little glass while there is nothing to send. */
@Composable
private fun SendButton(enabled: Boolean, onClick: () -> Unit) {
    val label = stringResource(R.string.concierge_send)
    Box(
        Modifier
            .size(46.dp)
            .clip(CircleShape)
            .background(if (enabled) Ocean.sunset else SolidColor(Ocean.glassDark))
            .then(if (enabled) Modifier else Modifier.border(1.dp, Ocean.glassEdge, CircleShape))
            .pressable(enabled = enabled, onClick = onClick)
            .semantics { contentDescription = label }
            .testTag("concierge.send"),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painter = painterResource(R.drawable.ic_arrow_up),
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = if (enabled) Color.White else Ocean.pearl.copy(alpha = 0.4f),
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
    focusedBorderColor = Theme.goldButton,
    unfocusedBorderColor = Theme.rule,
    focusedLabelColor = Theme.goldButton,
    unfocusedLabelColor = Theme.soft,
    focusedPlaceholderColor = Theme.soft,
    unfocusedPlaceholderColor = Theme.soft,
    cursorColor = Theme.goldButton,
)
