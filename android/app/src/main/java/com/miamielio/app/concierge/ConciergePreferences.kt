package com.miamielio.app.concierge

import android.content.SharedPreferences
import androidx.core.content.edit
import com.miamielio.app.core.ConciergeCard
import com.miamielio.app.core.ConciergeLink
import com.miamielio.app.core.ConciergeListing
import com.miamielio.app.core.ListingBooking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

internal data class StoredConversation(
    val entries: List<ConciergeEntry> = emptyList(),
    val sessionId: String? = null,
)

/** Local persistence for the native AI conversation across app restarts. */
internal interface ConciergeHistoryStore {
    fun load(): StoredConversation
    fun save(conversation: StoredConversation)
    fun clear()
}

internal class ConciergePreferences(
    private val preferences: SharedPreferences,
) : ConciergeHistoryStore {
    override fun load(): StoredConversation {
        val raw = preferences.getString(KEY, null) ?: return StoredConversation()
        val root = runCatching { json.parseToJsonElement(raw) as? JsonObject }.getOrNull() ?: return StoredConversation()
        val sessionId = root.str("sessionId")
        val items = (root["entries"] as? JsonArray).orEmpty().mapIndexedNotNull { index, el ->
            val obj = el as? JsonObject ?: return@mapIndexedNotNull null
            val kind = when (obj.str("kind")) {
                "guest" -> ConciergeEntry.Kind.Guest
                "assistant" -> ConciergeEntry.Kind.Concierge
                else -> return@mapIndexedNotNull null
            }
            val text = obj.str("text") ?: return@mapIndexedNotNull null
            ConciergeEntry(
                id = index.toLong(),
                kind = kind,
                text = text,
                suggestions = (obj["suggestions"] as? JsonArray).orEmpty().mapNotNull { s ->
                    val o = s as? JsonObject ?: return@mapNotNull null
                    val href = o.str("href") ?: return@mapNotNull null
                    val label = o.str("label") ?: return@mapNotNull null
                    ConciergeLink(href, label)
                },
                cards = (obj["cards"] as? JsonArray).orEmpty().mapNotNull { c ->
                    val o = c as? JsonObject ?: return@mapNotNull null
                    val href = o.str("href") ?: return@mapNotNull null
                    val title = o.str("title") ?: return@mapNotNull null
                    ConciergeCard(href, title, o.str("summary"), o.str("cta"))
                },
                listings = (obj["listings"] as? JsonArray).orEmpty().mapNotNull { l ->
                    val o = l as? JsonObject ?: return@mapNotNull null
                    val href = o.str("href") ?: return@mapNotNull null
                    val title = o.str("title") ?: return@mapNotNull null
                    val booking = (o["booking"] as? JsonObject)?.let { b ->
                        val bHref = b.str("href") ?: return@let null
                        ListingBooking(b.str("platform") ?: "partner", bHref, b.str("label"))
                    }
                    ConciergeListing(
                        href = href,
                        title = title,
                        label = o.str("label"),
                        image = o.str("image"),
                        price = o.str("price"),
                        summary = o.str("summary"),
                        availabilityStatus = o.str("availabilityStatus"),
                        estimatedTotal = o.str("estimatedTotal"),
                        perGuest = o.str("perGuest"),
                        booking = booking,
                    )
                },
                degraded = (obj["degraded"] as? JsonPrimitive)?.booleanOrNull ?: false,
                replyLocale = obj.str("replyLocale"),
                followups = (obj["followups"] as? JsonArray).orEmpty().mapNotNull { f ->
                    (f as? JsonPrimitive)?.takeIf { it.isString }?.content?.takeIf(String::isNotBlank)
                }.take(3),
                handoff = (obj["handoff"] as? JsonPrimitive)?.booleanOrNull ?: false,
                handoffSummary = obj.str("handoffSummary"),
            )
        }.takeLast(MAX_ENTRIES)
        return StoredConversation(entries = items, sessionId = sessionId)
    }

    override fun save(conversation: StoredConversation) {
        val kept = conversation.entries
            .filter { it.kind != ConciergeEntry.Kind.Failed }
            .takeLast(MAX_ENTRIES)
        if (kept.isEmpty()) {
            clear()
            return
        }
        val payload = buildJsonObject {
            conversation.sessionId?.let { put("sessionId", it) }
            put("entries", buildJsonArray {
                kept.forEach { entry ->
                    add(buildJsonObject {
                        put("kind", if (entry.kind == ConciergeEntry.Kind.Guest) "guest" else "assistant")
                        put("text", entry.text)
                        if (entry.degraded) put("degraded", true)
                        entry.replyLocale?.let { put("replyLocale", it) }
                        if (entry.handoff) put("handoff", true)
                        entry.handoffSummary?.let { put("handoffSummary", it) }
                        if (entry.followups.isNotEmpty()) {
                            put("followups", buildJsonArray { entry.followups.forEach { add(JsonPrimitive(it)) } })
                        }
                        if (entry.suggestions.isNotEmpty()) {
                            put("suggestions", buildJsonArray {
                                entry.suggestions.forEach { link ->
                                    add(buildJsonObject {
                                        put("href", link.href)
                                        put("label", link.label)
                                    })
                                }
                            })
                        }
                        if (entry.cards.isNotEmpty()) {
                            put("cards", buildJsonArray {
                                entry.cards.forEach { card ->
                                    add(buildJsonObject {
                                        put("href", card.href)
                                        put("title", card.title)
                                        card.summary?.let { put("summary", it) }
                                        card.cta?.let { put("cta", it) }
                                    })
                                }
                            })
                        }
                        if (entry.listings.isNotEmpty()) {
                            put("listings", buildJsonArray {
                                entry.listings.forEach { item ->
                                    add(buildJsonObject {
                                        put("href", item.href)
                                        put("title", item.title)
                                        item.label?.let { put("label", it) }
                                        item.image?.let { put("image", it) }
                                        item.price?.let { put("price", it) }
                                        item.summary?.let { put("summary", it) }
                                        item.availabilityStatus?.let { put("availabilityStatus", it) }
                                        item.estimatedTotal?.let { put("estimatedTotal", it) }
                                        item.perGuest?.let { put("perGuest", it) }
                                        item.booking?.let { b ->
                                            put("booking", buildJsonObject {
                                                put("platform", b.platform)
                                                put("href", b.href)
                                                b.label?.let { put("label", it) }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        }.toString()
        preferences.edit { putString(KEY, payload) }
    }

    override fun clear() {
        preferences.edit { remove(KEY) }
    }

    private fun JsonObject.str(key: String): String? =
        (this[key] as? JsonPrimitive)?.takeIf { it.isString }?.content?.takeIf(String::isNotBlank)

    private companion object {
        const val KEY = "conversation.v1"
        const val MAX_ENTRIES = 24
        val json = Json { ignoreUnknownKeys = true }
    }
}
