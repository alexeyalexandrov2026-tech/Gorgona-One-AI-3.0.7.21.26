package com.miamielio.app.ui

import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import com.miamielio.app.R
import kotlin.math.max

/**
 * The look of the app's own screens, Today included: the deep sea of the
 * brand art behind frosted glass, edged in pearl, aqua and champagne, with
 * icons on the colours of a Miami sunset.
 */
object Ocean {
    /** The deepest water of the brand art, under everything else. */
    val deep = Color(0xFF01212C)

    /** The ground of the bar and of anything that must not let the sea through. */
    val night = Color(0xFF01161E)

    val pearl = Color(0xFFF4F1EA)
    val aqua = Color(0xFF7FD6D0)

    /** Champagne, light to deep, for the date, the eyebrow and the main action. */
    val champagne = Brush.linearGradient(listOf(Color(0xFFFBF0D4), Color(0xFFE6C88E), Color(0xFFC9A45C)))
    val champagneMid = Color(0xFFE6C88E)
    val champagneInk = Color(0xFF1B1404)

    /** Champagne running into aqua: the icon in a field of glass. */
    val champagneAqua = Brush.linearGradient(listOf(Color(0xFFF6E4B8), Color(0xFFBFE6DC), aqua))

    /** The edge of frosted glass: pearl, a breath of aqua, champagne. */
    val glassEdge = Brush.linearGradient(
        listOf(Color.White.copy(alpha = 0.45f), aqua.copy(alpha = 0.12f), champagneMid.copy(alpha = 0.55f)),
    )

    /** Frosted glass over the sea: lighter at the top, deeper below. */
    val glass = Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.10f), Color(0x8C011A22)))

    /** The sunset that marks what is chosen or switched on: amber, the brand's pink, violet. */
    val sunset = Brush.linearGradient(listOf(Color(0xFFFFB36B), Color(0xFFFF6E93), Color(0xFFB76CFF)))

    /** An icon's circle when it is not chosen: a little white glass. */
    val idle = Color.White.copy(alpha = 0.14f)

    /** Dark glass for a small circle or tile laid over a photo or the sea. */
    val glassDark = Color(0x66011A22)

    /** Dark glass for a field or a bar that text is typed or read on. */
    val glassField = Color(0xB3011A22)

    /** What is laid over the sea so that text stays legible on it. */
    val veil = Brush.verticalGradient(listOf(Color(0xD901212C), Color(0xA601212C), Color(0xE6010F16)))

    /** A thinner veil for Today, where the cards carry their own glass: more of the sea shows. */
    val veilLight = Brush.verticalGradient(listOf(Color(0x9901212C), Color(0x5901212C), Color(0xA6010F16)))

    /** The tab bar and the strip above it: the sea a shade lighter than [night]. */
    val bar = Color(0xFF0C3440)
}

/**
 * The sea of the brand art behind a screen, cropped to fill it, under the
 * [Ocean.veil]. It is drawn behind, so the screen's own content stays as it is.
 */
fun Modifier.oceanBackground(veil: Brush = Ocean.veil): Modifier = composed {
    val sea = painterResource(R.drawable.splash_ocean)
    drawBehind {
        drawRect(Ocean.deep)
        val source = sea.intrinsicSize
        if (source.width > 0f && source.height > 0f) {
            val scale = max(size.width / source.width, size.height / source.height)
            val drawn = Size(source.width * scale, source.height * scale)
            translate((size.width - drawn.width) / 2f, (size.height - drawn.height) / 2f) {
                with(sea) { draw(drawn) }
            }
        }
        drawRect(veil)
    }
}

/** Paints what is drawn (an icon, a line) with [brush] instead of its own colour. */
fun Modifier.painted(brush: Brush): Modifier = this
    .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
    .drawWithContent {
        drawContent()
        drawRect(brush, blendMode = BlendMode.SrcIn)
    }
