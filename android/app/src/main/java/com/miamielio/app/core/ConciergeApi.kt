package com.miamielio.app.core

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** One turn of the conversation, in the shape `/api/chat` expects. */
data class ChatMessage(val role: Role, val content: String) {
    enum class Role(val wire: String) { User("user"), Assistant("assistant") }
}

/** A compact chip under a reply: somewhere to go next. */
data class ConciergeLink(val href: String, val label: String) {
    val id: String get() = href

    companion object {
        internal fun decode(json: JsonObject): ConciergeLink? {
            val href = json.text("href") ?: return null
            val label = json.text("label") ?: return null
            return ConciergeLink(href, label)
        }
    }
}

/** A richer navigation card: a section of the site with a line about it. */
data class ConciergeCard(
    val href: String,
    val title: String,
    val summary: String? = null,
    val cta: String? = null,
) {
    val id: String get() = href

    companion object {
        internal fun decode(json: JsonObject): ConciergeCard? {
            val href = json.text("href") ?: return null
            val title = json.text("title") ?: json.text("label") ?: return null
            return ConciergeCard(href, title, json.text("summary"), json.text("cta"))
        }
    }
}

/** Direct partner booking action returned inside a listing card (Viator, TicketNetwork, etc.). */
data class ListingBooking(
    val platform: String,
    val href: String,
    val label: String? = null,
) {
    companion object {
        internal fun decode(json: JsonObject): ListingBooking? {
            val href = json.text("href") ?: json.text("url") ?: return null
            val platform = json.text("platform") ?: "partner"
            return ListingBooking(platform = platform, href = href, label = json.text("label"))
        }
    }
}

/**
 * A real catalogue row under a reply: a yacht, villa, car or table with its
 * photo and stored price (`lib/ai/listingCards.mjs`). The title, price and
 * link come from the site's own index, never from the model.
 */
data class ConciergeListing(
    val href: String,
    val title: String,
    /** The kind of thing, as the site labels it ("Yacht", "Villa"). */
    val label: String? = null,
    /** Absolute https address once the client has resolved it. */
    val image: String? = null,
    val price: String? = null,
    val summary: String? = null,
    /** Live calendar check ("available" or "busy") when dates were supplied. */
    val availabilityStatus: String? = null,
    /** Verified multi-day estimate formatted in the guest's language. */
    val estimatedTotal: String? = null,
    /** Optional Split-Pay per-guest figure formatted in the guest's language. */
    val perGuest: String? = null,
    /** Optional partner booking target (Viator, TicketNetwork, etc.). */
    val booking: ListingBooking? = null,
) {
    val id: String get() = booking?.href?.takeIf { href.isBlank() } ?: href

    /** Preferred destination when the guest taps the card. */
    val openHref: String get() = booking?.href?.takeIf { !href.startsWith("/") } ?: href

    companion object {
        /** The site sends at most this many; anything more is ignored. */
        const val maxCount = 4

        internal fun decode(json: JsonObject): ConciergeListing? {
            val href = json.text("href") ?: return null
            val title = json.text("title") ?: return null
            val availability = json.text("availabilityStatus")
                ?.takeIf { it == "available" || it == "busy" }
            val booking = json.obj("booking")?.let(ListingBooking::decode)
            return ConciergeListing(
                href = href,
                title = title,
                label = json.text("label"),
                image = json.text("image"),
                price = json.text("price"),
                summary = json.text("summary") ?: json.text("subtitle"),
                availabilityStatus = availability,
                estimatedTotal = json.text("estimatedTotal"),
                perGuest = json.text("perGuest"),
                booking = booking,
            )
        }
    }
}

