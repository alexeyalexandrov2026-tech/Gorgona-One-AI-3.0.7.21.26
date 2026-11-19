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
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.miamielio.app.R
import com.miamielio.app.app.AppServices
import com.miamielio.app.app.AppTab
import com.miamielio.app.concierge.ConciergeScreen
import com.miamielio.app.search.SearchScreen
import com.miamielio.app.today.TodayScreen
import com.miamielio.app.season.EventsScreen
import com.miamielio.app.web.WebLayer
import com.miamielio.app.web.WebTab
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.shape.CircleShape
import kotlinx.coroutines.delay

/** The tabs, kept under the splash until the first page has something to show. */
@Composable
fun AppRoot(services: AppServices, modifier: Modifier = Modifier) {
    var showsSplash by rememberSaveable { mutableStateOf(true) }

    // The site loads from the start, out of sight: favourites sync through it
    // and the concierge answers in its language. Nothing on screen waits for it.
    LaunchedEffect(Unit) { services.explore.activate() }

    LaunchedEffect(Unit) {
        if (!showsSplash) return@LaunchedEffect
        // Long enough to be seen; Today is drawn from the app itself.
        delay(1_200)
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

/**
 * The five tabs, the Events screen that hangs off Today, the site pages shown
 * over them, the bar that switches between them, and the menu that opens from
 * the top of the screens.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RootTabs(services: AppServices, modifier: Modifier = Modifier) {
    val router = services.router
    val tab by router.selectedTab.collectAsStateWithLifecycle()
    val layer by router.webLayer.collectAsStateWithLifecycle()
    val events by router.eventsOpen.collectAsStateWithLifecycle()
    var menuOpen by rememberSaveable { mutableStateOf(false) }

    // "Back" on any other tab, or on Events, returns to Today; there it leaves
    // the app. A site page over the tab answers first (see WebLayer), and the
    // menu before either (see MenuSheet).
    BackHandler(enabled = (tab != AppTab.Today || events) && !layer) { router.show(AppTab.Today) }

    // Anything else that takes the screen (a link, a notification) puts the menu away.
    LaunchedEffect(tab, events, layer) { menuOpen = false }

    // The keyboard never follows the guest to another screen.
    KeyboardAway(tab, events, menuOpen)

    // The bar makes way for the keyboard, so a page's own field stays in view.
    val typing = WindowInsets.isImeVisible
    val openMenu = { menuOpen = true }

    Box(modifier.fillMaxSize().background(Theme.paper)) {
        // First, so that it is where Compose puts the focus when nobody has asked for it.
        FocusRest(LocalInputModeManager.current)
        Column(
            Modifier
                .fillMaxSize()
                .imePadding(),
        ) {
            Box(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    // Room for the orb that rises out of the bar, so it never sits
                    // on a tab's own field or button.
                    .padding(bottom = if (typing) 0.dp else OrbOverhang),
            ) {
                when (tab) {
                    AppTab.Today -> if (events) {
                        EventsScreen(
                            reminders = services.season,
                            onPlan = { request ->
                                services.concierge.prepare(request)
                                router.show(AppTab.Concierge)
                            },
                            onMenu = openMenu,
                        )
                    } else {
                        TodayScreen(
                            model = services.concierge,
                            season = services.season,
                            onAsked = { router.show(AppTab.Concierge) },
                            onOpen = router::open,
                            onEvents = router::showEvents,
                            onMenu = openMenu,
                        )
                    }
                    AppTab.Concierge -> ConciergeScreen(
                        model = services.concierge,
                        favorites = services.favorites,
                        onOpen = router::open,
                        onMenu = openMenu,
                        modifier = Modifier.testTag("content.Concierge"),
                    )
                    AppTab.Catalog -> SearchScreen(
                        model = services.search,
                        favorites = services.favorites,
                        onOpen = router::open,
                        onMenu = openMenu,
                        modifier = Modifier.testTag("content.Catalog"),
                    )
                    AppTab.Exclusive -> WebTab(services.exclusive, Modifier.testTag("content.Exclusive"))
                    AppTab.Account -> WebTab(services.account, Modifier.testTag("content.Account"))
                }
                if (layer) WebLayer(services.explore, onClose = router::closeLayer)
            }
            if (!typing) {
                TabBar(selected = tab, onSelect = router::select)
            }
        }
        MenuSheet(
            visible = menuOpen,
            onClose = { menuOpen = false },
            onSelect = { entry ->
                menuOpen = false
                entry.open(router)
            },
        )
    }
}

/**
 * Puts the keyboard away: no field keeps the focus, and the keyboard goes
 * down. It happens whenever one of [triggers] changes (another tab, Events
 * opening or closing, the menu opening) and each time the app comes to the
 * front, the first time included. No code of the app asks for focus, and
 * [FocusRest] keeps the focus Compose hands out by itself off the fields; this
 * is what ends a focus the guest gave a field themselves.
 */
@Composable
private fun KeyboardAway(vararg triggers: Any?) {
    val focus = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current
    val putAway by rememberUpdatedState {
        focus.clearFocus(force = true)
        keyboard?.hide()
    }
    LaunchedEffect(*triggers) { putAway() }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { putAway() }
}

/** How far the orb rises above the bar's top edge (see [TabItem]). */
private val OrbOverhang = 24.dp

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
    val colour = when {
        tab == AppTab.Concierge -> Theme.goldButton
        selected -> Theme.goldButton
        else -> Theme.soft
    }
    val interactions = remember { MutableInteractionSource() }
    val label = when (tab) {
        AppTab.Today -> stringResource(R.string.tab_today)
        AppTab.Catalog -> stringResource(R.string.tab_catalog)
        AppTab.Concierge -> stringResource(R.string.tab_ai)
        AppTab.Exclusive -> stringResource(R.string.tab_exclusive)
        AppTab.Account -> stringResource(R.string.tab_profile)
    }
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
            // The concierge's own orb, larger than the icons and lifted above
            // the bar, as on the website's AI launcher. It takes an icon's
            // place in the row; the rest of it overhangs the bar.
            AppTab.Concierge -> Box(Modifier.size(24.dp), contentAlignment = Alignment.Center) {
                ConciergeMark(
                    diameter = 52.dp,
                    modifier = Modifier
                        .requiredSize(58.dp)
                        .offset(y = (-16).dp)
                        .background(Theme.paper, CircleShape)
                        .padding(3.dp)
                        .testTag("tab.orb"),
                )
            }
            AppTab.Today -> TabIcon(R.drawable.ic_tab_home, colour)
            AppTab.Catalog -> TabIcon(R.drawable.ic_tab_search, colour)
            AppTab.Exclusive -> TabIcon(R.drawable.ic_tab_exclusive, colour)
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
