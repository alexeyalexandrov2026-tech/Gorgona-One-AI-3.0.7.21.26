package com.miamielio.app.web

import android.webkit.WebViewClient
import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.core.RoutePolicy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class WebBootstrapTest {
    private val config = AppConfig.production
    private val policy = RoutePolicy(config)

    @Test
    fun theScriptIsWrittenForTheSitesOwnPages() {
        val script = WebBootstrap.script(config.internalHosts, policy.restrictedPaths, "ru")
        // Kept so a person, or `node --check`, can look at exactly what a page gets.
        val output = File("build/outputs/web").apply { mkdirs() }
        output.resolve("bootstrap.js").writeText(script)
        val favorite = requireNotNull(FavoriteRef.of("yacht", "azimut-55", "Azimut \"55\""))
        output.resolve("favorite-change.js").writeText(
            WebBootstrap.onOrigin(config.baseUrl, favorite.script(on = true, receipt = "11111111-1111-4111-8111-111111111111", owner = null)),
        )

        assertTrue(script.contains("""var hosts = ["gorgona-one.com","www.gorgona-one.com"];"""))
        assertTrue(script.contains("if (hosts.indexOf(location.hostname) === -1) { return; }"))
        assertTrue(script.contains("root.setAttribute('data-app', 'android')"))
        // The door the iPhone app has, opened onto this app's bridge.
        assertTrue(script.contains("window.webkit.messageHandlers.miamiElio = { postMessage: post }"))
        assertTrue(script.contains("window.${WebBootstrap.BRIDGE}.postMessage(JSON.stringify(message))"))
        assertTrue(script.contains(""""/sportsbook""""))
        assertTrue(script.contains(""""gorgona-locale""""))
        assertTrue(script.contains("""'=' + "ru" + '; path=/"""))
    }

    @Test
    fun nothingFromOutsideCanBecomeCode() {
        val script = WebBootstrap.script(
            hosts = setOf("gorgona-one.com"),
            restrictedPaths = listOf("/a\"]; alert(1); [\"", "/</script><script>alert(2)</script>"),
            locale = "ru'; alert(3); '",
        )
        assertFalse(script.contains("alert(1); [\"\"")) // the quote stays escaped
        assertTrue(script.contains("""/a\"]; alert(1); [\""""))
        assertFalse(script.contains("</script>"))
        // A language the site does not have is English, never text from outside.
        assertFalse(script.contains("alert(3)"))
        assertTrue(script.contains("""'=' + "en" + '; path=/"""))
    }

    @Test
    fun theAppsSeaShowsUnderTheSitesPagesInTheAppOnly() {
        val style = WebBootstrap.APP_STYLE
        val app = "html[data-app=\"android\"]"
        // Every rule is the app's: the site in a browser keeps its own look.
        assertTrue(style.lines().all { it.startsWith(app) })
        assertTrue(style.contains("$app body { background: transparent !important; }"))
        // Cards turn to glass; body carries bg-g1-paper itself and must stay clear.
        assertTrue(style.contains("$app body .bg-g1-paper"))
        assertFalse(style.contains("$app .bg-g1-paper"))
        assertTrue(style.contains("$app header.sticky { background-color:"))
        assertTrue(style.contains("$app .text-villa-obsidian"))
        assertTrue(style.contains("$app .theme-villa [data-my-miami] { --g1-ink: #f4f1ea;"))
        // Still the launchers rule, and the one style goes into the script.
        assertTrue(style.contains("$app [data-floating-launcher]"))
        val script = WebBootstrap.script(config.internalHosts, policy.restrictedPaths, "en")
        assertEquals(1, Regex("createElement\\('style'\\)").findAll(script).count())
        assertTrue(script.contains("body { background: transparent !important; }"))
    }

    @Test
    fun onlyTheSitesOwnHttpsPagesGetTheScriptAndTheBridge() {
        assertEquals(setOf("https://gorgona-one.com", "https://www.gorgona-one.com"), WebBootstrap.originRules(config))
    }

    @Test
    fun readsWhatAPagePosts() {
        assertEquals(BridgeMessage(locale = "ru"), WebBootstrap.parse("""{"locale":"ru-RU"}"""))
        assertEquals(BridgeMessage(), WebBootstrap.parse("""{"locale":"sv"}"""))
        assertEquals(BridgeMessage(), WebBootstrap.parse("""{"locale":""}"""))
        assertEquals(
            BridgeMessage(open = "https://gorgona-one.com/sportsbook"),
            WebBootstrap.parse("""{"open":"https://gorgona-one.com/sportsbook"}"""),
        )
        assertEquals(
            BridgeMessage(favorites = BridgeFavorites(setOf("yacht:a", "car:b"), null)),
            WebBootstrap.parse("""{"favorites":["yacht:a","car:b",7,"no-colon"],"favoritesOwner":null,"favoritesVersion":2}"""),
        )
        assertEquals(BridgeMessage(), WebBootstrap.parse("""{"favorites":[]}"""))
        assertEquals(BridgeMessage(), WebBootstrap.parse("""{"favorites":"yacht:a","open":7,"unknown":true}"""))
    }

    @Test
    fun validatesFavoriteReceiptAndAccount() {
        val id = "11111111-1111-4111-8111-111111111111"
        val account = WebBootstrap.parse("""{"favorites":[],"favoritesOwner":"$id","favoritesVersion":2}""")
        assertEquals(BridgeFavorites(emptySet(), id), account?.favorites)
        assertEquals(
            BridgeFavoriteReceipt(id, true),
            WebBootstrap.parse("""{"favoriteReceipt":{"id":"$id","saved":true}}""")?.favoriteReceipt,
        )
        assertNull(WebBootstrap.parse("""{"favoriteReceipt":{"id":"$id","saved":"true"}}""")?.favoriteReceipt)
        assertNull(WebBootstrap.parse("""{"favorites":[],"favoritesOwner":"someone","favoritesVersion":2}""")?.favorites)
    }

    @Test
    fun ignoresWhatIsNotAMessage() {
        assertNull(WebBootstrap.parse(null))
        assertNull(WebBootstrap.parse(""))
        assertNull(WebBootstrap.parse("not json"))
        assertNull(WebBootstrap.parse("""["locale","ru"]"""))
        assertNull(WebBootstrap.parse("\"ru\""))
        assertNull(WebBootstrap.parse("""{"open":"${"x".repeat(70_000)}"}"""))
    }

    @Test
    fun tellsNoNetworkFromOtherFailures() {
        val url = "https://gorgona-one.com/"
        assertEquals(
            LoadFailure(url, isOffline = true),
            LoadFailure.from(url, WebViewClient.ERROR_HOST_LOOKUP, "net::ERR_NAME_NOT_RESOLVED"),
        )
        assertEquals(
            LoadFailure(url, isOffline = true),
            LoadFailure.from(url, WebViewClient.ERROR_UNKNOWN, "net::ERR_INTERNET_DISCONNECTED"),
        )
        assertEquals(LoadFailure(url, isOffline = true), LoadFailure.from(url, WebViewClient.ERROR_TIMEOUT, null))
        assertEquals(
            LoadFailure(url, isOffline = false),
            LoadFailure.from(url, WebViewClient.ERROR_FAILED_SSL_HANDSHAKE, "net::ERR_SSL_PROTOCOL_ERROR"),
        )
        assertEquals(
            LoadFailure(url, isOffline = false),
            LoadFailure.from(url, WebViewClient.ERROR_UNSAFE_RESOURCE, "net::ERR_BLOCKED_BY_RESPONSE"),
        )
        // A navigation the app itself cancelled or replaced is not a failure.
        assertNull(LoadFailure.from(url, WebViewClient.ERROR_UNKNOWN, "net::ERR_ABORTED"))
    }
}
