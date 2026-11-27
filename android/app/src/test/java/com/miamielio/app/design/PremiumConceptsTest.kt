package com.miamielio.app.design

import android.graphics.Bitmap
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.test.core.app.ApplicationProvider
import coil3.compose.AsyncImage
import com.miamielio.app.R
import com.miamielio.app.core.Season
import com.miamielio.app.core.SeasonEvent
import com.miamielio.app.season.SeasonReminders
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.MiamiElioTheme
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/**
 * Design trials for the owner, not the app: two premium directions for the
 * Events screen, its tab bar and the icons, drawn with the season's real
 * events and photos from the site. Pictures go to build/outputs/snapshots/concepts.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w360dp-h900dp-xhdpi")
class PremiumConceptsTest {
    @get:Rule
    val compose = createComposeRule()

    private val now = Clock.fixed(Instant.parse("2026-11-20T15:00:00Z"), ZoneOffset.UTC)

    private fun events(): List<SeasonEvent> =
        Season.upcoming(SeasonReminders(ApplicationProvider.getApplicationContext(), now).events, now.instant())

    private fun shoot(name: String, content: @Composable () -> Unit) {
        compose.setContent { MiamiElioTheme { content() } }
        compose.mainClock.advanceTimeBy(1_000)
        // The photos come from the site; give them a moment to arrive.
        repeat(6) {
            Thread.sleep(700)
            compose.mainClock.advanceTimeBy(200)
        }
        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        val folder = File("build/outputs/snapshots/concepts").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test
    fun oceanGlass() = shoot("A-ocean-glass-events.png") { OceanGlassEvents(events()) }

    @Test
    fun miamiSunset() = shoot("B-miami-sunset-events.png") { SunsetEvents(events()) }

    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h640dp-xhdpi")
    fun icons() = shoot("C-icons-compared.png") { IconSheet() }

    @Test
    fun menu() = shoot("D-menu.png") { MenuSample() }

    @Test
    fun catalogResults() = shoot("E-catalog-results.png") { CatalogSample() }

    @Test
    fun conciergeChat() = shoot("F-concierge-chat.png") { ConciergeSample() }
}

// region D–F. The other screens in the chosen mix (A's sea and glass, B's icons)

private val Night = Color(0xFF01161E)

/** The bar as the app now draws it: a white icon in a circle, a sunset for the tab you are on. */
@Composable
private fun MixBar(selected: Int, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().background(Night).padding(top = 8.dp, bottom = 14.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TABS.forEachIndexed { index, (icon, label) ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (icon == 0) {
                    ConciergeMark(40.dp)
                    Text(label, color = Color(0xFFE6C88E), style = AppFont.tabLabel)
                } else {
                    Box(
                        Modifier.size(34.dp).clip(CircleShape).background(if (index == selected) Sunset else Brush.linearGradient(listOf(Color(0x24FFFFFF), Color(0x24FFFFFF)))),
                        contentAlignment = Alignment.Center,
                    ) { Icon(painterResource(icon), null, Modifier.size(19.dp), tint = Color.White) }
                    Text(label, color = if (index == selected) Color.White else Pearl.copy(alpha = 0.6f), style = AppFont.tabLabel)
                }
            }
        }
    }
}

/** A white icon in a small circle: a sunset when [on], a little glass otherwise. */
@Composable
private fun CircleIcon(@DrawableRes icon: Int, on: Boolean = false, size: Int = 40) {
    Box(
        Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(if (on) Sunset else Brush.linearGradient(listOf(Color(0x66011A22), Color(0x66011A22))))
            .border(1.dp, if (on) Brush.linearGradient(listOf(Color.Transparent, Color.Transparent)) else GlassEdge, CircleShape),
        contentAlignment = Alignment.Center,
    ) { Icon(painterResource(icon), null, Modifier.size((size * 0.45f).dp), tint = Color.White) }
}

