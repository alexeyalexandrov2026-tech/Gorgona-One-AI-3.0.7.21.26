package com.miamielio.app.today

import androidx.compose.animation.core.withInfiniteAnimationFrameMillis
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.miamielio.app.R
import com.miamielio.app.app.LIVE_MANAGER_URL
import com.miamielio.app.concierge.ConciergeViewModel
import com.miamielio.app.concierge.rememberDictation
import com.miamielio.app.core.Season
import com.miamielio.app.season.SeasonReminders
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.LocalReduceMotion
import com.miamielio.app.ui.MenuButton
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark
import com.miamielio.app.ui.filled
import com.miamielio.app.ui.pressable
import kotlinx.coroutines.delay
import java.time.Instant

/** The dark text the site puts on its pink "Ask" button. */
private val AskInk = Color(0xFF2A1218)

/** Translucent dark pills over the photo, as on the site's hero. */
private val Smoke = Color(0x8C1C2229)

/**
 * The home screen: the website's AI concierge hero, drawn by the app so it
 * opens at once and without a connection. A question asked here goes to the
 * concierge tab, which answers it ([onAsked] brings that tab forward).
 */
@Composable
internal fun TodayScreen(
    model: ConciergeViewModel,
    season: SeasonReminders?,
    onAsked: () -> Unit,
    onOpen: (String) -> Unit,
    onEvents: () -> Unit,
    onMenu: () -> Unit,
    modifier: Modifier = Modifier,
    now: () -> Instant = Instant::now,
) {
    val state by model.state.collectAsStateWithLifecycle()
    val busy = state.isSending
    var query by rememberSaveable { mutableStateOf("") }
    val asked by rememberUpdatedState(onAsked)

    fun ask(text: String) {
        val question = text.trim()
        if (question.isEmpty() || model.state.value.isSending) return
        model.send(question)
        query = ""
        asked()
    }

    val next = remember(season) { season?.let { Season.upcoming(it.events, now()).firstOrNull() } }

    Column(
        modifier
            .fillMaxSize()
            .background(Theme.paper)
            .verticalScroll(rememberScrollState())
            .testTag("content.Today"),
    ) {
        Header(onMenu = onMenu, onManager = { onOpen(LIVE_MANAGER_URL) })
        Hero(
            query = query,
            onQuery = { query = it },
            busy = busy,
            onAsk = ::ask,
            speechLanguage = model::speechLanguage,
            now = now,
        )
        if (next != null) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .pressable(onClick = onEvents)
                    .padding(horizontal = 24.dp, vertical = 18.dp)
                    .testTag("today.nextEvent"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(painterResource(R.drawable.ic_tab_events), null, Modifier.size(20.dp), tint = Theme.goldText)
                Text(
                    stringResource(R.string.home_next_event).filled("name" to next.name),
                    Modifier.weight(1f),
                    color = Theme.ink,
                    style = AppFont.detailMedium,
                )
                ForwardArrow(Theme.goldText)
            }
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun Header(onMenu: () -> Unit, onManager: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .heightIn(min = 64.dp)
            // The menu's button is 48 dp wide around a 24 dp icon, so 8 dp in
            // puts the icon on the 20 dp edge the wordmark stood on.
            .padding(start = 8.dp, end = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MenuButton(onMenu)
        Spacer(Modifier.width(4.dp))
        Wordmark(size = 26f)
        Spacer(Modifier.weight(1f))
        Row(
            Modifier
                .clip(CircleShape)
                .border(1.dp, Theme.goldLine, CircleShape)
                .pressable(onClick = onManager)
                .padding(horizontal = 14.dp, vertical = 9.dp)
                .testTag("today.manager"),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(painterResource(R.drawable.ic_telegram), stringResource(R.string.concierge_live_manager), Modifier.size(18.dp), tint = Theme.goldText)
            Text(stringResource(R.string.concierge_manager), color = Theme.goldLight, style = AppFont.detailMedium)
        }
    }
}

@Composable
private fun Hero(
    query: String,
    onQuery: (String) -> Unit,
    busy: Boolean,
    onAsk: (String) -> Unit,
    speechLanguage: () -> String,
    now: () -> Instant,
) {
    val shape = RoundedCornerShape(28.dp)
    Box(
        Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth()
            .heightIn(min = 560.dp)
            .clip(shape),
    ) {
        Image(
            painter = painterResource(R.drawable.hero_tower),
            contentDescription = null,
            modifier = Modifier.matchParentSize(),
            contentScale = ContentScale.Crop,
            alignment = BiasAlignment(0f, 0.1f),
        )
        Box(
            Modifier
                .matchParentSize()
                .background(Brush.verticalGradient(0.35f to Color.Transparent, 1f to Theme.paper.copy(alpha = 0.55f))),
        )
        Column(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(start = 12.dp, end = 12.dp, top = 240.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Chips(busy, onAsk)
            Glass(query, onQuery, busy, onAsk, speechLanguage)
            ClockPill(now)
        }
    }
}

@Composable
private fun Chips(busy: Boolean, onAsk: (String) -> Unit) {
    Row(
        Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        CHIPS.forEach { id ->
            val text = stringResource(id)
            Row(
                Modifier
                    .clip(CircleShape)
                    .background(Smoke)
                    .border(1.dp, Color.White.copy(alpha = 0.14f), CircleShape)
                    .pressable(enabled = !busy) { onAsk(text) }
                    .padding(horizontal = 14.dp, vertical = 10.dp)
                    .testTag("today.chip"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(painterResource(R.drawable.ic_spark), null, Modifier.size(14.dp), tint = Theme.goldLight)
                Text(text, color = Color.White, style = AppFont.detailMedium, maxLines = 1)
            }
        }
    }
}

@Composable
private fun Glass(
    query: String,
    onQuery: (String) -> Unit,
    busy: Boolean,
    onAsk: (String) -> Unit,
    speechLanguage: () -> String,
) {
    val shape = RoundedCornerShape(22.dp)
    val label = stringResource(R.string.home_concierge_label)
    val prompts = PROMPTS.map { stringResource(it) }
    val reduceMotion = LocalReduceMotion.current
    var focused by remember { mutableStateOf(false) }
    val showGhost = query.isEmpty() && !focused && !reduceMotion
    val ghost by produceState(initialValue = "", showGhost, prompts) {
        if (!showGhost) return@produceState
        val start = withInfiniteAnimationFrameMillis { it }
        while (true) {
            withInfiniteAnimationFrameMillis { frame ->
                val text = ghostText(prompts, frame - start)
                if (text != value) value = text
            }
        }
    }
    val voice = rememberDictation(query, speechLanguage, onQuery, busy)

    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Theme.paper.copy(alpha = 0.82f))
            .border(1.dp, Theme.goldLine, shape)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ConciergeMark(diameter = 24.dp)
            Text(
                label.uppercase(),
                modifier = Modifier.semantics { heading() },
                color = Theme.goldText,
                style = AppFont.eyebrow.copy(fontSize = 13.sp, letterSpacing = 2.6.sp, fontWeight = FontWeight.Medium),
                maxLines = 2,
            )
        }
        voice.feedback()
        BasicTextField(
            value = query,
            onValueChange = onQuery,
            enabled = !busy,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .onFocusChanged { focused = it.isFocused }
                .semantics { contentDescription = label }
                .testTag("today.input"),
            textStyle = AppFont.body.copy(color = Theme.ink, fontSize = 19.sp),
            cursorBrush = SolidColor(Theme.accent),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences, imeAction = ImeAction.Send),
            keyboardActions = KeyboardActions(onSend = {
                voice.cancel()
                onAsk(query)
            }),
            maxLines = 4,
            decorationBox = { field ->
                Box {
                    if (query.isEmpty()) {
                        val hint = if (showGhost) ghost else prompts.firstOrNull().orEmpty()
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(hint, color = Theme.soft, style = AppFont.body.copy(fontSize = 19.sp))
                            if (showGhost) Box(Modifier.width(2.dp).height(22.dp).background(Theme.accent))
                        }
                    }
                    field()
                }
            },
        )
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.testTag("today.mic")) { voice.button(!busy) }
            val canAsk = !busy && query.isNotBlank()
            Row(
                Modifier
                    .clip(CircleShape)
                    .background(if (canAsk) Theme.accent else Theme.accent.copy(alpha = 0.45f))
                    .pressable(enabled = canAsk) {
                        voice.cancel()
                        onAsk(query)
                    }
                    .padding(horizontal = 22.dp, vertical = 13.dp)
                    .testTag("today.ask"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(stringResource(R.string.home_ask), color = AskInk, style = AppFont.bodyMedium)
                ForwardArrow(AskInk)
            }
        }
        Hairline()
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PICKS.forEach { pick ->
                val question = stringResource(pick.ask)
                Row(
                    Modifier
                        .clip(CircleShape)
                        .border(1.dp, Theme.rule, CircleShape)
                        .pressable(enabled = !busy) { onAsk(question) }
                        .padding(horizontal = 14.dp, vertical = 10.dp)
                        .testTag("today.pick"),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(painterResource(pick.icon), null, Modifier.size(18.dp), tint = Theme.goldLight)
                    Text(stringResource(pick.label), color = Theme.ink, style = AppFont.detailMedium, maxLines = 1)
                }
            }
        }
    }
}

@Composable
private fun ClockPill(now: () -> Instant) {
    val locale = LocalConfiguration.current.locales[0]
    val beach = stringResource(R.string.home_beach)
    // Wakes when the minute turns, not on every frame: the pill shows no seconds.
    val clock by produceState(initialValue = miamiClock(now(), locale), locale) {
        while (true) {
            delay(untilNextMinute(now()))
            value = miamiClock(now(), locale)
        }
    }
    Row(
        Modifier
            .clip(CircleShape)
            .background(Smoke)
            .padding(horizontal = 14.dp, vertical = 8.dp)
            .testTag("today.clock"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(Color(0xFF3CCF8E)))
        Text("${beach.uppercase()} · $clock", color = Theme.ink, style = AppFont.eyebrow)
    }
}

/** The drawable mirrors itself for right-to-left languages. */
@Composable
private fun ForwardArrow(tint: Color) {
    Icon(painterResource(R.drawable.ic_arrow_forward), contentDescription = null, modifier = Modifier.size(16.dp), tint = tint)
}
