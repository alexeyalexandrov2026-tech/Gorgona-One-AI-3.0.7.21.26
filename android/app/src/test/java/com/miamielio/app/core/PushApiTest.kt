package com.miamielio.app.core

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class PushApiTest {
    private val validPush = "fcm_token_abcdefghijklmnopqrstuvwxyz0123456789"
    private val validJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.push.signature"

    @Test
    fun buildsAuthenticatedRegisterAndUnregisterRequestsForInternalOriginOnly() = runTest {
        val transport = MockTransport(json = """{"ok":true}""")
        val client = PushClient(transport = transport)

        val reg = client.makeRegisterRequest(validPush, validJwt, "ru-RU", "1.5.1")
        assertEquals("POST", reg.method)
        assertEquals("https://gorgona-one.com/api/push/register", reg.url)
        assertEquals("Bearer $validJwt", reg.headers["Authorization"])
        val body = reg.jsonBody()
        assertEquals(validPush, body.getValue("token").jsonPrimitive.content)
        assertEquals("android", body.getValue("platform").jsonPrimitive.content)
        assertEquals("ru", body.getValue("locale").jsonPrimitive.content)
        assertEquals("1.5.1", body.getValue("appVersion").jsonPrimitive.content)

        assertTrue(client.register(validPush, validJwt, "ru", "1.5.1"))

        val del = client.makeUnregisterRequest(validPush, validJwt)
        assertEquals("DELETE", del.method)
        assertEquals("Bearer $validJwt", del.headers["Authorization"])
        assertTrue(client.unregister(validPush, validJwt))
    }

    @Test
    fun rejectsMalformedTokensOrInsecureBaseUrl() {
        val client = PushClient(transport = MockTransport())
        assertSame(
            ApiError.InvalidRequest,
            assertThrows(ApiError::class.java) { client.makeRegisterRequest("short", validJwt, "en") },
        )
        assertSame(
            ApiError.InvalidRequest,
            assertThrows(ApiError::class.java) { client.makeRegisterRequest(validPush, "short", "en") },
        )
        val insecure = PushClient(config = AppConfig("http://gorgona-one.com"), transport = MockTransport())
        assertSame(
            ApiError.InvalidRequest,
            assertThrows(ApiError::class.java) { insecure.makeRegisterRequest(validPush, validJwt, "en") },
        )
        assertFalse(PushClient.isValidPushToken("has space inside token 12345678901234567890"))
    }

    @Test
    fun sanitizesServerNotificationPathsAgainstOpenRedirects() {
        assertEquals("/pay/tok_abc123", PushClient.safeNotificationPath("/pay/tok_abc123"))
        assertEquals("/trip", PushClient.safeNotificationPath("/trip"))
        assertEquals("/trip", PushClient.safeNotificationPath("https://evil.example.com/phish"))
        assertEquals("/trip", PushClient.safeNotificationPath("//evil.example.com"))
        assertEquals("/trip", PushClient.safeNotificationPath("/\\evil"))
        assertEquals("/trip", PushClient.safeNotificationPath(null))
    }
}
