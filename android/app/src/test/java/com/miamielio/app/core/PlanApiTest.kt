package com.miamielio.app.core

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID

class PlanApiTest {
    private val user = ChatMessage.Role.User

    private val reply = """
        {"reply":"Here is a plan.","cards":[],"suggestions":[],
         "plan":{"version":1,"guests":4,"requestable":true,"sections":[
           {"href":"/yachts","label":"Yachts","candidates":[
             {"kind":"yacht","slug":"big-yacht","title":"Big Yacht","subtitle":"80 ft","image":"https://images.example.com/y.jpg","href":"/yachts/big-yacht"},
             {"kind":"yacht","slug":"elsewhere","title":"Wrong section","href":"/rentals/elsewhere"},
             {"kind":"experience","slug":"tour","title":"Not plannable","href":"/yachts/tour"}]},
           {"href":"/rentals","label":"Cars","candidates":[
             {"kind":"car","slug":"white-suv","title":"White SUV","image":"/images/rentals/white-suv/cover.jpg","href":"/rentals/white-suv"},
             {"kind":"car","slug":"plain","title":"Plain photo","image":"http://insecure.example.com/a.jpg","href":"/rentals/plain"}]},
           {"href":"/events","label":"Events","candidates":[{"kind":"car","slug":"x","title":"X","href":"/events/x"}]}]}}
    """.trimIndent()

    private suspend fun failureOf(block: suspend () -> Unit): Throwable? = try {
        block()
        null
    } catch (error: Throwable) {
        error
    }

    private fun request(
        time: String? = "20:00",
        end: String = "2027-02-16",
        items: List<PlanRequest.Item> = listOf(
            PlanRequest.Item("yacht", "big-yacht"),
            PlanRequest.Item("dining", "komodo-miami"),
        ),
    ) = PlanRequest(
        name = " Demo Guest ", email = "guest@example.com", phone = "+13055550123",
        start = "2027-02-14", end = end, guests = 4, time = time, note = "",
        items = items,
    )

    @Test
    fun readsThePlanAndKeepsOnlyOptionsThatBelong() = runTest {
        val client = ConciergeClient(transport = MockTransport(json = reply))
        val answer = client.send(listOf(ChatMessage(user, "yacht and a car")), sessionId = null, locale = "en")
        val plan = answer.plan
        assertNotNull(plan)
        assertEquals(4, plan!!.guests)
        assertTrue(plan.requestable)
        assertEquals(listOf("/yachts", "/rentals"), plan.sections.map { it.href })
        assertEquals(listOf("big-yacht"), plan.sections[0].candidates.map { it.slug })
        assertEquals(
            listOf("https://gorgona-one.com/images/rentals/white-suv/cover.jpg", null),
            plan.sections[1].candidates.map { it.image },
        )
        assertEquals("Here is a plan.", answer.reply)
    }

    @Test
    fun aBrokenPlanNeverCostsTheReply() = runTest {
        val broken = listOf(
            """{"version":2,"sections":[]}""",
            """{"version":1,"sections":[{"href":"/yachts","label":"Y","candidates":[{"kind":"yacht","slug":"a","title":"A","href":"/yachts/a"}]}]}""",
            "\"text\"",
        )
        for (plan in broken) {
            val client = ConciergeClient(transport = MockTransport(json = """{"reply":"Hello","plan":$plan}"""))
            val answer = client.send(listOf(ChatMessage(user, "Hi")), sessionId = null, locale = "en")
            assertEquals("Hello", answer.reply)
            assertNull(answer.plan)
        }
    }

    @Test
    fun aReplyWithoutAPlanIsAnOrdinaryReply() = runTest {
        // Production answers this way until the plan feature is merged there.
        val client = ConciergeClient(transport = MockTransport(json = """{"reply":"Hello"}"""))
        val answer = client.send(listOf(ChatMessage(user, "Hi")), sessionId = null, locale = "en")
        assertEquals("Hello", answer.reply)
        assertNull(answer.plan)
    }

