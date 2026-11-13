package com.miamielio.app.net

import com.miamielio.app.core.ApiError
import com.miamielio.app.core.HttpRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.io.Closeable
import java.io.IOException
import java.io.InputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class OkHttpTransportTest {
    private class Received(val requestLine: String, val headers: Map<String, String>, val body: ByteArray)

    /** A web server small enough to read: one answer per connection. */
    private class LocalServer(private val handler: LocalServer.(Socket) -> Unit) : Closeable {
        private val listener = ServerSocket(0, 50, InetAddress.getLoopbackAddress())
        val url: String get() = "http://127.0.0.1:${listener.localPort}"
        val received = CopyOnWriteArrayList<Received>()
        val arrived = Semaphore(0)
        val hungUp = CountDownLatch(1)

        init {
            thread(isDaemon = true) {
                while (true) {
                    val client = try {
                        listener.accept()
                    } catch (_: IOException) {
                        break
                    }
                    thread(isDaemon = true) { serve(client) }
                }
            }
        }

        private fun serve(client: Socket) {
            client.use { socket ->
                try {
                    val request = read(socket.getInputStream()) ?: return
                    received += request
                    arrived.release()
                    handler(socket)
                } catch (_: IOException) {
                    hungUp.countDown()
                }
            }
        }

        fun answer(socket: Socket, status: Int, body: ByteArray, extraHeaders: String = "") {
            val head = "HTTP/1.1 $status Answer\r\nContent-Type: application/json\r\n" +
                "Content-Length: ${body.size}\r\nConnection: close\r\n$extraHeaders\r\n"
            socket.getOutputStream().apply {
                write(head.toByteArray(Charsets.ISO_8859_1))
                write(body)
                flush()
            }
        }

        /** Says nothing until the caller gives up and closes the connection. */
        fun stall(socket: Socket) {
            if (socket.getInputStream().read() < 0) hungUp.countDown()
        }

        private fun read(input: InputStream): Received? {
            val end = "\r\n\r\n"
            val head = ByteArrayOutputStream()
            var matched = 0
            while (matched < end.length) {
                val byte = input.read()
                if (byte < 0) return null
                head.write(byte)
                matched = when (byte) {
                    end[matched].code -> matched + 1
                    '\r'.code -> 1
                    else -> 0
                }
            }
            val lines = head.toString("ISO-8859-1").trim().split("\r\n")
            val headers = lines.drop(1).associate { line ->
                line.substringBefore(':').trim().lowercase() to line.substringAfter(':').trim()
            }
            val body = ByteArray(headers["content-length"]?.toIntOrNull() ?: 0)
            var filled = 0
            while (filled < body.size) {
                val count = input.read(body, filled, body.size - filled)
                if (count < 0) return null
                filled += count
            }
            return Received(lines.first(), headers, body)
        }

        override fun close() = listener.close()
    }

    private suspend fun failureOf(block: suspend () -> Unit): Throwable? = try {
        block()
        null
    } catch (error: Throwable) {
        error
    }

    @Test
    fun carriesTheRequestAndReadsTheAnswer() = runBlocking {
        val reply = """{"reply":"Добро пожаловать"}""".toByteArray(Charsets.UTF_8)
        LocalServer { socket -> answer(socket, 200, reply) }.use { server ->
            val sent = """{"messages":[{"role":"user","content":"Привет"}],"locale":"ru"}""".toByteArray(Charsets.UTF_8)
            val response = withTimeout(10_000) {
                OkHttpTransport(5_000).send(
                    HttpRequest(
                        method = "POST",
                        url = server.url + "/api/chat",
                        headers = mapOf(
                            "Content-Type" to "application/json",
                            "Accept" to "application/json",
                            "User-Agent" to "MiamiElioApp/1.0",
                            "Idempotency-Key" to "8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a",
                        ),
                        body = sent,
                    ),
                )
            }

            assertEquals(200, response.status)
            assertArrayEquals(reply, response.body)

            val request = server.received.single()
            assertEquals("POST /api/chat HTTP/1.1", request.requestLine)
            assertEquals("application/json", request.headers["content-type"])
            assertEquals("MiamiElioApp/1.0", request.headers["user-agent"])
            assertEquals("8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a", request.headers["idempotency-key"])
            assertArrayEquals(sent, request.body)
        }
    }

    @Test
    fun aRefusalIsAnAnswerNotAFailure() = runBlocking {
        val refusal = """{"error":"Plan requests are not enabled"}""".toByteArray()
        LocalServer { socket -> answer(socket, 503, refusal) }.use { server ->
            val response = withTimeout(10_000) {
                OkHttpTransport(5_000).send(HttpRequest("GET", server.url + "/api/search?q=yacht&limit=20"))
            }
            assertEquals(503, response.status)
            assertArrayEquals(refusal, response.body)
            assertEquals("GET /api/search?q=yacht&limit=20 HTTP/1.1", server.received.single().requestLine)
        }
    }

    @Test
    fun keepsNoCookiesBetweenCalls() = runBlocking {
        LocalServer { socket ->
            answer(socket, 200, "{}".toByteArray(), "Set-Cookie: sid=1; Path=/\r\n")
        }.use { server ->
            val transport = OkHttpTransport(5_000)
            withTimeout(10_000) {
                transport.send(HttpRequest("GET", server.url + "/api/search?q=one"))
                transport.send(HttpRequest("GET", server.url + "/api/search?q=two"))
            }
            assertEquals(2, server.received.size)
            server.received.forEach { assertNull(it.headers["cookie"]) }
        }
    }

    @Test
    fun cancellingTheCallerHangsUpTheCall() = runBlocking {
        LocalServer { socket -> stall(socket) }.use { server ->
            val job = launch(Dispatchers.Default) {
                OkHttpTransport(30_000).send(HttpRequest("GET", server.url + "/api/search?q=ya"))
            }
            assertTrue(server.arrived.tryAcquire(10, TimeUnit.SECONDS))
            withTimeout(10_000) { job.cancelAndJoin() }
            assertTrue(job.isCancelled)
            assertTrue(server.hungUp.await(10, TimeUnit.SECONDS))
        }
    }

    @Test
    fun givesUpAtTheDeadline() = runBlocking {
        LocalServer { socket -> stall(socket) }.use { server ->
            val started = System.nanoTime()
            val failure = withTimeout(10_000) {
                failureOf { OkHttpTransport(400).send(HttpRequest("GET", server.url + "/api/search?q=ya")) }
            }
            val elapsedMillis = (System.nanoTime() - started) / 1_000_000
            assertTrue("expected an IOException, got $failure", failure is IOException)
            assertTrue("gave up after $elapsedMillis ms", elapsedMillis < 5_000)
        }
    }

    @Test
    fun reportsAnUnreachableServerAsAnIOException() = runBlocking {
        val port = ServerSocket(0, 1, InetAddress.getLoopbackAddress()).use { it.localPort }
        val failure = withTimeout(10_000) {
            failureOf { OkHttpTransport(5_000).send(HttpRequest("GET", "http://127.0.0.1:$port/api/search?q=ya")) }
        }
        assertTrue("expected an IOException, got $failure", failure is IOException)
    }

    @Test
    fun refusesAnAnswerFarLargerThanAnyTheAppReads() = runBlocking {
        val huge = ByteArray(OkHttpTransport.MAX_RESPONSE_BYTES.toInt() + 1) { '1'.code.toByte() }
        LocalServer { socket ->
            try {
                answer(socket, 200, huge)
            } catch (_: IOException) {
                // The caller stops reading at the limit.
            }
        }.use { server ->
            val failure = withTimeout(20_000) {
                failureOf { OkHttpTransport(15_000).send(HttpRequest("GET", server.url + "/api/search?q=ya")) }
            }
            assertTrue("expected an IOException, got $failure", failure is IOException)
            assertFalse(failure is ApiError)
        }
    }

    @Test
    fun refusesAnAddressThatIsNotOne() = runBlocking {
        assertSame(ApiError.InvalidRequest, failureOf { OkHttpTransport(5_000).send(HttpRequest("GET", "not an address")) })
        assertSame(
            ApiError.InvalidRequest,
            failureOf {
                OkHttpTransport(5_000).send(HttpRequest("GET", "https://gorgona-one.com/", headers = mapOf("X-Bad" to "a\nb")))
            },
        )
    }
}