data class ConciergeReply(
    val reply: String,
    val suggestions: List<ConciergeLink> = emptyList(),
    val cards: List<ConciergeCard> = emptyList(),
    /** Catalogue rows with photos and prices, shown above the section cards. */
    val listings: List<ConciergeListing> = emptyList(),
    /** Handle for the server's conversation memory; echoed back on the next turn. */
    val sessionId: String? = null,
    /** True when no AI engine answered and the server sent its polite fallback. */
    val degraded: Boolean = false,
    /** Real catalogue items when the guest named two or more sections (`lib/ai/plan.mjs`). */
    val plan: ConciergePlan? = null,
    /** Language code the model actually answered in, for matching TTS voice. */
    val replyLocale: String? = null,
    /** Up to 3 contextual follow-up prompts the guest can tap to continue the chat. */
    val followups: List<String> = emptyList(),
    /** True when the server recommends connecting the guest with the live Miami Elio team. */
    val handoff: Boolean = false,
    /** Short summary suitable for prefilling a WhatsApp handoff message to the team. */
    val handoffSummary: String? = null,
) {
    companion object {
        internal fun decode(json: JsonObject): ConciergeReply? {
            val reply = json.text("reply") ?: return null
            val followups = (json["followups"] as? JsonArray)
                ?.mapNotNull { (it as? JsonPrimitive)?.takeIf { p -> p.isString }?.content?.trim()?.takeIf(String::isNotEmpty) }
                ?.distinct()
                ?.take(3)
                .orEmpty()
            return ConciergeReply(
                reply = reply,
                suggestions = json.lossyArray("suggestions", ConciergeLink::decode),
                cards = json.lossyArray("cards", ConciergeCard::decode),
                listings = json.lossyArray("listings", ConciergeListing::decode)
                    .distinctBy { it.href }
                    .take(ConciergeListing.maxCount),
                sessionId = json.text("sessionId"),
                degraded = json.bool("error") ?: false,
                // A malformed plan costs the guest the plan, never the reply.
                plan = json.obj("plan")?.let(ConciergePlan::decode),
                replyLocale = json.text("replyLocale")?.let(SiteLocale::normalize),
                followups = followups,
                handoff = json.bool("handoff") ?: false,
                handoffSummary = json.text("handoffSummary"),
            )
        }
    }
}