@Composable
private fun MenuSample() {
    Box(Modifier.fillMaxSize().background(Color(0xFF01212C))) {
        OceanBackdrop()
        Box(Modifier.matchParentSize().background(Color(0x66000000)))
        Column(
            Modifier
                .fillMaxWidth(0.88f)
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xE601212C), Color(0xF201161E))))
                .border(1.dp, GlassEdge, RoundedCornerShape(topEnd = 28.dp, bottomEnd = 28.dp))
                .padding(top = 30.dp, start = 18.dp, end = 18.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Menu", color = Pearl, style = AppFont.title, modifier = Modifier.weight(1f))
                CircleIcon(R.drawable.ic_close)
            }
            Spacer(Modifier.height(10.dp))
            listOf(
                R.drawable.ic_tab_home to "Today", R.drawable.ic_tab_search to "Catalog", R.drawable.ic_spark to "AI Concierge",
                R.drawable.ic_tab_exclusive to "Exclusive Destinations", R.drawable.ic_tab_events to "Events", R.drawable.ic_tab_account to "Profile",
            ).forEachIndexed { index, (icon, label) ->
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    CircleIcon(icon, on = index == 0, size = 38)
                    Spacer(Modifier.width(14.dp))
                    Text(label, color = Pearl, style = AppFont.rowTitle, modifier = Modifier.weight(1f))
                    GradientIcon(R.drawable.ic_arrow_forward, Champagne, 16)
                }
            }
            Spacer(Modifier.height(10.dp))
            Text("SECTIONS", style = AppFont.eyebrow.copy(brush = Champagne))
            Spacer(Modifier.height(4.dp))
            listOf(
                "/images/home/travel-beach.webp" to "Travel", "/images/experiences/miami-coast.webp" to "Exclusive Destinations",
                "/images/home/worlds/stay-miami-beach.jpg" to "Stays", "/images/home/worlds/yacht-princess.jpg" to "Yachts",
                "/images/rentals/lamborghini-urus-se/cover-s.jpg" to "Cars", "/images/dining/komodo.jpg" to "Dining",
            ).forEach { (image, label) ->
                Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(
                        SITE + image, null,
                        Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, GlassEdge, RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Crop,
                    )
                    Spacer(Modifier.width(14.dp))
                    Text(label, color = Pearl.copy(alpha = 0.9f), style = AppFont.detailMedium, modifier = Modifier.weight(1f))
                    GradientIcon(R.drawable.ic_arrow_forward, Champagne, 16)
                }
            }
        }
    }
}

