package com.miamielio.app.core

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class AnswerReportClientTest {
    @Test
    fun submitsTheVisibleConversationWithAnIdempotencyKey() = runTest {
        var request: HttpRequest? = null
        val reporter = AnswerReportClient(AppConfig.production, HttpTransport {
            request = it
            HttpResponse(202, """{"received":true}""".toByteArray())
        })
        val key = UUID.randomUUID()
        reporter.send(AnswerReport("Reply", "Question", "Details", null, "ru-RU", key))
        val sent = requireNotNull(request)
        assertEquals("https://gorgona-one.com/api/concierge/report", sent.url)
        assertEquals(key.toString(), sent.headers["Idempotency-Key"])
        assertEquals("ru", Decode.obj(requireNotNull(sent.body))?.text("locale"))
        assertEquals("Reply", Decode.obj(requireNotNull(sent.body))?.text("answer"))
    }

    @Test
    fun aGenericSuccessPageDoesNotCountAsReceipt() = runTest {
        val reporter = AnswerReportClient(AppConfig.production, HttpTransport {
            HttpResponse(202, """{"ok":true}""".toByteArray())
        })
        val error = runCatching { reporter.send(AnswerReport("Reply", "", "", null, "en")) }.exceptionOrNull()
        assertTrue(error is ApiError.InvalidResponse)
    }
}
