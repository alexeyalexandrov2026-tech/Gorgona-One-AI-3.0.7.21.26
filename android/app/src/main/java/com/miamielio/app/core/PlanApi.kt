package com.miamielio.app.core

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.LocalDate
import java.time.LocalTime
import java.util.Locale
import java.util.UUID

/**
 * What a concierge plan may contain. Mirrors `lib/planRules.mjs` on the site:
 * experiences and events are booked on partner sites, so they never join.
 */
object PlanRules {
    val kinds = setOf("yacht", "stay", "car", "dining", "nightlife")
    val sections = setOf("/yachts", "/vacation-rentals", "/rentals", "/restaurants-nightlife")
    const val maxItems = 6
    const val maxNights = 30
    const val maxCandidates = 4

    /** Lowercase letters, digits and hyphens, as the site's catalogue slugs are. */
    fun isSlug(value: String): Boolean {
        if (value.isEmpty() || value.length > 120 || value.first() == '-') return false
        return value.all { it == '-' || it in 'a'..'z' || it in '0'..'9' }
    }

    private val UUID_FORM = Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

    internal fun isUuid(value: String): Boolean = UUID_FORM.matches(value)
}

/** One real catalogue item the server picked (`lib/ai/plan.mjs`). */
data class PlanItem(
    val kind: String,
    val slug: String,
    val title: String,
    val subtitle: String? = null,
    /** Absolute https address once the client has resolved it. */
    val image: String? = null,
    val href: String,
) {
    val id: String get() = "$kind:$slug"
    val isRestaurant: Boolean get() = kind == "dining" || kind == "nightlife"

    companion object {
        internal fun decode(json: JsonObject): PlanItem? {
            val kind = json.text("kind")?.takeIf { it in PlanRules.kinds } ?: return null
            val slug = json.text("slug")?.takeIf(PlanRules::isSlug) ?: return null
            val title = json.text("title") ?: return null
            val href = json.text("href") ?: return null
            return PlanItem(kind, slug, title, json.text("subtitle"), json.text("image"), href)
        }
    }
}

/** One section of the plan (yachts, villas, cars, restaurants) and its options. */
data class PlanSection(val href: String, val label: String, val candidates: List<PlanItem>) {
    val id: String get() = href

    companion object {
        internal fun decode(json: JsonObject): PlanSection? {
            val href = json.text("href")?.takeIf { it in PlanRules.sections } ?: return null
            val label = json.text("label") ?: return null
            // An option must open inside its own section.
            val candidates = json.lossyArray("candidates", PlanItem::decode)
                .filter { it.href.startsWith("$href/") }
                .take(PlanRules.maxCandidates)
            if (candidates.isEmpty()) return null
            return PlanSection(href, label, candidates)
        }
    }
}

/** Catalogue items for a request that named two or more sections. */
data class ConciergePlan(
    val guests: Int? = null,
    val sections: List<PlanSection>,
    /** False until the site's plan requests are switched on; the cards still show. */
    val requestable: Boolean,
) {
    /**
     * Keeps only options the app can open and gives every photo a full https
     * address. Null when fewer than two sections are left.
     */
    fun resolved(config: AppConfig, policy: RoutePolicy): ConciergePlan? {
        val kept = sections.mapNotNull { section ->
            val items = section.candidates.filter { policy.allowsInApp(it.href) }.map { item ->
                val photo = item.image?.let(config::resolve)?.takeIf { it.startsWith("https://", ignoreCase = true) }
                item.copy(image = photo)
            }
            if (items.isEmpty()) null else section.copy(candidates = items)
        }
        return if (kept.size >= 2) copy(sections = kept) else null
    }

    companion object {
        internal fun decode(json: JsonObject): ConciergePlan? {
            if (json.int("version") != 1) return null
            val sections = json.lossyArray("sections", PlanSection::decode).take(4)
            if (sections.size < 2) return null
            return ConciergePlan(
                guests = json.int("guests")?.takeIf { it in 1..99 },
                sections = sections,
                requestable = json.bool("requestable") ?: false,
            )
        }
    }
}

