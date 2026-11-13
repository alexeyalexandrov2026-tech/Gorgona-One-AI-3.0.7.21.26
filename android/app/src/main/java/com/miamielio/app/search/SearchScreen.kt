package com.miamielio.app.search

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.core.SearchResult
import com.miamielio.app.favorites.FavoriteHeart
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark
import com.miamielio.app.ui.arrives
import com.miamielio.app.ui.pressable
import com.miamielio.app.ui.rememberKeyboardDismissal
import kotlin.math.min

/**
 * Native search over the Miami Elio inventory. Until something is typed it
 * is a front door to the main sections, in photographs; anything chosen
 * opens in Home through [onOpen]. Mirrors the iPhone app's `SearchView`.
 */
@Composable
internal fun SearchScreen(
    model: SearchViewModel,
    favorites: FavoritesStore,
    onOpen: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by model.state.collectAsStateWithLifecycle()
    val savedKeys by favorites.keys.collectAsStateWithLifecycle()
    val open by rememberUpdatedState(onOpen)
    val focus = LocalFocusManager.current

    Column(
        modifier
            .fillMaxSize()
            .background(Theme.paper),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp),
        ) {
            Box(
                Modifier
                    .heightIn(min = 56.dp)
                    .padding(start = 4.dp),
                contentAlignment = Alignment.CenterStart,
            ) { Wordmark(size = 22f) }
            SearchField(
                query = state.query,
                onQuery = model::setQuery,
                onSearch = {
                    focus.clearFocus()
                    model.retry()
                },
                onCancel = {
                    model.setQuery("")
                    focus.clearFocus()
                },
            )
        }
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .nestedScroll(rememberKeyboardDismissal())
                .testTag("search.content"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 24.dp),
        ) {
            when (val phase = state.phase) {
                SearchPhase.Idle -> item(key = "worlds") { WorldGrid(open = { open(it) }) }
                SearchPhase.Searching -> item(key = "searching") { Loading() }
                is SearchPhase.Results -> itemsIndexed(phase.results, key = { index, result -> "$index ${result.href}" }) { index, result ->
                    ResultRow(
                        result = result,
                        imageUrl = model.imageUrl(result),
                        onClick = { open(result.href) },
                        favorite = remember(result) { FavoriteRef.of(result) },
                        savedKeys = savedKeys,
                        toggleFavorite = favorites::toggle,
                        // Only the first screenful arrives in turn; rows further
                        // down are already there by the time they scroll in.
                        modifier = Modifier.arrives(min(index, 7)),
                    )
                }
                SearchPhase.Empty -> item(key = "empty") {
                    Message(R.drawable.ic_tab_search, stringResource(R.string.search_empty))
                }
                SearchPhase.Failed -> item(key = "failed") {
                    Message(R.drawable.ic_warning, stringResource(R.string.error_generic), onRetry = model::retry)
                }
                SearchPhase.Offline -> item(key = "offline") {
                    Message(
                        R.drawable.ic_offline,
                        stringResource(R.string.offline_title),
                        detail = stringResource(R.string.offline_message),
                        onRetry = model::retry,
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchField(query: String, onQuery: (String) -> Unit, onSearch: () -> Unit, onCancel: () -> Unit) {
    val placeholder = stringResource(R.string.tab_search)
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(14.dp)
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        BasicTextField(
            value = query,
            onValueChange = onQuery,
            modifier = Modifier
                .weight(1f)
                .onFocusChanged { focused = it.isFocused }
                .semantics { contentDescription = placeholder }
                .testTag("search.input"),
            textStyle = AppFont.body.copy(color = Theme.ink),
            cursorBrush = SolidColor(Theme.accent),
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.None,
                autoCorrectEnabled = false,
                imeAction = ImeAction.Search,
            ),
            keyboardActions = KeyboardActions(onSearch = { onSearch() }),
            decorationBox = { field ->
                Row(
                    Modifier
                        .clip(shape)
                        .background(Theme.card)
                        .border(1.dp, if (focused) Theme.accent.copy(alpha = 0.6f) else Theme.rule, shape)
                        .heightIn(min = 46.dp)
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        painter = painterResource(R.drawable.ic_tab_search),
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = Theme.soft,
                    )
                    Spacer(Modifier.width(10.dp))
                    Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                        if (query.isEmpty()) Text(placeholder, color = Theme.soft, style = AppFont.body, maxLines = 1)
                        field()
                    }
                }
            },
        )
        // As on the iPhone: while searching, a way back to the sections.
        if (focused || query.isNotEmpty()) {
            Text(
                text = stringResource(R.string.action_cancel),
                modifier = Modifier
                    .pressable(onClick = onCancel)
                    .padding(vertical = 8.dp)
                    .testTag("search.cancel"),
                color = Theme.accent,
                style = AppFont.detailMedium,
            )
        }
    }
}

// region Sections

private data class World(@param:StringRes val title: Int, @param:DrawableRes val photo: Int, val path: String)

private enum class TileFormat(val proportion: Float) {
    /** Full width, the lead picture. */
    Wide(1.5f),

    /** Half width. */
    Tall(0.9f),

    /** Full width and shallow, to close the page. */
    Banner(2.1f),
}