    @Test
    fun buildsTheRequestTheServerExpects() {
        val key = UUID.randomUUID()
        val built = PlanClient(transport = MockTransport()).makeRequest(request(), key)
        assertEquals("https://gorgona-one.com/api/plan", built.url)
        assertEquals("POST", built.method)
        assertEquals(key.toString().lowercase(), built.headers["Idempotency-Key"])
        assertEquals("application/json", built.headers["Content-Type"])

        val json = built.jsonBody()
        assertEquals("Demo Guest", json.getValue("name").jsonPrimitive.content)
        assertEquals(4, json.getValue("guests").jsonPrimitive.int)
        assertEquals("20:00", json.getValue("time").jsonPrimitive.content)
        assertEquals(
            listOf("big-yacht", "komodo-miami"),
            json.getValue("items").jsonArray.map { it.jsonObject.getValue("slug").jsonPrimitive.content },
        )

        val noRestaurant = PlanClient(transport = MockTransport()).makeRequest(
            request(time = null, items = listOf(PlanRequest.Item("yacht", "big-yacht"), PlanRequest.Item("car", "white-suv"))),
            key,
        )
        assertFalse(noRestaurant.jsonBody().containsKey("time"))
    }

    @Test
    fun refusesAnIncompletePlanBeforeSending() {
        val client = PlanClient(transport = MockTransport())
        val key = UUID.randomUUID()
        for (incomplete in listOf(request(end = "2027-02-13"), request(time = null), request(items = emptyList()))) {
            assertSame(ApiError.InvalidRequest, assertThrows(ApiError::class.java) { client.makeRequest(incomplete, key) })
        }
    }

    @Test
    fun aRepeatedSendCarriesTheSameKeyAndBody() = runTest {
        val ok = """{"success":true,"planId":"8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a","bookingIds":["8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2b"],"replayed":true}"""
        val transport = MockTransport(json = ok)
        val client = PlanClient(transport = transport)
        val key = UUID.randomUUID()

        client.send(request(), key)
        client.send(request(), key)

        assertEquals(2, transport.requests.size)
        assertEquals(transport.requests[0].headers["Idempotency-Key"], transport.requests[1].headers["Idempotency-Key"])
        assertEquals(transport.requests[0].jsonBody(), transport.requests[1].jsonBody())
        // The same details are the same send; a changed detail is a new one.
        assertEquals(request(), request())
        assertEquals(request().hashCode(), request().hashCode())
        assertNotEquals(request(), request(end = "2027-02-17"))
    }

    @Test
    fun readsTheReceiptAndReportsRefusals() = runTest {
        val ok = """{"success":true,"planId":"8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a","bookingIds":["8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2b","8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2c"],"replayed":false}"""
        val receipt = PlanClient(transport = MockTransport(json = ok)).send(request(), UUID.randomUUID())
        assertEquals("8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a", receipt.planId)
        assertEquals(2, receipt.bookingIds.size)

        assertEquals(
            ApiError.Status(400),
            failureOf {
                PlanClient(transport = MockTransport(status = 400, json = """{"error":"Invalid request"}""")).send(request(), UUID.randomUUID())
            },
        )
        // The test site answers this way while plan requests are switched off.
        assertEquals(
            ApiError.Status(503),
            failureOf {
                PlanClient(transport = MockTransport(status = 503, json = """{"error":"Plan requests are not enabled"}""")).send(request(), UUID.randomUUID())
            },
        )
        assertSame(
            ApiError.Decoding,
            failureOf {
                PlanClient(transport = MockTransport(json = """{"success":true,"planId":"nope","bookingIds":[]}""")).send(request(), UUID.randomUUID())
            },
        )
    }

    @Test
    fun writesCalendarDaysAndTimes() {
        assertEquals("2027-02-04", PlanRequest.day(LocalDate.of(2027, 2, 4)))
        assertEquals("08:05", PlanRequest.clock(LocalTime.of(8, 5)))
    }
}
