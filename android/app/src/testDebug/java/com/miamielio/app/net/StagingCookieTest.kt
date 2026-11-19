package com.miamielio.app.net

import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class StagingCookieTest {
    private val staging = "https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev"
    private val issued = 1795064400L
    private val token = "$issued.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

    @Test
    fun sendsOnlyTheStagingGateCookie() {
        val cookie = stagingCookie("$staging/api/chat".toHttpUrl(), issued + 1) {
            "site_locale=ru; __Host-miami-staging=$token; app_session=private"
        }
        assertEquals("__Host-miami-staging", cookie?.name)
        assertEquals(token, cookie?.value)
        assertEquals(true, cookie?.httpOnly)
        assertEquals(true, cookie?.hostOnly)
    }

    @Test
    fun keepsTheCookieOffOtherOriginsAndRejectsExpiredOrInvalidSessions() {
        for (origin in listOf("https://gorgona-one.com", "https://evil.example", staging.replace("https:", "http:"), "$staging:444")) {
            assertNull(stagingCookie(origin.toHttpUrl(), issued + 1) { error("Must not read staging cookies") })
        }
        assertNull(stagingCookie(staging.toHttpUrl(), issued + 4 * 60 * 60) { "__Host-miami-staging=$token" })
        assertNull(stagingCookie(staging.toHttpUrl(), issued - 1) { "__Host-miami-staging=$token" })
        assertNull(stagingCookie(staging.toHttpUrl(), issued + 1) { "__Host-miami-staging=malformed" })
    }
}
