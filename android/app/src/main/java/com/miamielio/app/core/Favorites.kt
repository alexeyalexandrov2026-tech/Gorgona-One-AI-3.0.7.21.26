package com.miamielio.app.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * A catalogue item the guest can keep in "My Miami". Mirrors
 * `lib/favoriteRules.mjs`. The website owns the list - in the account when
 * signed in, in the web views' shared storage otherwise - so the app hands
 * changes to a page and listens to the list it reports back. Until a page
 * reports, the app shows what it remembers itself (see FavoritesStore).
 */
class FavoriteRef private constructor(
    val kind: String,
    val slug: String,
    val title: String,
    val subtitle: String?,
    val image: String?,
) {
    val key: String get() = "$kind:$slug"

    /**
     * JavaScript that gives the change to the page's favourites store, or
     * queues it in the shared web storage until a page is ready. Evaluates
     * to true once the change is with the page.
     */
    fun script(on: Boolean): String {
        val change = buildJsonObject {
            put("kind", kind)
            put("slug", slug)
            put("title", title)
            if (subtitle != null) put("subtitle", subtitle)
            if (image != null) put("image", image)
            put("on", on)
        }
        // JSON is valid JavaScript except for these two line separators.
        val literal = change.toString().replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
        return """
            (function (change) {
              try {
                if (window.__miamiFavorite) { window.__miamiFavorite(change); return true; }
                var key = '$pendingKey';
                var queue = JSON.parse(window.localStorage.getItem(key) || '[]');
                queue.push(change);
                window.localStorage.setItem(key, JSON.stringify(queue.slice(-50)));
                return true;
              } catch (e) { return false; }
            })($literal)
        """.trimIndent()
    }

    override fun equals(other: Any?): Boolean =
        other is FavoriteRef && kind == other.kind && slug == other.slug && title == other.title &&
            subtitle == other.subtitle && image == other.image

    override fun hashCode(): Int = listOf(kind, slug, title, subtitle, image).hashCode()

    companion object {
        val kinds = setOf("yacht", "stay", "car", "dining", "nightlife")

        /** Where a page queues changes it could not take yet (`FavoritesProvider.jsx`). */
        const val pendingKey = "gorgona-favorites-pending"

        fun of(kind: String, slug: String, title: String, subtitle: String? = null, image: String? = null): FavoriteRef? {
            val name = title.trim()
            if (kind !in kinds || !PlanRules.isSlug(slug) || name.isEmpty()) return null
            return FavoriteRef(
                kind = kind,
                slug = slug,
                title = name.take(240),
                subtitle = subtitle?.takeIf { it.isNotEmpty() }?.take(300),
                image = image?.takeIf { it.isNotEmpty() },
            )
        }

        private val worlds = mapOf(
            "yachts" to "yacht",
            "car-rentals" to "car",
            "vacation-rentals" to "stay",
            "dining-nightlife" to "dining",
        )

        /** A search hit, when it is something that can be kept: a yacht, villa, car or restaurant. */
        fun of(result: SearchResult): FavoriteRef? {
            val mapped = worlds[result.world ?: return null] ?: return null
            val kind = if (mapped == "dining" && result.category?.lowercase() == "nightlife") "nightlife" else mapped
            val slug = result.href.split('/').lastOrNull { it.isNotEmpty() }.orEmpty()
            return of(kind, slug, result.title, result.location, result.image)
        }

        /** An item of a concierge plan. */
        fun of(item: PlanItem): FavoriteRef? =
            of(item.kind, item.slug, item.title, item.subtitle, item.image)

        /**
         * The list a page reported ("kind:slug" each), or null when the
         * message is something else. `json` is the `favorites` value as text.
         */
        fun keys(json: String?): Set<String>? {
            val list = try {
                Json.parseToJsonElement(json ?: return null) as? JsonArray
            } catch (_: Exception) {
                null
            } ?: return null
            return keys(list)
        }

        internal fun keys(list: JsonArray): Set<String> =
            list.asSequence()
                .mapNotNull { (it as? JsonPrimitive)?.takeIf { value -> value.isString }?.content }
                .filter { it.length <= 160 && it.contains(":") }
                .take(200)
                .toSet()
    }
}
