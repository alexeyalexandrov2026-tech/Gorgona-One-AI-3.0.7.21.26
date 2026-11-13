package com.miamielio.app.concierge

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.miamielio.app.core.AnswerReport
import com.miamielio.app.core.AnswerReporter
import com.miamielio.app.core.ApiError
import com.miamielio.app.core.ChatMessage
import com.miamielio.app.core.ConciergeCard
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.ConciergeLink
import com.miamielio.app.core.ConciergePlan
import com.miamielio.app.core.ConciergeReply
import com.miamielio.app.core.PlanClient
import com.miamielio.app.core.PlanItem
import com.miamielio.app.core.PlanRequest
import com.miamielio.app.core.PlanReceipt
import com.miamielio.app.core.PlanSection
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

/** One row of the conversation. */
data class ConciergeEntry(
    val id: Long,
    val kind: Kind,
    /** What was said. Empty for [Kind.Failed]: the screen says what went wrong. */
    val text: String,
    val suggestions: List<ConciergeLink> = emptyList(),
    val cards: List<ConciergeCard> = emptyList(),
    /** How far a report on this answer got. */
    val report: ReportStatus = ReportStatus.None,
) {
    enum class Kind {
        Guest,
        Concierge,

        /** The request never got an answer; offers a retry. */
        Failed,
    }
}

enum class ReportStatus { None, Sending, Sent, Failed }

/**
 * The guest's working copy of the latest plan: which option each section
 * shows, which sections were taken out, and the receipt once it is sent.
 */
data class PlanDraft(
    val plan: ConciergePlan,
    val shown: Map<String, Int> = emptyMap(),
    val removed: Set<String> = emptySet(),
    val receipt: PlanReceipt? = null,
) {
    fun item(section: PlanSection): PlanItem {
        val index = shown[section.href] ?: 0
        return section.candidates[index.coerceIn(0, section.candidates.size - 1)]
    }

    /** What would be requested: the shown option of every section left in. */
    val items: List<PlanItem>
        get() = plan.sections.filter { it.href !in removed }.map(::item)

    /** A restaurant in the plan needs a time for dinner. */
    val hasRestaurant: Boolean get() = items.any { it.isRestaurant }
}

/** Why a plan request did not go. */
enum class PlanProblem {
    /** The last day is before the first. */
    BadDates,

    /** A detail is missing or the server refused one. */
    Check,

    /** The request did not reach the team; the same send may be tried again. */
    Failed,
}

data class ConciergeState(
    val entries: List<ConciergeEntry> = emptyList(),
    /** A reply is on its way. */
    val isSending: Boolean = false,
    val plan: PlanDraft? = null,
    val isSendingPlan: Boolean = false,
    /** What stopped the last plan request, until the guest tries again. */
    val planProblem: PlanProblem? = null,
    /** What is in the composer. */
    val draft: String = "",
) {
    val canSend: Boolean get() = !isSending && draft.isNotBlank()
}

/**
 * The concierge conversation: what was said, what is being sent, and the
 * handle the server uses to remember the thread. Mirrors the iPhone app's
 * `ConciergeStore`.
 *
 * @param reporter delivers "report this answer"; null while there is
 *   nowhere to deliver it, and then the action is not offered.
 * @param locale the language the guest last chose on the site: the
 *   concierge answers in it.
 */
