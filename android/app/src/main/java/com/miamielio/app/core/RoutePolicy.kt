package com.miamielio.app.core

/** What the app does with a URL someone is about to open. */
enum class RouteDecision {
    /** A Miami Elio page: load it in the app's web view. */
    Web,

    /**
     * Someone else's page (a partner, a ticket seller): show it in an in-app
     * browser tab so the guest can come straight back.
     */
    Browser,

    /**
     * Not a web page at all, or a link another app owns (phone, mail,
     * WhatsApp, Play Store): hand it to Android.
     */
    System,

    /** A Miami Elio section this app does not carry. Opens in the browser. */
    Restricted,

    /** Nothing to open (a `javascript:` or `file:` link). */
    Ignored,
}

/**
 * The single place that decides where a link goes. The web view, the
 * concierge and search all ask here, so they can never disagree.
 */
class RoutePolicy(
    val config: AppConfig = AppConfig.production,
    restrictedPaths: List<String> = defaultRestrictedPaths,
) {
    val restrictedPaths: List<String> = restrictedPaths.map(::normalize)

    fun decide(url: String): RouteDecision {
        val address = WebAddress.parse(url) ?: return RouteDecision.Ignored
        return when (address.scheme) {
            "https", "http" -> {
                if (address.host.isEmpty()) return RouteDecision.Ignored
                if (address.host in config.internalHosts) {
                    if (isRestricted(address.path)) RouteDecision.Restricted else RouteDecision.Web
                } else if (address.host in systemHosts) {
                    RouteDecision.System
                } else {
                    RouteDecision.Browser
                }
            }
            // Scratch documents the page creates for itself.
            "about", "blob", "data" -> RouteDecision.Web
            // Never opened: scripts, local files, and the intent: links that
            // would let a page start arbitrary components of other apps.
            "javascript", "file", "content", "intent", "android-app" -> RouteDecision.Ignored
            else -> RouteDecision.System
        }
    }

    /**
     * True for a link the app can show in its own web view - used to drop
     * concierge cards and search results that would lead out of the app.
     */
    fun allowsInApp(reference: String): Boolean {
        val url = config.resolve(reference) ?: return false
        return decide(url) == RouteDecision.Web
    }

    fun isRestricted(path: String): Boolean {
        val candidate = normalize(path)
        return restrictedPaths.any { candidate == it || candidate.startsWith("$it/") }
    }

    companion object {
        /**
         * Sportsbook sections stay out of the app: store rules require a
         * gambling licence for apps that promote real-money betting. The same
         * list as the iPhone app and `lib/appRestrictedPaths.js` on the site.
         */
        val defaultRestrictedPaths = listOf(
            "/sportsbook",
            "/sports-betting-promos",
            "/betmgm-promos",
            "/caesars-sportsbook-promos",
            "/draftkings-promos",
            "/fanduel-promos",
            "/stores/betting",
        )

        /** Web addresses that are really doors into other apps. */
        private val systemHosts = setOf(
            "wa.me", "api.whatsapp.com", "t.me",
            "play.google.com", "maps.app.goo.gl", "maps.google.com",
        )

        private fun normalize(path: String): String {
            var value = path.lowercase()
            while (value.length > 1 && value.endsWith("/")) {
                value = value.dropLast(1)
            }
            return value
        }
    }
}
