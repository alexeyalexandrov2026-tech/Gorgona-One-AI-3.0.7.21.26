package com.miamielio.app.web

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Message
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
import androidx.core.graphics.toColorInt
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.miamielio.app.BuildConfig
import com.miamielio.app.app.WebPage
import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.RouteDecision
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.core.SiteLocale
import com.miamielio.app.core.WebAddress
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** What a page may ask the Activity for. */
interface WebHost {
    /** Shows the system's file chooser; `result` gets null when the guest backs out. */
    fun chooseFiles(intent: Intent, result: (Array<Uri>?) -> Unit)

    /** Asks for the microphone if the app does not have it yet. */
    fun requestMicrophone(result: (Boolean) -> Unit)
}

/**
 * One web view showing the Miami Elio site, plus everything the app layers
 * on top of plain browsing: link routing, language hand-off, pull to
 * refresh, an offline screen, and keeping sign-in state in step between tabs.
 *
 * It lives as long as its Activity, so a tab keeps its page and its history
 * while the guest is on another one.
 */
class WebTabController(
    private val activity: Activity,
    private val config: AppConfig,
    private val policy: RoutePolicy,
    startPath: String,
    private val deviceLocale: String,
    private val host: WebHost,
) : WebPage {
    data class State(
        val progress: Float = 0f,
        val isLoading: Boolean = false,
        val failure: LoadFailure? = null,
        /**
         * True once the first page is all but drawn, or has failed: either
         * way there is now something to look at. The splash waits for this.
         */
        val hasSettled: Boolean = false,
        val canGoBack: Boolean = false,
    )

    private val mutableState = MutableStateFlow(State())
    val state: StateFlow<State> = mutableState.asStateFlow()

    override var onRoute: ((url: String, decision: RouteDecision) -> Unit)? = null

    /** The favourites the page reports ("kind:slug"), with the page they came from. */
    var onFavorites: ((Set<String>, WebTabController) -> Unit)? = null
    internal var onFavoritesPageReady: (() -> Unit)? = null

    private val startUrl: String = config.resolve(startPath) ?: config.baseUrl
    private val bootstrap = WebBootstrap.script(config.internalHosts, policy.restrictedPaths, deviceLocale)
    private val originRules = WebBootstrap.originRules(config)

    private var started = false
    private var destroyed = false
    private var scriptInstalledAtDocumentStart = false
    private var reportedLocale: String? = null
    private var signedInAtLoad: Boolean? = null
    private var pendingUrl: String? = null

    /** The view a tab shows: the web view inside its pull-to-refresh frame. */
    val container: SwipeRefreshLayout = SwipeRefreshLayout(activity).apply {
        setColorSchemeColors(ACCENT)
        setProgressBackgroundColorSchemeColor(CARD)
        setBackgroundColor(PAPER)
        setOnRefreshListener { pulledToRefresh() }
    }

    internal var webView: WebView = build()
        private set

    init {
        attach(webView)
    }

    // --- Loading ---

    /**
     * The tab came on screen: load it the first time, and afterwards pick
     * up a sign-in or sign-out that happened in the other tab.
     */
    fun activate() {
        if (destroyed) return
        if (!started) {
            begin(startUrl)
            return
        }
        reloadIfSessionChanged()
        // A favourite changed in another tab shows up when this one comes back.
        runOnSite(WebBootstrap.FAVORITES_REFRESH) {}
        onFavoritesPageReady?.invoke()
    }

    override fun load(url: String) {
        if (destroyed) return
        mutableState.update { it.copy(failure = null) }
        if (started) webView.loadUrl(url) else begin(url)
    }

    override fun returnToStart() = load(startUrl)

    fun retry() = load(state.value.failure?.url ?: webView.url ?: startUrl)

    fun goBack() {
        if (webView.canGoBack()) webView.goBack()
    }

    /** The language the site is showing, for native features that must match it. */
    fun currentSiteLocale(): String = reportedLocale ?: deviceLocale

    /** Runs a script only while a Miami Elio page is showing; reports false anywhere else. */
    fun runOnSite(script: String, completion: (Boolean) -> Unit) {
        if (destroyed || state.value.isLoading || state.value.failure != null) {
            completion(false)
            return
        }
        val origin = siteOrigin(webView.url)
        if (origin == null) {
            completion(false)
            return
        }
        webView.evaluateJavascript(WebBootstrap.onOrigin(origin, script)) { result -> completion(result == "true") }
    }

    private fun siteOrigin(url: String?): String? {
        val address = url?.let(Uri::parse) ?: return null
        val host = address.host?.lowercase()
        if (address.scheme != "https" || address.userInfo != null ||
            (address.port != -1 && address.port != 443) || host !in config.internalHosts
        ) return null
        return "https://$host"
    }

    fun onResume() {
        if (!destroyed) webView.onResume()
    }

    fun onPause() {
        if (!destroyed) webView.onPause()
    }

    fun destroy() {
        if (destroyed) return
        destroyed = true
        container.removeAllViews()
        webView.destroy()
    }

    private fun begin(url: String) {
        started = true
        // The language cookie has to exist before the first request, or the
        // server renders that page in English.
        writeLocaleCookieIfMissing()
        webView.loadUrl(url)
    }

    private fun writeLocaleCookieIfMissing() {
        val cookies = CookieManager.getInstance()
        val name = SiteLocale.storageKey
        val alreadyChosen = config.internalHosts.any { host ->
            cookies.getCookie("https://$host/").orEmpty().split(';').any { it.trim().startsWith("$name=") }
        }
        if (alreadyChosen) return
        cookies.setCookie(config.baseUrl, "$name=$deviceLocale; Path=/; Max-Age=31536000; SameSite=Lax; Secure")
        cookies.flush()
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

    // --- Sign-in state shared between tabs ---

    private fun readSession(completion: (Boolean?) -> Unit) {
        webView.evaluateJavascript(WebBootstrap.SESSION_PROBE) { result ->
            completion(
                when (result) {
                    "true" -> true
                    "false" -> false
                    else -> null
                },
            )
        }
    }

    private fun reloadIfSessionChanged() {
        val before = signedInAtLoad ?: return
        if (state.value.failure != null || state.value.isLoading) return
        readSession { now ->
            if (now != null && now != before && !destroyed) {
                signedInAtLoad = now
                webView.reload()
            }
        }
    }

    // --- Messages from the page ---

    private fun received(data: String?, origin: Uri, isMainFrame: Boolean) {
        if (!isMainFrame || origin.scheme != "https" || origin.host?.lowercase() !in config.internalHosts) return
        val message = WebBootstrap.parse(data) ?: return

        message.locale?.let { reportedLocale = it }
        // The page may only ask for what the policy already refuses to show here.
        message.open?.let { target ->
            if (policy.decide(target) == RouteDecision.Restricted) onRoute?.invoke(target, RouteDecision.Restricted)
        }
        message.favorites?.let { onFavorites?.invoke(it, this) }
    }

    // --- Routing ---

    /** True when the app took the link; false to let the web view load it. */
    private fun route(view: WebView, raw: String): Boolean {
        val url = config.secure(raw)
        val decision = policy.decide(url)
        if (decision != RouteDecision.Web) {
            onRoute?.invoke(url, decision)
            return true
        }
        // One of the site's own pages written with "http://".
        if (url != raw) {
            view.loadUrl(url)
            return true
        }
        return false
    }

    /**
     * The site moves between its own pages without a real navigation, so
     * those moves never reach `shouldOverrideUrlLoading`. This catches a
     * move into a section the app does not carry: step back out and hand
     * it to the browser.
     */
    private fun addressChanged(view: WebView, url: String) {
        if (policy.decide(url) != RouteDecision.Restricted) return
        if (view.canGoBack()) view.goBack() else view.loadUrl(startUrl)
        onRoute?.invoke(url, RouteDecision.Restricted)
    }

    // --- The web view ---

    @SuppressLint("SetJavaScriptEnabled")
    private fun build(): WebView {
        val view = WebView(activity)
        view.setBackgroundColor(PAPER)
        view.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        with(view.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Keep the browser's own description and add ours, so the site
            // still sees a phone browser and can also tell it is inside the app.
            userAgentString = "$userAgentString ${config.userAgentToken}"
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = false
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            setGeolocationEnabled(false)
        }
        with(CookieManager.getInstance()) {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(view, false)
        }
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)

        view.webViewClient = Navigation()
        view.webChromeClient = Chrome()
        // Something the web view cannot draw (a download): give it to the browser.
        view.setDownloadListener { url, _, _, _, _ ->
            val scheme = WebAddress.parse(url)?.scheme
            if (scheme == "https" || scheme == "http") onRoute?.invoke(url, RouteDecision.Browser)
        }

        // Before any of the page's own code, on the site's own pages only.
        // An old system web view may lack either feature; the app then falls
        // back to injecting the script as each page starts, and to routing
        // without the page's help.
        scriptInstalledAtDocumentStart = runCatching {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                WebViewCompat.addDocumentStartJavaScript(view, bootstrap, originRules)
                true
            } else {
                false
            }
        }.getOrDefault(false)
        runCatching {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                WebViewCompat.addWebMessageListener(view, WebBootstrap.BRIDGE, originRules) { source, message, origin, isMainFrame, _ ->
                    if (!destroyed && source === webView) received(message.data, origin, isMainFrame)
                }
            }
        }
        return view
    }

    private fun attach(view: WebView) {
        (view.parent as? ViewGroup)?.removeView(view)
        container.removeAllViews()
        container.addView(view)
        // Pulling down refreshes only from the very top of the page.
        container.setOnChildScrollUpCallback { _, _ -> view.scrollY > 0 }
    }

    /** The system took the page's process (memory, or a crash): start a fresh web view where it was. */
    private fun rebuild(lost: WebView) {
        if (destroyed || lost !== webView) return
        val url = lost.url ?: startUrl
        container.removeAllViews()
        lost.destroy()
        webView = build()
        attach(webView)
        mutableState.update { it.copy(isLoading = false, progress = 0f, canGoBack = false) }
        container.isRefreshing = false
        if (started) webView.loadUrl(url)
    }

    private inner class Navigation : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            // Embedded catalogues, maps and players load whatever they need.
            if (!request.isForMainFrame) return false
            return route(view, request.url.toString())
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            pendingUrl = url
            mutableState.update { it.copy(failure = null, isLoading = true, progress = 0f) }
            if (!scriptInstalledAtDocumentStart && url != null) {
                val address = WebAddress.parse(url)
                if (address?.scheme == "https" && address.host in config.internalHosts) {
                    view.evaluateJavascript(bootstrap, null)
                }
            }
        }

        override fun onPageFinished(view: WebView, url: String?) {
            if (destroyed || view !== webView) return
            settle()
            container.isRefreshing = false
            mutableState.update { it.copy(isLoading = false, canGoBack = view.canGoBack()) }
            readSession { signedIn -> signedInAtLoad = signedIn }
            if (state.value.failure == null && url == view.url && siteOrigin(url) != null) {
                onFavoritesPageReady?.invoke()
            }
        }

        override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
            mutableState.update { it.copy(canGoBack = view.canGoBack()) }
            if (url != null) addressChanged(view, url)
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (!request.isForMainFrame) return
            val failure = LoadFailure.from(request.url.toString(), error.errorCode, error.description?.toString()) ?: return
            failed(failure)
        }

        override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
            // Never proceed past a certificate the system does not trust.
            handler.cancel()
            if (error.url != null && error.url == pendingUrl) failed(LoadFailure(error.url, isOffline = false))
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            rebuild(view)
            // Handled: without this the system closes the whole app.
            return true
        }

        private fun failed(failure: LoadFailure) {
            settle()
            container.isRefreshing = false
            mutableState.update { it.copy(failure = failure, isLoading = false) }
        }
    }

    private inner class Chrome : WebChromeClient() {
        override fun onProgressChanged(view: WebView, newProgress: Int) {
            mutableState.update { it.copy(progress = newProgress / 100f) }
            if (newProgress >= 85) settle()
        }

        /**
         * A link or a script asking for a new window: there is only this
         * one. A throwaway web view catches the address, which then goes
         * the same way as any other link.
         */
        override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message): Boolean {
            // A window nobody tapped for is a pop-up.
            if (!isUserGesture) return false
            val transport = resultMsg.obj as? WebView.WebViewTransport ?: return false
            val catcher = WebView(activity)
            var caught = false
            fun finish() {
                if (!caught) {
                    caught = true
                    catcher.post { catcher.destroy() }
                }
            }
            catcher.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(window: WebView, request: WebResourceRequest): Boolean {
                    if (!caught && !destroyed) {
                        val url = config.secure(request.url.toString())
                        val decision = policy.decide(url)
                        if (decision == RouteDecision.Web) webView.loadUrl(url) else onRoute?.invoke(url, decision)
                    }
                    finish()
                    return true
                }
            }
            // A window that never names an address is thrown away too.
            catcher.postDelayed({ finish() }, 10_000)
            transport.webView = catcher
            resultMsg.sendToTarget()
            return true
        }

        override fun onShowFileChooser(
            view: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams,
        ): Boolean {
            val intent = runCatching { fileChooserParams.createIntent() }.getOrNull() ?: return false
            host.chooseFiles(intent) { files -> filePathCallback.onReceiveValue(files) }
            return true
        }

        override fun onPermissionRequest(request: PermissionRequest) {
            // Only Miami Elio's own pages may ask, and only for the microphone;
            // Android still shows its own prompt the first time.
            val origin = request.origin
            val microphoneOnly = request.resources.isNotEmpty() &&
                request.resources.all { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE }
            if (origin?.scheme != "https" || origin.host?.lowercase() !in config.internalHosts || !microphoneOnly) {
                request.deny()
                return
            }
            host.requestMicrophone { granted ->
                if (granted) request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else request.deny()
            }
        }
    }

    private companion object {
        // The site's dark palette, as in ui/Theme.kt.
        val PAPER = "#0A1218".toColorInt()
        val CARD = "#111D25".toColorInt()
        val ACCENT = "#FF6E93".toColorInt()
    }
}
