package com.miamielio.app.favorites

import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.miamielio.app.R
import com.miamielio.app.ui.Theme

/** A separate action from opening the listing, with its own accessible state. */
@Composable
internal fun FavoriteHeart(saved: Boolean, onToggle: () -> Unit, modifier: Modifier = Modifier) {
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
        Icon(
            painter = painterResource(if (saved) R.drawable.ic_heart_filled else R.drawable.ic_heart),
            contentDescription = stringResource(if (saved) R.string.favorite_remove else R.string.favorite_save),
            modifier = Modifier.size(21.dp),
            tint = if (saved) Theme.accent else Theme.soft,
        )
    }
}
