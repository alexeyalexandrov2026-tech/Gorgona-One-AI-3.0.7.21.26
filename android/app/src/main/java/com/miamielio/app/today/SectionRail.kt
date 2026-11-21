package com.miamielio.app.today

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.animation.core.withInfiniteAnimationFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.text.InlineTextContent
import androidx.compose.foundation.text.appendInlineContent
import androidx.compose.ui.text.Placeholder
import androidx.compose.ui.text.PlaceholderVerticalAlign
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.currentStateAsState
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.core.HomeSection
import com.miamielio.app.core.HomeSections
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.LocalReduceMotion
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.pressable

/** The site's `RAIL_SPEED_PX_PER_S`, in dp. */
private const val DRIFT_DP_PER_SECOND = 25f

/** How long the rail waits after the guest's finger before it drifts again. */
internal const val RAIL_HOLD_AFTER_TOUCH_MILLIS = 6_000L

private val TILE_WIDTH = 148.dp

/** Room for two lines of a name under the AI tile's orb. */
private val TILE_HEIGHT = 96.dp
private val TILE_GAP = 10.dp
private const val ARROW = "arrow"

/**
 * The site's section rail (`HomeSectionRail.jsx`): the ten sections of
 * [HomeSections] as photo tiles drifting slowly sideways without end, the
 * way they do under the home page's header. It stops while paused, while
 * the app is not in front, while the guest drags it and for six seconds after
 * any touch; with animations removed it does not drift at all and has no
 * pause button. [onSection] takes a tile to its section (see `SECTION_MENU`).
 * [resolve] turns a picture's site path into its address.
 */
