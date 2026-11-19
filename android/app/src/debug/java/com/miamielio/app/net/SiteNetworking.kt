package com.miamielio.app.net

import android.app.Application
import android.content.Context
import android.webkit.CookieManager
import coil3.ImageLoader
import coil3.SingletonImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import com.miamielio.app.BuildConfig
import com.miamielio.app.core.AppConfig
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import java.io.IOException

private const val STAGING_ORIGIN = "https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev"
private const val COOKIE_NAME = "__Host-miami-staging"
private const val SESSION_FILE = "miami-staging-session"
private const val SESSION_SECONDS = 4 * 60 * 60L
private val stagingUrl = STAGING_ORIGIN.toHttpUrl()
private val tokenFormat = Regex("""(\d{10})\.[0-9a-f]{64}""")

internal fun siteHttpClient(context: Context, config: AppConfig): OkHttpClient {
    val base = OkHttpTransport.sharedClient
    if (config.baseUrl != STAGING_ORIGIN) return base
    val cookies = CookieManager.getInstance()
    // The provisioner deposits only the expiring QA cookie in the debug app's private files.
    val file = context.filesDir.resolve(SESSION_FILE)
    if (file.isFile) {
        try {
            val token = if (file.length() in 1L..96L) file.readText().trim() else ""
            val now = System.currentTimeMillis() / 1000
            val remaining = sessionRemaining(token, now)
            if (remaining > 0) {
                cookies.setCookie(STAGING_ORIGIN, "$COOKIE_NAME=$token; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=$remaining")
                cookies.flush()
            }
        } catch (_: IOException) {
            // The debug shell can provision a new session after an interrupted write.
        } finally {
            file.delete()
        }
    }
    return stagingClient
}

private val stagingClient: OkHttpClient by lazy {
    val cookies = CookieManager.getInstance()
    OkHttpTransport.sharedClient.newBuilder().cookieJar(object : CookieJar {
        override fun loadForRequest(url: HttpUrl): List<Cookie> =
            listOfNotNull(stagingCookie(url, System.currentTimeMillis() / 1000) {
                cookies.getCookie(STAGING_ORIGIN)
            })

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) = Unit
    }).build()
}

class StagingApplication : Application(), SingletonImageLoader.Factory {
    override fun newImageLoader(context: Context): ImageLoader {
        val builder = ImageLoader.Builder(context)
        if (BuildConfig.BASE_URL.trim().trimEnd('/') == STAGING_ORIGIN) {
            builder.components { add(OkHttpNetworkFetcherFactory(callFactory = { stagingClient })) }
        }
        return builder.build()
    }
}

internal fun stagingCookie(url: HttpUrl, nowSeconds: Long, getHeader: () -> String?): Cookie? {
    if (!url.isHttps || url.host != stagingUrl.host || url.port != stagingUrl.port) return null
    val token = getHeader().orEmpty().split(';').firstNotNullOfOrNull { entry ->
        val pair = entry.trim()
        if (pair.startsWith("$COOKIE_NAME=")) pair.substringAfter('=') else null
    } ?: return null
    if (sessionRemaining(token, nowSeconds) <= 0) return null
    return Cookie.Builder().name(COOKIE_NAME).value(token).hostOnlyDomain(stagingUrl.host)
        .path("/").secure().httpOnly().build()
}

private fun sessionRemaining(token: String, now: Long): Long {
    val issuedAt = tokenFormat.matchEntire(token)?.groupValues?.get(1)?.toLongOrNull() ?: return 0
    val age = now - issuedAt
    return if (age in 0 until SESSION_SECONDS) SESSION_SECONDS - age else 0
}
