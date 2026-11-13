package com.miamielio.app.core

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * A guest's complaint about one concierge answer. Google Play asks apps
 * with generated content to let people flag it without leaving the app.
 */
class AnswerReport(
    /** The answer being reported, as the guest saw it. */
    answer: String,
    /** What the guest asked just before it, for context. */
    question: String,
    /** The guest's own words about what is wrong; may be empty. */
    note: String,
    val sessionId: String?,
    val locale: String,
) {
    val answer: String = ConciergeClient.clipped(answer.trim())
    val question: String = ConciergeClient.clipped(question.trim())
    val note: String = note.trim().take(MAX_NOTE)

    fun toJson(): ByteArray = buildJsonObject {
        put("answer", answer)
        put("question", question)
        put("note", note)
        if (sessionId != null) put("sessionId", sessionId)
        put("locale", SiteLocale.normalize(locale) ?: SiteLocale.fallback)
        put("platform", "android")
    }.toString().toByteArray(Charsets.UTF_8)

    companion object {
        const val MAX_NOTE = 1000
    }
}

/**
 * Sends a report to the site. Anonymous, like every other JSON call the app
 * makes. The path comes from the build (`REPORT_PATH`); the site answers
 * 200 or 204 once the report is stored.
 */
class ReportClient(
    private val config: AppConfig = AppConfig.production,
    private val path: String = DEFAULT_PATH,
    private val transport: HttpTransport,
) {
    fun makeRequest(report: AnswerReport): HttpRequest {
        val url = config.resolve(path)
        if (report.answer.isEmpty() || url == null || !path.startsWith("/")) throw ApiError.InvalidRequest
        return HttpRequest(
            method = "POST",
            url = url,
            headers = mapOf(
                "Content-Type" to "application/json",
                "Accept" to "application/json",
                "User-Agent" to config.userAgentToken,
            ),
            body = report.toJson(),
        )
    }

    suspend fun send(report: AnswerReport) {
        val response = transport.send(makeRequest(report))
        if (response.status != 200 && response.status != 204) throw ApiError.Status(response.status)
    }

    companion object {
        const val DEFAULT_PATH = "/api/chat/report"
    }
}
