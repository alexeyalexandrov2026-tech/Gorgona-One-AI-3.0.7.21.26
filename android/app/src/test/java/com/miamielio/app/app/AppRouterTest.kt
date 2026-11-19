package com.miamielio.app.app

import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.RouteDecision
import com.miamielio.app.core.RoutePolicy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppRouterTest {
    private class FakePage : WebPage {
        override var onRoute: ((url: String, decision: RouteDecision) -> Unit)? = null
        val loaded = mutableListOf<String>()
        var returnsToStart = 0

        override fun load(url: String) {
            loaded += url
        }

        override fun returnToStart() {
            returnsToStart++
        }
    }

    private class FakeOpener : ExternalOpener {
        val browser = mutableListOf<String>()
        val system = mutableListOf<String>()

        override fun openBrowser(url: String) {
            browser += url
        }

        override fun openSystem(url: String) {
            system += url
        }
    }

    private val config = AppConfig.production
    private val explore = FakePage()
    private val account = FakePage()
    private val outside = FakeOpener()
    private val router = AppRouter(config, RoutePolicy(config), explore, account, outside)

    private val tab get() = router.selectedTab.value

    @Test
    fun tappingTheTabYouAreOnTakesItBackToItsStart() {
        assertEquals(AppTab.Today, tab)

        router.select(AppTab.Account)
        assertEquals(AppTab.Account, tab)
        assertEquals(0, account.returnsToStart)

        router.select(AppTab.Account)
        assertEquals(1, account.returnsToStart)

        router.select(AppTab.Today)
        router.select(AppTab.Today)
        assertEquals(AppTab.Today, tab)
        assertEquals(0, explore.returnsToStart)

        router.select(AppTab.Concierge)
        router.select(AppTab.Concierge)
        assertEquals(AppTab.Concierge, tab)
    }

    @Test
    fun aSitePageOpensAsALayerOverTheTab() {
        router.select(AppTab.Catalog)
        router.open("/yachts/azimut-55")
        assertEquals(listOf("https://gorgona-one.com/yachts/azimut-55"), explore.loaded)
        assertTrue(router.webLayer.value)
        assertEquals(AppTab.Catalog, tab)
        assertEquals(emptyList<String>(), outside.browser + outside.system)
    }

    @Test
    fun closingTheLayerKeepsTheTab() {
        router.select(AppTab.Events)
        router.open("/yachts")
        assertTrue(router.webLayer.value)
        router.closeLayer()
        assertFalse(router.webLayer.value)
        assertEquals(AppTab.Events, tab)
    }

    @Test
    fun sitePagesWithTheirOwnTabSwitchTabs() {
        router.open("/profile")
        assertEquals(AppTab.Account, tab)
        assertFalse(router.webLayer.value)
        router.open("/search?q=yacht")
        assertEquals(AppTab.Catalog, tab)
        assertFalse(router.webLayer.value)
        assertEquals(emptyList<String>(), explore.loaded)
    }

    @Test
    fun selectingATabClosesTheLayer() {
        router.open("/yachts")
        router.select(AppTab.Concierge)
        assertFalse(router.webLayer.value)
    }

    @Test
    fun otherPeoplesPagesAndOtherAppsLinksLeaveTheApp() {
        router.select(AppTab.Catalog)

        router.open("https://tickets.example.com/art-basel")
        assertEquals(listOf("https://tickets.example.com/art-basel"), outside.browser)

        router.open("https://wa.me/13055550123")
        // A section the app does not carry opens in the browser.
        router.open("/sportsbook")
        assertEquals(listOf("https://wa.me/13055550123", "https://gorgona-one.com/sportsbook"), outside.system)

        router.open("javascript:alert(1)")
        router.open("//evil.example.com")
        router.open("")

        assertEquals(emptyList<String>(), explore.loaded)
        assertEquals(1, outside.browser.size)
        assertEquals(2, outside.system.size)
        // Leaving the app does not move the guest off their tab.
        assertEquals(AppTab.Catalog, tab)
        assertFalse(router.webLayer.value)
    }

    @Test
    fun linksAPageHandsOverGoTheSameWay() {
        router.select(AppTab.Account)

        account.onRoute?.invoke("tel:+13055550123", RouteDecision.System)
        account.onRoute?.invoke("https://partner.example.com/villa", RouteDecision.Browser)
        explore.onRoute?.invoke("https://gorgona-one.com/sportsbook", RouteDecision.Restricted)
        explore.onRoute?.invoke("file:///etc/hosts", RouteDecision.Ignored)
        assertEquals(listOf("tel:+13055550123", "https://gorgona-one.com/sportsbook"), outside.system)
        assertEquals(listOf("https://partner.example.com/villa"), outside.browser)
        assertEquals(AppTab.Account, tab)

        // A site page asked for from "My Miami" opens as a layer over it.
        account.onRoute?.invoke("https://gorgona-one.com/yachts", RouteDecision.Web)
        assertEquals(listOf("https://gorgona-one.com/yachts"), explore.loaded)
        assertEquals(emptyList<String>(), account.loaded)
        assertTrue(router.webLayer.value)
        assertEquals(AppTab.Account, tab)
    }

    @Test
    fun deepLinksReachTabsAndSitePagesOnly() {
        router.handle("miamielio://concierge")
        assertEquals(AppTab.Concierge, tab)
        router.handle("miamielio://search")
        assertEquals(AppTab.Catalog, tab)
        router.handle("miamielio://account")
        assertEquals(AppTab.Account, tab)
        // Arriving by link is not "tap again to go home".
        router.handle("miamielio://account")
        assertEquals(0, account.returnsToStart)

        router.handle("miamielio://open?path=/yachts")
        assertEquals(listOf("https://gorgona-one.com/yachts"), explore.loaded)
        assertTrue(router.webLayer.value)
        assertEquals(AppTab.Account, tab)

        router.handle("miamielio://search")
        router.handle("miamielio://open?path=//evil.example.com")
        router.handle("miamielio://open?path=https://evil.example.com")
        router.handle("https://gorgona-one.com/rentals")
        assertEquals(1, explore.loaded.size)
        assertEquals(AppTab.Catalog, tab)

        router.handle("miamielio://open?path=/sportsbook")
        assertEquals(1, explore.loaded.size)
        assertEquals(listOf("https://gorgona-one.com/sportsbook"), outside.system)
    }
}
