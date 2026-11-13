package com.miamielio.app.web

import android.webkit.WebViewClient
import com.miamielio.app.core.AppConfig
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
        File("build/outputs/web").apply { mkdirs() }.resolve("bootstrap.js").writeText(script)

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
            BridgeMessage(favorites = setOf("yacht:a", "car:b")),
            WebBootstrap.parse("""{"favorites":["yacht:a","car:b",7,"no-colon"]}"""),
        )
        assertEquals(BridgeMessage(favorites = emptySet()), WebBootstrap.parse("""{"favorites":[]}"""))
        assertEquals(BridgeMessage(), WebBootstrap.parse("""{"favorites":"yacht:a","open":7,"unknown":true}"""))
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