class ConciergeViewModel(
    private val client: ConciergeClient,
    private val planClient: PlanClient,
    private val reporter: AnswerReporter?,
    private val locale: () -> String,
) : ViewModel() {
    private val mutableState = MutableStateFlow(ConciergeState())
    val state: StateFlow<ConciergeState> = mutableState.asStateFlow()

    /** The key of the last plan send, reused while its details stay the same. */
    private var planAttempt: Pair<PlanRequest, UUID>? = null
    private var sessionId: String? = null
    private var job: Job? = null
    private var nextId = 0L

    /** True when a report on an answer can actually be delivered. */
    val canReport: Boolean get() = reporter != null

    fun setDraft(text: String) = mutableState.update { it.copy(draft = text) }

    /**
     * Puts a request in the composer for the guest to read and send, as
     * when they open a season reminder. Nothing goes until they send it.
     */
    fun prepare(text: String) = setDraft(text)

    /** Sends the draft, or a ready-made prompt when one is given. */
    fun send(prompt: String? = null) {
        val current = mutableState.value
        val text = (prompt ?: current.draft).trim()
        if (text.isEmpty() || current.isSending) return
        mutableState.update { state ->
            state.copy(
                draft = if (prompt == null) "" else state.draft,
                entries = state.entries.filter { it.kind != ConciergeEntry.Kind.Failed } +
                    entry(ConciergeEntry.Kind.Guest, text),
            )
        }
        request()
    }

    /** Asks again after a failure; the guest's message is still in the thread. */
    fun retry() {
        val current = mutableState.value
        if (current.isSending || current.entries.lastOrNull()?.kind != ConciergeEntry.Kind.Failed) return
        mutableState.update { it.copy(entries = it.entries.dropLast(1)) }
        request()
    }

    /** A new conversation. Whatever is in the composer stays there. */
    fun reset() {
        job?.cancel()
        job = null
        sessionId = null
        planAttempt = null
        mutableState.update { ConciergeState(draft = it.draft) }
    }

    // region Plan

    fun showAnotherOption(section: PlanSection) = editPlan { draft ->
        if (section.candidates.size <= 1) return@editPlan draft
        val next = ((draft.shown[section.href] ?: 0) + 1) % section.candidates.size
        draft.copy(shown = draft.shown + (section.href to next))
    }

    fun removeFromPlan(section: PlanSection) = editPlan { it.copy(removed = it.removed + section.href) }

    fun restoreToPlan(section: PlanSection) = editPlan { it.copy(removed = it.removed - section.href) }

    /** Puts the plan away, for a new one after a request was sent. */
    fun clearPlan() {
        planAttempt = null
        mutableState.update { it.copy(plan = null, planProblem = null) }
    }

    /** The request form opens afresh, without the last attempt's complaint. */
    fun clearPlanProblem() = mutableState.update { it.copy(planProblem = null) }

    /** A sent plan is a record of what was asked for; it no longer changes. */
    private fun editPlan(change: (PlanDraft) -> PlanDraft) = mutableState.update { state ->
        val draft = state.plan
        if (draft == null || draft.receipt != null) state else state.copy(plan = change(draft))
    }

    /**
     * Sends every item left in the plan as one request. When it went through
     * the receipt is on the plan; otherwise [ConciergeState.planProblem] says
     * why. A send repeated with nothing changed carries the same key, so an
     * answer lost on the way never makes a second request.
     */
    fun sendPlan(request: PlanRequest) {
        val current = mutableState.value
        val sent = current.plan ?: return
        if (current.isSendingPlan || sent.receipt != null || !sent.plan.requestable) return
        if (!request.isComplete) {
            val problem = if (request.end < request.start) PlanProblem.BadDates else PlanProblem.Check
            mutableState.update { it.copy(planProblem = problem) }
            return
        }
        val key = planAttempt?.takeIf { it.first == request }?.second ?: UUID.randomUUID()
        planAttempt = request to key
        mutableState.update { it.copy(isSendingPlan = true, planProblem = null) }

        viewModelScope.launch {
            var problem: PlanProblem? = null
            try {
                val receipt = planClient.send(request, key)
                planAttempt = null
                // A new plan that arrived meanwhile is left untouched.
                mutableState.update { state ->
                    val now = state.plan
                    if (now != null && now.plan == sent.plan) state.copy(plan = now.copy(receipt = receipt)) else state
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiError.Status) {
                // The server read the request and refused it: a corrected
                // request is a new one, with a new key.
                if (e.code == 400) {
                    planAttempt = null
                    problem = PlanProblem.Check
                } else {
                    problem = PlanProblem.Failed
                }
            } catch (_: Exception) {
                problem = PlanProblem.Failed
            } finally {
                mutableState.update { it.copy(isSendingPlan = false, planProblem = problem) }
            }
        }
    }

    // endregion

    /**
     * Reports one answer, with the guest's note. The entry shows how far it
     * got; a report that arrived cannot be sent again.
     */
    fun report(entryId: Long, note: String) {
        val sender = reporter ?: return
        val entries = mutableState.value.entries
        val index = entries.indexOfFirst { it.id == entryId && it.kind == ConciergeEntry.Kind.Concierge }
        if (index < 0) return
        val answer = entries[index]
        if (answer.report == ReportStatus.Sending || answer.report == ReportStatus.Sent) return
        val question = entries.take(index).lastOrNull { it.kind == ConciergeEntry.Kind.Guest }?.text.orEmpty()
        val report = AnswerReport(
            answer = answer.text,
            question = question,
            note = note.trim().take(AnswerReport.maxNoteLength),
            sessionId = sessionId,
            locale = locale(),
        )
        markReport(entryId, ReportStatus.Sending)
        viewModelScope.launch {
            val outcome = try {
                sender.send(report)
                ReportStatus.Sent
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                ReportStatus.Failed
            }
            markReport(entryId, outcome)
        }
    }

    private fun markReport(entryId: Long, status: ReportStatus) = mutableState.update { state ->
        state.copy(entries = state.entries.map { if (it.id == entryId) it.copy(report = status) else it })
    }

    private fun entry(kind: ConciergeEntry.Kind, text: String, reply: ConciergeReply? = null) = ConciergeEntry(
        id = nextId++,
        kind = kind,
        text = text,
        suggestions = reply?.suggestions.orEmpty(),
        cards = reply?.cards.orEmpty(),
    )

    private fun request() {
        val history = mutableState.value.entries.mapNotNull { entry ->
            when (entry.kind) {
                ConciergeEntry.Kind.Guest -> ChatMessage(ChatMessage.Role.User, entry.text)
                ConciergeEntry.Kind.Concierge -> ChatMessage(ChatMessage.Role.Assistant, entry.text)
                ConciergeEntry.Kind.Failed -> null
            }
        }
        if (history.isEmpty()) return

        mutableState.update { it.copy(isSending = true) }
        val session = sessionId
        val language = locale()
        job = viewModelScope.launch {
            val reply = try {
                client.send(history, session, language)
            } catch (e: CancellationException) {
                // A conversation that was cleared mid-request stays cleared.
                throw e
            } catch (_: Exception) {
                null
            }
            // An answer that comes back after all, once the request was
            // given up, is not shown.
            ensureActive()
            finish(reply)
        }
    }

    private fun finish(reply: ConciergeReply?) {
        job = null
        if (reply == null) {
            mutableState.update { it.copy(isSending = false, entries = it.entries + entry(ConciergeEntry.Kind.Failed, "")) }
            return
        }
        reply.sessionId?.let { sessionId = it }
        // A reply without a plan keeps the current one and the guest's edits.
        if (reply.plan != null) planAttempt = null
        mutableState.update { state ->
            state.copy(
                isSending = false,
                entries = state.entries + entry(ConciergeEntry.Kind.Concierge, reply.reply, reply),
                plan = reply.plan?.let(::PlanDraft) ?: state.plan,
                planProblem = if (reply.plan != null) null else state.planProblem,
            )
        }
    }
}
