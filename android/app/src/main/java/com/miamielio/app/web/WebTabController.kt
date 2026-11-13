package com.miamielio.app.web

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Message
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.core.RouteDecision
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.core.SiteLocale
import com.miamielio.app.core.WebAddress
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** What the web view needs from the screen it lives on. */
interface WebHost {
    /** A page wants files (a listing photo, a profile picture). */
    fun chooseFiles(params: WebChromeClient.FileChooserParams, done: (Array<Uri>?) -> Unit)

    /** Asks the guest for the microphone; reports whether it was given. */
    fun requestMicrophone(done: (Boolean) -> Unit)
}

/**
 * One web view showing the Miami Elio site, plus everything the app layers
 * on top of plain browsing: link routing, language hand-off, pull to
 * refresh, an offline screen, and keeping sign-in state in step between tabs.
 */
@SuppressLint("SetJavaScriptEnabled")
class WebTabController(
    private val context: Context,
    private val config: AppConfig,
    private val policy: RoutePolicy,
    startPath: String,
    private val deviceLocale: String,
    private val host: WebHost,
    private val debuggable: Boolean = false,
) : WebPage {
    private val startUrl: String = config.resolve(startPath) ?: config.baseUrl
    private val origins: Set<String> = config.internalHosts.map { "https://$it" }.toSet()
    private val bootstrap = PageScripts.bootstrap(config.internalHosts, policy.restrictedPaths, deviceLocale)

    private val mutableState = MutableStateFlow(WebState())
    override val state: StateFlow<WebState> = mutableState.asStateFlow()

    override var onRoute: ((String, RouteDecision) -> Unit)? = null
    override var onFavorites: ((Set<String>, WebPage) -> Unit)? = null

    private var started = false
    private var reportedLocale: String? = null
    private var signedInAtLoad: Boolean? = null
    private var hasDocumentStartScript = false

    private val refresh = SwipeRefreshLayout(context)
    private var webView: WebView = build()

    init {
        refresh.setColorSchemeColors(0xFFFF6E93.toInt())
        refresh.setProgressBackgroundColorSchemeColor(0xFF111D25.toInt())
        refresh.setBackgroundColor(PAPER)
        refresh.setOnRefreshListener { pulledToRefresh() }
        // Only a page scrolled to its top can be pulled.
        refresh.setOnChildScrollUpCallback { _, _ -> webView.scrollY > 0 }
        attach()
    }

    override fun hostView(): View = refresh

    // region Loading

    override fun activate() {
        if (!started) {
            begin(startUrl)
            return
        }
        reloadIfSessionChanged()
        // A favourite changed in another tab shows up when this one comes back.
        if (isOnSite()) webView.evaluateJavascript(PageScripts.favoritesRefresh, null)
    }

    override fun load(url: String) {
        val target = config.secure(url)
        if (policy.decide(target) != RouteDecision.Web) return
        mutableState.update { it.copy(failure = null) }
        if (!started) begin(target) else webView.loadUrl(target)
    }

    override fun returnToStart() = load(startUrl)

    override fun retry() {
        load(state.value.failure?.url ?: webView.url ?: startUrl)
    }

    override fun goBack(): Boolean {
        if (!webView.canGoBack()) return false
        mutableState.update { it.copy(failure = null) }
        webView.goBack()
        return true
    }

    override fun currentSiteLocale(): String = reportedLocale ?: deviceLocale

    private fun begin(url: String) {
        started = true
        // The language cookie has to exist before the first request, or the
        // server renders that page in English.
        writeLocaleCookieIfMissing()
        webView.loadUrl(url)
    }

    private fun writeLocaleCookieIfMissing() {
        try {
            val cookies = CookieManager.getInstance()
            val existing = cookies.getCookie(config.baseUrl).orEmpty()
            val chosen = existing.split(';').any { it.trim().startsWith("${SiteLocale.storageKey}=") }
            if (!chosen) {
                cookies.setCookie(
                    config.baseUrl,
                    "${SiteLocale.storageKey}=$deviceLocale; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
                )
            }
        } catch (_: Exception) {
            // No cookie store: the page sets the cookie itself (see the bootstrap script).
        }
    }

    private fun pulledToRefresh() {
        if (webView.url == null) {
            load(startUrl)
        } else {
            mutableState.update { it.copy(failure = null) }
            webView.reload()
        }
    }

    private fun settle() = mutableState.update { if (it.hasSettled) it else it.copy(hasSettled = true) }

    // endregion

    // region Sign-in state shared between tabs

    private fun readSession(done: (Boolean?) -> Unit) {
        if (!isOnSite()) return done(null)
        webView.evaluateJavascript(PageScripts.sessionProbe) { result ->
            done(when (result) { "true" -> true; "false" -> false; else -> null })
        }
    }

    private fun reloadIfSessionChanged() {
        val before = signedInAtLoad ?: return
        if (state.value.failure != null || state.value.isLoading) return
        readSession { now ->
            if (now != null && now != before) {
                signedInAtLoad = now
                webView.reload()
            }
        }
    }

    // endregion

    // region Scripts

    private fun isOnSite(): Boolean {
        val address = WebAddress.parse(webView.url ?: return false) ?: return false
        return address.scheme == "https" && address.host in config.internalHosts
    }

    override fun runOnSite(script: String, done: (Boolean) -> Unit) {
        if (!started || !isOnSite()) return done(false)
        webView.evaluateJavascript(script) { result -> done(result == "true") }
    }

    override fun readFromSite(script: String, done: (String?) -> Unit) {
        if (!started || !isOnSite()) return done(null)
        webView.evaluateJavascript(script) { result -> done(result?.takeIf { it != "null" }) }
    }

    private fun received(text: String?, sourceHost: String, isMainFrame: Boolean) {
        if (!isMainFrame || sourceHost.lowercase() !in config.internalHosts) return
        val body = try {
            Json.parseToJsonElement(text?.takeIf { it.length <= MAX_MESSAGE } ?: return) as? JsonObject
        } catch (_: Exception) {
            null
        } ?: return

        (body["locale"] as? JsonPrimitive)?.takeIf { it.isString }?.content
            ?.let(SiteLocale::normalize)?.let { reportedLocale = it }

        // The page may only ask for what the policy already refuses to show here.
        (body["open"] as? JsonPrimitive)?.takeIf { it.isString }?.content?.let { target ->
            if (policy.decide(target) == RouteDecision.Restricted) onRoute?.invoke(target, RouteDecision.Restricted)
        }

        (body["favorites"] as? JsonArray)?.let { list ->
            FavoriteRef.keys(list.toString())?.let { onFavorites?.invoke(it, this) }
        }
    }

    // endregion

    // region The web view

    private fun attach() {
        refresh.removeAllViews()
        refresh.addView(
            webView,
            ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
        )
    }

    private fun build(): WebView {
        val view = WebView(context)
        view.setBackgroundColor(PAPER)
        view.overScrollMode = View.OVER_SCROLL_NEVER

        with(view.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Keep the browser's own description and add ours, so the site still
            // sees Chrome on Android and can also tell it is inside the app.
            userAgentString = "$userAgentString ${config.userAgentToken}"
            mediaPlaybackRequiresUserGesture = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = false
            setGeolocationEnabled(false)
        }
        try {
            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(view, false)
        } catch (_: Exception) {
        }
        if (debuggable) WebView.setWebContentsDebuggingEnabled(true)

        installBridge(view)
        view.webViewClient = Navigation()
        view.webChromeClient = Chrome()
        // Something the web view cannot draw (a download): give it to the browser.
        view.setDownloadListener { url, _, _, _, _ ->
            if (url != null) onRoute?.invoke(url, RouteDecision.Browser)
        }
        return view
    }

    /**
     * Both pieces are limited to the site's own https origins by the web
     * view itself: the script never runs, and the bridge object never exists,
     * on anyone else's page or frame.
     */
    private fun installBridge(view: WebView) {
        hasDocumentStartScript = false
        try {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                WebViewCompat.addDocumentStartJavaScript(view, bootstrap, origins)
                hasDocumentStartScript = true
            }
            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                WebViewCompat.addWebMessageListener(view, PageScripts.bridgeName, origins) { _, message, sourceOrigin, isMainFrame, _ ->
                    received(message.data, sourceOrigin.host.orEmpty(), isMainFrame)
                }
            }
        } catch (_: Exception) {
            // An old or missing WebView: pages still load, without the bridge.
        }
    }

    /** The renderer was killed (low memory, a crash): the old view is dead, start a new one. */
    private fun rebuild(lastUrl: String?) {
        val old = webView
        refresh.removeView(old)
        old.destroy()
        webView = build()
        attach()
        mutableState.update { it.copy(isLoading = false, progress = 0f) }
        if (started) webView.loadUrl(lastUrl?.takeIf { policy.decide(it) == RouteDecision.Web } ?: startUrl)
    }

    private fun route(url: String, decision: RouteDecision) {
        onRoute?.invoke(url, decision)
    }

    private inner class Navigation : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            // Embedded catalogues, maps and players load whatever they need.
            if (!request.isForMainFrame) return false
            val url = request.url.toString()
            val decision = policy.decide(url)
            if (decision != RouteDecision.Web) {
                route(url, decision)
                return true
            }
            // The app never loads its own site in clear text.
            val secure = config.secure(url)
            if (secure != url) {
                view.loadUrl(secure)
                return true
            }
            return false
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            mutableState.update { it.copy(failure = null, isLoading = true, progress = 0.05f) }
            if (!hasDocumentStartScript && isOnSite()) view.evaluateJavascript(bootstrap, null)
        }

        override fun onPageFinished(view: WebView, url: String?) {
            refresh.isRefreshing = false
            mutableState.update { it.copy(isLoading = false, progress = 1f, hasSettled = true, canGoBack = view.canGoBack()) }
            readSession { signedIn -> signedInAtLoad = signedIn }
        }

        /**
         * The site moves between its own pages without a real navigation, so
         * those moves never reach `shouldOverrideUrlLoading`. This catches a
         * move into a section the app does not carry: step back out and hand
         * it to the browser.
         */
        override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
            mutableState.update { it.copy(canGoBack = view.canGoBack()) }
            if (url == null || policy.decide(url) != RouteDecision.Restricted) return
            if (view.canGoBack()) view.goBack() else view.loadUrl(startUrl)
            route(url, RouteDecision.Restricted)
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (!request.isForMainFrame) return
            refresh.isRefreshing = false
            val offline = error.errorCode in OFFLINE_ERRORS
            mutableState.update {
                it.copy(
                    isLoading = false,
                    hasSettled = true,
                    failure = LoadFailure(request.url.toString(), offline),
                )
            }
        }

        override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
            // Never continue past a bad certificate.
            handler.cancel()
            if (error.url == view.url || view.url == null) {
                refresh.isRefreshing = false
                mutableState.update {
                    it.copy(isLoading = false, hasSettled = true, failure = LoadFailure(error.url, false))
                }
            }
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            if (view === webView) rebuild(view.url)
            return true
        }
    }

    private inner class Chrome : WebChromeClient() {
        override fun onProgressChanged(view: WebView, newProgress: Int) {
            val value = (newProgress / 100f).coerceIn(0f, 1f)
            mutableState.update { it.copy(progress = value, hasSettled = it.hasSettled || value >= 0.85f) }
        }

        /** A link asking for a new window: there is only this one. */
        override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message?): Boolean {
            val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
            // The address only arrives through a web view; this one never draws.
            val catcher = WebView(context)
            catcher.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(v: WebView, request: WebResourceRequest): Boolean {
                    val url = request.url.toString()
                    val decision = policy.decide(url)
                    if (decision == RouteDecision.Web) webView.loadUrl(config.secure(url)) else route(url, decision)
                    v.post { v.destroy() }
                    return true
                }
            }
            transport.webView = catcher
            resultMsg.sendToTarget()
            return true
        }

        override fun onShowFileChooser(
            view: WebView,
            callback: ValueCallback<Array<Uri>>,
            params: FileChooserParams,
        ): Boolean {
            host.chooseFiles(params) { files -> callback.onReceiveValue(files) }
            return true
        }

        /** Only Miami Elio's own pages may ask, and only for the microphone. */
        override fun onPermissionRequest(request: PermissionRequest) {
            val asker = WebAddress.parse(request.origin.toString())
            val own = asker != null && asker.scheme == "https" && asker.host in config.internalHosts
            val wantsMicrophone = PermissionRequest.RESOURCE_AUDIO_CAPTURE in request.resources
            if (!own || !wantsMicrophone) {
                request.deny()
                return
            }
            val grant = { request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) }
            val allowed = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
            if (allowed) grant() else host.requestMicrophone { given -> if (given) grant() else request.deny() }
        }
    }

    // endregion

    private companion object {
        const val PAPER = 0xFF0A1218.toInt()
        const val MAX_MESSAGE = 64 * 1024

        val OFFLINE_ERRORS = setOf(
            WebViewClient.ERROR_HOST_LOOKUP,
            WebViewClient.ERROR_CONNECT,
            WebViewClient.ERROR_TIMEOUT,
            WebViewClient.ERROR_IO,
            WebViewClient.ERROR_PROXY_AUTHENTICATION,
        )
    }
}
