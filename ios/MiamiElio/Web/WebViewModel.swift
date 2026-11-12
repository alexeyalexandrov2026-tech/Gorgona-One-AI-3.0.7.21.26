import Observation
import UIKit
import WebKit
import MiamiElioKit

/// Why a page could not be shown.
struct LoadFailure: Equatable {
    let url: URL?
    let isOffline: Bool
}

/// One web view showing the Miami Elio site, plus everything the app layers
/// on top of plain browsing: link routing, language hand-off, pull to
/// refresh, an offline screen, and keeping sign-in state in step between tabs.
@MainActor
@Observable
final class WebViewModel: NSObject {
    private(set) var progress: Double = 0
    private(set) var isLoading = false
    private(set) var failure: LoadFailure?
    /// True once the first page is all but drawn, or has failed: either way
    /// there is now something to look at. The splash waits for this.
    private(set) var hasSettled = false

    let webView: WKWebView

    /// Called for every link that should not load in this web view.
    @ObservationIgnored var onRoute: ((URL, RouteDecision) -> Void)?
    /// The favourites the page reports ("kind:slug"), with the page they came from.
    @ObservationIgnored var onFavorites: ((Set<String>, WebViewModel) -> Void)?

    private let config: AppConfig
    private let policy: RoutePolicy
    private let startURL: URL
    private let deviceLocale: String

    private enum Boot {
        case idle
        case preparing
        case ready
    }

    @ObservationIgnored private var boot = Boot.idle
    @ObservationIgnored private var queuedURL: URL?
    @ObservationIgnored private var observations: [NSKeyValueObservation] = []
    @ObservationIgnored private var reportedLocale: String?
    @ObservationIgnored private var signedInAtLoad: Bool?

    private static let messageChannel = "miamiElio"

    init(config: AppConfig, policy: RoutePolicy, startPath: String, deviceLocale: String) {
        self.config = config
        self.policy = policy
        self.startURL = config.resolve(startPath) ?? config.baseURL
        self.deviceLocale = deviceLocale

        let relay = MessageRelay()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        // Keep Safari's "Mobile/…" marker and add ours, so the site still
        // sees an iPhone browser and can also tell it is inside the app.
        configuration.applicationNameForUserAgent = "Mobile/15E148 \(config.userAgentToken)"
        configuration.allowsInlineMediaPlayback = true
        // As in Safari: silent video may start by itself, sound needs a tap.
        configuration.mediaTypesRequiringUserActionForPlayback = .audio
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: Self.bootstrapScript(hosts: config.internalHosts, restrictedPaths: policy.restrictedPaths, locale: deviceLocale),
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        configuration.userContentController.add(relay, name: Self.messageChannel)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = Theme.paperUI
        webView.scrollView.backgroundColor = Theme.paperUI
        webView.underPageBackgroundColor = Theme.paperUI
        #if DEBUG
        webView.isInspectable = true
        #endif
        self.webView = webView

        super.init()

        relay.owner = self
        webView.navigationDelegate = self
        webView.uiDelegate = self

        let refresh = UIRefreshControl()
        refresh.tintColor = Theme.softUI
        refresh.addTarget(self, action: #selector(pulledToRefresh), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        observations = [
            webView.observe(\.estimatedProgress, options: [.new]) { [weak self] _, change in
                guard let value = change.newValue else { return }
                Task { @MainActor [weak self] in
                    self?.progress = value
                    if value >= 0.85 { self?.settle() }
                }
            },
            webView.observe(\.isLoading, options: [.new]) { [weak self] _, change in
                guard let value = change.newValue else { return }
                Task { @MainActor [weak self] in self?.isLoading = value }
            },
            webView.observe(\.url, options: [.new]) { [weak self] _, change in
                guard let value = change.newValue, let url = value else { return }
                Task { @MainActor [weak self] in self?.addressChanged(to: url) }
            }
        ]
    }

    // MARK: - Loading

