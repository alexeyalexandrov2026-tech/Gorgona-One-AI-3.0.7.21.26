package com.miamielio.app.core

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class ConciergeApiTest {
    private val user = ChatMessage.Role.User
    private val assistant = ChatMessage.Role.Assistant
    private val hello = listOf(ChatMessage(user, "Hello"))

    /** The turns of a request as (role, content) pairs. */
    private fun turns(request: HttpRequest): List<Pair<String, String>> =
        request.jsonBody().getValue("messages").jsonArray.map { turn ->
            val fields = turn.jsonObject
            fields.getValue("role").jsonPrimitive.content to fields.getValue("content").jsonPrimitive.content
        }

    private suspend fun failureOf(block: suspend () -> Unit): Throwable? = try {
        block()
        null
    } catch (error: Throwable) {
        error
    }

    @Test
    fun buildsTheRequestTheServerExpects() {
        val client = ConciergeClient(transport = MockTransport())
        val request = client.makeRequest(
            messages = listOf(ChatMessage(user, "Find a yacht for 8 guests")),
            sessionId = "abc-123",
            locale = "ru-RU",
        )

        assertEquals("https://gorgona-one.com/api/chat", request.url)
        assertEquals("POST", request.method)
        assertEquals("application/json", request.headers["Content-Type"])
        assertEquals("MiamiElioApp/1.0", request.headers["User-Agent"])

        val json = request.jsonBody()
        assertEquals("ru", json.getValue("locale").jsonPrimitive.content)
        assertEquals("abc-123", json.getValue("sessionId").jsonPrimitive.content)
        assertEquals(listOf("user" to "Find a yacht for 8 guests"), turns(request))
    }

    @Test
    fun omitsTheSessionOnTheFirstTurnAndFallsBackToEnglish() {
        val client = ConciergeClient(transport = MockTransport())
        val json = client.makeRequest(hello, sessionId = null, locale = "sv-SE").jsonBody()
        assertFalse(json.containsKey("sessionId"))
        assertEquals("en", json.getValue("locale").jsonPrimitive.content)
    }

    @Test
    fun sendsOnlyTheRecentTurnsAndTrimsLongOnes() {
        val client = ConciergeClient(transport = MockTransport())
        val history = (1..20).map { index ->
            ChatMessage(if (index % 2 == 0) assistant else user, "turn $index")
        } + ChatMessage(user, "x".repeat(5000))

        val messages = turns(client.makeRequest(history, sessionId = null, locale = "en"))
        assertEquals(ConciergeClient.historyLimit, messages.size)
        assertEquals("turn 10", messages.first().second)
        assertEquals(ConciergeClient.maxMessageLength, messages.last().second.length)
    }

    @Test
    fun keepsALongConversationUnderTheServersBodyLimit() {
        val client = ConciergeClient(transport = MockTransport())
        // Twelve turns of 3,000 Cyrillic letters are about 72 KB of UTF-8.
        val history = (1..11).map { index ->
            ChatMessage(if (index % 2 == 0) assistant else user, "я".repeat(3000))
        } + ChatMessage(user, "последний вопрос")

        val request = client.makeRequest(history, sessionId = "abc", locale = "ru")
        assertTrue(request.body!!.size <= ConciergeClient.maxBodyBytes)
        val messages = turns(request)
        assertTrue(messages.size < ConciergeClient.historyLimit)
        assertTrue(messages.size > 1)
        assertEquals("user" to "последний вопрос", messages.last())
    }

    @Test
    fun measuresATurnTheWayTheServerDoes() {
        val client = ConciergeClient(transport = MockTransport())
        val emoji = "😀".repeat(3000)
        val content = turns(client.makeRequest(listOf(ChatMessage(user, emoji)), sessionId = null, locale = "en")).first().second
        assertEquals(ConciergeClient.maxMessageLength, content.length)
        assertEquals(ConciergeClient.maxMessageLength / 2, content.codePointCount(0, content.length))

        // Shifted by one letter the limit falls inside an emoji: the whole emoji goes.
        val shifted = ConciergeClient.clipped("a$emoji")
        assertEquals(ConciergeClient.maxMessageLength - 1, shifted.length)
        assertFalse(Character.isHighSurrogate(shifted.last()))
    }

    @Test
    fun leavesOutBlankTurnsAndNeedsTheGuestToSpeakLast() {
        val client = ConciergeClient(transport = MockTransport())
        val request = client.makeRequest(
            messages = listOf(
                ChatMessage(user, "  Hello  "),
                ChatMessage(assistant, " \n "),
                ChatMessage(user, "A yacht"),
            ),
            sessionId = null,
            locale = "en",
        )
        assertEquals(listOf("user" to "Hello", "user" to "A yacht"), turns(request))

        val refused = assertThrows(ApiError::class.java) {
            client.makeRequest(
                messages = listOf(ChatMessage(user, "Hello"), ChatMessage(assistant, "Welcome")),
                sessionId = null,
                locale = "en",
            )
        }
        assertSame(ApiError.InvalidRequest, refused)
    }

    @Test
    fun refusesAnEmptyConversation() {
        val client = ConciergeClient(transport = MockTransport())
        assertSame(
            ApiError.InvalidRequest,
            assertThrows(ApiError::class.java) { client.makeRequest(emptyList(), sessionId = null, locale = "en") },
        )
        assertSame(
            ApiError.InvalidRequest,
            assertThrows(ApiError::class.java) {
                client.makeRequest(listOf(ChatMessage(user, "   ")), sessionId = null, locale = "en")
            },
        )
    }

    @Test
    fun readsAReplyAndDropsDestinationsTheAppDoesNotCarry() = runTest {
        val transport = MockTransport(
            json = """
            {
              "reply": "  Three crewed yachts fit eight guests.  ",
              "suggestions": [
                {"href": "/yachts", "label": "Yachts"},
                {"href": "/sportsbook", "label": "Sportsbooks"},
                {"href": "/events", "label": "Events"}
              ],
              "cards": [
                {"href": "/yachts", "label": "Yachts", "title": "Yacht Charters", "summary": "Crewed charters from Miami marinas.", "cta": "Explore Yachts"},
                {"href": "/sportsbook", "label": "Sportsbooks", "title": "Sportsbooks", "summary": "Offers.", "cta": "Open"}
              ],
              "configured": true,
              "source": "router",
              "sessionId": "session-9"
            }
            """.trimIndent(),
        )
        val client = ConciergeClient(transport = transport)

        val reply = client.send(listOf(ChatMessage(user, "Find a yacht for 8 guests")), sessionId = null, locale = "en")

        assertEquals("Three crewed yachts fit eight guests.", reply.reply)
        assertEquals(listOf(ConciergeLink("/yachts", "Yachts"), ConciergeLink("/events", "Events")), reply.suggestions)
        assertEquals(
            listOf(ConciergeCard("/yachts", "Yacht Charters", "Crewed charters from Miami marinas.", "Explore Yachts")),
            reply.cards,
        )
        assertEquals("session-9", reply.sessionId)
        assertFalse(reply.degraded)
        assertNull(reply.plan)
        assertEquals(1, transport.requests.size)
    }

    @Test
    fun readsTheServersFallbackReply() = runTest {
        val transport = MockTransport(json = """{"reply":"The concierge is resting.","suggestions":[],"cards":[],"configured":true,"error":true}""")
        val reply = ConciergeClient(transport = transport).send(hello, sessionId = null, locale = "en")
        assertEquals("The concierge is resting.", reply.reply)
        assertTrue(reply.degraded)
        assertNull(reply.sessionId)
    }

    @Test
    fun keepsTheReplyWhenACardIsMalformed() = runTest {
        val transport = MockTransport(
            json = """{"reply":"Here you go.","suggestions":[{"href":"/yachts"},42,{"href":"/rentals","label":"Cars"}],"cards":"none"}""",
        )
        val reply = ConciergeClient(transport = transport).send(hello, sessionId = null, locale = "en")
        assertEquals("Here you go.", reply.reply)
        assertEquals(listOf(ConciergeLink("/rentals", "Cars")), reply.suggestions)
        assertEquals(emptyList<ConciergeCard>(), reply.cards)
    }

    @Test
    fun reportsServerAndFormatFailures() = runTest {
        assertEquals(
            ApiError.Status(503),
            failureOf { ConciergeClient(transport = MockTransport(status = 503)).send(hello, sessionId = null, locale = "en") },
        )
        assertSame(
            ApiError.Decoding,
            failureOf { ConciergeClient(transport = MockTransport(json = """{"reply":""}""")).send(hello, sessionId = null, locale = "en") },
        )
        assertSame(
            ApiError.Decoding,
            failureOf { ConciergeClient(transport = MockTransport(json = "<html>")).send(hello, sessionId = null, locale = "en") },
        )
    }
}
