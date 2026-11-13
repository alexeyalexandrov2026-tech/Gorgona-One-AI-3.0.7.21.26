package com.miamielio.app.app

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.miamielio.app.R
import com.miamielio.app.concierge.ConciergeScreen
import com.miamielio.app.concierge.ConciergeViewModel
import com.miamielio.app.concierge.Voice
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.search.SearchScreen
import com.miamielio.app.search.SearchViewModel
import com.miamielio.app.season.SeasonStore
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.AppIcon
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.LocalReduceMotion
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark
import com.miamielio.app.ui.pressable
import com.miamielio.app.web.WebTab
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

/** Everything the screens are built from, made once for the life of the activity. */
class AppScreens(
    val router: AppRouter,
    val concierge: ConciergeViewModel,
    val search: SearchViewModel,
    val favorites: FavoritesStore,
    val season: SeasonStore,
    val voice: Voice,
)

/** The tabs, kept under the splash until the first page has something to show. */
@Composable
fun AppRoot(screens: AppScreens, splash: Boolean = true) {
    var showsSplash by remember { mutableStateOf(splash) }
    Box(Modifier.fillMaxSize().background(Theme.paper)) {
        RootTabs(screens)
        AnimatedVisibility(
            visible = showsSplash,
            exit = fadeOut(tween(450, easing = EaseInOut)),
        ) { SplashScreen() }
    }
    LaunchedEffect(Unit) {
        if (!showsSplash) return@LaunchedEffect
        // Long enough to be seen, and then only as long as the first page
        // needs - with a limit, so a slow connection is never held behind
        // it. The page goes on loading underneath either way.
        delay(1200)
        withTimeoutOrNull(1600) { screens.router.explore.state.first { it.hasSettled } }
        showsSplash = false
    }
}

@Composable
private fun RootTabs(screens: AppScreens) {
    val router = screens.router
    val tab by router.selectedTab.collectAsState()
    val keep = rememberSaveableStateHolder()

    // The system back button steps back through the pages of a web tab, and
    // from any other tab returns Home; at the first page of Home it is
    // Android's again, and puts the app away.
    val exploreState by router.explore.state.collectAsState()
    BackHandler(enabled = tab != AppTab.Explore || exploreState.canGoBack) { router.back() }

    // With the keyboard up the tab bar steps aside, as it does on the iPhone.
    val keyboardUp = WindowInsets.ime.getBottom(LocalDensity.current) > 0

    Column(Modifier.fillMaxSize().background(Theme.paper)) {
        Box(Modifier.weight(1f).fillMaxWidth().imePadding()) {
            keep.SaveableStateProvider(tab.name) {
                when (tab) {
                    AppTab.Explore -> WebTab(router.explore, "tab.home.content") { screens.favorites.sync(router.explore) }
                    AppTab.Concierge -> ConciergeScreen(
                        screens.concierge, router, screens.favorites, screens.season, screens.voice,
                    )
                    AppTab.Search -> SearchScreen(screens.search, router, screens.favorites)
                    AppTab.Account -> WebTab(router.account, "tab.account.content") { screens.favorites.sync(router.account) }
                }
            }
        }
        if (!keyboardUp) TabBar(tab, router::select)
    }
}

@Composable
private fun TabBar(selected: AppTab, select: (AppTab) -> Unit) {
    Column(Modifier.fillMaxWidth().background(Theme.paper)) {
        Hairline()
        Row(
            modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            TabItem(AppTab.Explore, R.string.tab_home, "tab.home", selected, select) { tint ->
                AppIcon(R.drawable.ic_home, tint = tint, size = 24.dp)
            }
            TabItem(AppTab.Concierge, R.string.tab_concierge, "tab.concierge", selected, select) {
                // The concierge's own orb rather than a symbol: lit on its
                // tab, muted while another one is showing.
                ConciergeMark(
                    diameter = 22.dp,
                    modifier = Modifier.alpha(if (selected == AppTab.Concierge) 1f else 0.55f),
                )
            }
            TabItem(AppTab.Search, R.string.tab_search, "tab.search", selected, select) { tint ->
                AppIcon(R.drawable.ic_search, tint = tint, size = 24.dp)
            }
            TabItem(AppTab.Account, R.string.tab_account, "tab.account", selected, select) { tint ->
                AppIcon(R.drawable.ic_person, tint = tint, size = 24.dp)
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.TabItem(
    tab: AppTab,
    label: Int,
    tag: String,
    selected: AppTab,
    select: (AppTab) -> Unit,
    icon: @Composable (androidx.compose.ui.graphics.Color) -> Unit,
) {
    val on = tab == selected
    val name = stringResource(label)
    val tint = if (on) Theme.accent else Theme.soft
    Column(
        modifier = Modifier
            .weight(1f)
            .heightIn(min = 58.dp)
            .testTag(tag)
            .clearAndSetSemantics {
                contentDescription = name
                this.selected = on
            }
            .pressable(role = Role.Tab) { select(tab) }
            .padding(top = 8.dp, bottom = 6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(26.dp), contentAlignment = Alignment.Center) { icon(tint) }
        Text(
            name,
            color = tint,
            style = AppFont.tabLabel,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
    }
}

/**
 * The moment between the launch colour and the first page: the concierge's
 * orb and the name on the same dark ground, so the app lights up instead of
 * cutting in from a blank screen.
 */
@Composable
fun SplashScreen(modifier: Modifier = Modifier) {
    val reduceMotion = LocalReduceMotion.current
    var lit by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { lit = true }
    val orb by animateFloatAsState(if (lit) 1f else 0f, tween(700, easing = EaseOut), label = "splashOrb")
    val name by animateFloatAsState(if (lit) 1f else 0f, tween(600, delayMillis = 250, easing = EaseOut), label = "splashName")

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Theme.paper)
            .testTag("splash")
            .clearAndSetSemantics { contentDescription = "Miami Elio" }
            // Taps do not reach the tabs underneath while the splash is up.
            .pressable(role = null) {},
        contentAlignment = Alignment.Center,
    ) {
        // A faint warmth on the wall behind the orb.
        Box(
            Modifier
                .size(600.dp)
                .alpha(orb)
                .background(Brush.radialGradient(listOf(Theme.gold.copy(alpha = 0.18f), Theme.gold.copy(alpha = 0f)))),
        )
        Column(
            verticalArrangement = Arrangement.spacedBy(36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            ConciergeMark(
                diameter = 96.dp,
                modifier = Modifier.graphicsLayer {
                    alpha = orb
                    val scale = if (reduceMotion) 1f else 0.8f + 0.2f * orb
                    scaleX = scale
                    scaleY = scale
                },
                breathes = true,
            )
            Wordmark(
                modifier = Modifier.graphicsLayer {
                    alpha = name
                    translationY = if (reduceMotion) 0f else (1f - name) * 12.dp.toPx()
                },
                size = 44f,
            )
        }
    }
}