@Composable
internal fun SectionRail(
    onSection: (HomeSection) -> Unit,
    resolve: (String) -> String?,
    modifier: Modifier = Modifier,
    now: () -> Long = System::currentTimeMillis,
) {
    val reduceMotion = LocalReduceMotion.current
    val lifecycle by LocalLifecycleOwner.current.lifecycle.currentStateAsState()
    var paused by rememberSaveable { mutableStateOf(false) }
    var touchedAt by remember { mutableLongStateOf(Long.MIN_VALUE / 2) }
    val scroll = rememberScrollState()
    val density = LocalDensity.current
    val oneCopy = with(density) { ((TILE_WIDTH + TILE_GAP) * HomeSections.all.size).toPx() }
    val held by rememberUpdatedState(paused || !lifecycle.isAtLeast(Lifecycle.State.RESUMED))
    val clock by rememberUpdatedState(now)

    LaunchedEffect(reduceMotion) {
        if (reduceMotion) return@LaunchedEffect
        val speed = with(density) { DRIFT_DP_PER_SECOND.dp.toPx() } / 1000f
        // Frames of an endless motion: tests and "remove animations" settings can tell them from real work.
        var last = withInfiniteAnimationFrameMillis { it }
        var carry = 0f
        while (true) {
            val frame = withInfiniteAnimationFrameMillis { it }
            // A frame that comes late (the app was away) moves no further than a tenth of a second would.
            val dt = (frame - last).coerceIn(0L, 100L)
            last = frame
            val touched = clock() - touchedAt < RAIL_HOLD_AFTER_TOUCH_MILLIS
            if (held || touched || scroll.isScrollInProgress) continue
            carry += speed * dt
            if (carry < 1f) continue
            val step = carry.toInt().toFloat()
            carry -= step
            scroll.dispatchRawDelta(step)
            // The second copy is the first again: past it, step back by one copy and nobody sees the seam.
            if (scroll.value >= oneCopy) scroll.dispatchRawDelta(-oneCopy)
        }
    }

    Row(
        modifier
            .fillMaxWidth()
            .padding(start = 12.dp, end = 12.dp)
            .testTag("rail"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(
            Modifier
                .weight(1f)
                .clip(RoundedCornerShape(14.dp))
                .pointerInput(Unit) {
                    // Every touch, a tap included, holds the drift; the touch itself goes on to the tile.
                    awaitPointerEventScope {
                        while (true) {
                            awaitPointerEvent(PointerEventPass.Initial)
                            touchedAt = clock()
                        }
                    }
                }
                .horizontalScroll(scroll)
                .padding(4.dp)
                .testTag("rail.track"),
            horizontalArrangement = Arrangement.spacedBy(TILE_GAP),
        ) {
            HomeSections.all.forEach { section ->
                SectionTile(section, resolve, onClick = { onSection(section) }, Modifier.testTag("rail.tile.${section.id}"))
            }
            if (!reduceMotion) {
                // The copy that makes the loop: there to be seen, not to be read out twice.
                HomeSections.all.forEach { section ->
                    SectionTile(section, resolve, onClick = { onSection(section) }, Modifier.clearAndSetSemantics { })
                }
            }
        }
        if (!reduceMotion) {
            PauseButton(paused = paused, onToggle = { paused = !paused })
        }
    }
}

@Composable
private fun SectionTile(section: HomeSection, resolve: (String) -> String?, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(14.dp)
    val concierge = section.image == null
    val image = section.image?.let(resolve)
    Box(
        modifier
            .width(TILE_WIDTH)
            // One height for all, so a name on two lines ("Exclusive Destinations") does not stand out.
            .height(TILE_HEIGHT)
            .clip(shape)
            .background(
                if (concierge) {
                    Brush.radialGradient(0f to Color(0xFF2E2A20), 0.55f to Color(0xFF14232C), 1f to Color(0xFF0A1218))
                } else {
                    Brush.verticalGradient(listOf(Color(0xFF15242D), Color(0xFF15242D)))
                },
            )
            .then(if (concierge) Modifier.border(1.dp, Color(0xFF3B4144), shape) else Modifier)
            .pressable(onClick = onClick),
    ) {
        if (image != null) {
            AsyncImage(
                model = image,
                contentDescription = null,
                modifier = Modifier.matchParentSize(),
                contentScale = ContentScale.Crop,
            )
            // The foot of the picture darkens so the name stays legible.
            Box(
                Modifier
                    .matchParentSize()
                    .background(Brush.verticalGradient(0f to Color(0x14050E15), 0.14f to Color(0x14050E15), 1f to Color(0xF0050E15))),
            )
        }
        if (concierge) {
            ConciergeMark(30.dp, Modifier.align(Alignment.TopCenter).padding(top = 8.dp), breathes = true)
        }
        // The arrow follows the last word, as on the site, so a long word ("Эксклюзивные") keeps the
        // whole width of the tile instead of breaking in the middle.
        Text(
            text = buildAnnotatedString {
                append(stringResource(section.label))
                append(" ")
                appendInlineContent(ARROW, "→")
            },
            inlineContent = mapOf(
                ARROW to InlineTextContent(Placeholder(16.sp, 16.sp, PlaceholderVerticalAlign.TextCenter)) {
                    // The drawable mirrors itself for right-to-left languages.
                    Icon(painterResource(R.drawable.ic_arrow_forward), null, Modifier.fillMaxSize(), tint = Color.White)
                },
            ),
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(start = 12.dp, end = 10.dp, bottom = 10.dp),
            color = if (concierge) Color(0xFFFFF8E2) else Color.White,
            style = AppFont.detailMedium.copy(fontSize = 15.sp, fontWeight = FontWeight.SemiBold),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun PauseButton(paused: Boolean, onToggle: () -> Unit) {
    val label = stringResource(if (paused) R.string.rail_play else R.string.rail_pause)
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    Box(
        Modifier
            .size(48.dp)
            .pressable(onClick = onToggle)
            .semantics { contentDescription = label }
            .testTag("rail.pause"),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(Theme.card)
                .border(1.dp, Theme.goldLine, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(Modifier.size(14.dp)) {
                val ink = Theme.goldLight
                if (paused) {
                    // A play triangle, pointing the way the rail drifts.
                    val path = Path().apply {
                        if (rtl) {
                            moveTo(size.width * 0.85f, 0f)
                            lineTo(size.width * 0.85f, size.height)
                            lineTo(size.width * 0.1f, size.height / 2)
                        } else {
                            moveTo(size.width * 0.15f, 0f)
                            lineTo(size.width * 0.15f, size.height)
                            lineTo(size.width * 0.9f, size.height / 2)
                        }
                        close()
                    }
                    drawPath(path, ink)
                } else {
                    val bar = size.width * 0.28f
                    drawRect(ink, Offset(size.width * 0.12f, 0f), Size(bar, size.height))
                    drawRect(ink, Offset(size.width * 0.88f - bar, 0f), Size(bar, size.height))
                }
            }
        }
    }
}
