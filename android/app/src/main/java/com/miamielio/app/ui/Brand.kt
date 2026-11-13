package com.miamielio.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.withInfiniteAnimationFrameNanos
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.max
import kotlin.math.sin

/**
 * "MIAMI Elio", set the way the website header sets it. [size] is the size
 * of "Elio"; "MIAMI" and the spacing keep their proportion to it. The
 * default is the top bar's.
 */
@Composable
fun Wordmark(modifier: Modifier = Modifier, size: Float = 26f) {
    // A fixed mark, not text to read: the top bar has no room for it to
    // grow, and the splash is composed around its size.
    val density = LocalDensity.current
    val capped = remember(density) { Density(density.density, density.fontScale.coerceAtMost(1.3f)) }
    // A logo, not a sentence: "MIAMI Elio" in that order in every language,
    // right-to-left ones included.
    CompositionLocalProvider(LocalDensity provides capped, LocalLayoutDirection provides LayoutDirection.Ltr) {
        Row(
            modifier = modifier.clearAndSetSemantics {
                contentDescription = "Miami Elio"
                heading()
            },
            horizontalArrangement = Arrangement.spacedBy((size * 7 / 26).dp),
        ) {
            Text(
                text = "MIAMI",
                modifier = Modifier.alignByBaseline(),
                color = Theme.accent,
                style = AppFont.mono(size * 11 / 26).copy(letterSpacing = (size * 3.3f / 26).sp),
            )
            Text(
                text = "Elio",
                modifier = Modifier.alignByBaseline(),
                color = Theme.ink,
                style = AppFont.wordmark(size),
            )
        }
    }
}

/** What the concierge is doing, as the orb shows it. */
enum class OrbActivity {
    Resting,

    /** The guest is speaking; `level` says how loudly. */
    Listening,

    /** A reply is on its way. */
    Thinking,
}

/**
 * The concierge's gold orb, as on the website. It shows what the concierge
 * is doing: at rest it only glows, while the guest speaks it swells with
 * their voice, while a reply is on its way a light turns across it, and a
 * reply arriving lights it for a moment. With animations removed nothing
 * moves or changes size; only the brightness changes.
 *
 * @param breathes a slow pulse of the glow, for the large orb on the welcome screen.
 * @param level how loud the guest is, 0..1, while the orb listens.
 * @param glintsOnArrival lights up once when it first appears: the orb
 *   beside a reply that has just arrived.
 */
@Composable
fun ConciergeMark(
    diameter: Dp,
    modifier: Modifier = Modifier,
    breathes: Boolean = false,
    activity: OrbActivity = OrbActivity.Resting,
    level: Double = 0.0,
    glintsOnArrival: Boolean = false,
) {
    val reduceMotion = LocalReduceMotion.current
    val thinking = activity == OrbActivity.Thinking

    val loudness by animateFloatAsState(
        targetValue = if (activity == OrbActivity.Listening) level.coerceIn(0.0, 1.0).toFloat() else 0f,
        animationSpec = tween(120, easing = EaseOut),
        label = "loudness",
    )
    // How much of each state shows, so the orb eases from one to the next.
    val listeningShare by animateFloatAsState(
        if (activity == OrbActivity.Listening) 1f else 0f, tween(450, easing = EaseInOut), label = "listening",
    )
    val thinkingShare by animateFloatAsState(
        if (thinking) 1f else 0f, tween(450, easing = EaseInOut), label = "thinking",
    )

    val breath = if (breathes && !reduceMotion) {
        val transition = rememberInfiniteTransition(label = "breath")
        val value by transition.animateFloat(
            initialValue = 0f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(2800, easing = EaseInOut), RepeatMode.Reverse),
            label = "breath",
        )
        value
    } else {
        0f
    }

    // The clock only runs while there is something to draw from it.
    val seconds by produceState(initialValue = 0.0, thinking) {
        if (!thinking) {
            value = 0.0
            return@produceState
        }
        val start = withInfiniteAnimationFrameNanos { it }
        while (true) {
            withInfiniteAnimationFrameNanos { now -> value = (now - start) / 1e9 }
        }
    }

    val glint = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        if (glintsOnArrival) {
            glint.animateTo(1f, tween(150, easing = EaseOut))
            glint.animateTo(0f, tween(700, easing = EaseOut))
        }
    }

    Canvas(modifier = modifier.size(diameter)) {
        val across = size.minDimension
        val restingShare = (1f - listeningShare - thinkingShare).coerceIn(0f, 1f)

        // One turn of the light every 2.4 seconds; with animations removed,
        // a slow rise and fall of brightness instead.
        val turn = ((seconds % 2.4) / 2.4 * 360).toFloat()
        val pulse = ((sin(seconds * 2.6) + 1) / 2).toFloat()
        var brightness = glint.value * 0.28f
        if (reduceMotion) {
            brightness += loudness * 0.18f + thinkingShare * pulse * 0.14f
        }
        val swell = if (reduceMotion) 1f else 1f + loudness * 0.07f

        val glowScale = if (reduceMotion) {
            1.1f
        } else {
            restingShare * (0.95f + 0.35f * breath) + listeningShare * (1f + loudness * 0.6f) + thinkingShare * 1.15f
        }
        val glowOpacity = restingShare * (0.55f + 0.35f * breath) +
            listeningShare * (0.6f + loudness * 0.4f) + thinkingShare * 0.85f

        // The halo: a soft disc of gold that fades out past the orb's edge.
        val haloRadius = across / 2 * glowScale + across * 0.28f
        drawCircle(
            brush = Brush.radialGradient(
                0f to Theme.gold.copy(alpha = 0.45f * glowOpacity),
                0.45f to Theme.gold.copy(alpha = 0.34f * glowOpacity),
                1f to Theme.gold.copy(alpha = 0f),
                center = center,
                radius = haloRadius,
            ),
            radius = haloRadius,
            center = center,
        )

        // The orb itself, lit from the upper left.
        val radius = across / 2 * swell
        val lit = Offset(center.x - radius + 2 * radius * 0.34f, center.y - radius + 2 * radius * 0.28f)
        drawCircle(
            brush = Brush.radialGradient(
                0.05f to Theme.goldLight,
                0.52f to Theme.gold,
                1f to Theme.goldDeep,
                center = lit,
                radius = 2 * radius * 0.78f,
            ),
            radius = radius,
            center = center,
        )

        if (thinkingShare > 0f && !reduceMotion) {
            rotate(degrees = turn, pivot = center) {
                drawCircle(
                    brush = Brush.sweepGradient(
                        0f to Theme.goldLight.copy(alpha = 0f),
                        1f / 3 to Theme.goldLight.copy(alpha = 0.8f * thinkingShare),
                        2f / 3 to Theme.goldLight.copy(alpha = 0f),
                        1f to Theme.goldLight.copy(alpha = 0f),
                        center = center,
                    ),
                    radius = radius,
                    center = center,
                    blendMode = BlendMode.Screen,
                )
            }
        }

        val rim = max(0.5.dp.toPx(), across / 64)
        drawCircle(
            color = Theme.goldLight.copy(alpha = 0.35f),
            radius = radius - rim / 2,
            center = center,
            style = Stroke(width = rim),
        )

        if (brightness > 0f) {
            drawCircle(color = Color.White.copy(alpha = brightness.coerceIn(0f, 1f)), radius = radius, center = center)
        }
    }
}

/** A hairline, as the site draws between rows. */
@Composable
fun Hairline(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(Theme.rule),
    )
}
