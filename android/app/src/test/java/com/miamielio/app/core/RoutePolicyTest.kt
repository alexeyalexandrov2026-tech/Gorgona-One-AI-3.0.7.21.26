package com.miamielio.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RoutePolicyTest {
    private val policy = RoutePolicy()

    @Test
    fun sitePagesStayInTheApp() {
        listOf(
            "https://gorgona-one.com/",
            "https://gorgona-one.com",
            "https://gorgona-one.com/yachts",
            "https://gorgona-one.com/rentals/lamborghini-urus-se",
            "https://gorgona-one.com/vacation-rentals",
            "https://gorgona-one.com/restaurants-nightlife",
            "https://gorgona-one.com/events?category=concerts",
            "https://gorgona-one.com/stores/fashion",
            "https://gorgona-one.com/profile",
            "https://gorgona-one.com/login",
            "https://www.gorgona-one.com/travel",
            "https://GORGONA-ONE.com/experiences",
            "https://gorgona-one.com:443/yachts#top",
        ).forEach { assertEquals(it, RouteDecision.Web, policy.decide(it)) }
    }

    @Test
    fun sportsbookSectionsAreNotCarried() {
        listOf(
            "https://gorgona-one.com/sportsbook",
            "https://gorgona-one.com/sportsbook/",
            "https://gorgona-one.com/sportsbook/fanduel",
            "https://gorgona-one.com/SportsBook/DraftKings",
            "https://gorgona-one.com/sports-betting-promos",
            "https://gorgona-one.com/betmgm-promos",
            "https://gorgona-one.com/caesars-sportsbook-promos",
            "https://gorgona-one.com/draftkings-promos",
            "https://gorgona-one.com/fanduel-promos",
            "https://gorgona-one.com/stores/betting",
            "https://www.gorgona-one.com/sportsbook?ref=home",
        ).forEach { assertEquals(it, RouteDecision.Restricted, policy.decide(it)) }
    }

    @Test
    fun restrictionMatchesWholePathSegments() {
        // Neighbours that merely start with the same letters are ordinary pages.
        assertEquals(RouteDecision.Web, policy.decide("https://gorgona-one.com/sportsbooks-explained"))
        assertEquals(RouteDecision.Web, policy.decide("https://gorgona-one.com/stores/betting-shops"))
        assertEquals(RouteDecision.Web, policy.decide("https://gorgona-one.com/events/sportsbook"))
    }

    @Test
    fun otherSitesOpenInTheBrowserTab() {
        assertEquals(RouteDecision.Browser, policy.decide("https://www.ticketnetwork.com/tickets/123"))
        assertEquals(RouteDecision.Browser, policy.decide("http://example.com/"))
        // Look-alike hosts are not the site.
        assertEquals(RouteDecision.Browser, policy.decide("https://gorgona-one.com.example.net/yachts"))
        assertEquals(RouteDecision.Browser, policy.decide("https://notgorgona-one.com/yachts"))
        assertEquals(RouteDecision.Browser, policy.decide("https://shop.gorgona-one.com/"))
        // Credentials in front of a host do not make it the site.
        assertEquals(RouteDecision.Browser, policy.decide("https://gorgona-one.com@example.net/yachts"))
        assertEquals(RouteDecision.Browser, policy.decide("https://example.net\\@gorgona-one.com/yachts"))
    }

    @Test
    fun linksOwnedByOtherAppsGoToTheSystem() {
        assertEquals(RouteDecision.System, policy.decide("tel:18004262537"))
        assertEquals(RouteDecision.System, policy.decide("mailto:hello@example.com"))
        assertEquals(RouteDecision.System, policy.decide("sms:+13055550100"))
        assertEquals(RouteDecision.System, policy.decide("whatsapp://send?phone=13055550100"))
        assertEquals(RouteDecision.System, policy.decide("https://wa.me/13055550100"))
        assertEquals(RouteDecision.System, policy.decide("https://play.google.com/store/apps/details?id=x"))
        assertEquals(RouteDecision.System, policy.decide("geo:25.76,-80.19"))
    }

    @Test
    fun pageScratchDocumentsAreAllowedAndUnsafeSchemesIgnored() {
        assertEquals(RouteDecision.Web, policy.decide("about:blank"))
        assertEquals(RouteDecision.Web, policy.decide("blob:https://gorgona-one.com/5f0c"))
        assertEquals(RouteDecision.Ignored, policy.decide("javascript:void(0)"))
        assertEquals(RouteDecision.Ignored, policy.decide("file:///etc/hosts"))
        assertEquals(RouteDecision.Ignored, policy.decide("content://com.example/secret"))
        // A page must not be able to start another app's components.
        assertEquals(RouteDecision.Ignored, policy.decide("intent://scan/#Intent;scheme=zxing;end"))
        assertEquals(RouteDecision.Ignored, policy.decide("not a link"))
        assertEquals(RouteDecision.Ignored, policy.decide(""))
    }

    @Test
    fun referencesFromTheApiAreFiltered() {
        assertTrue(policy.allowsInApp("/yachts"))
        assertTrue(policy.allowsInApp("/rentals/bmw-x5-white-brown"))
        assertTrue(policy.allowsInApp("https://gorgona-one.com/events"))
        assertFalse(policy.allowsInApp("/sportsbook"))
        assertFalse(policy.allowsInApp("/sportsbook/betmgm"))
        assertFalse(policy.allowsInApp("https://example.com/"))
        assertFalse(policy.allowsInApp("//example.com/yachts"))
        assertFalse(policy.allowsInApp("yachts"))
        assertFalse(policy.allowsInApp(""))
        assertFalse(policy.allowsInApp("javascript:alert(1)"))
    }

    @Test
    fun aTestSiteIsTheOnlySiteOfItsBuild() {
        val test = AppConfig("https://preview.example.dev/")
        val policy = RoutePolicy(test)
        assertEquals(RouteDecision.Web, policy.decide("https://preview.example.dev/yachts"))
        assertEquals(RouteDecision.Restricted, policy.decide("https://preview.example.dev/sportsbook"))
        assertEquals(RouteDecision.Browser, policy.decide("https://gorgona-one.com/yachts"))
        assertEquals("https://preview.example.dev/api/chat", test.resolve("/api/chat"))
    }
}

