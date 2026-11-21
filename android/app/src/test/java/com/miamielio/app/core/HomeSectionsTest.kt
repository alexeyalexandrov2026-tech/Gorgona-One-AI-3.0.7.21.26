package com.miamielio.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** The list the menu and the section rail share: the site's own, in the site's order. */
class HomeSectionsTest {
    @Test
    fun theTenSectionsAreTheSitesInTheSitesOrder() {
        assertEquals(
            listOf("travel", "exclusive", "stays", "yachts", "cars", "events", "privateJets", "experiences", "dining", "concierge"),
            HomeSections.all.map { it.id },
        )
        assertEquals(
            listOf(
                "/travel", "/exclusive-destinations", "/vacation-rentals", "/yachts", "/rentals", "/events",
                "/private-jets", "/experiences", "/restaurants-nightlife", null,
            ),
            HomeSections.all.map { it.href },
        )
    }

    @Test
    fun everySectionButTheAiHasAPictureOfTheSite() {
        assertEquals(
            listOf(
                "/images/home/travel-beach.webp",
                "/images/experiences/miami-coast.webp",
                "/images/home/worlds/stay-miami-beach.jpg",
                "/images/home/worlds/yacht-princess.jpg",
                "/images/rentals/lamborghini-urus-se/cover-s.jpg",
                "/images/home/worlds/events-stage.jpg",
                "/images/home/worlds/travel-wing.jpg",
                "/images/home/experiences-coaster.webp",
                "/images/dining/komodo.jpg",
            ),
            HomeSections.all.mapNotNull { it.image },
        )
        assertNull(HomeSections.byId("concierge")?.image)
        // Each one is something the app can load from the site.
        for (image in HomeSections.all.mapNotNull { it.image }) {
            assertEquals("https://gorgona-one.com$image", AppConfig.production.resolve(image))
        }
    }

    @Test
    fun everyPageIsOneTheAppShowsAndEveryIdIsUnique() {
        val policy = RoutePolicy(AppConfig.production)
        for (section in HomeSections.all) {
            section.href?.let { assertTrue("${section.id} $it", policy.allowsInApp(it)) }
        }
        assertEquals(HomeSections.all.size, HomeSections.all.map { it.id }.toSet().size)
        assertEquals(HomeSections.all.size, HomeSections.all.map { it.label }.toSet().size)
    }

    @Test
    fun aSectionIsFoundByItsId() {
        assertEquals("/private-jets", HomeSections.byId("privateJets")?.href)
        assertNotNull(HomeSections.byId("dining"))
        assertNull(HomeSections.byId("sportsbook"))
    }
}