/** One wide picture, three pairs, one shallow one: a magazine spread rather than a grid of equal boxes. */
@Composable
private fun WorldGrid(open: (String) -> Unit) {
    val gap = 12.dp
    Column(verticalArrangement = Arrangement.spacedBy(gap)) {
        Eyebrow(
            stringResource(R.string.search_popular),
            Modifier
                .padding(bottom = 4.dp)
                .arrives(0)
                .semantics { heading() },
        )
        WorldTile(World(R.string.world_cars, R.drawable.world_cars, "/rentals"), TileFormat.Wide, open, Modifier.arrives(1))
        listOf(
            World(R.string.world_yachts, R.drawable.world_yachts, "/yachts") to
                World(R.string.world_villas, R.drawable.world_villas, "/vacation-rentals"),
            World(R.string.world_events, R.drawable.world_events, "/events") to
                World(R.string.world_dining, R.drawable.world_dining, "/restaurants-nightlife"),
            World(R.string.world_experiences, R.drawable.world_experiences, "/experiences") to
                World(R.string.world_travel, R.drawable.world_travel, "/travel"),
        ).forEachIndexed { index, (first, second) ->
            Row(Modifier.arrives(2 + index), horizontalArrangement = Arrangement.spacedBy(gap)) {
                WorldTile(first, TileFormat.Tall, open, Modifier.weight(1f))
                WorldTile(second, TileFormat.Tall, open, Modifier.weight(1f))
            }
        }
        WorldTile(World(R.string.world_jets, R.drawable.world_jets, "/private-jets"), TileFormat.Banner, open, Modifier.arrives(5))
    }
}

@Composable
private fun WorldTile(world: World, format: TileFormat, open: (String) -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(20.dp)
    Box(
        modifier
            .fillMaxWidth()
            .aspectRatio(format.proportion)
            .clip(shape)
            .background(Theme.card)
            .border(1.dp, Color.White.copy(alpha = 0.08f), shape)
            .pressable { open(world.path) }
            .testTag("world.${world.path}"),
    ) {
        // Loaded at the tile's size, off the main thread: eight photographs
        // decoded whole would cost the first frame and a good deal of memory.
        AsyncImage(
            model = world.photo,
            contentDescription = null,
            modifier = Modifier.matchParentSize(),
            contentScale = ContentScale.Crop,
        )
        // The foot of the picture darkens so the name stays legible.
        Box(
            Modifier
                .matchParentSize()
                .background(Brush.verticalGradient(0.3f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.78f))),
        )
        Text(
            text = stringResource(world.title),
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            color = Color.White,
            style = (if (format == TileFormat.Tall) AppFont.cardTitle else AppFont.title)
                .copy(shadow = Shadow(Color.Black.copy(alpha = 0.45f), Offset(0f, 2f), blurRadius = 16f)),
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// endregion

// region Results

@Composable
private fun ResultRow(
    result: SearchResult,
    imageUrl: String?,
    onClick: () -> Unit,
    favorite: FavoriteRef?,
    savedKeys: Set<String>,
    toggleFavorite: (FavoriteRef) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .pressable(onClick = onClick)
                    .padding(top = 14.dp, bottom = 14.dp, end = if (favorite != null) 4.dp else 0.dp)
                    .testTag("search.result"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(if (favorite != null) 12.dp else 16.dp),
            ) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .size(width = 92.dp, height = 76.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Theme.card),
                    contentScale = ContentScale.Crop,
                )
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(result.title, color = Theme.ink, style = AppFont.rowTitle, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    if (result.detailLine.isNotEmpty()) {
                        Text(result.detailLine, color = Theme.soft, style = AppFont.detail, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                    result.price?.let { Text(it, color = Theme.accent, style = AppFont.detailMedium) }
                }
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_forward),
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = Theme.soft,
                )
            }
            if (favorite != null) FavoriteHeart(saved = favorite.key in savedKeys, onToggle = { toggleFavorite(favorite) })
        }
        Hairline()
    }
}

@Composable
private fun Loading() {
    val loading = stringResource(R.string.state_loading)
    Box(
        Modifier
            .fillMaxWidth()
            .padding(top = 56.dp),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(
            modifier = Modifier
                .size(28.dp)
                .semantics { contentDescription = loading }
                .testTag("search.loading"),
            color = Theme.soft,
            strokeWidth = 2.dp,
        )
    }
}

/** Nothing found, a failure or no connection; with a way to ask again where that helps. */
@Composable
private fun Message(@DrawableRes icon: Int, text: String, detail: String? = null, onRetry: (() -> Unit)? = null) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 56.dp)
            .testTag("search.message"),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(painter = painterResource(icon), contentDescription = null, modifier = Modifier.size(36.dp), tint = Theme.soft)
        Text(
            text,
            Modifier.semantics { heading() },
            color = if (detail != null) Theme.ink else Theme.soft,
            style = if (detail != null) AppFont.cardTitle else AppFont.body,
            textAlign = TextAlign.Center,
        )
        detail?.let { Text(it, color = Theme.soft, style = AppFont.detail, textAlign = TextAlign.Center) }
        onRetry?.let {
            Text(
                text = stringResource(R.string.action_retry),
                modifier = Modifier
                    .pressable(onClick = it)
                    .padding(8.dp)
                    .testTag("search.retry"),
                color = Theme.accent,
                style = AppFont.button,
            )
        }
    }
}

// endregion
