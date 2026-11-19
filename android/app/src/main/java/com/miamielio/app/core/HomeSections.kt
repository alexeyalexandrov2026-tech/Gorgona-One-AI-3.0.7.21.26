package com.miamielio.app.core

import androidx.annotation.StringRes
import com.miamielio.app.R

/**
 * One of the site's sections, as the home page lists it. The menu's
 * "Sections" group and the section rail both read the same list, so their
 * order, their names and their pictures cannot drift apart.
 */
data class HomeSection(
    /** The site's own id for it ("privateJets"). */
    val id: String,
    /**
     * The site page ("/yachts"), or null for the one section that is not a
     * page: the AI concierge, which the app answers itself in its AI tab.
     */
    val href: String?,
    /** The section's name in the guest's language, from the site's own wording. */
    @param:StringRes val label: Int,
    /** The section's picture, site-relative ("/images/..."; see `AppConfig.resolve`), or null for the AI's orb. */
    val image: String?,
)

/**
 * `HOME_SECTIONS` in the site's `lib/homeData.js`, in the site's order (the
 * pictures are those the site resolves today: its `carThumb(FLEET[0])` is
 * the Lamborghini's small cover).
 */
object HomeSections {
    val all: List<HomeSection> = listOf(
        HomeSection("travel", "/travel", R.string.section_travel, "/images/home/travel-beach.webp"),
        HomeSection("exclusive", "/exclusive-destinations", R.string.section_exclusive, "/images/experiences/miami-coast.webp"),
        HomeSection("stays", "/vacation-rentals", R.string.section_stays, "/images/home/worlds/stay-miami-beach.jpg"),
        HomeSection("yachts", "/yachts", R.string.section_yachts, "/images/home/worlds/yacht-princess.jpg"),
        HomeSection("cars", "/rentals", R.string.section_cars, "/images/rentals/lamborghini-urus-se/cover-s.jpg"),
        HomeSection("events", "/events", R.string.section_events, "/images/home/worlds/events-stage.jpg"),
        HomeSection("privateJets", "/private-jets", R.string.section_private_jets, "/images/home/worlds/travel-wing.jpg"),
        HomeSection("experiences", "/experiences", R.string.section_experiences, "/images/home/experiences-coaster.webp"),
        HomeSection("adventures", "/entertainment/adrenaline-365", R.string.section_adventures, "/images/adrenaline365/helicopter-tour.png"),
        HomeSection("dining", "/restaurants-nightlife", R.string.section_dining, "/images/dining/komodo.jpg"),
        HomeSection("concierge", null, R.string.section_concierge, null),
    )

    fun byId(id: String): HomeSection? = all.firstOrNull { it.id == id }
}
