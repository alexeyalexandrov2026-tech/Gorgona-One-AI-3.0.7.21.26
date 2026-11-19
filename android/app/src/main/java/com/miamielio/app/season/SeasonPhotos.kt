package com.miamielio.app.season

import com.miamielio.app.core.SeasonEvent

/**
 * A photograph from the site for each event of the season (ids of the site's
 * lib/seasonData.js), site-relative; see `AppConfig.resolve`. An event left
 * out shows a band of sea instead.
 */
internal object SeasonPhotos {
    private val paths = mapOf(
        "flibs" to "/images/home/worlds/yacht-princess.jpg",
        "art-basel" to "/images/home/worlds/deco-street.jpg",
        "nye" to "/images/experiences/miami-coast.webp",
        "boat-show" to "/images/home/travel-beach.webp",
        "miami-open" to "/images/home/tickets/tennis.jpg",
        "ultra" to "/images/events/festival-pass.jpg",
        "f1" to "/images/events/sports-pass.jpg",
    )

    fun pathOf(event: SeasonEvent): String = paths[event.id] ?: "/images/home/worlds/events-stage.jpg"
}