/** Talks to the site's AI chat endpoint (`app/api/chat/route.js`), supporting JSON and SSE streaming. */
class ConciergeClient(
    private val config: AppConfig = AppConfig.production,
    private val policy: RoutePolicy = RoutePolicy(config),
    private val transport: HttpTransport,
) {
    fun makeRequest(
        messages: List<ChatMessage>,
        sessionId: String?,
        locale: String,
        voiceMode: Boolean = false,
        authToken: String? = null,
        pagePath: String? = null,
        acceptStream: Boolean = false,
    ): HttpRequest {
        // The server answers 400 to a blank turn, an over-long one, or a
        // conversation that does not end on the guest's own words.
        val recent = messages.takeLast(historyLimit).mapNotNull { message ->
            val text = clipped(message.content.trim())
            if (text.isEmpty()) null else ChatMessage(message.role, text)
        }.toMutableList()
        val url = config.resolve("/api/chat")
        if (recent.lastOrNull()?.role != ChatMessage.Role.User || url == null) {
            throw ApiError.InvalidRequest
        }

        val language = SiteLocale.normalize(locale) ?: SiteLocale.fallback
        val safePagePath = pagePath?.trim()?.takeIf { it.startsWith("/") && !it.startsWith("//") && it.length <= 120 }
        var body = payload(recent, sessionId, language, voiceMode, safePagePath)
        // A long conversation in a multi-byte script outgrows the body limit
        // before it reaches twelve turns. The oldest turns go first, as in
        // the website's own client (chatPayload in lib/ai/chatRequest.mjs).
        while (body.size > maxBodyBytes && recent.size > 1) {
            recent.removeAt(0)
            body = payload(recent, sessionId, language, voiceMode, safePagePath)
        }

        val headers = linkedMapOf(
            "Content-Type" to "application/json",
            "Accept" to if (acceptStream) "text/event-stream" else "application/json",
            "User-Agent" to config.userAgentToken,
        )
        // Only send the guest's Supabase Bearer token to Miami Elio's own HTTPS origin.
        val token = authToken?.trim()?.takeIf { it.length >= 20 && !it.any(Char::isWhitespace) }
        val host = WebAddress.parse(url)?.host
        if (token != null && host != null && host in config.internalHosts && url.startsWith("https://", ignoreCase = true)) {
            headers["Authorization"] = "Bearer $token"
        }

        return HttpRequest(
            method = "POST",
            url = url,
            headers = headers,
            body = body,
        )
    }

    suspend fun send(
        messages: List<ChatMessage>,
        sessionId: String?,
        locale: String,
        voiceMode: Boolean = false,
        authToken: String? = null,
        pagePath: String? = null,
    ): ConciergeReply {
        val response = transport.send(
            makeRequest(messages, sessionId, locale, voiceMode, authToken, pagePath, acceptStream = false),
        )
        if (response.status != 200) throw ApiError.Status(response.status)
        val decoded = Decode.obj(response.body)?.let(ConciergeReply::decode) ?: throw ApiError.Decoding
        return sanitize(decoded)
    }

    /**
     * Streams progress status labels and text deltas over SSE when backed by a
     * [StreamingHttpTransport], falling back cleanly to standard JSON otherwise.
     */
    suspend fun sendStreaming(
        messages: List<ChatMessage>,
        sessionId: String?,
        locale: String,
        voiceMode: Boolean = false,
        authToken: String? = null,
        pagePath: String? = null,
        onStatus: (String) -> Unit = {},
        onDelta: (String) -> Unit = {},
        onReset: () -> Unit = {},
    ): ConciergeReply {
        val streaming = transport as? StreamingHttpTransport
            ?: return send(messages, sessionId, locale, voiceMode, authToken, pagePath)

        val request = makeRequest(messages, sessionId, locale, voiceMode, authToken, pagePath, acceptStream = true)
        var finalReply: ConciergeReply? = null
        var streamError = false
        val fallbackResponse = streaming.stream(request) { event, data ->
            val obj = Decode.obj(data.toByteArray(Charsets.UTF_8)) ?: return@stream
            when (event) {
                "status" -> obj.text("label")?.let(onStatus)
                "delta" -> (obj["text"] as? JsonPrimitive)?.takeIf { it.isString }?.content?.takeIf { it.isNotEmpty() }?.let(onDelta)
                "reset" -> onReset()
                "done" -> finalReply = ConciergeReply.decode(obj)
                "error" -> streamError = true
            }
        }
        if (fallbackResponse != null) {
            if (fallbackResponse.status != 200) throw ApiError.Status(fallbackResponse.status)
            val decoded = Decode.obj(fallbackResponse.body)?.let(ConciergeReply::decode) ?: throw ApiError.Decoding
            return sanitize(decoded)
        }
        if (streamError || finalReply == null) throw ApiError.Decoding
        return sanitize(finalReply!!)
    }

    private fun sanitize(decoded: ConciergeReply): ConciergeReply {
        val offered = { href: String -> policy.allowsInApp(href) && !PartnerOnly.isRetiredListing(href) }
        val sanitizedListings = decoded.listings.mapNotNull { listing ->
            val safeBooking = listing.booking?.let { b ->
                val resolvedBooking = config.resolve(b.href)
                val decision = resolvedBooking?.let(policy::decide)
                val allowed = resolvedBooking != null &&
                    resolvedBooking.startsWith("https://", ignoreCase = true) &&
                    (decision == RouteDecision.Web || decision == RouteDecision.Browser || decision == RouteDecision.System)
                if (allowed) b.copy(href = resolvedBooking) else null
            }
            val inAppAllowed = offered(listing.href)
            val partnerAllowed = !PartnerOnly.isRetiredListing(listing.href) &&
                policy.decide(config.resolve(listing.href) ?: listing.href) != RouteDecision.Restricted &&
                safeBooking != null
            if (!inAppAllowed && !partnerAllowed) return@mapNotNull null

            val photo = listing.image?.let(config::resolve)?.takeIf { it.startsWith("https://", ignoreCase = true) }
            val resolvedHref = if (inAppAllowed) listing.href else safeBooking!!.href
            listing.copy(href = resolvedHref, image = photo, booking = safeBooking)
        }
        return decoded.copy(
            suggestions = decoded.suggestions.filter { offered(it.href) },
            cards = decoded.cards.filter { offered(it.href) },
            listings = sanitizedListings,
            plan = decoded.plan?.resolved(config, policy),
        )
    }

    private fun payload(
        messages: List<ChatMessage>,
        sessionId: String?,
        locale: String,
        voiceMode: Boolean,
        pagePath: String?,
    ): ByteArray =
        buildJsonObject {
            put("messages", buildJsonArray {
                messages.forEach { message ->
                    add(buildJsonObject {
                        put("role", message.role.wire)
                        put("content", message.content)
                    })
                }
            })
            if (sessionId != null) put("sessionId", sessionId)
            put("locale", locale)
            if (voiceMode) put("voiceMode", true)
            if (pagePath != null) put("pagePath", pagePath)
        }.toString().toByteArray(Charsets.UTF_8)

    companion object {
        /** The server reads at most this many turns; sending more is wasted bytes. */
        const val historyLimit = 12

        /**
         * The server refuses a turn longer than this (lib/ai/chatRequest.mjs).
         * It counts the way JavaScript does, in UTF-16 units: an emoji is two.
         */
        const val maxMessageLength = 4000

        /** The server refuses a request body larger than this many bytes. */
        const val maxBodyBytes = 32_768

        /**
         * The start of `text` that fits in [maxMessageLength] UTF-16 units,
         * cut so an emoji is never split in half.
         */
        fun clipped(text: String): String {
            if (text.length <= maxMessageLength) return text
            var end = maxMessageLength
            if (Character.isHighSurrogate(text[end - 1])) end -= 1
            return text.substring(0, end)
        }
    }
}
