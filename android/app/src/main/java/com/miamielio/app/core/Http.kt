package com.miamielio.app.core

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.longOrNull

sealed class ApiError(message: String) : Exception(message) {
    data object InvalidRequest : ApiError("invalid request") {
        private fun readResolve(): Any = InvalidRequest
    }

    data object InvalidResponse : ApiError("invalid response") {
        private fun readResolve(): Any = InvalidResponse
    }

    data class Status(val code: Int) : ApiError("status $code")

    data object Decoding : ApiError("decoding") {
        private fun readResolve(): Any = Decoding
    }
}

class HttpRequest(
    val method: String,
    val url: String,
    val headers: Map<String, String> = emptyMap(),
    val body: ByteArray? = null,
)

class HttpResponse(val status: Int, val body: ByteArray)

/**
 * The network, reduced to one call so the API clients can be tested against
 * recorded responses. Implementations throw [java.io.IOException] when the
 * server cannot be reached.
 */
fun interface HttpTransport {
    suspend fun send(request: HttpRequest): HttpResponse
}

// --- Tolerant decoding ---

internal object Decode {
    private val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true; isLenient = false }

    /** The body as a JSON object, or null when it is anything else. */
    fun obj(bytes: ByteArray): JsonObject? = try {
        json.parseToJsonElement(bytes.toString(Charsets.UTF_8)) as? JsonObject
    } catch (_: Exception) {
        null
    }
}

/** A non-empty string, whether the server sent text or a bare number. */
internal fun JsonObject.text(key: String): String? {
    val value = this[key] as? JsonPrimitive ?: return null
    if (value is JsonNull) return null
    if (value.isString) {
        return value.content.trim().takeIf { it.isNotEmpty() }
    }
    if (value.booleanOrNull != null) return null
    value.longOrNull?.let { return it.toString() }
    value.doubleOrNull?.let { number ->
        return if (number % 1.0 == 0.0 && kotlin.math.abs(number) < 1e15) number.toLong().toString() else number.toString()
    }
    return null
}

/** A whole number, however the server wrote it (1 or 1.0), or null. */
internal fun JsonObject.int(key: String): Int? {
    val value = this[key] as? JsonPrimitive ?: return null
    if (value is JsonNull || value.isString) return null
    value.longOrNull?.let { return it.takeIf { n -> n in Int.MIN_VALUE..Int.MAX_VALUE }?.toInt() }
    val number = value.doubleOrNull ?: return null
    return if (number % 1.0 == 0.0 && kotlin.math.abs(number) <= Int.MAX_VALUE) number.toInt() else null
}

internal fun JsonObject.bool(key: String): Boolean? {
    val value = this[key] as? JsonPrimitive ?: return null
    if (value is JsonNull || value.isString) return null
    return value.booleanOrNull
}

internal fun JsonObject.obj(key: String): JsonObject? = this[key] as? JsonObject

/**
 * An array that keeps the entries it understands and drops the rest, so one
 * malformed card cannot cost the guest the whole reply.
 */
internal fun <T : Any> JsonObject.lossyArray(key: String, decode: (JsonObject) -> T?): List<T> {
    val array = this[key] as? JsonArray ?: return emptyList()
    return array.mapNotNull { element: JsonElement -> (element as? JsonObject)?.let(decode) }
}
