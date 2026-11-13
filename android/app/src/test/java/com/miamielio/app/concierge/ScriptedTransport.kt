package com.miamielio.app.concierge

import com.miamielio.app.core.HttpRequest
import com.miamielio.app.core.HttpResponse
import com.miamielio.app.core.HttpTransport
import kotlinx.coroutines.CompletableDeferred
import java.io.IOException

/**
 * Plays the server's side of a conversation: each request gets the next
 * answer in line. An answer can be held back until the test lets it go, to
 * look at the screen while a reply is on its way.
 */
class ScriptedTransport : HttpTransport {
    sealed interface Answer {
        data class Json(val status: Int, val body: String) : Answer

        data object Offline : Answer

        /** Waits for [release]; then answers with what it was given. */
        class Held(val gate: CompletableDeferred<Answer> = CompletableDeferred()) : Answer {
            fun release(answer: Answer) {
                gate.complete(answer)
            }
        }
    }

    private val queue = ArrayDeque<Answer>()
    val requests = mutableListOf<HttpRequest>()

    fun reply(body: String, status: Int = 200) = apply { queue += Answer.Json(status, body) }

    fun offline() = apply { queue += Answer.Offline }

    fun hold(): Answer.Held = Answer.Held().also { queue += it }

    override suspend fun send(request: HttpRequest): HttpResponse {
        requests += request
        val next = queue.removeFirstOrNull() ?: error("No answer scripted for ${request.url}")
        return answer(if (next is Answer.Held) next.gate.await() else next)
    }

    private fun answer(answer: Answer): HttpResponse = when (answer) {
        is Answer.Json -> HttpResponse(answer.status, answer.body.toByteArray(Charsets.UTF_8))
        Answer.Offline -> throw IOException("offline")
        is Answer.Held -> error("A held answer cannot release into another held one")
    }
}

/** Server answers the concierge tests share. */
object Replies {
    fun text(reply: String, session: String? = "s-1") =
        """{"reply":${quote(reply)}${session?.let { ""","sessionId":"$it"""" } ?: ""}}"""

    val withCardAndSuggestion = """
        {"reply":"Try a sunset cruise.","sessionId":"s-1",
         "cards":[{"href":"/yachts","title":"Yachts","summary":"Private charters","cta":"See yachts"}],
         "suggestions":[{"href":"/restaurants-nightlife","label":"Dinner after"}]}
    """.trimIndent()

    /** Two sections: a yacht with two options and a restaurant with one. */
    fun withPlan(reply: String = "Here is a plan.", requestable: Boolean = true, yacht: String = "Big Yacht") = """
        {"reply":${quote(reply)},"sessionId":"s-1",
         "plan":{"version":1,"guests":4,"requestable":$requestable,"sections":[
           {"href":"/yachts","label":"Yachts","candidates":[
             {"kind":"yacht","slug":"big-yacht","title":${quote(yacht)},"subtitle":"80 ft","href":"/yachts/big-yacht"},
             {"kind":"yacht","slug":"small-yacht","title":"Small Yacht","href":"/yachts/small-yacht"}]},
           {"href":"/restaurants-nightlife","label":"Dining","candidates":[
             {"kind":"dining","slug":"komodo-miami","title":"Komodo","href":"/restaurants-nightlife/komodo-miami"}]}]}}
    """.trimIndent()

    const val receipt =
        """{"success":true,"planId":"8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a","bookingIds":["8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2b","8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2c"]}"""

    private fun quote(text: String) = "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
}
