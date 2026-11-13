package com.miamielio.app.net

import com.miamielio.app.core.ApiError
import com.miamielio.app.core.HttpRequest
import com.miamielio.app.core.HttpResponse
import com.miamielio.app.core.HttpTransport
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * The app's JSON calls over OkHttp. Anonymous by design: no cookies, no
 * cache, a hard deadline. The site's JSON endpoints need nothing from the
 * web view's signed-in state, so none of it is shared with them.
 *
 * Cancelling the calling coroutine cancels the request on the wire, which is
 * what lets search drop the previous query the moment the guest types on.
 */
class OkHttpTransport(
    timeoutMillis: Long,
    base: OkHttpClient = sharedClient,
) : HttpTransport {
    private val client: OkHttpClient = base.newBuilder()
        .callTimeout(timeoutMillis, TimeUnit.MILLISECONDS)
        .connectTimeout(minOf(timeoutMillis, CONNECT_TIMEOUT_MILLIS), TimeUnit.MILLISECONDS)
        .readTimeout(timeoutMillis, TimeUnit.MILLISECONDS)
        .writeTimeout(timeoutMillis, TimeUnit.MILLISECONDS)
        .build()

    override suspend fun send(request: HttpRequest): HttpResponse {
        val call = client.newCall(build(request))
        return suspendCancellableCoroutine { continuation ->
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(Answer(continuation))
        }
    }

    private fun build(request: HttpRequest): Request {
        val builder = try {
            Request.Builder().url(request.url)
        } catch (_: IllegalArgumentException) {
            throw ApiError.InvalidRequest
        }
        try {
            request.headers.forEach { (name, value) -> builder.header(name, value) }
        } catch (_: IllegalArgumentException) {
            // A header OkHttp refuses (a line break, a control character).
            throw ApiError.InvalidRequest
        }
        // The content type travels as a header the caller set; OkHttp adds none.
        val body = request.body?.toRequestBody(null)
        return when (val method = request.method.uppercase()) {
            "GET", "HEAD" -> builder.method(method, null)
            else -> builder.method(method, body ?: ByteArray(0).toRequestBody(null))
        }.build()
    }

    private class Answer(private val continuation: CancellableContinuation<HttpResponse>) : Callback {
        override fun onFailure(call: Call, e: IOException) {
            // A no-op once the coroutine is cancelled.
            continuation.resumeWithException(e)
        }

        override fun onResponse(call: Call, response: Response) {
            val result = try {
                response.use { answer ->
                    val source = answer.body.source()
                    // request() is true only when more than the limit arrived.
                    if (source.request(MAX_RESPONSE_BYTES + 1)) {
                        throw IOException("response larger than $MAX_RESPONSE_BYTES bytes")
                    }
                    HttpResponse(answer.code, source.readByteArray())
                }
            } catch (e: IOException) {
                continuation.resumeWithException(e)
                return
            }
            continuation.resume(result)
        }
    }

    companion object {
        /** How long each endpoint may take, as in the iPhone app. */
        const val SEARCH_TIMEOUT_MILLIS = 20_000L
        const val CHAT_TIMEOUT_MILLIS = 45_000L
        const val PLAN_TIMEOUT_MILLIS = 30_000L

        private const val CONNECT_TIMEOUT_MILLIS = 15_000L

        /** No answer the app reads is anywhere near this; a larger one is a fault. */
        const val MAX_RESPONSE_BYTES = 2L * 1024 * 1024

        /**
         * One connection pool for every endpoint. OkHttp keeps no cookies and
         * no cache unless given a jar or a directory, and it is given neither.
         * A redirect may not move a call from https to http.
         */
        val sharedClient: OkHttpClient by lazy {
            OkHttpClient.Builder()
                .followSslRedirects(false)
                .build()
        }

        fun search(base: OkHttpClient = sharedClient) = OkHttpTransport(SEARCH_TIMEOUT_MILLIS, base)
        fun chat(base: OkHttpClient = sharedClient) = OkHttpTransport(CHAT_TIMEOUT_MILLIS, base)
        fun plan(base: OkHttpClient = sharedClient) = OkHttpTransport(PLAN_TIMEOUT_MILLIS, base)
    }
}
