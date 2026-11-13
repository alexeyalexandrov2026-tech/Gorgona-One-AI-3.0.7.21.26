package com.miamielio.app.core

import kotlinx.serialization.json.JsonObject
import java.net.URLEncoder

/** One inventory hit, as shaped by `toSearchResult` in `lib/data/listings.js`. */
data class SearchResult(
    val href: String,
    val title: String,
    val world: String? = null,
    val subtitle: String? = null,
    val category: String? = null,
    val location: String? = null,
    val price: String? = null,
    val image: String? = null,
) {
    val id: String get() = href

    /** "MIAMI ELIO Fleet · Sunny Isles Beach" - whichever parts exist. */
    val detailLine: String
        get() = listOfNotNull(subtitle ?: category, location).distinct().joinToString(" · ")

    companion object {
        internal fun decode(json: JsonObject): SearchResult? {
            val href = json.text("href") ?: return null
            val title = json.text("title") ?: return null
            return SearchResult(
                href = href,
                title = title,
                world = json.text("world"),
                subtitle = json.text("subtitle"),
                category = json.text("category"),
                location = json.text("location"),
                price = json.text("price"),
                image = json.text("image"),
            )
        }
    }
}

/** Talks to the site's inventory search (`app/api/search/route.js`). */
class SearchClient(
    private val config: AppConfig = AppConfig.production,
    private val policy: RoutePolicy = RoutePolicy(config),
    private val transport: HttpTransport,
) {
    fun makeRequest(query: String, limit: Int = maximumResults): HttpRequest {
        val normalized = normalize(query)
        val endpoint = config.resolve("/api/search")
        if (length(normalized) < minimumQueryLength || endpoint == null) {
            throw ApiError.InvalidRequest
        }
        val q = URLEncoder.encode(normalized, "UTF-8").replace("+", "%20")
        return HttpRequest(
            method = "GET",
            url = "$endpoint?q=$q&limit=${limit.coerceIn(1, maximumResults)}",
            headers = mapOf("Accept" to "application/json", "User-Agent" to config.userAgentToken),
        )
    }

    /** Queries too short for the server return an empty list without a request. */
    suspend fun search(query: String, limit: Int = maximumResults): List<SearchResult> {
        if (length(normalize(query)) < minimumQueryLength) return emptyList()
        val response = transport.send(makeRequest(query, limit))
        if (response.status != 200) throw ApiError.Status(response.status)
        val body = Decode.obj(response.body) ?: throw ApiError.Decoding
        if (!body.containsKey("results")) throw ApiError.Decoding
        return body.lossyArray("results", SearchResult::decode).filter { policy.allowsInApp(it.href) }
    }

    /** Full URL of a result's picture, or null when it has none. */
    fun imageUrl(result: SearchResult): String? = result.image?.let(config::resolve)

    companion object {
        /** The server answers nothing below this and trims above the maximum. */
        const val minimumQueryLength = 2
        const val maximumQueryLength = 80
        const val maximumResults = 20

        fun normalize(query: String): String {
            val trimmed = query.trim()
            if (length(trimmed) <= maximumQueryLength) return trimmed
            return trimmed.substring(0, trimmed.offsetByCodePoints(0, maximumQueryLength))
        }

        /** Letters as a person counts them, not UTF-16 units: an emoji is one. */
        private fun length(text: String): Int = text.codePointCount(0, text.length)
    }
}
