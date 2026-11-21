package com.miamielio.app.ui

import androidx.activity.compose.BackHandler
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.text.intl.Locale
import androidx.compose.ui.text.toUpperCase
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.app.AppRouter
import com.miamielio.app.app.AppTab
import com.miamielio.app.core.HomeSections
import com.miamielio.app.search.sectionPhoto

/**
 * One row of the menu. [open] takes the guest there, through the router, so
 * the menu has no way of going anywhere the rest of the app cannot.
 */
internal class MenuEntry(
    /** Names the row's test tag (`menu.item.<id>`). */
    val id: String,
    @param:StringRes val label: Int,
    @param:DrawableRes val icon: Int?,
    /** A section's picture, site-relative; null for the app's own places and for the AI's orb. */
    val image: String? = null,
    /** A section's page on the site, site-relative; null for the app's own places. */
    val href: String? = null,
    val open: AppRouter.() -> Unit,
)

/** The app's own places: the five tabs' pages, and Events, which is no tab of the bar. */
internal val MAIN_MENU: List<MenuEntry> = listOf(
    MenuEntry("today", R.string.tab_today, R.drawable.ic_tab_home) { show(AppTab.Today) },
    MenuEntry("catalog", R.string.tab_catalog, R.drawable.ic_tab_search) { show(AppTab.Catalog) },
    MenuEntry("ai", R.string.section_concierge, R.drawable.ic_spark) { show(AppTab.Concierge) },
    MenuEntry("exclusive", R.string.section_exclusive, R.drawable.ic_tab_exclusive) { show(AppTab.Exclusive) },
    MenuEntry("events", R.string.tab_events, R.drawable.ic_tab_events) { showEvents() },
    MenuEntry("profile", R.string.tab_profile, R.drawable.ic_tab_account) { show(AppTab.Account) },
)

/**
 * The site's sections, in the site's order. Three of them are places the
 * app has of its own, so they go there rather than to the site's page:
 * Exclusive Destinations is the Exclusive tab, Events the season's Events
 * screen, and the AI concierge the AI tab.
 */
internal val SECTION_MENU: List<MenuEntry> = HomeSections.all.map { section ->
    val href = section.href
    MenuEntry("section.${section.id}", section.label, icon = null, image = section.image, href = href) {
        when {
            section.id == "exclusive" -> show(AppTab.Exclusive)
            section.id == "events" -> showEvents()
            href == null -> show(AppTab.Concierge)
            else -> open(href)
        }
    }
}

/** The button at the top of a screen that opens the menu. */
@Composable
internal fun MenuButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    // 48 dp by its own size, not by the touch area Material adds around a 40 dp button.
    IconButton(onClick = onClick, modifier = modifier.size(48.dp).testTag("menu.open")) {
        Icon(
            painter = painterResource(R.drawable.ic_menu),
            contentDescription = stringResource(R.string.menu_open),
            tint = Theme.ink,
        )
    }
}

/**
 * The menu: a panel over everything, from the side the button is on, with the
 * app's own places and then the site's sections. It closes on a choice, on
 * its close button, on a tap outside it and on "back".
 */
@Composable
internal fun MenuSheet(
    visible: Boolean,
    onClose: () -> Unit,
    onSelect: (MenuEntry) -> Unit,
    modifier: Modifier = Modifier,
    /** The id of the place the guest is on ("today", "events"...), which wears the sunset. */
    current: String? = null,
    /** Turns a section's site path into its picture's address (see `AppConfig.resolve`). */
    resolve: (String) -> String? = { null },
) {
    val reduceMotion = LocalReduceMotion.current
    val rightToLeft = LocalLayoutDirection.current == LayoutDirection.Rtl
    AnimatedVisibility(
        visible = visible,
        modifier = modifier,
        enter = fadeIn(tween(220, easing = EaseOut)),
        exit = fadeOut(tween(180)),
    ) {
        BackHandler(onBack = onClose)
        val title = stringResource(R.string.menu_title)
        Box(Modifier.fillMaxSize().testTag("menu.sheet")) {
            // Tapping the dimmed screen closes the menu; for a screen reader the
            // close button is the way, so the scrim is not offered as a control.
            Box(
                Modifier
                    .fillMaxSize()
                    // Before the click: what a modifier clears is what comes after it.
                    .clearAndSetSemantics { }
                    .background(Color.Black.copy(alpha = 0.6f))
                    .clickable(interactionSource = null, indication = null, onClick = onClose),
            )
            Column(
                Modifier
                    .align(Alignment.CenterStart)
                    .fillMaxHeight()
                    .fillMaxWidth(0.88f)
                    .widthIn(max = 360.dp)
                    .animateEnterExit(
                        enter = if (reduceMotion) EnterTransition.None else slideInHorizontally(tween(260, easing = EaseOut)) { if (rightToLeft) it else -it },
                        exit = if (reduceMotion) ExitTransition.None else slideOutHorizontally(tween(200)) { if (rightToLeft) it else -it },
                    )
                    // The sea of the Catalog, edged in pearl, aqua and champagne.
                    .clip(PanelShape)
                    .oceanBackground()
                    .border(1.dp, Ocean.glassEdge, PanelShape)
                    // Taps on the panel's own gaps must not fall through to the scrim.
                    .pointerInput(Unit) { detectTapGestures { } }
                    .semantics {
                        paneTitle = title
                        isTraversalGroup = true
                    }
                    .statusBarsPadding()
                    .navigationBarsPadding(),
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = 64.dp)
                        .padding(start = 20.dp, end = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        title,
                        Modifier
                            .weight(1f)
                            .semantics { heading() },
                        color = Ocean.pearl,
                        style = AppFont.title,
                        maxLines = 1,
                    )
                    IconButton(onClick = onClose, modifier = Modifier.size(48.dp).testTag("menu.close")) {
                        GlassCircle(R.drawable.ic_close, on = false, diameter = 40.dp, contentDescription = stringResource(R.string.menu_close))
                    }
                }
                Column(
                    Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(TileGap),
                ) {
                    MAIN_MENU.forEach { entry ->
                        MenuCard(entry, current = entry.id == current, onClick = { onSelect(entry) })
                    }
                    Text(
                        stringResource(R.string.menu_sections).toUpperCase(Locale.current),
                        Modifier
                            .padding(start = 4.dp, end = 4.dp, top = 14.dp, bottom = 2.dp)
                            .semantics { heading() },
                        style = AppFont.eyebrow.copy(brush = Ocean.champagne),
                    )
                    SectionTiles(resolve = resolve, onSelect = onSelect)
                }
            }
        }
    }
}

