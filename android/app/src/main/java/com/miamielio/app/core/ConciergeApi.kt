package com.miamielio.app.core

import kotlinx.serialization.json.JsonObject
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

data class ConciergeReply(
    val reply: String,
    val suggestions: List<ConciergeLink> = emptyList(),
    val cards: List<ConciergeCard> = emptyList(),
    /** Handle for the server's conversation memory; echoed back on the next turn. */
    val sessionId: String? = null,
    /** True when no AI engine answered and the server sent its polite fallback. */
    val degraded: Boolean = false,
    /** Real catalogue items when the guest named two or more sections (`lib/ai/plan.mjs`). */
    val plan: ConciergePlan? = null,
) {
    companion object {
        internal fun decode(json: JsonObject): ConciergeReply? {
            val reply = json.text("reply") ?: return null
            return ConciergeReply(
                reply = reply,
                suggestions = json.lossyArray("suggestions", ConciergeLink::decode),
                cards = json.lossyArray("cards", ConciergeCard::decode),
                sessionId = json.text("sessionId"),
                degraded = json.bool("error") ?: false,
                // A malformed plan costs the guest the plan, never the reply.
                plan = json.obj("plan")?.let(ConciergePlan::decode),
            )
        }
    }
}

/** Talks to the site's concierge endpoint (`app/api/chat/route.js`). */
class ConciergeClient(
    private val config: AppConfig = AppConfig.production,
    private val policy: RoutePolicy = RoutePolicy(config),
    private val transport: HttpTransport,
) {
    fun makeRequest(messages: List<ChatMessage>, sessionId: String?, locale: String): HttpRequest {
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
        var body = payload(recent, sessionId, language)
        // A long conversation in a multi-byte script outgrows the body limit
        // before it reaches twelve turns. The oldest turns go first, as in
        // the website's own client (chatPayload in lib/ai/chatRequest.mjs).
        while (body.size > maxBodyBytes && recent.size > 1) {
            recent.removeAt(0)
            body = payload(recent, sessionId, language)
        }

        return HttpRequest(
            method = "POST",
            url = url,
            headers = mapOf(
                "Content-Type" to "application/json",
                "Accept" to "application/json",
                "User-Agent" to config.userAgentToken,
            ),
            body = body,
        )
    }

    suspend fun send(messages: List<ChatMessage>, sessionId: String?, locale: String): ConciergeReply {
        val response = transport.send(makeRequest(messages, sessionId, locale))
        if (response.status != 200) throw ApiError.Status(response.status)
        val decoded = Decode.obj(response.body)?.let(ConciergeReply::decode) ?: throw ApiError.Decoding
        // Only offer destinations the app can actually show.
        return decoded.copy(
            suggestions = decoded.suggestions.filter { policy.allowsInApp(it.href) },
            cards = decoded.cards.filter { policy.allowsInApp(it.href) },
            plan = decoded.plan?.resolved(config, policy),
        )
    }

    private fun payload(messages: List<ChatMessage>, sessionId: String?, locale: String): ByteArray =
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