@Composable
private fun CatalogSample() {
    Box(Modifier.fillMaxSize().background(Color(0xFF01212C))) {
        OceanBackdrop()
        Column(Modifier.fillMaxSize()) {
            Header(Brush.linearGradient(listOf(Pearl, Pearl)))
            // The search field: glass, with the query in it.
            Row(
                Modifier
                    .padding(horizontal = 16.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(50))
                    .background(Color(0x40011A22))
                    .border(1.dp, GlassEdge, RoundedCornerShape(50))
                    .padding(horizontal = 18.dp, vertical = 13.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                GradientIcon(R.drawable.ic_tab_search, ChampagneAqua, 20)
                Spacer(Modifier.width(12.dp))
                Text("yacht for 8", color = Pearl, style = AppFont.body)
            }
            Row(Modifier.padding(start = 16.dp, top = 14.dp, bottom = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("All  12", "Yachts  6", "Villas  4", "Cars  2").forEachIndexed { index, label ->
                    Text(
                        label,
                        Modifier
                            .clip(RoundedCornerShape(50))
                            .background(if (index == 0) Sunset else Brush.linearGradient(listOf(Color(0x1FFFFFFF), Color(0x1FFFFFFF))))
                            .padding(horizontal = 14.dp, vertical = 7.dp),
                        color = Color.White,
                        style = AppFont.detailMedium.copy(fontSize = 13.sp),
                    )
                }
            }
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                ResultCard("/images/home/worlds/yacht-princess.jpg", "Princess 78 Flybridge", "78 ft · Miami Beach Marina", "From \$4,800 / day", saved = true)
                ResultCard("/images/home/worlds/stay-miami-beach.jpg", "Villa Bay Point", "5 bedrooms · Miami Beach", "Rate on request", saved = false)
            }
        }
        MixBar(selected = 1, modifier = Modifier.align(Alignment.BottomCenter))
    }
}

@Composable
private fun ResultCard(image: String, title: String, detail: String, price: String, saved: Boolean) {
    val shape = RoundedCornerShape(24.dp)
    Column(Modifier.fillMaxWidth().clip(shape).background(Brush.verticalGradient(listOf(Color(0x1AFFFFFF), Color(0x8C011A22)))).border(1.dp, GlassEdge, shape)) {
        Box(Modifier.fillMaxWidth().height(150.dp)) {
            AsyncImage(SITE + image, null, Modifier.matchParentSize(), contentScale = ContentScale.Crop)
            Box(Modifier.matchParentSize().background(Brush.verticalGradient(0.5f to Color.Transparent, 1f to Color(0xCC011A22))))
            Box(Modifier.align(Alignment.TopEnd).padding(10.dp)) { CircleIcon(if (saved) R.drawable.ic_heart_filled else R.drawable.ic_heart, on = saved, size = 40) }
        }
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 14.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, color = Pearl, style = AppFont.cardTitle, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(detail, color = Aqua, style = AppFont.detail)
            Text(price, style = AppFont.button.copy(fontSize = 15.sp, brush = Champagne), modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable
private fun ConciergeSample() {
    Box(Modifier.fillMaxSize().background(Color(0xFF01212C))) {
        OceanBackdrop()
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().padding(start = 12.dp, end = 16.dp, top = 28.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) { GradientIcon(R.drawable.ic_menu, Brush.linearGradient(listOf(Pearl, Pearl)), 24) }
                Text("Miami Elio AI", color = Pearl, style = AppFont.rowTitle, modifier = Modifier.weight(1f))
                Row(
                    Modifier.clip(RoundedCornerShape(50)).border(1.dp, Champagne, RoundedCornerShape(50)).padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    GradientIcon(R.drawable.ic_telegram, Champagne, 16)
                    Text("Manager", style = AppFont.detailMedium.copy(brush = Champagne))
                }
            }
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // The guest's message, on the sunset.
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                    Text(
                        "A yacht for 8 guests on Saturday",
                        Modifier.clip(RoundedCornerShape(22.dp, 22.dp, 6.dp, 22.dp)).background(Sunset).padding(horizontal = 16.dp, vertical = 11.dp),
                        color = Color.White, style = AppFont.body,
                    )
                }
                // The concierge's answer, on glass beside its orb.
                Row(verticalAlignment = Alignment.Top) {
                    ConciergeMark(30.dp)
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "Here are three yachts free on Saturday, all with crew. Shall I hold one while you decide?",
                        Modifier
                            .clip(RoundedCornerShape(6.dp, 22.dp, 22.dp, 22.dp))
                            .background(Brush.verticalGradient(listOf(Color(0x1FFFFFFF), Color(0x8C011A22))))
                            .border(1.dp, GlassEdge, RoundedCornerShape(6.dp, 22.dp, 22.dp, 22.dp))
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        color = Pearl, style = AppFont.body,
                    )
                }
                // A listing in the answer.
                Row(
                    Modifier
                        .padding(start = 40.dp)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color(0x66011A22))
                        .border(1.dp, GlassEdge, RoundedCornerShape(20.dp))
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AsyncImage(SITE + "/images/home/worlds/yacht-princess.jpg", null, Modifier.size(78.dp).clip(RoundedCornerShape(14.dp)), contentScale = ContentScale.Crop)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Princess 78", color = Pearl, style = AppFont.rowTitle)
                        Text("78 ft · Miami Beach", color = Aqua, style = AppFont.detail)
                        Text("From \$4,800", style = AppFont.detailMedium.copy(brush = Champagne))
                    }
                    CircleIcon(R.drawable.ic_heart, size = 36)
                }
                Row(Modifier.padding(start = 40.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Hold it for me", "Add dinner").forEach {
                        Text(
                            it,
                            Modifier.clip(RoundedCornerShape(50)).border(1.dp, Champagne, RoundedCornerShape(50)).padding(horizontal = 14.dp, vertical = 8.dp),
                            style = AppFont.detailMedium.copy(fontSize = 14.sp, brush = Champagne),
                        )
                    }
                }
            }
        }
        Column(Modifier.align(Alignment.BottomCenter)) {
            // The composer: glass, with the microphone and the sunset "Ask".
            Row(
                Modifier
                    .padding(horizontal = 14.dp, vertical = 10.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(50))
                    .background(Color(0xB3011A22))
                    .border(1.dp, GlassEdge, RoundedCornerShape(50))
                    .padding(start = 18.dp, end = 6.dp, top = 6.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Ask Miami Elio AI", color = Pearl.copy(alpha = 0.55f), style = AppFont.body, modifier = Modifier.weight(1f))
                Icon(painterResource(R.drawable.ic_mic), null, Modifier.size(22.dp), tint = Pearl)
                Spacer(Modifier.width(10.dp))
                Box(Modifier.size(44.dp).clip(CircleShape).background(Sunset), contentAlignment = Alignment.Center) {
                    Icon(painterResource(R.drawable.ic_arrow_up), null, Modifier.size(20.dp), tint = Color.White)
                }
            }
            MixBar(selected = -1)
        }
    }
}

