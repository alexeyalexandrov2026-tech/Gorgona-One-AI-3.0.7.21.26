package com.miamielio.app.core

import java.net.URLDecoder

/** Where a `miamielio://` link asks the app to go. */
sealed interface DeepLink {
    data object Concierge : DeepLink
    data object Search : DeepLink
    data object Account : DeepLink
    data class SeasonConcierge(val eventId: String) : DeepLink

    /** A page of the site, as a site-relative path ("/yachts"). */
    data class Open(val path: String) : DeepLink

    companion object {
        const val SCHEME = "miamielio"
        private val seasonId = Regex("[a-z0-9][a-z0-9-]{0,79}")

        internal fun seasonUrl(eventId: String): String {
            require(seasonId.matches(eventId))
            return "miamielio://concierge?event=" + eventId
        }

        /**
         * `miamielio://open?path=/yachts`, `miamielio://concierge`,
         * `miamielio://search`, `miamielio://account`. Null for anything
         * else. Only site-relative paths: a deep link can never point the
         * app at another site.
         */
        fun parse(link: String): DeepLink? {
            val address = WebAddress.parse(link) ?: return null
            if (address.scheme != SCHEME) return null
            return when (address.host) {
                "concierge" -> query(link)["event"]?.takeIf(seasonId::matches)?.let(::SeasonConcierge) ?: Concierge
                "search" -> Search
                "account" -> Account
                else -> {
                    val path = query(link)["path"] ?: "/"
                    if (path.startsWith("/") && !path.startsWith("//") && !path.contains('\\')) Open(path) else null
                }
            }
        }

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
