package com.miamielio.app.concierge

import com.miamielio.app.core.AnswerReport
import com.miamielio.app.core.AnswerReporter
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.PlanClient
import com.miamielio.app.core.PlanRequest
import com.miamielio.app.core.jsonBody
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.IOException

@OptIn(ExperimentalCoroutinesApi::class)
class ConciergeViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val chat = ScriptedTransport()
    private val plans = ScriptedTransport()

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    private fun model(reporter: AnswerReporter? = null, locale: String = "ru") = ConciergeViewModel(
        client = ConciergeClient(transport = chat),
        planClient = PlanClient(transport = plans),
        reporter = reporter,
        locale = { locale },
    )

    private fun test(block: suspend TestScope.() -> Unit) = runTest(dispatcher) { block() }

    private fun request(note: String = "", end: String = "2027-02-16", name: String = "Demo Guest") = PlanRequest(
        name = name, email = "guest@example.com", phone = "+13055550123",
        start = "2027-02-14", end = end, guests = 4, time = "20:00", note = note,
        items = listOf(PlanRequest.Item("yacht", "big-yacht"), PlanRequest.Item("dining", "komodo-miami")),
    )

    private val ConciergeViewModel.kinds get() = state.value.entries.map { it.kind }

    // region Conversation

    @Test
    fun sendsTheWholeConversationInTheSiteLanguageAndKeepsTheSession() = test {
        val model = model()
        chat.reply(Replies.text("Hello")).reply(Replies.text("More soon", session = null))

        model.setDraft("  Hi  ")
        model.send()
        assertEquals("", model.state.value.draft)
        assertTrue(model.state.value.isSending)
        advanceUntilIdle()

        model.send("More")
        advanceUntilIdle()

        val first = chat.requests[0].jsonBody()
        assertEquals("ru", first["locale"]!!.jsonPrimitive.content)
        assertNull(first["sessionId"])
        val second = chat.requests[1].jsonBody()
        assertEquals("s-1", second["sessionId"]!!.jsonPrimitive.content)
        assertEquals(
            listOf("user" to "Hi", "assistant" to "Hello", "user" to "More"),
            second["messages"]!!.jsonArray.map {
                it.jsonObject["role"]!!.jsonPrimitive.content to it.jsonObject["content"]!!.jsonPrimitive.content
            },
        )
        assertEquals(
            listOf(ConciergeEntry.Kind.Guest, ConciergeEntry.Kind.Concierge, ConciergeEntry.Kind.Guest, ConciergeEntry.Kind.Concierge),
            model.kinds,
        )
        assertFalse(model.state.value.isSending)
    }

    @Test
    fun aReadyMadePromptLeavesWhatTheGuestTypedAlone() = test {
        val model = model()
        chat.reply(Replies.text("Sure"))
        model.setDraft("half a thought")
        model.send("Plan a weekend in Miami")
        advanceUntilIdle()
        assertEquals("half a thought", model.state.value.draft)
        assertEquals("Plan a weekend in Miami", model.state.value.entries.first().text)
    }

    @Test
    fun nothingGoesWhenBlankOrWhileAReplyIsOnItsWay() = test {
        val model = model()
        model.send("   ")
        assertTrue(chat.requests.isEmpty())
        assertFalse(model.state.value.canSend)

        val held = chat.hold()
        model.send("First")
        advanceUntilIdle()
        model.setDraft("Second")
        assertFalse(model.state.value.canSend)
        model.send()
        advanceUntilIdle()
        assertEquals(1, chat.requests.size)
        assertEquals("Second", model.state.value.draft)

        held.release(ScriptedTransport.Answer.Json(200, Replies.text("Done")))
        advanceUntilIdle()
        assertTrue(model.state.value.canSend)
    }

    @Test
    fun aFailureOffersARetryThatAsksAgain() = test {
        val model = model()
        chat.offline().reply(Replies.text("Back again"))
        model.send("Hi")
        advanceUntilIdle()
        assertEquals(listOf(ConciergeEntry.Kind.Guest, ConciergeEntry.Kind.Failed), model.kinds)

        model.retry()
        advanceUntilIdle()
        assertEquals(listOf(ConciergeEntry.Kind.Guest, ConciergeEntry.Kind.Concierge), model.kinds)
        // The failure was never part of the conversation the server sees.
        assertEquals(1, chat.requests[1].jsonBody()["messages"]!!.jsonArray.size)
    }

    @Test
    fun aNewMessageAfterAFailureReplacesTheRetry() = test {
        val model = model()
        chat.offline().reply(Replies.text("Got both"))
        model.send("Hi")
        advanceUntilIdle()
        model.send("Hello?")
        advanceUntilIdle()
        assertEquals(
            listOf(ConciergeEntry.Kind.Guest, ConciergeEntry.Kind.Guest, ConciergeEntry.Kind.Concierge),
            model.kinds,
        )
    }

    @Test
    fun aNewConversationStaysEmptyWhenTheOldReplyArrivesLate() = test {
        val model = model()
        val held = chat.hold()
        model.send("Hi")
        advanceUntilIdle()
        model.setDraft("kept")
        model.reset()
        held.release(ScriptedTransport.Answer.Json(200, Replies.text("Too late")))
        advanceUntilIdle()

        assertTrue(model.state.value.entries.isEmpty())
        assertFalse(model.state.value.isSending)
        assertEquals("kept", model.state.value.draft)

        chat.reply(Replies.text("Fresh"))
        model.send("Start over")
        advanceUntilIdle()
        assertNull(chat.requests.last().jsonBody()["sessionId"])
    }

    // endregion

    // region Plan

    @Test
    fun thePlanCanBeChangedBeforeItIsSent() = test {
        val model = model()
        chat.reply(Replies.withPlan()).reply(Replies.text("Anything else?"))
        model.send("Yacht and dinner")
        advanceUntilIdle()

        val plan = model.state.value.plan
        assertNotNull(plan)
        val (yachts, dining) = plan!!.plan.sections
        assertEquals(listOf("Big Yacht", "Komodo"), plan.items.map { it.title })
        assertTrue(plan.hasRestaurant)

        model.showAnotherOption(yachts)
        assertEquals("Small Yacht", model.state.value.plan!!.item(yachts).title)
        model.showAnotherOption(yachts)
        assertEquals("Big Yacht", model.state.value.plan!!.item(yachts).title)
        model.showAnotherOption(dining)
        assertEquals("Komodo", model.state.value.plan!!.item(dining).title)

        model.removeFromPlan(dining)
        assertEquals(listOf("Big Yacht"), model.state.value.plan!!.items.map { it.title })
        assertFalse(model.state.value.plan!!.hasRestaurant)

        // A reply without a plan keeps the plan and the guest's changes.
        model.send("Thanks")
        advanceUntilIdle()
        assertEquals(listOf("Big Yacht"), model.state.value.plan!!.items.map { it.title })

        model.restoreToPlan(dining)
        assertEquals(listOf("Big Yacht", "Komodo"), model.state.value.plan!!.items.map { it.title })
    }

    @Test
    fun anIncompleteRequestSaysWhatIsWrongWithoutSending() = test {
        val model = model()
        chat.reply(Replies.withPlan())
        model.send("Plan")
        advanceUntilIdle()

        model.sendPlan(request(end = "2027-02-10"))
        assertEquals(PlanProblem.BadDates, model.state.value.planProblem)
        model.sendPlan(request(name = " "))
        assertEquals(PlanProblem.Check, model.state.value.planProblem)
        assertTrue(plans.requests.isEmpty())

        model.clearPlanProblem()
        assertNull(model.state.value.planProblem)
    }

    @Test
    fun aRetriedRequestKeepsItsKeyAndTheReceiptFreezesThePlan() = test {
        val model = model()
        chat.reply(Replies.withPlan())
        plans.offline().reply(Replies.receipt)
        model.send("Plan")
        advanceUntilIdle()

        model.sendPlan(request())
        assertTrue(model.state.value.isSendingPlan)
        advanceUntilIdle()
        assertEquals(PlanProblem.Failed, model.state.value.planProblem)
        assertNull(model.state.value.plan!!.receipt)

        model.sendPlan(request())
        advanceUntilIdle()
        assertNull(model.state.value.planProblem)
        assertFalse(model.state.value.isSendingPlan)
        val receipt = model.state.value.plan!!.receipt
        assertNotNull(receipt)
        assertEquals(2, receipt!!.bookingIds.size)

        val keys = plans.requests.map { it.headers["Idempotency-Key"] }
        assertEquals(2, keys.size)
        assertNotNull(keys[0])
        assertEquals(keys[0], keys[1])

        // What was sent no longer changes.
        val yachts = model.state.value.plan!!.plan.sections.first()
        model.removeFromPlan(yachts)
        model.showAnotherOption(yachts)
        assertEquals(listOf("Big Yacht", "Komodo"), model.state.value.plan!!.items.map { it.title })
        model.sendPlan(request())
        advanceUntilIdle()
        assertEquals(2, plans.requests.size)

        model.clearPlan()
        assertNull(model.state.value.plan)
    }

    @Test
    fun aChangedOrRefusedRequestGetsANewKey() = test {
        val model = model()
        chat.reply(Replies.withPlan())
        plans.offline().reply("""{"error":"Invalid request"}""", status = 400).reply(Replies.receipt)
        model.send("Plan")
        advanceUntilIdle()

        model.sendPlan(request())
        advanceUntilIdle()
        model.sendPlan(request(note = "Window table, please"))
        advanceUntilIdle()
        assertEquals(PlanProblem.Check, model.state.value.planProblem)
        // Refused: the same details again are a new request.
        model.sendPlan(request(note = "Window table, please"))
        advanceUntilIdle()

        val keys = plans.requests.map { it.headers["Idempotency-Key"] }
        assertEquals(3, keys.toSet().size)
        assertNotNull(model.state.value.plan!!.receipt)
    }

    @Test
    fun aNewPlanThatArrivesDuringASendIsLeftAlone() = test {
        val model = model()
        chat.reply(Replies.withPlan()).reply(Replies.withPlan(reply = "Or this", yacht = "Other Yacht"))
        val held = plans.hold()
        model.send("Plan")
        advanceUntilIdle()

        model.sendPlan(request())
        advanceUntilIdle()
        model.send("Something different")
        advanceUntilIdle()
        held.release(ScriptedTransport.Answer.Json(200, Replies.receipt))
        advanceUntilIdle()

        val plan = model.state.value.plan!!
        assertEquals("Other Yacht", plan.items.first().title)
        assertNull(plan.receipt)
        assertFalse(model.state.value.isSendingPlan)
    }

    @Test
    fun aPlanTheSiteCannotTakeYetIsNotSent() = test {
        val model = model()
        chat.reply(Replies.withPlan(requestable = false))
        model.send("Plan")
        advanceUntilIdle()
        model.sendPlan(request())
        advanceUntilIdle()
        assertTrue(plans.requests.isEmpty())
        assertNull(model.state.value.planProblem)
    }

    // endregion

    // region Report

    @Test
    fun withNowhereToSendIt_noAnswerCanBeReported() = test {
        val model = model(reporter = null)
        chat.reply(Replies.text("Hello"))
        model.send("Hi")
        advanceUntilIdle()
        assertFalse(model.canReport)
        model.report(model.state.value.entries.last().id, "wrong")
        advanceUntilIdle()
        assertEquals(ReportStatus.None, model.state.value.entries.last().report)
    }

    @Test
    fun aReportCarriesTheAnswerItsQuestionAndTheNote() = test {
        val sent = mutableListOf<AnswerReport>()
        val attempts = mutableListOf<AnswerReport>()
        var fails = true
        val model = model(reporter = { report ->
            attempts += report
            if (fails) {
                fails = false
                throw IOException("offline")
            }
            sent += report
        })
        chat.reply(Replies.text("A wrong answer"))
        model.send("A question")
        advanceUntilIdle()
        val answer = model.state.value.entries.last()
        assertTrue(model.canReport)

        model.report(answer.id, "  not true  ")
        assertEquals(ReportStatus.Sending, model.state.value.entries.last().report)
        advanceUntilIdle()
        assertEquals(ReportStatus.Failed, model.state.value.entries.last().report)

        model.report(answer.id, "  not true  ")
        advanceUntilIdle()
        assertEquals(ReportStatus.Sent, model.state.value.entries.last().report)
        assertEquals(2, attempts.size)
        val expected = AnswerReport("A wrong answer", "A question", "not true", "s-1", "ru", attempts.first().idempotencyKey)
        assertEquals(listOf(expected), sent)

        // Once is enough; the guest's own message cannot be reported.
        model.report(answer.id, "again")
        model.report(model.state.value.entries.first().id, "mine")
        advanceUntilIdle()
        assertEquals(1, sent.size)
        assertNotEquals(ReportStatus.Sent, model.state.value.entries.first().report)
    }

    // endregion
}
