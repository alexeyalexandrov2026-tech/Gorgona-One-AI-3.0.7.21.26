package com.miamielio.app.web

import com.miamielio.app.core.SiteLocale
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive

/** The JavaScript the app gives to Miami Elio pages. Plain text, so it can be tested. */
object PageScripts {
    /** The object pages reach the app through (`WebViewCompat.addWebMessageListener`). */
    const val bridgeName = "miamiElioBridge"

    /** The channel name the site already posts to in the iPhone app. */
    const val messageChannel = "miamiElio"

    /**
     * Runs before any of the page's own code, on Miami Elio pages only.
     * - Marks the document so the site hides web-only chrome
     *   (`html[data-app] [data-app-hidden]` in `app/globals.css`).
     * - Falls back to setting the language cookie from the page if the
     *   native cookie write did not happen.
     * - Reports the language the site settles on.
     * - Gives the site the message channel it already knows from the iPhone
     *   app, carried over the origin-checked bridge.
     * - Stops links into sections the app does not carry before the site's
     *   own router follows them, and hands them to the app instead.
     */
    fun bootstrap(hosts: Set<String>, restrictedPaths: List<String>, locale: String): String {
        val hostList = literal(hosts.sorted())
        val restrictedList = literal(restrictedPaths)
        val language = SiteLocale.normalize(locale) ?: SiteLocale.fallback
        return """
            (function () {
              var hosts = $hostList;
              if (hosts.indexOf(location.hostname) === -1) { return; }
              if (window.__miamiElioBooted) { return; }
              window.__miamiElioBooted = true;

              function whenRoot(run) {
                if (document.documentElement) { run(document.documentElement); return; }
                var waiting = new MutationObserver(function () {
                  if (document.documentElement) { waiting.disconnect(); run(document.documentElement); }
                });
                waiting.observe(document, { childList: true });
              }

              function post(message) {
                try { window.$bridgeName.postMessage(JSON.stringify(message)); } catch (e) {}
              }

              try {
                window.webkit = window.webkit || {};
                window.webkit.messageHandlers = window.webkit.messageHandlers || {};
                window.webkit.messageHandlers.$messageChannel = { postMessage: post };
              } catch (e) {}

              var key = '${SiteLocale.storageKey}';
              try {
                var stored = window.localStorage.getItem(key);
                var hasCookie = new RegExp('(?:^|; )' + key + '=').test(document.cookie);
                if (!stored && !hasCookie) {
                  document.cookie = key + '=$language; path=/; max-age=31536000; SameSite=Lax; Secure';
                }
              } catch (e) {}

              whenRoot(function (root) {
                root.setAttribute('data-app', 'android');
                function report() { post({ locale: root.lang || '' }); }
                try {
                  new MutationObserver(report).observe(root, { attributes: true, attributeFilter: ['lang'] });
                } catch (e) {}
                document.addEventListener('DOMContentLoaded', report);
              });

              var restricted = $restrictedList;
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
        """.trimIndent()
    }

    /**
     * Both tabs share one cookie jar and one localStorage, but a page that is
     * already open does not notice a sign-in made in the other tab. Each page
     * records whether it loaded signed in; when its tab comes back on screen
     * and that has changed, it reloads.
     */
    val sessionProbe = """
        (function () {
          try {
            for (var i = 0; i < localStorage.length; i++) {
              var key = localStorage.key(i);
              if (/^sb-.*-auth-token$/.test(key) && localStorage.getItem(key)) { return true; }
            }
          } catch (e) {}
          return false;
        })()
    """.trimIndent()

    /** Asks the page to read its favourites again (a change made in another tab). */
    const val favoritesRefresh = "window.__miamiFavoritesRefresh && window.__miamiFavoritesRefresh()"

    /**
     * The favourites a signed-out guest keeps on this device, as the site
     * stores them (`gorgona-favorites` in `FavoritesProvider.jsx`): a JSON
     * array of "kind:slug", or null when the guest is signed in and the list
     * lives in the account.
     */
    val deviceFavorites = """
        (function () {
          try {
            for (var i = 0; i < localStorage.length; i++) {
              var key = localStorage.key(i);
              if (/^sb-.*-auth-token$/.test(key) && localStorage.getItem(key)) { return null; }
            }
            var list = JSON.parse(localStorage.getItem('gorgona-favorites') || '[]');
            if (!Array.isArray(list)) { return []; }
            return list.filter(function (item) { return item && item.kind && item.slug; })
              .map(function (item) { return item.kind + ':' + item.slug; });
          } catch (e) { return null; }
        })()
    """.trimIndent()

    private fun literal(values: List<String>): String =
        JsonArray(values.map(::JsonPrimitive)).toString()
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
            .replace("<", "\\u003c")
}