// endregion

// region Shared

private const val SITE = "https://gorgona-one.com"

/** A photo from the site for each event of the season. */
private val PHOTOS = mapOf(
    "flibs" to "/images/home/worlds/yacht-princess.jpg",
    "art-basel" to "/images/home/worlds/deco-street.jpg",
    "nye" to "/images/experiences/miami-coast.webp",
    "boat-show" to "/images/home/travel-beach.webp",
    "miami-open" to "/images/home/tickets/tennis.jpg",
    "ultra" to "/images/events/festival-pass.jpg",
    "f1" to "/images/events/sports-pass.jpg",
)

private fun photo(event: SeasonEvent) = SITE + (PHOTOS[event.id] ?: "/images/home/worlds/events-stage.jpg")

private val TABS = listOf(
    R.drawable.ic_tab_home to "Today",
    R.drawable.ic_tab_search to "Catalog",
    0 to "AI",
    R.drawable.ic_tab_exclusive to "Exclusive",
    R.drawable.ic_tab_account to "Profile",
)

/** Paints whatever is drawn (an icon, a line) with [brush] instead of its own colour. */
private fun Modifier.painted(brush: Brush): Modifier = this
    .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
    .drawWithContent {
        drawContent()
        drawRect(brush, blendMode = BlendMode.SrcIn)
    }

@Composable
private fun GradientIcon(@DrawableRes icon: Int, brush: Brush, size: Int = 22) {
    Icon(painterResource(icon), null, Modifier.size(size.dp).painted(brush), tint = Color.White)
}

@Composable
private fun Header(menu: Brush) {
    Row(
        Modifier.fillMaxWidth().padding(start = 12.dp, end = 20.dp, top = 28.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) { GradientIcon(R.drawable.ic_menu, menu, 24) }
        Spacer(Modifier.width(4.dp))
        Wordmark(size = 24f)
    }
}

// endregion

// region A. Ocean glass

private val Pearl = Color(0xFFF4F1EA)
private val Aqua = Color(0xFF7FD6D0)
private val Champagne = Brush.linearGradient(listOf(Color(0xFFFBF0D4), Color(0xFFE6C88E), Color(0xFFC9A45C)))
private val ChampagneAqua = Brush.linearGradient(listOf(Color(0xFFF6E4B8), Color(0xFFBFE6DC), Color(0xFF7FD6D0)))
private val GlassEdge = Brush.linearGradient(
    listOf(Color.White.copy(alpha = 0.45f), Aqua.copy(alpha = 0.12f), Color(0xFFE6C88E).copy(alpha = 0.55f)),
)

@Composable
private fun BoxScope.OceanBackdrop() {
    Image(
        painterResource(R.drawable.splash_ocean), null,
        Modifier.matchParentSize(), contentScale = ContentScale.Crop,
    )
    Box(
        Modifier.matchParentSize().background(
            Brush.verticalGradient(listOf(Color(0xD901212C), Color(0xA601212C), Color(0xE6010F16))),
        ),
    )
}

@Composable
private fun OceanGlassEvents(events: List<SeasonEvent>) {
    Box(Modifier.fillMaxSize().background(Color(0xFF01212C))) {
        OceanBackdrop()
        Column(Modifier.fillMaxSize()) {
            Header(Champagne)
            Column(Modifier.padding(horizontal = 20.dp)) {
                Text("MIAMI SEASON", style = AppFont.eyebrow.copy(brush = Champagne))
                Text("Events", color = Pearl, style = AppFont.hero.copy(fontSize = 40.sp))
                Text(
                    "The weeks that sell out first. Plan them before everyone else does.",
                    color = Pearl.copy(alpha = 0.72f), style = AppFont.detail,
                )
            }
            Spacer(Modifier.height(18.dp))
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                events.take(3).forEach { GlassCard(it) }
            }
        }
        GlassTabBar(Modifier.align(Alignment.BottomCenter))
    }
}

