package com.miamielio.app.core

/**
 * What the guest says about one concierge answer they found wrong or
 * harmful. Google Play asks apps with generated answers to let people
 * report them without leaving the app.
 */
data class AnswerReport(
    /** The answer being reported, as the guest saw it. */
    val answer: String,
    /** The guest's message the answer replied to. */
    val question: String,
    /** What the guest added, possibly nothing. */
    val note: String,
    /** The server's handle for the conversation, when it gave one. */
    val sessionId: String?,
    /** The language the conversation was in. */
    val locale: String,
) {
    companion object {
        /** A note longer than this is cut; the report itself is what matters. */
        const val maxNoteLength = 1000
    }
}

/**
 * Delivers a report to the Miami Elio team. Throws when it did not arrive.
 *
 * There is no delivery yet: the site has neither a report endpoint nor an
 * address for them, and the owner has not said which it should be
 * (docs/ANDROID_APP_HANDOFF.md, open question 1). Until one exists the app
 * passes no reporter and the action is not shown, so a guest is never told
 * a report went somewhere when it did not.
 */
fun interface AnswerReporter {
    suspend fun send(report: AnswerReport)
}
