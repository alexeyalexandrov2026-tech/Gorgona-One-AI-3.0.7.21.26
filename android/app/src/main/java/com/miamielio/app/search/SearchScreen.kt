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
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
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
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.core.SearchResult
import com.miamielio.app.favorites.FavoriteHeart
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.Eyebrow
import com.miamielio.app.ui.MenuButton
import com.miamielio.app.ui.Ocean
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark
import com.miamielio.app.ui.arrives
import com.miamielio.app.ui.oceanBackground
import com.miamielio.app.ui.painted
import com.miamielio.app.ui.pressable
import com.miamielio.app.ui.rememberKeyboardDismissal
import kotlin.math.min

/**
 * Native search over the Miami Elio inventory. Until something is typed it
 * is a front door to the main sections, in photographs; anything chosen
 * opens through [onOpen]. Mirrors the iPhone app's `SearchView`.
 */
@Composable
internal fun SearchScreen(
    model: SearchViewModel,
    favorites: FavoritesStore,
    onOpen: (String) -> Unit,
    onMenu: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by model.state.collectAsStateWithLifecycle()
    val savedKeys by favorites.keys.collectAsStateWithLifecycle()
    val open by rememberUpdatedState(onOpen)
    val focus = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current
    val openPage: (String) -> Unit = { path ->
        focus.clearFocus()
        keyboard?.hide()
        open(path)
    }

    Column(
        modifier
            .fillMaxSize()
            .oceanBackground(),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding(),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 56.dp)
                    // 4 dp in puts the menu icon (24 dp in a 48 dp button) on the field's 16 dp edge.
                    .padding(start = 4.dp, end = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                MenuButton(onMenu)
                Spacer(Modifier.width(4.dp))
                Wordmark(size = 22f)
            }
            Box(Modifier.padding(horizontal = 16.dp)) {
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
                SearchPhase.Idle -> item(key = "worlds") { WorldGrid(open = openPage) }
                SearchPhase.Searching -> item(key = "searching") { Loading() }
                is SearchPhase.Results -> itemsIndexed(phase.results, key = { index, result -> "$index ${result.href}" }) { index, result ->
                    ResultRow(
                        result = result,
                        imageUrl = model.imageUrl(result),
                        onClick = { openPage(result.href) },
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
    val shape = RoundedCornerShape(50)
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        BasicTextField(
            value = query,
            onValueChange = onQuery,
            modifier = Modifier
                .weight(1f)
                .onFocusChanged { focused = it.isFocused }
                .semantics { contentDescription = placeholder }
                .testTag("search.input"),
            textStyle = AppFont.body.copy(color = Ocean.pearl),
            cursorBrush = SolidColor(Ocean.aqua),
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
                        .background(Ocean.glassDark)
                        .border(1.dp, if (focused) Ocean.champagne else Ocean.glassEdge, shape)
                        .heightIn(min = 48.dp)
                        .padding(horizontal = 18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        painter = painterResource(R.drawable.ic_tab_search),
                        contentDescription = null,
                        modifier = Modifier.size(20.dp).painted(Ocean.champagneAqua),
                        tint = Color.White,
                    )
                    Spacer(Modifier.width(12.dp))
                    Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                        if (query.isEmpty()) Text(placeholder, color = Ocean.pearl.copy(alpha = 0.55f), style = AppFont.body, maxLines = 1)
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
                color = Ocean.champagneMid,
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

/** The app's own photo of the section a result belongs to, by the start of its path; null when none fits. */
@DrawableRes
internal fun sectionPhoto(href: String): Int? {
    val trimmed = href.trim()
    // "https://gorgona-one.com/yachts?x" -> "/yachts?x"; a site path stays as it is.
    val path = if ("://" in trimmed) "/" + trimmed.substringAfter("://").substringAfter('/', "") else trimmed
    return SECTION_PHOTOS.entries.firstOrNull { (section, _) -> path == section || path.startsWith("$section/") || path.startsWith("$section?") }?.value
}

private val SECTION_PHOTOS = linkedMapOf(
    "/vacation-rentals" to R.drawable.world_villas,
    "/rentals" to R.drawable.world_cars,
    "/yachts" to R.drawable.world_yachts,
    "/events" to R.drawable.world_events,
    "/restaurants-nightlife" to R.drawable.world_dining,
    "/experiences" to R.drawable.world_experiences,
    "/travel" to R.drawable.world_travel,
    "/private-jets" to R.drawable.world_jets,
)

// endregion

// region Results

/** One result as a card of frosted glass: the photo, the name, where it is, and the price in champagne. */
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
    val shape = RoundedCornerShape(24.dp)
    Box(
        modifier
            .padding(bottom = 14.dp)
            .fillMaxWidth()
            .clip(shape)
            .background(Ocean.glass)
            .border(1.dp, Ocean.glassEdge, shape),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .pressable(onClick = onClick)
                .testTag("search.result"),
        ) {
            // A result without its own photo (YATR's catalogue, say) shows its section's.
            val photo: Any? = imageUrl ?: sectionPhoto(result.href)
            if (photo != null) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .background(Ocean.night),
                ) {
                    AsyncImage(
                        model = photo,
                        contentDescription = null,
                        modifier = Modifier.matchParentSize(),
                        contentScale = ContentScale.Crop,
                    )
                    // The foot of the photo sinks into the glass below it.
                    Box(
                        Modifier
                            .matchParentSize()
                            .background(Brush.verticalGradient(0.5f to Color.Transparent, 1f to Color(0xCC011A22))),
                    )
                }
            }
            Column(
                Modifier.padding(
                    start = 16.dp,
                    // With no photo the heart sits beside the name, not over it.
                    end = if (photo == null && favorite != null) 60.dp else 16.dp,
                    top = 12.dp,
                    bottom = 14.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(result.title, color = Ocean.pearl, style = AppFont.cardTitle, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (result.detailLine.isNotEmpty()) {
                    Text(result.detailLine, color = Ocean.aqua, style = AppFont.detail, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                result.price?.let {
                    Text(it, Modifier.padding(top = 3.dp), style = AppFont.button.copy(fontSize = 15.sp, brush = Ocean.champagne))
                }
            }
        }
        if (favorite != null) {
            FavoriteHeart(
                saved = favorite.key in savedKeys,
                onToggle = { toggleFavorite(favorite) },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp),
                glass = true,
            )
        }
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
            color = Ocean.aqua,
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
        Icon(painter = painterResource(icon), contentDescription = null, modifier = Modifier.size(36.dp), tint = Ocean.aqua)
        Text(
            text,
            Modifier.semantics { heading() },
            color = if (detail != null) Ocean.pearl else Ocean.pearl.copy(alpha = 0.75f),
            style = if (detail != null) AppFont.cardTitle else AppFont.body,
            textAlign = TextAlign.Center,
        )
        detail?.let { Text(it, color = Ocean.pearl.copy(alpha = 0.75f), style = AppFont.detail, textAlign = TextAlign.Center) }
        onRetry?.let {
            Text(
                text = stringResource(R.string.action_retry),
                modifier = Modifier
                    .pressable(onClick = it)
                    .padding(8.dp)
                    .testTag("search.retry"),
                color = Ocean.champagneMid,
                style = AppFont.button,
            )
        }
    }
}

// endregion
