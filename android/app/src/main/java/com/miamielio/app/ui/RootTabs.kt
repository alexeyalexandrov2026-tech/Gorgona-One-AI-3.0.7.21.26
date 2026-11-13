package com.miamielio.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.isImeVisible
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.miamielio.app.R
import com.miamielio.app.app.AppServices
import com.miamielio.app.app.AppTab
import com.miamielio.app.concierge.ConciergeScreen
import com.miamielio.app.web.WebTab
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

/** The tabs, kept under the splash until the first page has something to show. */
@Composable
fun AppRoot(services: AppServices, modifier: Modifier = Modifier) {
    var showsSplash by rememberSaveable { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        if (!showsSplash) return@LaunchedEffect
        // Long enough to be seen, and then only as long as the first page
        // needs - with a limit, so a slow connection is never held behind
        // it. The page goes on loading underneath either way.
        delay(1_200)
        withTimeoutOrNull(1_600) { services.explore.state.first { it.hasSettled } }
        showsSplash = false
    }

    Box(
        modifier
            .fillMaxSize()
            .background(Theme.paper),
    ) {
        RootTabs(services)
        AnimatedVisibility(
            visible = showsSplash,
            enter = EnterTransition.None,
            exit = fadeOut(tween(450, easing = EaseInOut)) + scaleOut(tween(450, easing = EaseInOut), targetScale = 1.04f),
        ) {
            SplashView()
        }
    }
}

/**
 * The moment between the launch colour and the first page: the concierge's
 * orb and the name on the same dark ground, so the app lights up instead of
 * cutting in from a blank screen.
 */
@Composable
fun SplashView(modifier: Modifier = Modifier) {
    val reduceMotion = LocalReduceMotion.current
    var lit by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { lit = true }
    val orb by animateFloatAsState(if (lit) 1f else 0f, tween(700, easing = EaseOut), label = "splashOrb")
    val name by animateFloatAsState(
        if (lit) 1f else 0f, tween(600, delayMillis = 250, easing = EaseOut), label = "splashName",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Theme.paper)
            // A faint warmth on the wall behind the orb.
            .drawBehind {
                drawRect(
                    Brush.radialGradient(
                        listOf(Theme.gold.copy(alpha = 0.18f * orb), Theme.gold.copy(alpha = 0f)),
                        center = center,
                        radius = 300.dp.toPx(),
                    ),
                )
            }
            .testTag("splash")
            .clearAndSetSemantics { contentDescription = "Miami Elio" }
            // Nothing underneath is reachable while the splash is up.
            .clickable(interactionSource = null, indication = null, onClick = {}),
        contentAlignment = Alignment.Center,
    ) {
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

/** The four tabs and the bar that switches between them. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RootTabs(services: AppServices, modifier: Modifier = Modifier) {
    val router = services.router
    val tab by router.selectedTab.collectAsStateWithLifecycle()

    // "Back" on any other tab returns to the first one; there it leaves the
    // app. A web tab with pages behind it answers first (see WebTab).
    BackHandler(enabled = tab != AppTab.Explore) { router.show(AppTab.Explore) }

    // The bar makes way for the keyboard, so a page's own field stays in view.
    val typing = WindowInsets.isImeVisible

    Column(
        modifier
            .fillMaxSize()
            .background(Theme.paper)
            .imePadding(),
    ) {
        Box(
            Modifier
                .weight(1f)
                .fillMaxWidth(),
        ) {
            when (tab) {
                AppTab.Explore -> WebTab(services.explore, Modifier.testTag("content.Explore"))
                AppTab.Concierge -> ConciergeScreen(
                    model = services.concierge,
                    onOpen = router::open,
                    modifier = Modifier.testTag("content.Concierge"),
                )
                AppTab.Search -> ComingTab(stringResource(R.string.tab_search), orb = false, tag = "content.Search")
                AppTab.Account -> WebTab(services.account, Modifier.testTag("content.Account"))
            }
        }
        if (!typing) {
            TabBar(selected = tab, onSelect = router::select)
        }
    }
}

/** Holds the place of a native tab until its screen is built. */
@Composable
private fun ComingTab(title: String, orb: Boolean, tag: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(32.dp)
            .testTag(tag),
        verticalArrangement = Arrangement.spacedBy(24.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (orb) ConciergeMark(diameter = 72.dp, modifier = Modifier.arrives(0), breathes = true)
        Text(
            text = title,
            modifier = Modifier
                .arrives(1)
                .semantics { heading() },
            color = Theme.ink,
            style = AppFont.title,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
fun TabBar(selected: AppTab, onSelect: (AppTab) -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier
            .fillMaxWidth()
            .background(Theme.paper),
    ) {
        Hairline()
        Row(
            Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .selectableGroup(),
        ) {
            AppTab.entries.forEach { tab ->
                TabItem(tab = tab, selected = tab == selected, onClick = { onSelect(tab) }, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun TabItem(tab: AppTab, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colour = if (selected) Theme.accent else Theme.soft
    val interactions = remember { MutableInteractionSource() }
    val label = stringResource(
        when (tab) {
            AppTab.Explore -> R.string.tab_home
            AppTab.Concierge -> R.string.tab_concierge
            AppTab.Search -> R.string.tab_search
            AppTab.Account -> R.string.tab_account
        },
    )
    Column(
        modifier = modifier
            .testTag("tab.${tab.name}")
            .selectable(
                selected = selected,
                interactionSource = interactions,
                indication = null,
                role = Role.Tab,
                onClick = onClick,
            )
            .dips(interactions)
            .heightIn(min = 56.dp)
            .padding(horizontal = 4.dp, vertical = 7.dp),
        verticalArrangement = Arrangement.spacedBy(3.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        when (tab) {
            // The concierge's own orb rather than a symbol: lit on its tab,
            // muted while another one is showing.
            AppTab.Concierge -> ConciergeMark(
                diameter = 22.dp,
                modifier = Modifier
                    .padding(1.dp)
                    .alpha(if (selected) 1f else 0.5f),
            )
            AppTab.Explore -> TabIcon(R.drawable.ic_tab_home, colour)
            AppTab.Search -> TabIcon(R.drawable.ic_tab_search, colour)
            AppTab.Account -> TabIcon(R.drawable.ic_tab_account, colour)
        }
        Text(
            text = label,
            color = colour,
            style = AppFont.tabLabel,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun TabIcon(drawable: Int, colour: androidx.compose.ui.graphics.Color) {
    Icon(painter = painterResource(drawable), contentDescription = null, modifier = Modifier.size(24.dp), tint = colour)
}