    /// The tab came on screen: load it the first time, and afterwards pick
    /// up a sign-in or sign-out that happened in the other tab.
    func activate() {
        switch boot {
        case .idle:
            begin(with: nil)
        case .preparing:
            break
        case .ready:
            reloadIfSessionChanged()
            // A favourite changed in another tab shows up when this one comes back.
            webView.evaluateJavaScript("window.__miamiFavoritesRefresh && window.__miamiFavoritesRefresh()", completionHandler: nil)
        }
    }

    func load(_ url: URL) {
        failure = nil
        switch boot {
        case .idle:
            begin(with: url)
        case .preparing:
            queuedURL = url
        case .ready:
            webView.load(URLRequest(url: url))
        }
    }

    func returnToStart() {
        load(startURL)
    }

    func retry() {
        let target = failure?.url ?? webView.url ?? startURL
        load(target)
    }

    /// The language the site is showing, for native features that must match it.
    func currentSiteLocale() -> String {
        reportedLocale ?? deviceLocale
    }

    private func begin(with url: URL?) {
        boot = .preparing
        queuedURL = url
        // The language cookie has to exist before the first request, or the
        // server renders that page in English.
        Task { [weak self] in
            await self?.writeLocaleCookieIfMissing()
            self?.finishPreparing()
        }
        // A cookie store that never answers must not leave a blank screen.
        Task { [weak self] in
            try? await Task.sleep(for: .seconds(2))
            self?.finishPreparing()
        }
    }

    private func settle() {
        if !hasSettled { hasSettled = true }
    }

    private func finishPreparing() {
        guard boot == .preparing else { return }
        boot = .ready
        webView.load(URLRequest(url: queuedURL ?? startURL))
        queuedURL = nil
    }

    private func writeLocaleCookieIfMissing() async {
        let store = webView.configuration.websiteDataStore.httpCookieStore
        let hosts = config.internalHosts
        let existing = await store.allCookies()
        let alreadyChosen = existing.contains { cookie in
            let domain = cookie.domain.hasPrefix(".") ? String(cookie.domain.dropFirst()) : cookie.domain
            return cookie.name == SiteLocale.storageKey && hosts.contains(domain.lowercased())
        }
        guard !alreadyChosen,
              let cookie = HTTPCookie(properties: [
                  .name: SiteLocale.storageKey,
                  .value: deviceLocale,
                  .domain: config.cookieHost,
                  .path: "/",
                  .expires: Date().addingTimeInterval(365 * 24 * 60 * 60)
              ])
        else { return }
        await store.setCookie(cookie)
    }

    /// The site moves between its own pages without a real navigation, so
    /// those moves never reach `decidePolicyFor`. This catches a move into a
    /// section the app does not carry: step back out and hand it to Safari.
    private func addressChanged(to url: URL) {
        guard policy.decide(url) == .restricted else { return }
        if webView.canGoBack {
            webView.goBack()
        } else {
            webView.load(URLRequest(url: startURL))
        }
        onRoute?(url, .restricted)
    }

    @objc private func pulledToRefresh() {
        if webView.url == nil {
            load(startURL)
        } else {
            failure = nil
            webView.reload()
        }
    }

    // MARK: - Sign-in state shared between tabs

    /// Both tabs share one cookie jar and one localStorage, but a page that is
    /// already open does not notice a sign-in made in the other tab. Each page
    /// records whether it loaded signed in; when its tab comes back on screen
    /// and that has changed, it reloads.
    private static let sessionProbe = """
    (function () {
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (/^sb-.*-auth-token$/.test(key) && localStorage.getItem(key)) { return true; }
        }
      } catch (e) {}
      return false;
    })()
    """

    private func readSession(_ completion: @escaping (Bool?) -> Void) {
        webView.evaluateJavaScript(Self.sessionProbe) { result, _ in
            completion(result as? Bool)
        }
    }

