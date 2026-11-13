package com.miamielio.app.search

import androidx.annotation.DrawableRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.miamielio.app.R
import com.miamielio.app.app.AppRouter
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.core.SearchResult
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.AppIcon
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.FavoriteHeart
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.RemotePhoto
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.TopBar
import com.miamielio.app.ui.arrives
import com.miamielio.app.ui.pressable

/**
 * Native search over the Miami Elio inventory. Until something is typed it
 * is a front door to the main sections, in photographs.
 */
@Composable
fun SearchScreen(
    model: SearchViewModel,
    router: AppRouter,
    favorites: FavoritesStore,
    modifier: Modifier = Modifier,
) {
    val state by model.state.collectAsState()
    val focus = LocalFocusManager.current

    Column(modifier.fillMaxSize().background(Theme.paper)) {
        TopBar()
        SearchField(state.query, model::setQuery) { focus.clearFocus() }

        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth().testTag("search.list"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp),
        ) {
            when (val phase = state.phase) {
                SearchPhase.Idle -> item(key = "worlds") { WorldGrid(router::openReference) }

                SearchPhase.Searching -> item(key = "searching") {
                    val loading = stringResource(R.string.state_loading)
                    Box(Modifier.fillMaxWidth().padding(top = 56.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            modifier = Modifier
                                .size(28.dp)
                                .testTag("search.loading")
                                .semantics { contentDescription = loading },
                            color = Theme.soft,
                            strokeWidth = 2.dp,
                        )
                    }
                }

                is SearchPhase.Results -> itemsIndexed(phase.results, key = { _, result -> result.id }) { index, result ->
                    // Only the first screenful is staggered; rows further down
                    // are already there by the time they scroll in.
                    Column(Modifier.arrives(minOf(index, 7))) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            SearchResultRow(
                                result = result,
                                imageUrl = model.imageUrl(result),
                                modifier = Modifier.weight(1f).pressable { router.openReference(result.href) },
                            )
                            FavoriteRef.of(result)?.let { FavoriteHeart(it, favorites) }
                        }
                        Hairline()
                    }
                }

                SearchPhase.Empty -> item(key = "empty") {
                    SearchMessage(R.drawable.ic_search, stringResource(R.string.search_empty), "search.empty")
                }

                SearchPhase.Failed -> item(key = "failed") {
                    SearchMessage(R.drawable.ic_warning, stringResource(R.string.error_generic), "search.failed", model::retry)
                }

                SearchPhase.Offline -> item(key = "offline") {
                    SearchMessage(
                        R.drawable.ic_offline,
                        stringResource(R.string.offline_title),
                        "search.offline",
                        model::retry,
                        detail = stringResource(R.string.offline_message),
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchField(query: String, change: (String) -> Unit, done: () -> Unit) {
    val shape = RoundedCornerShape(24.dp)
    val label = stringResource(R.string.tab_search)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .heightIn(min = 48.dp)
            .background(Theme.card, shape)
            .border(BorderStroke(1.dp, Theme.rule), shape)
            .padding(start = 16.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        AppIcon(R.drawable.ic_search)
        BasicTextField(
            value = query,
            onValueChange = { change(it.replace("\n", " ")) },
            modifier = Modifier
                .weight(1f)
                .testTag("search.input")
                .semantics { contentDescription = label },
            textStyle = AppFont.body.copy(color = Theme.ink),
            cursorBrush = SolidColor(Theme.accent),
            singleLine = true,
            keyboardOptions = KeyboardOptions(autoCorrectEnabled = false, imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { done() }),
            decorationBox = { field ->
                Box(Modifier.padding(vertical = 12.dp), contentAlignment = Alignment.CenterStart) {
                    if (query.isEmpty()) {
                        Text(
                            label,
                            modifier = Modifier.clearAndSetSemantics { },
                            color = Theme.soft,
                            style = AppFont.body,
                            maxLines = 1,
                        )
                    }
                    field()
                }
            },
        )
        if (query.isNotEmpty()) {
            val clear = stringResource(R.string.action_cancel)
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .testTag("search.clear")
                    .semantics { contentDescription = clear }
                    .pressable { change("") },
                contentAlignment = Alignment.Center,
            ) { AppIcon(R.drawable.ic_close, size = 18.dp) }
        } else {
            Box(Modifier.size(48.dp))
        }
    }
}

// region Sections

private enum class TileFormat(val proportion: Float) {
    /** Full width, the lead picture. */
    Wide(1.5f),

    /** Half width. */
    Tall(0.9f),

    /** Full width and shallow, to close the page. */
    Banner(2.1f),
}

/**
 * One wide picture, three pairs, one wide picture: the rhythm of a magazine
 * spread rather than a grid of equal boxes. The paths are the site's own
 * routes (see `navItems` in Header.jsx).
 */
@Composable
private fun WorldGrid(open: (String) -> Unit) {
    val gap = 12.dp
    Column(verticalArrangement = Arrangement.spacedBy(gap)) {
        Eyebrow(stringResource(R.string.search_popular), modifier = Modifier.padding(bottom = 4.dp).arrives(0))
        WorldTile(R.string.world_cars, R.drawable.world_cars, "/rentals", TileFormat.Wide, open, Modifier.arrives(1))
        Row(Modifier.arrives(2), horizontalArrangement = Arrangement.spacedBy(gap)) {
            WorldTile(R.string.world_yachts, R.drawable.world_yachts, "/yachts", TileFormat.Tall, open, Modifier.weight(1f))
            WorldTile(R.string.world_villas, R.drawable.world_villas, "/vacation-rentals", TileFormat.Tall, open, Modifier.weight(1f))
        }
        Row(Modifier.arrives(3), horizontalArrangement = Arrangement.spacedBy(gap)) {
            WorldTile(R.string.world_events, R.drawable.world_events, "/events", TileFormat.Tall, open, Modifier.weight(1f))
            WorldTile(R.string.world_dining, R.drawable.world_dining, "/restaurants-nightlife", TileFormat.Tall, open, Modifier.weight(1f))
        }
        Row(Modifier.arrives(4), horizontalArrangement = Arrangement.spacedBy(gap)) {
            WorldTile(R.string.world_experiences, R.drawable.world_experiences, "/experiences", TileFormat.Tall, open, Modifier.weight(1f))
            WorldTile(R.string.world_travel, R.drawable.world_travel, "/travel", TileFormat.Tall, open, Modifier.weight(1f))
        }
        WorldTile(R.string.world_jets, R.drawable.world_jets, "/private-jets", TileFormat.Banner, open, Modifier.arrives(5))
    }
}

@Composable
private fun WorldTile(
    title: Int,
    @DrawableRes photo: Int,
    path: String,
    format: TileFormat,
    open: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val name = stringResource(title)
    val shape = RoundedCornerShape(20.dp)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(format.proportion)
            .testTag("world.$path")
            .clip(shape)
            .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)), shape)
            .clearAndSetSemantics { contentDescription = name }
            .pressable { open(path) },
    ) {
        Image(
            painter = painterResource(photo),
            contentDescription = null,
            modifier = Modifier.matchParentSize(),
            contentScale = ContentScale.Crop,
        )
        // Darken the foot of the picture so the name stays legible.
        Box(
            Modifier
                .matchParentSize()
                .background(Brush.verticalGradient(0.3f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.78f))),
        )
        val style = if (format == TileFormat.Tall) AppFont.cardTitle else AppFont.title
        Text(
            name,
            modifier = Modifier.align(Alignment.BottomStart).padding(horizontal = 16.dp, vertical = 14.dp),
            color = Color.White,
            style = style.copy(shadow = Shadow(Color.Black.copy(alpha = 0.45f), blurRadius = 8f)),
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// endregion

// region Results

@Composable
private fun SearchResultRow(result: SearchResult, imageUrl: String?, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.testTag("search.result").padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        RemotePhoto(imageUrl, Modifier.size(width = 92.dp, height = 76.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(result.title, color = Theme.ink, style = AppFont.rowTitle, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (result.detailLine.isNotEmpty()) {
                Text(result.detailLine, color = Theme.soft, style = AppFont.detail, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            result.price?.let { Text(it, color = Theme.accent, style = AppFont.detailMedium) }
        }
        AppIcon(R.drawable.ic_arrow_forward, size = 16.dp)
    }
}

@Composable
private fun SearchMessage(
    @DrawableRes icon: Int,
    text: String,
    tag: String,
    retry: (() -> Unit)? = null,
    detail: String? = null,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 56.dp).testTag(tag),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        AppIcon(icon, size = 32.dp)
        Text(text, color = Theme.soft, style = AppFont.body, textAlign = TextAlign.Center)
        if (detail != null) Text(detail, color = Theme.soft, style = AppFont.detail, textAlign = TextAlign.Center)
        if (retry != null) {
            Text(
                stringResource(R.string.action_retry),
                modifier = Modifier
                    .testTag("search.retry")
                    .pressable(onClick = retry)
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                color = Theme.accent,
                style = AppFont.button,
            )
        }
    }
}

// endregion
