package com.miamielio.app.ui

import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp

/**
 * Content that arrives a beat after its screen does: it fades in while
 * settling upward, each piece a little later than the one above it, the
 * way the website brings in its sections. With animations removed, it only
 * fades. `order` is the piece's place in the sequence, counting from 0.
 */
fun Modifier.arrives(order: Int = 0): Modifier = composed {
    val reduceMotion = LocalReduceMotion.current
    var arrived by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { arrived = true }
    val progress by animateFloatAsState(
        targetValue = if (arrived) 1f else 0f,
        animationSpec = tween(durationMillis = 500, delayMillis = order * 70, easing = EaseOut),
        label = "arrival",
    )
    val rise = with(LocalDensity.current) { 16.dp.toPx() }
    graphicsLayer {
        alpha = progress
        translationY = if (reduceMotion) 0f else (1f - progress) * rise
    }
}

/**
 * Buttons that are pictures or rows: they dip slightly under the finger
 * instead of flashing.
 */
fun Modifier.dips(interactions: InteractionSource): Modifier = composed {
    val pressed by interactions.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.975f else 1f, tween(150, easing = EaseOut), label = "dip")
    val fade by animateFloatAsState(if (pressed) 0.85f else 1f, tween(150, easing = EaseOut), label = "dipFade")
    graphicsLayer {
        scaleX = scale
        scaleY = scale
        alpha = fade
    }
}

/** A tap target that dips when pressed. */
fun Modifier.pressable(
    enabled: Boolean = true,
    onClickLabel: String? = null,
    role: Role? = Role.Button,
    onClick: () -> Unit,
): Modifier = composed {
    val interactions = remember { MutableInteractionSource() }
    dips(interactions).clickable(
        interactionSource = interactions,
        indication = null,
        enabled = enabled,
        onClickLabel = onClickLabel,
        role = role,
        onClick = onClick,
    )
}
