package com.miamielio.app.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.annotation.DrawableRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.favorites.FavoritesStore

/** One of the app's line icons. Decorative unless it is given a description. */
@Composable
fun AppIcon(
    @DrawableRes id: Int,
    modifier: Modifier = Modifier,
    tint: Color = Theme.soft,
    size: Dp = 20.dp,
    description: String? = null,
) {
    Icon(
        painter = painterResource(id),
        contentDescription = description,
        modifier = modifier.size(size),
        tint = tint,
    )
}

/** The bar over a native screen: the wordmark, and what the screen adds on the far side. */
@Composable
fun TopBar(modifier: Modifier = Modifier, actions: @Composable RowScope.() -> Unit = {}) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Theme.paper)
            .statusBarsPadding()
            .height(56.dp)
            .padding(horizontal = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Wordmark()
        Spacer(Modifier.weight(1f))
        actions()
    }
}

/**
 * Something is turned off for the app - notifications, the microphone -
 * and only the guest can turn it back on: say so, with the way to Settings.
 */
@Composable
fun SettingsNotice(text: String, modifier: Modifier = Modifier, offersSettings: Boolean = true) {
    val context = LocalContext.current
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Theme.card, shape)
            .border(BorderStroke(1.dp, Theme.rule), shape)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(text, modifier = Modifier.weight(1f), color = Theme.soft, style = AppFont.detail)
        if (offersSettings) {
            Text(
                stringResource(R.string.action_settings),
                modifier = Modifier
                    .testTag("notice.settings")
                    .pressable { openAppSettings(context) }
                    .padding(vertical = 10.dp),
                color = Theme.accent,
                style = AppFont.detailMedium,
            )
        }
    }
}

/** The app's own page in the phone's Settings. */
fun openAppSettings(context: Context) {
    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
        context.startActivity(intent)
    } catch (_: Exception) {
    }
}

/** The heart beside a yacht, villa, car or restaurant. */
@Composable
fun FavoriteHeart(favorite: FavoriteRef, favorites: FavoritesStore, modifier: Modifier = Modifier) {
    val keys by favorites.keys.collectAsState()
    val saved = favorite.key in keys
    val label = stringResource(if (saved) R.string.favorite_remove else R.string.favorite_save)
    Box(
        modifier = modifier
            .size(48.dp)
            .testTag("favorite.heart")
            .semantics {
                contentDescription = label
                selected = saved
            }
            .pressable(role = Role.Checkbox) { favorites.toggle(favorite) },
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(
            if (saved) R.drawable.ic_heart_filled else R.drawable.ic_heart,
            tint = if (saved) Theme.accent else Theme.soft,
            size = 22.dp,
        )
    }
}

/** A catalogue photograph from the site, cropped to its frame; a quiet block until it arrives. */
@Composable
fun RemotePhoto(url: String?, modifier: Modifier = Modifier, corner: Dp = 14.dp) {
    val shape = RoundedCornerShape(corner)
    Box(modifier.clip(shape).background(Theme.card), contentAlignment = Alignment.Center) {
        AppIcon(R.drawable.ic_photo, tint = Theme.rule, size = 22.dp)
        if (url != null) {
            AsyncImage(
                model = url,
                contentDescription = null,
                modifier = Modifier.matchParentSize(),
                contentScale = ContentScale.Crop,
            )
        }
    }
}

/** A pill with a hairline border: a suggestion, a way back. */
@Composable
fun Chip(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(50)
    Text(
        text,
        modifier = modifier
            .clip(shape)
            .border(BorderStroke(1.dp, Theme.rule), shape)
            .pressable(onClick = onClick)
            .padding(horizontal = 15.dp, vertical = 11.dp),
        color = Theme.ink,
        style = AppFont.detailMedium,
    )
}

/** Space between things laid out in a row. */
@Composable
fun Gap(width: Dp) = Spacer(Modifier.width(width))
