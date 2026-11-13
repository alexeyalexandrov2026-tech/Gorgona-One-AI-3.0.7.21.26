package com.miamielio.app.core

/**
 * Where the app's content lives. One value, so pointing a build at a test
 * site is a single change (see `BASE_URL` in app/build.gradle.kts).
 */
class AppConfig(
    baseUrl: String,
    additionalHosts: Set<String> = emptySet(),
    /** Appended to the web view's user agent so the site can recognise the app. */
    val userAgentToken: String = "MiamiElioApp/1.0",
) {
    /** Origin every site-relative link is resolved against, without a trailing slash. */
    val baseUrl: String = baseUrl.trim().trimEnd('/')

    /** The host cookies are stored under. */
    val cookieHost: String = WebAddress.parse(this.baseUrl)?.host.orEmpty()

    /** Hosts whose pages belong inside the app's own web view. */
    val internalHosts: Set<String> =
        (additionalHosts.map { it.trim().lowercase() }.filter { it.isNotEmpty() } + cookieHost)
            .filter { it.isNotEmpty() }
            .toSet()

    /**
     * Turns a link from the site's JSON into a full URL.
     *
     * The API sends site-relative references ("/yachts/azimut-55",
     * "/images/rentals/x/cover.jpg") and, for partner media, absolute https
     * URLs. Anything else - an empty string, a protocol-relative "//host",
     * a non-web scheme - is rejected rather than guessed at.
     */
    fun resolve(reference: String): String? {
        val trimmed = reference.trim()
        if (trimmed.isEmpty()) return null
        if (trimmed.any { it.isWhitespace() || it.isISOControl() }) return null

        if (trimmed.startsWith("/")) {
            if (trimmed.startsWith("//")) return null
            return baseUrl + trimmed
        }

        val address = WebAddress.parse(trimmed) ?: return null
        if (address.scheme != "https" && address.scheme != "http") return null
        if (address.host.isEmpty()) return null
        return trimmed
    }

    /**
     * The same address over HTTPS when it is one of the site's own pages
     * written with "http://": the app never loads its site in clear text.
     */
    fun secure(url: String): String {
        val address = WebAddress.parse(url) ?: return url
        if (address.scheme != "http" || address.host !in internalHosts) return url
        return "https" + url.trim().substring(4)
    }

    companion object {
        val production = AppConfig(
            baseUrl = "https://gorgona-one.com",
            additionalHosts = setOf("www.gorgona-one.com"),
        )

        /** `hosts` is the comma-separated list a build carries in `ADDITIONAL_HOSTS`. */
        fun fromBuild(baseUrl: String, hosts: String): AppConfig =
            AppConfig(baseUrl, hosts.split(',').map { it.trim() }.filter { it.isNotEmpty() }.toSet())
    }
}

/**
 * The parts of an address the app makes decisions on. Parsed leniently:
 * pages link to addresses a strict URI parser refuses, and a refusal must
 * never turn into "open it anyway".
 */
class WebAddress private constructor(
    /** Lowercase, without the colon. */
    val scheme: String,
    /** Lowercase, without credentials or port; empty when the address has none. */
    val host: String,
    /** As written, starting with "/" for web addresses; empty when absent. */
    val path: String,
) {
    companion object {
        private val SCHEME = Regex("^([A-Za-z][A-Za-z0-9+.-]*):")

        fun parse(text: String): WebAddress? {
            val value = text.trim()
            val match = SCHEME.find(value) ?: return null
            val scheme = match.groupValues[1].lowercase()
            val rest = value.substring(match.value.length)
            if (!rest.startsWith("//")) {
                return WebAddress(scheme, "", rest.substringBefore('?').substringBefore('#'))
            }
            val afterSlashes = rest.substring(2)
            val end = afterSlashes.indexOfFirst { it == '/' || it == '?' || it == '#' || it == '\\' }
            val authority = if (end < 0) afterSlashes else afterSlashes.substring(0, end)
            val tail = if (end < 0) "" else afterSlashes.substring(end)
            var host = authority.substringAfterLast('@')
            host = if (host.startsWith("[")) host.substringBefore(']') + "]" else host.substringBefore(':')
            val path = if (tail.startsWith("/")) tail.substringBefore('?').substringBefore('#') else ""
            return WebAddress(scheme, host.lowercase().trimEnd('.'), path)
        }
    }
}
