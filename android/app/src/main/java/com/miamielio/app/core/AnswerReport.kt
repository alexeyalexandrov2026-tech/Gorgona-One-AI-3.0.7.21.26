package com.miamielio.app.core

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

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
    val idempotencyKey: UUID = UUID.randomUUID(),
) {
    companion object {
        /** A note longer than this is cut; the report itself is what matters. */
        const val maxNoteLength = 1000
    }
}

/**
 * Delivers a report to the Miami Elio team. Throws when it did not arrive.
 *
 */
fun interface AnswerReporter {
    suspend fun send(report: AnswerReport)
}

/** A success requires a receipt from the site's staff queue. */
class AnswerReportClient(
    private val config: AppConfig,
    private val transport: HttpTransport,
) : AnswerReporter {
    override suspend fun send(report: AnswerReport) {
        val endpoint = config.resolve("/api/concierge/report") ?: throw ApiError.InvalidRequest
        if (!endpoint.startsWith("https://") || report.answer.isBlank()) throw ApiError.InvalidRequest
        val body = buildJsonObject {
            put("answer", report.answer.limit(6000))
            put("question", report.question.limit(4000))
            put("note", report.note.limit(AnswerReport.maxNoteLength))
            report.sessionId?.takeIf { it.length <= 120 }?.let { put("sessionId", it) }
            put("locale", SiteLocale.normalize(report.locale) ?: SiteLocale.fallback)
        }
        val response = transport.send(HttpRequest(
            method = "POST",
            url = endpoint,
            headers = mapOf(
                "Content-Type" to "application/json",
                "Accept" to "application/json",
                "User-Agent" to config.userAgentToken,
                "Idempotency-Key" to report.idempotencyKey.toString(),
            ),
            body = body.toString().toByteArray(Charsets.UTF_8),
        ))
        if (response.status != 202) throw ApiError.Status(response.status)
        if (Decode.obj(response.body)?.bool("received") != true) throw ApiError.InvalidResponse
    }

    private fun String.limit(max: Int): String {
        if (length <= max) return this
        return take(if (this[max - 1].isHighSurrogate()) max - 1 else max)
    }
}
