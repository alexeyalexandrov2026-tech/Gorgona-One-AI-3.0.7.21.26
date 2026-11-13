package com.miamielio.app.concierge

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.miamielio.app.core.AnswerReport
import com.miamielio.app.core.ApiError
import com.miamielio.app.core.ChatMessage
import com.miamielio.app.core.ConciergeCard
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.ConciergeLink
import com.miamielio.app.core.ConciergePlan
import com.miamielio.app.core.ConciergeReply
import com.miamielio.app.core.PlanClient
import com.miamielio.app.core.PlanItem
import com.miamielio.app.core.PlanReceipt
import com.miamielio.app.core.PlanRequest
import com.miamielio.app.core.PlanSection
import com.miamielio.app.core.ReportClient
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

/** One row of the conversation. */
data class ConciergeEntry(
    val id: String = UUID.randomUUID().toString(),
    val kind: Kind,
    val text: String,
    val suggestions: List<ConciergeLink> = emptyList(),
    val cards: List<ConciergeCard> = emptyList(),
    /** No AI engine answered: the server sent its fallback and where to go meanwhile. */
    val degraded: Boolean = false,
    val reported: Boolean = false,
) {
    enum class Kind {
        Guest,
        Concierge,

        /** The request never got an answer; offers a retry. */
        Failed,
    }
}

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

    val items: List<PlanItem>
        get() = plan.sections.filter { it.href !in removed }.map(::item)

    val hasRestaurant: Boolean get() = items.any { it.isRestaurant }
}

/** Why a plan request was not sent. */
enum class PlanProblem { BadDates, Check, Failed }

data class ConciergeState(
    val entries: List<ConciergeEntry> = emptyList(),
    val isSending: Boolean = false,
    val plan: PlanDraft? = null,
    val isSendingPlan: Boolean = false,
    val draft: String = "",
) {
    val canSend: Boolean get() = !isSending && draft.isNotBlank()
}

/**
 * The concierge conversation: what was said, what is being sent, and the
 * handle the server uses to remember the thread.
 */
class ConciergeViewModel(
    private val client: ConciergeClient,
    private val planClient: PlanClient,
    private val reportClient: ReportClient?,
    /** The language the guest last chose on the site. */
    private val locale: () -> String,
) : ViewModel() {
    private val mutableState = MutableStateFlow(ConciergeState())
    val state: StateFlow<ConciergeState> = mutableState.asStateFlow()

    /** The key of the last plan send, reused while its details stay the same. */
    private var planAttempt: Pair<PlanRequest, UUID>? = null
    private var sessionId: String? = null
    private var job: Job? = null

    /** The concierge answers in it, and the microphone listens for it. */
    val language: String get() = locale()

    /** True when this build can deliver a report on an answer. */
    val canReport: Boolean get() = reportClient != null

    fun setDraft(text: String) = mutableState.update { it.copy(draft = text) }

    /**
     * Puts a request in the composer for the guest to read and send, as when
     * they open a season reminder. Nothing goes until they send it.
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
                    ConciergeEntry(kind = ConciergeEntry.Kind.Guest, text = text),
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

    fun clearPlan() {
        planAttempt = null
        mutableState.update { it.copy(plan = null) }
    }

    private fun editPlan(change: (PlanDraft) -> PlanDraft) = mutableState.update { state ->
        val draft = state.plan
        if (draft == null || draft.receipt != null) state else state.copy(plan = change(draft))
    }

    /**
     * Sends every item left in the plan as one request. Returns null when it
     * went through - the receipt is then on the plan - otherwise what to
     * tell the guest. A send that is repeated with nothing changed carries
     * the same key, so an answer lost on the way never makes a second request.
     */
    suspend fun sendPlan(request: PlanRequest): PlanProblem? {
        val current = mutableState.value
        val sent = current.plan
        if (current.isSendingPlan || sent == null || sent.receipt != null) return null
        if (!sent.plan.requestable) return PlanProblem.Failed
        if (!request.isComplete) {
            return if (request.end < request.start) PlanProblem.BadDates else PlanProblem.Check
        }
        val previous = planAttempt
        val key = if (previous != null && previous.first == request) previous.second else UUID.randomUUID()
        planAttempt = request to key
        mutableState.update { it.copy(isSendingPlan = true) }
        try {
            val receipt = planClient.send(request, key)
            planAttempt = null
            // A new plan that arrived meanwhile is left untouched.
            mutableState.update { state ->
                if (state.plan?.plan == sent.plan) state.copy(plan = state.plan.copy(receipt = receipt)) else state
            }
            return null
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiError.Status) {
            if (e.code == 400) {
                planAttempt = null
                return PlanProblem.Check
            }
            return PlanProblem.Failed
        } catch (_: Exception) {
            return PlanProblem.Failed
        } finally {
            mutableState.update { it.copy(isSendingPlan = false) }
        }
    }

    // endregion

    /**
     * Reports one answer. True once the site has it; the entry is then
     * marked so it cannot be reported twice.
     */
    suspend fun report(entryId: String, note: String): Boolean {
        val sender = reportClient ?: return false
        val entries = mutableState.value.entries
        val index = entries.indexOfFirst { it.id == entryId && it.kind == ConciergeEntry.Kind.Concierge }
        if (index < 0) return false
        val question = entries.take(index).lastOrNull { it.kind == ConciergeEntry.Kind.Guest }?.text.orEmpty()
        return try {
            sender.send(AnswerReport(entries[index].text, question, note, sessionId, locale()))
            mutableState.update { state ->
                state.copy(entries = state.entries.map { if (it.id == entryId) it.copy(reported = true) else it })
            }
            true
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            false
        }
    }

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
            val outcome = try {
                Result.success(client.send(history, session, language))
            } catch (e: CancellationException) {
                // A conversation that was cleared mid-request stays cleared.
                throw e
            } catch (e: Exception) {
                Result.failure(e)
            }
            finish(outcome)
        }
    }

    private fun finish(outcome: Result<ConciergeReply>) {
        job = null
        val reply = outcome.getOrNull()
        if (reply == null) {
            mutableState.update {
                it.copy(isSending = false, entries = it.entries + ConciergeEntry(kind = ConciergeEntry.Kind.Failed, text = ""))
            }
            return
        }
        reply.sessionId?.let { sessionId = it }
        // A reply without a plan keeps the current one and the guest's edits.
        if (reply.plan != null) planAttempt = null
        mutableState.update { state ->
            state.copy(
                isSending = false,
                entries = state.entries + ConciergeEntry(
                    kind = ConciergeEntry.Kind.Concierge,
                    text = reply.reply,
                    suggestions = reply.suggestions,
                    cards = reply.cards,
                    degraded = reply.degraded,
                ),
                plan = reply.plan?.let { PlanDraft(it) } ?: state.plan,
            )
        }
    }
}
