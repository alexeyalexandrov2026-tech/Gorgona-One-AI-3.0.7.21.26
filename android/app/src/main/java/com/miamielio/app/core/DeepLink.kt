package com.miamielio.app.core

import java.net.URLDecoder

/** Where a `miamielio://` link or a verified `https://gorgona-one.com` App Link asks the app to go. */
sealed interface DeepLink {
    data object Concierge : DeepLink
    data object Search : DeepLink
    data object Account : DeepLink
    data class SeasonConcierge(val eventId: String) : DeepLink

    /** Supabase / OAuth callback returning from Chrome Custom Tabs into the Account WebView. */
    data class AuthCallback(val path: String) : DeepLink

    /** A page of the site, as a site-relative path ("/yachts", "/pay/token?paid=1", "/trip"). */
    data class Open(val path: String) : DeepLink

    companion object {
        const val SCHEME = "miamielio"
        val DEFAULT_HOSTS: Set<String> = AppConfig.production.internalHosts
        private val seasonId = Regex("[a-z0-9][a-z0-9-]{0,79}")

        internal fun seasonUrl(eventId: String): String {
            require(seasonId.matches(eventId))
            return "miamielio://concierge?event=" + eventId
        }

        /**
         * Parses `miamielio://...` deep links and verified `https://gorgona-one.com/...`
         * Android App Links. Returns null for unknown schemes, unknown hosts, or unsafe paths.
         */
        fun parse(link: String, allowedHosts: Set<String> = DEFAULT_HOSTS): DeepLink? {
            val trimmed = link.trim()
            val address = WebAddress.parse(trimmed) ?: return null
            return when (address.scheme) {
                SCHEME -> parseCustomScheme(trimmed, address)
                "https" -> parseHttpsAppLink(trimmed, address, allowedHosts)
                else -> null
            }
        }

        private fun parseCustomScheme(link: String, address: WebAddress): DeepLink? = when (address.host) {
            "concierge" -> query(link)["event"]?.takeIf(seasonId::matches)?.let(::SeasonConcierge) ?: Concierge
            "search" -> Search
            "account" -> Account
            else -> {
                val path = query(link)["path"] ?: "/"
                if (isSafeRelativePath(path)) {
                    if (isAuthCallbackPath(path)) AuthCallback(path) else Open(path)
                } else {
                    null
                }
            }
        }

        private fun parseHttpsAppLink(link: String, address: WebAddress, allowedHosts: Set<String>): DeepLink? {
            if (address.host !in allowedHosts) return null
            if (link.any { it.isWhitespace() || it.isISOControl() }) return null
            val afterScheme = link.substringAfter("://", missingDelimiterValue = "")
            val slash = afterScheme.indexOf('/')
            val rawTail = if (slash < 0) "/" else afterScheme.substring(slash)
            if (!isSafeRelativePath(rawTail)) return null

            val normalizedPath = address.path.lowercase().trimEnd('/').ifEmpty { "/" }
            val hasQueryOrFragment = rawTail.contains('?') || rawTail.contains('#')
            return when {
                normalizedPath == "/auth/callback" || normalizedPath.startsWith("/auth/callback/") -> AuthCallback(rawTail)
                normalizedPath == "/discovery" && !hasQueryOrFragment -> Concierge
                normalizedPath == "/search" && !hasQueryOrFragment -> Search
                normalizedPath == "/profile" && !hasQueryOrFragment -> Account
                else -> Open(rawTail)
            }
        }

        private fun isAuthCallbackPath(path: String): Boolean {
            val clean = path.substringBefore('?').substringBefore('#').lowercase().trimEnd('/')
            return clean == "/auth/callback" || clean.startsWith("/auth/callback/")
        }

        private fun isSafeRelativePath(path: String): Boolean =
            path.startsWith("/") && !path.startsWith("//") && !path.contains('\\')

        private fun query(link: String): Map<String, String> {
            val text = link.substringBefore('#').substringAfter('?', missingDelimiterValue = "")
            if (text.isEmpty()) return emptyMap()
            return text.split('&').mapNotNull { pair ->
                val name = pair.substringBefore('=')
                val value = pair.substringAfter('=', missingDelimiterValue = "")
                try {
                    URLDecoder.decode(name, "UTF-8") to URLDecoder.decode(value, "UTF-8")
                } catch (_: IllegalArgumentException) {
                    null
                }
            }.toMap()
        }
    }
}