class AppConfigTest {
    private val config = AppConfig.production

    @Test
    fun resolvesSiteRelativeReferences() {
        assertEquals("https://gorgona-one.com/yachts/azimut-55", config.resolve("/yachts/azimut-55"))
        assertEquals("https://gorgona-one.com/images/rentals/x/cover.jpg", config.resolve("  /images/rentals/x/cover.jpg "))
        assertEquals("https://gorgona-one.com/events?category=concerts", config.resolve("/events?category=concerts"))
    }

    @Test
    fun passesAbsoluteWebAddressesThrough() {
        assertEquals("https://cdn.example.com/a.jpg", config.resolve("https://cdn.example.com/a.jpg"))
    }

    @Test
    fun rejectsEverythingElse() {
        assertNull(config.resolve(""))
        assertNull(config.resolve("   "))
        assertNull(config.resolve("//example.com/a.jpg"))
        assertNull(config.resolve("images/a.jpg"))
        assertNull(config.resolve("javascript:alert(1)"))
        assertNull(config.resolve("tel:18004262537"))
        assertNull(config.resolve("/yachts/a b"))
        assertNull(config.resolve("https:///nohost"))
    }

    @Test
    fun knowsItsOwnHosts() {
        assertEquals(setOf("gorgona-one.com", "www.gorgona-one.com"), config.internalHosts)
        assertEquals("gorgona-one.com", config.cookieHost)
        assertEquals("MiamiElioApp/1.0", config.userAgentToken)
    }

    @Test
    fun readsTheHostsABuildCarries() {
        val built = AppConfig.fromBuild("https://gorgona-one.com", "www.gorgona-one.com, ")
        assertEquals(config.internalHosts, built.internalHosts)
        assertEquals(setOf("preview.example.dev"), AppConfig.fromBuild("https://preview.example.dev", "").internalHosts)
    }

    @Test
    fun neverLoadsItsOwnPagesInClearText() {
        assertEquals("https://gorgona-one.com/yachts", config.secure("http://gorgona-one.com/yachts"))
        assertEquals("https://gorgona-one.com/yachts", config.secure("https://gorgona-one.com/yachts"))
        assertEquals("http://example.com/", config.secure("http://example.com/"))
    }
}