/**
 * One of the app's own places as a card of frosted glass, like a Catalog
 * result: its icon in a circle (the sunset for the place the guest is on), its
 * name and an arrow.
 */
@Composable
private fun MenuCard(entry: MenuEntry, current: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .testTag("menu.item.${entry.id}")
            .clip(CardShape)
            .background(Ocean.glass)
            .border(1.dp, if (current) Ocean.champagne else Ocean.glassEdge, CardShape)
            .pressable(onClick = onClick)
            .heightIn(min = 56.dp)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        val icon = entry.icon
        if (icon != null) {
            GlassCircle(icon, on = current, diameter = 40.dp)
        } else {
            // The AI concierge has no icon or picture: its orb stands in for one.
            Box(Modifier.size(40.dp), contentAlignment = Alignment.Center) { ConciergeMark(36.dp) }
        }
        Text(
            stringResource(entry.label),
            Modifier.weight(1f),
            color = Ocean.pearl,
            style = AppFont.rowTitle,
        )
        // The drawable mirrors itself for right-to-left languages.
        Icon(
            painterResource(R.drawable.ic_arrow_forward),
            contentDescription = null,
            modifier = Modifier.size(16.dp).painted(Ocean.champagne),
            tint = Color.White,
        )
    }
}

/**
 * The site's sections as the Catalog shows its own: photographs in frames,
 * two to a row, in the site's order. A section without a picture (the AI
 * concierge) is a card of glass across the row.
 */
@Composable
private fun SectionTiles(resolve: (String) -> String?, onSelect: (MenuEntry) -> Unit) {
    // Runs of pictured sections, kept in order, broken by those without one.
    val runs = mutableListOf<MutableList<MenuEntry>>()
    SECTION_MENU.forEach { entry ->
        val last = runs.lastOrNull()
        if (entry.image != null && last != null && last.first().image != null) last += entry else runs += mutableListOf(entry)
    }
    runs.forEach { run ->
        if (run.first().image == null) {
            run.forEach { entry -> MenuCard(entry, current = false, onClick = { onSelect(entry) }) }
            return@forEach
        }
        run.chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(TileGap)) {
                pair.forEach { entry ->
                    val image = entry.image
                    PhotoTile(
                        title = stringResource(entry.label),
                        photo = image?.let(resolve),
                        proportion = 1.05f,
                        onClick = { onSelect(entry) },
                        modifier = Modifier
                            .weight(1f)
                            .testTag("menu.item.${entry.id}"),
                        titleStyle = AppFont.rowTitle,
                        fallback = entry.href?.let(::sectionPhoto),
                    )
                }
                if (pair.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

/** A white icon in a circle: the sunset when [on], a little dark glass otherwise. */
@Composable
private fun GlassCircle(@DrawableRes icon: Int, on: Boolean, diameter: Dp, contentDescription: String? = null) {
    Box(
        Modifier
            .size(diameter)
            .clip(CircleShape)
            .background(if (on) Ocean.sunset else SolidColor(Ocean.glassDark))
            .then(if (on) Modifier else Modifier.border(1.dp, Ocean.glassEdge, CircleShape)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icon), contentDescription, Modifier.size(diameter * 0.45f), tint = Color.White)
    }
}

private val PanelShape = RoundedCornerShape(topEnd = 28.dp, bottomEnd = 28.dp)

/** The Catalog's corners, for the cards and the photographs alike. */
private val CardShape = RoundedCornerShape(20.dp)
private val TileGap = 10.dp
