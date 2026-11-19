package com.miamielio.app.today

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.animation.core.withInfiniteAnimationFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.lerp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.currentStateAsState
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.core.ShowcaseCategory
import com.miamielio.app.core.ShowcaseCorner
import com.miamielio.app.core.ShowcaseEnter
import com.miamielio.app.core.ShowcaseExit
import com.miamielio.app.core.ShowcaseFeed
import com.miamielio.app.core.ShowcaseItem
import com.miamielio.app.core.ShowcaseState
import com.miamielio.app.core.ShowcaseStep
import com.miamielio.app.core.nextShowcaseStep
import com.miamielio.app.core.stillShowcaseStep
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.LocalReduceMotion
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.filled
import kotlin.math.max

private val ENTER_EASING = CubicBezierEasing(0.2f, 0.7f, 0.2f, 1f)
private val EXIT_EASING = CubicBezierEasing(0.6f, 0f, 0.6f, 1f)
private const val ENTER_MILLIS = 900
private const val EXIT_MILLIS = 700

/** The card's width: readable on a 360 dp phone, where the site's 60 % would not be. */
internal val SHOWCASE_CARD_WIDTH = 148.dp

/**
 * The website's floating showcase (`HeroShowcase.jsx`): one card at a time,
 * hung in a top corner of the hero, a car, then a yacht, a villa, a jet or
 * tickets, each staying [ShowcaseFeed.intervalMillis] and changing corner and
 * entrance each time, as `nextShowcaseStep` decides. Its time stops while it
 * is held and while the app is not in front. With animations removed the
 * first card stands still. Without cards there is nothing at all. A tap
 * opens the card's page.
 */
@Composable
internal fun BoxScope.HeroShowcase(
    feed: ShowcaseFeed,
    onOpen: (String) -> Unit,
    random: () -> Double = kotlin.random.Random::nextDouble,
) {
    val items = feed.items
    if (items.isEmpty()) return
    val reduceMotion = LocalReduceMotion.current
    val lifecycle by LocalLifecycleOwner.current.lifecycle.currentStateAsState()
    val press = remember { MutableInteractionSource() }
    val pressed by press.collectIsPressedAsState()
    val waiting by rememberUpdatedState(pressed || !lifecycle.isAtLeast(Lifecycle.State.RESUMED))

    var step by remember(items, reduceMotion) {
        mutableStateOf(if (reduceMotion) stillShowcaseStep(items) else null)
    }
    val enter = remember(items, reduceMotion) { Animatable(if (reduceMotion) 1f else 0f) }
    val exit = remember(items, reduceMotion) { Animatable(0f) }
    var shown by remember(items) { mutableFloatStateOf(0f) }

    LaunchedEffect(items, reduceMotion, feed.intervalMillis) {
        if (reduceMotion) return@LaunchedEffect
        var state = ShowcaseState()
        while (true) {
            val next = nextShowcaseStep(items, state, random) ?: return@LaunchedEffect
            state = next.state
            step = next
            shown = 0f
            exit.snapTo(0f)
            enter.snapTo(0f)
            enter.animateTo(1f, tween(ENTER_MILLIS, easing = ENTER_EASING))
            // The card's time runs only while nobody holds it and the app is in front; no catching up.
            var elapsed = 0L
            // Frames of an endless cycle: tests and "remove animations" settings can tell them from real work.
            var last = withInfiniteAnimationFrameMillis { it }
            while (elapsed < feed.intervalMillis) {
                val now = withInfiniteAnimationFrameMillis { it }
                if (!waiting) elapsed += (now - last).coerceIn(0L, 100L)
                last = now
                shown = elapsed.toFloat() / feed.intervalMillis
            }
            exit.animateTo(1f, tween(EXIT_MILLIS, easing = EXIT_EASING))
        }
    }

    val current = step ?: return
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val density = LocalDensity.current
    Box(
        Modifier
            .align(if (current.corner == ShowcaseCorner.TopStart) Alignment.TopStart else Alignment.TopEnd)
            .padding(top = 14.dp, start = 10.dp, end = 10.dp)
            .graphicsLayer {
                val motion = motionOf(current, enter.value, exit.value, rtl)
                alpha = motion.alpha
                translationX = with(density) { motion.x.dp.toPx() }
                translationY = with(density) { motion.y.dp.toPx() }
                scaleX = motion.scale
                scaleY = motion.scale
                rotationZ = motion.rotation
                // It hangs from its hole: the top centre, 15 dp down.
                transformOrigin = TransformOrigin(0.5f, with(density) { 15.dp.toPx() } / max(size.height, 1f))
            }
            .testTag("showcase"),
    ) {
        ShowcaseCard(
            item = current.item,
            // Read while drawing, not composing: the line moves every frame, the card need not be rebuilt.
            shown = if (reduceMotion) null else ({ shown }),
            interaction = press,
            onClick = { onOpen(current.item.href) },
        )
    }
}

