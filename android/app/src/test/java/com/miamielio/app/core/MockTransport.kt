package com.miamielio.app.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject

/** Answers every request with one recorded response and remembers what was asked. */
class MockTransport(
    private val status: Int = 200,
    private val json: String = "{}",
    private val failure: Exception? = null,
) : HttpTransport {
    val requests = mutableListOf<HttpRequest>()

    override suspend fun send(request: HttpRequest): HttpResponse {
        requests += request
        failure?.let { throw it }
        return HttpResponse(status, json.toByteArray(Charsets.UTF_8))
    }
}

fun HttpRequest.jsonBody(): JsonObject =
    Json.parseToJsonElement(body!!.toString(Charsets.UTF_8)) as JsonObject
