package com.miamielio.app.core

import java.io.IOException

/** What the showcase shows, and how long each card stays. */
data class ShowcaseFeed(
    val items: List<ShowcaseItem> = emptyList(),
    val intervalMillis: Long = DEFAULT_INTERVAL_MILLIS,
) {
    companion object {
        const val DEFAULT_INTERVAL_MILLIS = 6_500L
        private const val SHORTEST_MILLIS = 3_000L
        private const val LONGEST_MILLIS = 20_000L

        /** The site's answer, or null when it is not one: the cards it cannot show are left out. */
        internal fun decode(body: ByteArray, policy: RoutePolicy? = null): ShowcaseFeed? {
            val json = Decode.obj(body) ?: return null
            if (!json.containsKey("items")) return null
            val items = json.lossyArray("items", ShowcaseItem::decode)
                .filter { policy?.allowsInApp(it.href) ?: true }
                .distinctBy { it.href }
            val interval = json.int("intervalMs")?.toLong()?.coerceIn(SHORTEST_MILLIS, LONGEST_MILLIS)
                ?: DEFAULT_INTERVAL_MILLIS
            return ShowcaseFeed(items, interval)
        }
    }
}

/** Where the last good answer is kept, so the cards still show without a connection. */
interface ShowcaseCache {
    fun read(): ByteArray?
    fun write(body: ByteArray)
}

/**
 * Talks to the site's showcase feed (`app/api/showcase/route.js`): the cars,
 * yachts, villas, jets and tickets the home page's floating cards cycle
 * through. Read-only and anonymous.
 */
class ShowcaseClient(
    private val config: AppConfig = AppConfig.production,
    private val policy: RoutePolicy = RoutePolicy(config),
    private val transport: HttpTransport,
    private val cache: ShowcaseCache? = null,
) {
    fun makeRequest(): HttpRequest {
        val endpoint = config.resolve("/api/showcase") ?: throw ApiError.InvalidRequest
        return HttpRequest(
            method = "GET",
            url = endpoint,
            headers = mapOf("Accept" to "application/json", "User-Agent" to config.userAgentToken),
        )
    }

    /**
     * The feed. A good answer with cards is kept for next time; anything else
     * (no connection, an error, a site without the feed yet) falls back on
     * what was kept, and on no cards at all when nothing was.
     */
    suspend fun load(): ShowcaseFeed {
        val fresh = try {
            val response = transport.send(makeRequest())
            if (response.status == 200) {
                ShowcaseFeed.decode(response.body, policy)?.also { feed ->
                    if (feed.items.isNotEmpty()) cache?.write(response.body)
                }
            } else {
                null
            }
        } catch (_: IOException) {
            null
        }
        if (fresh != null && fresh.items.isNotEmpty()) return fresh
        return cached() ?: fresh ?: ShowcaseFeed()
    }

    /** What was kept from the last good answer, if anything. */
    fun cached(): ShowcaseFeed? =
        cache?.read()?.let { ShowcaseFeed.decode(it, policy) }?.takeIf { it.items.isNotEmpty() }
}