/** Where the card is in its entrance ([enter] 0 → 1) or its exit ([exit] 0 → 1). */
private class Motion(val alpha: Float, val x: Float, val y: Float, val scale: Float, val rotation: Float)

private fun motionOf(step: ShowcaseStep, enter: Float, exit: Float, rtl: Boolean): Motion {
    // The start side is the left in left-to-right languages and the right in the others.
    val mirror = if (rtl) -1f else 1f
    val rest = step.rotation * mirror
    if (exit > 0f) {
        var x = 0f
        var y = 0f
        var scale = 1f
        when (step.exit) {
            ShowcaseExit.Up -> y = -22f * exit
            ShowcaseExit.Down -> y = 26f * exit
            ShowcaseExit.Fade -> scale = lerp(1f, 0.92f, exit)
            ShowcaseExit.ToStart -> x = -40f * exit * mirror
            ShowcaseExit.ToEnd -> x = 40f * exit * mirror
        }
        return Motion(1f - exit, x, y, scale, rest)
    }
    return when (step.enter) {
        ShowcaseEnter.Swing -> {
            // 0 %: +14°, 45 %: −5°, 70 %: +2.5°, 100 %: at rest; it drops in from 26 dp above.
            val drop = (enter / 0.45f).coerceAtMost(1f)
            val swing = when {
                enter < 0.45f -> lerp(14f, -5f, enter / 0.45f)
                enter < 0.7f -> lerp(-5f, 2.5f, (enter - 0.45f) / 0.25f)
                else -> lerp(2.5f, 0f, (enter - 0.7f) / 0.3f)
            }
            Motion(drop, 0f, -26f * (1f - drop), 1f, rest + swing * mirror)
        }
        ShowcaseEnter.Rise -> Motion(enter, 0f, 34f * (1f - enter), 1f, rest)
        ShowcaseEnter.Focus -> Motion(enter, 0f, 0f, lerp(0.86f, 1f, enter), rest)
        ShowcaseEnter.SlideFromStart -> Motion(enter, -46f * (1f - enter) * mirror, 0f, 1f, rest)
        ShowcaseEnter.SlideFromEnd -> Motion(enter, 46f * (1f - enter) * mirror, 0f, 1f, rest)
    }
}

/** The eyebrow, its aside, the name and the call to action of a card, as `present()` in `HeroShowcase.jsx` words them. */
internal class ShowcaseWords(val eyebrow: String, val aside: String, val title: String, val action: String)

private val PER_DAY_ALREADY = Regex("""\bday\b""", RegexOption.IGNORE_CASE)

@Composable
internal fun wordsFor(item: ShowcaseItem): ShowcaseWords = when (item.category) {
    ShowcaseCategory.Car -> {
        val price = ShowcaseItem.price(item.price)
        ShowcaseWords(
            eyebrow = stringResource(R.string.showcase_car),
            aside = item.company ?: stringResource(R.string.showcase_fleet),
            title = item.title,
            action = when {
                price == null -> stringResource(R.string.showcase_rates)
                PER_DAY_ALREADY.containsMatchIn(price) -> price
                else -> stringResource(R.string.showcase_per_day).filled("price" to price)
            },
        )
    }
    ShowcaseCategory.Yacht -> ShowcaseWords(
        eyebrow = stringResource(R.string.showcase_yacht),
        aside = item.length ?: item.company.orEmpty(),
        title = item.title,
        action = stringResource(R.string.showcase_charter),
    )
    ShowcaseCategory.Stay -> ShowcaseWords(
        eyebrow = stringResource(R.string.showcase_stay),
        aside = item.bedrooms?.let { stringResource(R.string.showcase_bedrooms).filled("n" to it.toString()) }.orEmpty(),
        title = item.title,
        action = stringResource(R.string.showcase_nightly),
    )
    ShowcaseCategory.Jet -> ShowcaseWords(
        eyebrow = stringResource(R.string.showcase_jet),
        aside = stringResource(R.string.showcase_any_route),
        title = stringResource(R.string.section_private_jets),
        action = stringResource(R.string.showcase_flights),
    )
    ShowcaseCategory.Event -> ShowcaseWords(
        eyebrow = stringResource(R.string.showcase_tickets),
        aside = item.kicker.orEmpty(),
        title = item.kicker ?: item.title,
        action = stringResource(R.string.showcase_tickets_cta),
    )
}

