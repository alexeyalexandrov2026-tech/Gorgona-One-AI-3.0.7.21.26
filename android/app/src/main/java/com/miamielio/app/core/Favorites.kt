package com.miamielio.app.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
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
     * Asks the page to save this edit. True means the page started delivery.
     * It sends a separate receipt with this token after persistence.
     */
    internal fun script(on: Boolean, receipt: String, owner: String?): String {
        // JSON is valid JavaScript except for these two line separators.
        val operation = buildJsonObject {
            changeJson(on).forEach { (name, value) -> put(name, value) }
            put("receipt", receipt)
            put("owner", owner)
        }
        val literal = operation.toString().replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
        return """
            (function (change) {
              try {
                if (typeof window.__miamiFavoriteV2 !== 'function') return false;
                window.__miamiFavoriteV2(change);
                return true;
              } catch (e) { return false; }
            })($literal)
        """.trimIndent()
    }

    /** The same validated catalogue fields are used on the site and in the native queue. */
    internal fun changeJson(on: Boolean): JsonObject = buildJsonObject {
        put("kind", kind)
        put("slug", slug)
        put("title", title)
        if (subtitle != null) put("subtitle", subtitle)
        if (image != null) put("image", image)
        put("on", on)
    }

    override fun equals(other: Any?): Boolean =
        other is FavoriteRef && kind == other.kind && slug == other.slug && title == other.title &&
            subtitle == other.subtitle && image == other.image

    override fun hashCode(): Int = listOf(kind, slug, title, subtitle, image).hashCode()

    companion object {
        val kinds = setOf("yacht", "stay", "car", "dining", "nightlife")

        fun of(kind: String, slug: String, title: String, subtitle: String? = null, image: String? = null): FavoriteRef? {
            val name = title.trim()
            if (kind !in kinds || !PlanRules.isSlug(slug) || name.isEmpty()) return null
            return FavoriteRef(
                kind = kind,
                slug = slug,
                title = name.take(240),
                subtitle = subtitle?.takeIf { it.isNotEmpty() }?.take(300),
                image = image?.takeIf { it.isNotEmpty() && it.length <= 2_048 },
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
                .filter(::isKey)
                .distinct()
                .take(200)
                .toSet()

        internal fun isKey(value: String): Boolean {
            val separator = value.indexOf(':')
            return separator > 0 && value.substring(0, separator) in kinds &&
                PlanRules.isSlug(value.substring(separator + 1))
        }
    }
}