/** The one request for a whole plan, in the shape `/api/plan` expects. */
class PlanRequest(
    name: String,
    email: String,
    phone: String,
    /** Calendar days, `yyyy-MM-dd`. */
    val start: String,
    val end: String,
    val guests: Int,
    /** `HH:mm`, only when the plan has a restaurant. */
    val time: String?,
    note: String,
    val items: List<Item>,
) {
    data class Item(val kind: String, val slug: String)

    val name: String = name.trim()
    val email: String = email.trim()
    val phone: String = phone.trim()
    val note: String = note.trim()

    /**
     * The same checks the server makes first, so the guest hears about a
     * mistake before anything is sent.
     */
    val isComplete: Boolean
        get() {
            if (name.isEmpty() || name.length > 120 || phone.isEmpty() || phone.length > 40) return false
            if (email.length > 254 || !email.contains("@") || !email.contains(".")) return false
            if (end < start || guests !in 1..99 || note.length > 1000) return false
            if (items.isEmpty() || items.size > PlanRules.maxItems) return false
            val hasRestaurant = items.any { it.kind == "dining" || it.kind == "nightlife" }
            return hasRestaurant == (time != null)
        }

    fun toJson(): ByteArray = buildJsonObject {
        put("name", name)
        put("email", email)
        put("phone", phone)
        put("start", start)
        put("end", end)
        put("guests", guests)
        if (time != null) put("time", time)
        put("note", note)
        put("items", buildJsonArray {
            items.forEach { item ->
                add(buildJsonObject {
                    put("kind", item.kind)
                    put("slug", item.slug)
                })
            }
        })
    }.toString().toByteArray(Charsets.UTF_8)

    /** Two requests are the same send when every detail is the same. */
    override fun equals(other: Any?): Boolean =
        other is PlanRequest && name == other.name && email == other.email && phone == other.phone &&
            start == other.start && end == other.end && guests == other.guests && time == other.time &&
            note == other.note && items == other.items

    override fun hashCode(): Int =
        listOf(name, email, phone, start, end, guests, time, note, items).hashCode()

    companion object {
        /** `yyyy-MM-dd` for a calendar day as the guest picked it. */
        fun day(date: LocalDate): String =
            String.format(Locale.ROOT, "%04d-%02d-%02d", date.year, date.monthValue, date.dayOfMonth)

        /** `HH:mm` for a time of day as the guest picked it. */
        fun clock(time: LocalTime): String =
            String.format(Locale.ROOT, "%02d:%02d", time.hour, time.minute)
    }
}

/** What the server returns once every item of the plan is saved. */
data class PlanReceipt(val planId: String, val bookingIds: List<String>) {
    companion object {
        internal fun decode(json: JsonObject): PlanReceipt? {
            if (json.bool("success") != true) return null
            val planId = json.text("planId")?.takeIf(PlanRules::isUuid) ?: return null
            val raw = json["bookingIds"] as? JsonArray ?: return null
            val ids = raw.map { element ->
                (element as? JsonPrimitive)?.takeIf { it.isString }?.content ?: return null
            }
            if (ids.isEmpty() || !ids.all(PlanRules::isUuid)) return null
            return PlanReceipt(planId, ids)
        }
    }
}

/**
 * Sends a plan to `app/api/plan/route.js`. Anonymous, like every other JSON
 * call the app makes; the same key is reused when a send is retried, so a
 * lost answer never creates a second request.
 */
class PlanClient(
    private val config: AppConfig = AppConfig.production,
    private val transport: HttpTransport,
) {
    fun makeRequest(plan: PlanRequest, key: UUID): HttpRequest {
        val url = config.resolve("/api/plan")
        if (!plan.isComplete || url == null) throw ApiError.InvalidRequest
        return HttpRequest(
            method = "POST",
            url = url,
            headers = mapOf(
                "Content-Type" to "application/json",
                "Accept" to "application/json",
                "User-Agent" to config.userAgentToken,
                "Idempotency-Key" to key.toString().lowercase(),
            ),
            body = plan.toJson(),
        )
    }

    suspend fun send(plan: PlanRequest, key: UUID): PlanReceipt {
        val response = transport.send(makeRequest(plan, key))
        if (response.status != 200) throw ApiError.Status(response.status)
        return Decode.obj(response.body)?.let(PlanReceipt::decode) ?: throw ApiError.Decoding
    }
}