/**
 * One card: the photograph, the kind and its aside, the name, and what to do
 * next, with a thin line along the foot that fills as the card's time runs
 * ([shown], 0..1; none when it stands still).
 */
@Composable
internal fun ShowcaseCard(
    item: ShowcaseItem,
    shown: (() -> Float)?,
    interaction: MutableInteractionSource,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val words = wordsFor(item)
    val shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp, bottomEnd = 22.dp, bottomStart = 22.dp)
    val description = listOf(words.eyebrow, words.aside, words.title, words.action)
        .filter(String::isNotBlank)
        .distinct()
        .joinToString(", ")
    Box(
        modifier
            .width(SHOWCASE_CARD_WIDTH)
            .shadow(14.dp, shape, ambientColor = Theme.paper, spotColor = Theme.paper)
            .clip(shape)
            .background(Theme.card)
            .border(1.dp, Theme.goldLine, shape)
            .clickable(interactionSource = interaction, indication = null, onClick = onClick)
            .clearAndSetSemantics {
                contentDescription = description
                role = Role.Button
                onClick {
                    onClick()
                    true
                }
            },
    ) {
        Column(Modifier.padding(start = 12.dp, end = 12.dp, top = 26.dp, bottom = 11.dp)) {
            AsyncImage(
                model = item.image,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(3f / 2f)
                    .clip(RoundedCornerShape(9.dp))
                    .background(Theme.rule),
                contentScale = ContentScale.Crop,
            )
            Spacer(Modifier.height(9.dp))
            Text(
                text = eyebrow(words.eyebrow, words.aside),
                color = Theme.goldLight,
                style = AppFont.eyebrow.copy(fontSize = 9.5.sp, letterSpacing = 1.2.sp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = words.title,
                color = Theme.ink,
                style = AppFont.cardTitle.copy(fontSize = 16.sp, lineHeight = 19.sp),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(8.dp))
            Row(
                Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        drawLine(
                            color = Theme.rule,
                            start = Offset(0f, 0f),
                            end = Offset(size.width, 0f),
                            strokeWidth = 1.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx())),
                        )
                    }
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = words.action,
                    modifier = Modifier.weight(1f),
                    color = Theme.accent,
                    style = AppFont.detailMedium.copy(fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                // The drawable mirrors itself for right-to-left languages.
                Icon(painterResource(R.drawable.ic_arrow_forward), null, Modifier.size(13.dp), tint = Theme.accent)
            }
        }
        // The hole it hangs by.
        Box(
            Modifier
                .align(Alignment.TopCenter)
                .offset(y = 9.dp)
                .size(12.dp)
                .clip(CircleShape)
                .background(Theme.paper)
                .border(1.dp, Theme.goldLine, CircleShape),
        )
        if (shown != null) {
            val line = Brush.horizontalGradient(listOf(Theme.goldText, Theme.accent))
            Box(
                Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(2.dp)
                    .drawBehind {
                        val width = size.width * shown().coerceIn(0f, 1f)
                        // From the start side: the right in right-to-left languages.
                        val left = if (layoutDirection == LayoutDirection.Rtl) size.width - width else 0f
                        drawRect(line, topLeft = Offset(left, 0f), size = Size(width, size.height))
                    },
            )
        }
    }
}

private fun eyebrow(label: String, aside: String): AnnotatedString = buildAnnotatedString {
    append(label.uppercase())
    if (aside.isNotBlank()) {
        append("  ·  ")
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(aside.uppercase()) }
    }
}