@Composable
private fun GlassCard(event: SeasonEvent) {
    val shape = RoundedCornerShape(26.dp)
    // No shadow: through frosted glass a shadow shows as a pale box inside the card.
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Brush.verticalGradient(listOf(Color(0x40FFFFFF).copy(alpha = 0.10f), Color(0x8C011A22))))
            .border(1.dp, GlassEdge, shape),
    ) {
        Box(Modifier.fillMaxWidth().height(132.dp)) {
            AsyncImage(photo(event), null, Modifier.matchParentSize(), contentScale = ContentScale.Crop)
            Box(Modifier.matchParentSize().background(Brush.verticalGradient(0.4f to Color.Transparent, 1f to Color(0xE6011A22))))
            // The date as a medallion of champagne glass on the photo.
            Column(
                Modifier
                    .align(Alignment.BottomStart)
                    .padding(14.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0x99011A22))
                    .border(1.dp, Champagne, RoundedCornerShape(16.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(Season.dayStub(event), style = AppFont.title.copy(fontSize = 22.sp, brush = Champagne))
                Text(Season.monthStub(event).uppercase(), color = Aqua, style = AppFont.eyebrow.copy(fontSize = 10.sp))
            }
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp)
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0x66011A22))
                    .border(1.dp, GlassEdge, CircleShape),
                contentAlignment = Alignment.Center,
            ) { GradientIcon(R.drawable.ic_bell, ChampagneAqua, 18) }
        }
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp)) {
            Text(event.name, color = Pearl, style = AppFont.cardTitle, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(event.place, color = Aqua.copy(alpha = 0.9f), style = AppFont.detail)
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Champagne)
                    .padding(horizontal = 18.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("Plan this week", color = Color(0xFF1B1404), style = AppFont.button.copy(fontSize = 14.sp))
                Icon(painterResource(R.drawable.ic_arrow_forward), null, Modifier.size(14.dp), tint = Color(0xFF1B1404))
            }
        }
    }
}

@Composable
private fun GlassTabBar(modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(30.dp)
    val dim = Brush.linearGradient(listOf(Pearl.copy(alpha = 0.55f), Pearl.copy(alpha = 0.55f)))
    Row(
        modifier
            .padding(horizontal = 12.dp, vertical = 14.dp)
            .fillMaxWidth()
            .height(68.dp)
            .clip(shape)
            .background(Color(0xB3011A22))
            .border(1.dp, GlassEdge, shape),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TABS.forEachIndexed { index, (icon, label) ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (icon == 0) {
                    ConciergeMark(40.dp)
                } else {
                    GradientIcon(icon, if (index == 0) Champagne else dim)
                    Text(label, color = if (index == 0) Color(0xFFE6C88E) else Pearl.copy(alpha = 0.55f), style = AppFont.tabLabel)
                }
            }
        }
    }
}

// endregion

// region B. Miami sunset

private val Sunset = Brush.linearGradient(listOf(Color(0xFFFFB36B), Color(0xFFFF6E93), Color(0xFFB76CFF)))
private val SunsetSoft = Brush.linearGradient(listOf(Color(0xFFFFC98F), Color(0xFFFF9BB5)))

@Composable
private fun SunsetEvents(events: List<SeasonEvent>) {
    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Color(0xFF0B1026), Color(0xFF231A47), Color(0xFF4A1F57), Color(0xFF7A2E5C)))),
    ) {
        // The sea under the sunset, faintly.
        Image(
            painterResource(R.drawable.splash_ocean), null,
            Modifier.matchParentSize().graphicsLayer { alpha = 0.22f }, contentScale = ContentScale.Crop,
        )
        Box(
            Modifier.matchParentSize().background(
                Brush.radialGradient(listOf(Color(0x66FF7A59), Color(0x00FF7A59)), center = Offset(360f, 1700f), radius = 900f),
            ),
        )
        Column(Modifier.fillMaxSize()) {
            Header(Sunset)
            Column(Modifier.padding(horizontal = 20.dp)) {
                Text("MIAMI SEASON", style = AppFont.eyebrow.copy(brush = SunsetSoft))
                Text("Events", color = Color.White, style = AppFont.hero.copy(fontSize = 40.sp))
                Text(
                    "The weeks that sell out first. Plan them before everyone else does.",
                    color = Color.White.copy(alpha = 0.75f), style = AppFont.detail,
                )
            }
            Spacer(Modifier.height(18.dp))
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                events.take(3).forEach { SunsetCard(it) }
            }
        }
        SunsetTabBar(Modifier.align(Alignment.BottomCenter))
    }
}

