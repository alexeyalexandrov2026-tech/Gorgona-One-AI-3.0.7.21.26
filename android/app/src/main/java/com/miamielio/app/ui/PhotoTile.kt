package com.miamielio.app.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage

/**
 * A photograph in a frame, with its name at the foot: the look of the
 * Catalog's sections, which the menu shares. The foot of the picture darkens
 * so the name stays legible over any photograph.
 */
@Composable
internal fun PhotoTile(
    title: String,
    /** A drawable, or the address of a picture. */
    photo: Any?,
    /** Width over height. */
    proportion: Float,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    titleStyle: TextStyle = AppFont.cardTitle,
    /** The app's own photo, shown while [photo] arrives and if it never does. */
    @DrawableRes fallback: Int? = null,
) {
    Box(
        modifier
            .fillMaxWidth()
            .aspectRatio(proportion)
            .clip(TileShape)
            .background(Theme.card)
            .border(1.dp, Color.White.copy(alpha = 0.08f), TileShape)
            .pressable(onClick = onClick),
    ) {
        // Loaded at the tile's size, off the main thread: several photographs
        // decoded whole would cost the first frame and a good deal of memory.
        val stand = fallback?.let { painterResource(it) }
        AsyncImage(
            model = photo ?: fallback,
            contentDescription = null,
            modifier = Modifier.matchParentSize(),
            placeholder = stand,
            error = stand,
            fallback = stand,
            contentScale = ContentScale.Crop,
        )
        Box(Modifier.matchParentSize().background(Foot))
        Text(
            text = title,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            color = Color.White,
            style = titleStyle.copy(shadow = TitleShadow),
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private val TileShape = RoundedCornerShape(20.dp)
private val Foot = Brush.verticalGradient(0.3f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.78f))
private val TitleShadow = Shadow(Color.Black.copy(alpha = 0.45f), Offset(0f, 2f), blurRadius = 16f)