    private func reloadIfSessionChanged() {
        guard failure == nil, !webView.isLoading, let before = signedInAtLoad else { return }
        readSession { [weak self] now in
            guard let self, let now, now != before else { return }
            self.signedInAtLoad = now
            self.webView.reload()
        }
    }

    // MARK: - Page bootstrap

    /// Runs before any of the page's own code, on Miami Elio pages only.
    /// - Marks the document so the site hides web-only chrome
    ///   (`html[data-app] [data-app-hidden]` in `app/globals.css`).
    /// - Falls back to setting the language cookie from the page if the
    ///   native cookie write did not happen.
    /// - Reports the language the site settles on.
    /// - Stops links into sections the app does not carry before the site's
    ///   own router follows them, and hands them to the app instead.
    private static func bootstrapScript(hosts: Set<String>, restrictedPaths: [String], locale: String) -> String {
        let hostList = hosts.sorted().map { "'\($0)'" }.joined(separator: ",")
        let restrictedList = restrictedPaths.map { "'\($0)'" }.joined(separator: ",")
        return """
        (function () {
          var hosts = [\(hostList)];
          if (hosts.indexOf(location.hostname) === -1) { return; }

          // WebKit runs this once the root element exists; other engines may
          // run it a moment earlier, so wait for the element if it is not there.
          function whenRoot(run) {
            if (document.documentElement) { run(document.documentElement); return; }
            var waiting = new MutationObserver(function () {
              if (document.documentElement) { waiting.disconnect(); run(document.documentElement); }
            });
            waiting.observe(document, { childList: true });
          }

          function post(message) {
            try { window.webkit.messageHandlers.\(messageChannel).postMessage(message); } catch (e) {}
          }

          var key = '\(SiteLocale.storageKey)';
          try {
            var stored = window.localStorage.getItem(key);
            var hasCookie = new RegExp('(?:^|; )' + key + '=').test(document.cookie);
            if (!stored && !hasCookie) {
              document.cookie = key + '=\(locale); path=/; max-age=31536000; SameSite=Lax';
            }
          } catch (e) {}

          whenRoot(function (root) {
            root.setAttribute('data-app', 'ios');
            function report() { post({ locale: root.lang || '' }); }
            try {
              new MutationObserver(report).observe(root, { attributes: true, attributeFilter: ['lang'] });
            } catch (e) {}
            document.addEventListener('DOMContentLoaded', report);
          });

          var restricted = [\(restrictedList)];
          function isRestricted(pathname) {
            var path = String(pathname || '').toLowerCase();
            while (path.length > 1 && path.charAt(path.length - 1) === '/') { path = path.slice(0, -1); }
            return restricted.some(function (prefix) {
              return path === prefix || path.indexOf(prefix + '/') === 0;
            });
          }
          document.addEventListener('click', function (event) {
            var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
            if (!link) { return; }
            var url;
            try { url = new URL(link.getAttribute('href'), location.href); } catch (e) { return; }
            if (hosts.indexOf(url.hostname) !== -1 && isRestricted(url.pathname)) {
              event.preventDefault();
              event.stopPropagation();
              post({ open: url.href });
            }
          }, true);
        })();
        """
    }

    fileprivate func received(_ message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              config.internalHosts.contains(message.frameInfo.securityOrigin.host.lowercased()),
              let body = message.body as? [String: Any]
        else { return }

        if let locale = body["locale"] as? String, let code = SiteLocale.normalize(locale) {
            reportedLocale = code
        }
        // The page may only ask for what the policy already refuses to show here.
        if let target = body["open"] as? String, let url = URL(string: target), policy.decide(url) == .restricted {
            onRoute?(url, .restricted)
        }
        if let favorites = FavoriteRef.keys(from: body["favorites"]) {
            onFavorites?(favorites, self)
        }
    }

    /// Runs a script only while a Miami Elio page is showing; reports false anywhere else.
    func runOnSite(_ script: String, completion: @escaping (Bool) -> Void) {
        guard let host = webView.url?.host?.lowercased(), config.internalHosts.contains(host) else {
            completion(false)
            return
        }
        webView.evaluateJavaScript(script) { result, _ in
            completion((result as? Bool) == true)
        }
    }