@Composable
private fun SunsetCard(event: SeasonEvent) {
    val shape = RoundedCornerShape(24.dp)
    Box(
        Modifier
            .fillMaxWidth()
            .height(170.dp)
            .shadow(20.dp, shape, ambientColor = Color(0xFFFF6E93), spotColor = Color(0xFFB76CFF))
            .clip(shape)
            .border(1.dp, Brush.linearGradient(listOf(Color(0x99FFB36B), Color(0x33FFFFFF), Color(0x99B76CFF))), shape),
    ) {
        AsyncImage(photo(event), null, Modifier.matchParentSize(), contentScale = ContentScale.Crop)
        Box(Modifier.matchParentSize().background(Brush.verticalGradient(0.25f to Color.Transparent, 1f to Color(0xF01A0F2E))))
        Row(
            Modifier
                .align(Alignment.TopStart)
                .padding(12.dp)
                .clip(RoundedCornerShape(50))
                .background(Sunset)
                .padding(horizontal = 12.dp, vertical = 5.dp),
        ) {
            Text(
                "${Season.monthStub(event).uppercase()} ${Season.dayStub(event)}",
                color = Color.White,
                style = AppFont.eyebrow.copy(fontSize = 11.sp, fontWeight = FontWeight.SemiBold),
            )
        }
        Box(
            Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp)
                .size(38.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.18f))
                .border(1.dp, Color.White.copy(alpha = 0.35f), CircleShape),
            contentAlignment = Alignment.Center,
        ) { Icon(painterResource(R.drawable.ic_bell), null, Modifier.size(18.dp), tint = Color.White) }
        Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
            Text(event.name, color = Color.White, style = AppFont.cardTitle, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(event.place, color = Color.White.copy(alpha = 0.78f), style = AppFont.detail)
            Spacer(Modifier.height(6.dp))
            Text("Plan this week  →", style = AppFont.button.copy(fontSize = 14.sp, brush = SunsetSoft))
        }
    }
}

@Composable
private fun SunsetTabBar(modifier: Modifier = Modifier) {
    val idle = Brush.linearGradient(listOf(Color(0x26FFFFFF), Color(0x26FFFFFF)))
    Row(
        modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(Color(0x001A0F2E), Color(0xF21A0F2E))))
            .padding(top = 18.dp, bottom = 14.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TABS.forEachIndexed { index, (icon, label) ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (icon == 0) {
                    ConciergeMark(40.dp)
                } else {
                    Box(
                        Modifier.size(36.dp).clip(CircleShape).background(if (index == 0) Sunset else idle),
                        contentAlignment = Alignment.Center,
                    ) { Icon(painterResource(icon), null, Modifier.size(19.dp), tint = Color.White) }
                    Text(label, color = Color.White.copy(alpha = if (index == 0) 1f else 0.6f), style = AppFont.tabLabel)
                }
            }
        }
    }
}

// endregion

// region C. Icons compared

private val SHEET_ICONS = listOf(
    R.drawable.ic_tab_home, R.drawable.ic_tab_search, R.drawable.ic_tab_exclusive,
    R.drawable.ic_bell, R.drawable.ic_heart, R.drawable.ic_spark,
)

@Composable
private fun IconSheet() {
    Column(
        Modifier.fillMaxSize().background(Color(0xFF0A1218)).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Text("Иконки", color = Color.White, style = AppFont.title)
        IconRow("Сейчас · плоское золото", Color(0xFF0A1218)) {
            Icon(painterResource(it), null, Modifier.size(24.dp), tint = Theme.goldText)
        }
        IconRow("A · Океан и стекло", Color(0xFF01212C), ocean = true) {
            Box(
                Modifier.size(46.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.08f)).border(1.dp, GlassEdge, CircleShape),
                contentAlignment = Alignment.Center,
            ) { GradientIcon(it, ChampagneAqua, 22) }
        }
        IconRow("B · Закат Майами", Color(0xFF231A47)) {
            Box(Modifier.size(46.dp).clip(CircleShape).background(Sunset), contentAlignment = Alignment.Center) {
                Icon(painterResource(it), null, Modifier.size(22.dp), tint = Color.White)
            }
        }
    }
}

@Composable
private fun IconRow(title: String, ground: Color, ocean: Boolean = false, icon: @Composable (Int) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, color = Color.White.copy(alpha = 0.8f), style = AppFont.detailMedium)
        Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(ground)) {
            if (ocean) OceanBackdrop()
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) { SHEET_ICONS.forEach { icon(it) } }
        }
    }
}

// endregion
