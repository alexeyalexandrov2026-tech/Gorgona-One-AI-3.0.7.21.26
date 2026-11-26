package com.miamielio.app.core

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

class TtsApiTest {
    @Test
    fun buildsTtsRequestWithOriginAndFastFlag() {
        val client = TtsClient(transport = MockTransport())
        val request = client.makeRequest("  Welcome to Miami Elio.  ", locale = "ru-RU", fast = true)

        assertEquals("https://gorgona-one.com/api/tts", request.url)
        assertEquals("POST", request.method)
        assertEquals("application/json", request.headers["Content-Type"])
        assertEquals("audio/mpeg", request.headers["Accept"])
        assertEquals("https://gorgona-one.com", request.headers["Origin"])
        assertEquals("MiamiElioApp/1.0", request.headers["User-Agent"])

        val json = request.jsonBody()
        assertEquals("Welcome to Miami Elio.", json.getValue("text").jsonPrimitive.content)
        assertEquals("ru", json.getValue("locale").jsonPrimitive.content)
        assertEquals("true", json.getValue("fast").jsonPrimitive.content)
    }

    @Test
    fun rejectsBlankTextAndClipsLongSpeechWithoutSplittingSurrogates() {
        val client = TtsClient(transport = MockTransport())
        assertThrows(ApiError.InvalidRequest::class.java) {
            client.makeRequest("   ", locale = "en")
        }

        val emojis = "🌴".repeat(900)
        val clipped = TtsClient.clipped("a$emojis")
        assertEquals(TtsClient.maxTextLength - 1, clipped.length)
        assertFalse(Character.isHighSurrogate(clipped.last()))
    }

    @Test
    fun returnsMp3BytesWhenAvailableAndNullOnFallback() = runTest {
        val mp3 = ByteArray(512) { 7 }
        val okClient = TtsClient(transport = HttpTransport { HttpResponse(200, mp3) })
        assertArrayEquals(mp3, okClient.speak("Hello Miami", "en"))

        val fallbackClient = TtsClient(transport = HttpTransport { HttpResponse(503, """{"available":false}""".toByteArray()) })
        assertNull(fallbackClient.speak("Hello Miami", "en"))

        val tinyClient = TtsClient(transport = HttpTransport { HttpResponse(200, ByteArray(16)) })
        assertNull(tinyClient.speak("Hello Miami", "en"))
    }
}