    // MARK: - Presenting page dialogs

    private func present(_ alert: UIAlertController, otherwise fallback: () -> Void) {
        var presenter = webView.window?.rootViewController
        while let presented = presenter?.presentedViewController, !presented.isBeingDismissed {
            presenter = presented
        }
        guard let top = presenter else {
            fallback()
            return
        }
        top.present(alert, animated: true)
    }
}

// MARK: - Navigation

extension WebViewModel: WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        // Embedded catalogues, maps and players load whatever they need.
        if let frame = navigationAction.targetFrame, !frame.isMainFrame {
            decisionHandler(.allow)
            return
        }

        let decision = policy.decide(url)

        // A link asking for a new window: there is only this one.
        if navigationAction.targetFrame == nil {
            decisionHandler(.cancel)
            if decision == .web {
                webView.load(navigationAction.request)
            } else {
                onRoute?(url, decision)
            }
            return
        }

        if decision == .web {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
            onRoute?(url, decision)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        // Something the web view cannot draw (a download): give it to Safari.
        if navigationResponse.isForMainFrame, !navigationResponse.canShowMIMEType, let url = navigationResponse.response.url {
            decisionHandler(.cancel)
            onRoute?(url, .browser)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        failure = nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        settle()
        webView.scrollView.refreshControl?.endRefreshing()
        readSession { [weak self] signedIn in
            self?.signedInAtLoad = signedIn
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        settle()
        webView.scrollView.refreshControl?.endRefreshing()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        webView.scrollView.refreshControl?.endRefreshing()

        let failed = error as NSError
        // Not failures: a navigation this app cancelled or replaced.
        if failed.domain == NSURLErrorDomain, failed.code == NSURLErrorCancelled { return }
        if failed.domain == "WebKitErrorDomain", failed.code == 102 || failed.code == 204 { return }

        let offlineCodes: Set<Int> = [
            NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost, NSURLErrorTimedOut,
            NSURLErrorCannotFindHost, NSURLErrorCannotConnectToHost, NSURLErrorDNSLookupFailed,
            NSURLErrorInternationalRoamingOff, NSURLErrorDataNotAllowed
        ]
        settle()
        failure = LoadFailure(
            url: (failed.userInfo[NSURLErrorFailingURLErrorKey] as? URL) ?? webView.url,
            isOffline: failed.domain == NSURLErrorDomain && offlineCodes.contains(failed.code)
        )
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // iOS reclaimed the page's memory while the app was in the background.
        webView.reload()
    }
}

// MARK: - Windows, dialogs, permissions

extension WebViewModel: WKUIDelegate {
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // Normally answered in decidePolicyFor; this covers scripts that ask
        // for a window directly.
        if let url = navigationAction.request.url {
            let decision = policy.decide(url)
            if decision == .web {
                webView.load(navigationAction.request)
            } else {
                onRoute?(url, decision)
            }
        }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: L10n.actionOK, style: .default) { _ in completionHandler() })
        present(alert, otherwise: completionHandler)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: L10n.actionCancel, style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: L10n.actionOK, style: .default) { _ in completionHandler(true) })
        present(alert) { completionHandler(false) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: L10n.actionCancel, style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: L10n.actionOK, style: .default) { [weak alert] _ in
            completionHandler(alert?.textFields?.first?.text)
        })
        present(alert) { completionHandler(nil) }
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        // Only Miami Elio's own pages may ask; iOS still shows its prompt.
        decisionHandler(config.internalHosts.contains(origin.host.lowercased()) ? .prompt : .deny)
    }
}

// MARK: - Messages from the page

/// The web view keeps its message handler alive; this indirection stops that
/// from keeping the whole model alive with it.
@MainActor
private final class MessageRelay: NSObject, WKScriptMessageHandler {
    weak var owner: WebViewModel?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        owner?.received(message)
    }
}
