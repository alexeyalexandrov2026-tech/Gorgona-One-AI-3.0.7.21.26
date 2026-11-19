package com.miamielio.app.favorites

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.miamielio.app.R
import com.miamielio.app.ui.Ocean
import com.miamielio.app.ui.Theme

/** A separate action from opening the listing, with its own accessible state. */
@Composable
internal fun FavoriteHeart(
    saved: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
    /** In a circle of glass over a photo or the sea, which turns to the sunset once saved. */
    glass: Boolean = false,
) {
    val haptics = LocalHapticFeedback.current
    IconButton(
        onClick = {
            onToggle()
            haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        },
        modifier = modifier
            .size(48.dp)
            .testTag("favorite.heart")
            .semantics { selected = saved },
    ) {
        val icon = painterResource(if (saved) R.drawable.ic_heart_filled else R.drawable.ic_heart)
        val label = stringResource(if (saved) R.string.favorite_remove else R.string.favorite_save)
        if (glass) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (saved) Ocean.sunset else SolidColor(Ocean.glassDark))
                    .then(if (saved) Modifier else Modifier.border(1.dp, Ocean.glassEdge, CircleShape)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(painter = icon, contentDescription = label, modifier = Modifier.size(19.dp), tint = Color.White)
            }
        } else {
            Icon(
                painter = icon,
                contentDescription = label,
                modifier = Modifier.size(21.dp),
                tint = if (saved) Theme.accent else Theme.soft,
            )
        }
    }
}
