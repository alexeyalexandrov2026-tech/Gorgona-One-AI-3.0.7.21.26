package com.miamielio.app.web

import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.core.SiteLocale
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull

data class BridgeFavorites(val keys: Set<String>, val owner: String?)
data class BridgeFavoriteReceipt(val id: String, val saved: Boolean)

/** What a Miami Elio page told the app. Every part is optional. */
data class BridgeMessage(
    /** The language the site settled on, as a site code ("ru"). */
    val locale: String? = null,
    /** A page the site would like opened outside the web view. */
    val open: String? = null,
    /** The guest's favourites as "kind:slug" keys. */
    val favorites: BridgeFavorites? = null,
    val favoriteReceipt: BridgeFavoriteReceipt? = null,
)

/**
 * The text side of the bridge between a page and the app: the script every
 * Miami Elio page starts with, and the reading of what it posts back.
 * Nothing here touches a web view, so all of it is tested on the JVM.
 */
object WebBootstrap {
    /** The object the web view gives Miami Elio pages to post messages through. */
    const val BRIDGE = "miamiElioNative"

    /** Only the site's own pages, and only over https, get the script and the bridge. */
    fun originRules(config: AppConfig): Set<String> =
        config.internalHosts.map { "https://$it" }.toSet()

    /** Check again in the renderer, in case navigation raced the native URL check. */
    internal fun onOrigin(origin: String, expression: String): String =
        "(function(){if(window.location.origin!==${js(origin)}) return false;return ($expression);})()"

    private fun js(text: String): String = JsonPrimitive(text).toString()
        // A line separator ends a statement in older engines.
        .replace(" ", "\\u2028")
        .replace(" ", "\\u2029")
        .replace("<", "\\u003c")

    private fun jsList(values: Iterable<String>): String = values.joinToString(",", "[", "]") { js(it) }

    /**
     * The one stylesheet the app adds to the site's pages. Every rule sits
     * under `html[data-app="android"]`, so the site in a browser is untouched.
     * - Hides the site's own launchers; the native tab and manager cover them.
     * - Lets the app's sea (drawn behind a transparent web view) show through:
     *   the page itself is transparent, cards become the app's dark glass and
     *   the sticky header a night bar. `body` carries `bg-g1-paper` itself, so
     *   the glass rule only reaches what is inside it.
     * - Turns the light profile (the villa palette) to light text on the sea.
     * `--g1-paper` is left alone: it is also the text colour on accent buttons.
     */
    internal val APP_STYLE: String = listOf(
        " [data-floating-launcher], html[data-app=\"android\"] .aidock { display: none !important; }",
        ", html[data-app=\"android\"] body { background: transparent !important; }",
        " body .bg-g1-paper, html[data-app=\"android\"] body .bg-g1-card" +
            " { background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(1,26,34,0.55)); }",
        " header.sticky { background-color: rgba(1,22,30,0.95) !important; }",
        " .bg-villa-parchment { background: transparent; }",
        " .text-villa-obsidian, html[data-app=\"android\"] .text-villa-charcoal { color: #f4f1ea; }",
        " .text-villa-graphite { color: rgba(244,241,234,0.78); }",
        " .text-villa-ash { color: #e6c88e; }",
        // The site gives the profile's favourites dark ink for the parchment.
        " .theme-villa [data-my-miami] { --g1-ink: #f4f1ea; --g1-ink-soft: rgba(244,241,234,0.72);" +
            " --g1-rule: rgba(244,241,234,0.2); --g1-card: rgba(255,255,255,0.08); }",
        " .border-villa-obsidian { border-color: rgba(244,241,234,0.55); }",
        " [class~=\"border-villa-obsidian/20\"], html[data-app=\"android\"] [class~=\"border-villa-obsidian/25\"]" +
            " { border-color: rgba(244,241,234,0.2); }",
    ).joinToString("\n") { "html[data-app=\"android\"]$it" }

    /**
     * Runs before any of the page's own code, on Miami Elio pages only.
     * - Gives the page the door the iPhone app has
     *   (`window.webkit.messageHandlers.miamiElio`), so the site talks to
     *   both apps the same way.
     * - Marks the document so the site hides web-only chrome
     *   (`html[data-app] [data-app-hidden]` in `app/globals.css`), and adds
     *   [APP_STYLE] for the app's own look.
     * - Falls back to setting the language cookie from the page if the
     *   native cookie write did not happen.
     * - Reports the language the site settles on.
     * - Stops links into sections the app does not carry before the site's
     *   own router follows them, and hands them to the app instead.
     */
    fun script(hosts: Set<String>, restrictedPaths: List<String>, locale: String): String {
        val language = SiteLocale.normalize(locale) ?: SiteLocale.fallback
        return """
        (function () {
          var hosts = ${jsList(hosts.sorted())};
          if (hosts.indexOf(location.hostname) === -1) { return; }
          // An older web view gets this script a second time, a moment late.
          if (window.__miamiElioApp) { return; }
          window.__miamiElioApp = 'android';

          function whenRoot(run) {
            if (document.documentElement) { run(document.documentElement); return; }
            var waiting = new MutationObserver(function () {
              if (document.documentElement) { waiting.disconnect(); run(document.documentElement); }
            });
            waiting.observe(document, { childList: true });
          }

          function post(message) {
            try { window.$BRIDGE.postMessage(JSON.stringify(message)); } catch (e) {}
          }
          try {
            window.webkit = window.webkit || {};
            window.webkit.messageHandlers = window.webkit.messageHandlers || {};
            window.webkit.messageHandlers.miamiElio = { postMessage: post };
          } catch (e) {}

          var key = ${js(SiteLocale.storageKey)};
          try {
            var stored = window.localStorage.getItem(key);
            var hasCookie = new RegExp('(?:^|; )' + key + '=').test(document.cookie);
            if (!stored && !hasCookie) {
              document.cookie = key + '=' + ${js(language)} + '; path=/; max-age=31536000; SameSite=Lax; Secure';
            }
          } catch (e) {}

          whenRoot(function (root) {
            root.setAttribute('data-app', 'android');
            // The app's look: no duplicate launchers, the app's sea under the page.
            function addAppStyle() {
              var style = document.createElement('style');
              style.textContent = ${js(APP_STYLE)};
              document.head.appendChild(style);
            }
            if (document.head) { addAppStyle(); }
            else { document.addEventListener('DOMContentLoaded', addAppStyle, { once: true }); }
            function report() { post({ locale: root.lang || '' }); }
            try {
              new MutationObserver(report).observe(root, { attributes: true, attributeFilter: ['lang'] });
            } catch (e) {}
            document.addEventListener('DOMContentLoaded', report);
          });

          var restricted = ${jsList(restrictedPaths)};
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
     * True when this page loaded with a signed-in guest. Both tabs share one
     * cookie jar and one localStorage, but a page that is already open does
     * not notice a sign-in made in the other tab; each tab compares this
     * when it comes back on screen and reloads if it changed.
     */
    const val SESSION_PROBE = """(function () {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (/^sb-.*-auth-token$/.test(key) && localStorage.getItem(key)) { return true; }
    }
  } catch (e) {}
  return false;
})()"""

    /**
     * Reads the signed-in guest's Supabase access token from WebView localStorage
     * strictly on Miami Elio's own origin, so native `/api/chat` (Wave 2C VIP memory
     * & proactive trip care) and `/api/plan` work identically to the website.
     */
    const val AUTH_TOKEN_PROBE = """(function () {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (/^sb-.*-auth-token$/.test(key)) {
        var raw = localStorage.getItem(key);
        if (!raw) { continue; }
        var parsed = JSON.parse(raw);
        var token = parsed && (parsed.access_token || (parsed.currentSession && parsed.currentSession.access_token));
        if (typeof token === 'string' && token.length >= 20) { return token; }
      }
    }
  } catch (e) {}
  return '';
})()"""

    /** Asks the page to look at its favourites again; a no-op where the site has none. */
    const val FAVORITES_REFRESH = "window.__miamiFavoritesRefresh && window.__miamiFavoritesRefresh()"

    private val json = Json { ignoreUnknownKeys = true }

    /** What the page posted, or null when it is not a message the app knows. */
    fun parse(data: String?): BridgeMessage? {
        if (data == null || data.length > MAX_MESSAGE_LENGTH) return null
        val body = try {
            json.parseToJsonElement(data) as? JsonObject
        } catch (_: Exception) {
            null
        } ?: return null

        fun string(key: String): String? =
            (body[key] as? JsonPrimitive)?.takeIf { it.isString }?.content?.trim()?.takeIf { it.isNotEmpty() }

        val owner = string("favoritesOwner")?.takeIf(uuid::matches)
        val validOwner = body["favoritesOwner"] == JsonNull || owner != null
        val receipt = body["favoriteReceipt"] as? JsonObject
        val receiptId = (receipt?.get("id") as? JsonPrimitive)?.takeIf { it.isString }?.content
        val saved = (receipt?.get("saved") as? JsonPrimitive)?.takeUnless { it.isString }?.booleanOrNull
        return BridgeMessage(
            locale = string("locale")?.let(SiteLocale::normalize),
            open = string("open"),
            favorites = if (validOwner && body["favoritesVersion"] == JsonPrimitive(2)) {
                (body["favorites"] as? JsonArray)?.let { BridgeFavorites(FavoriteRef.keys(it), owner) }
            } else null,
            favoriteReceipt = if (receiptId != null && uuid.matches(receiptId) && saved != null) {
                BridgeFavoriteReceipt(receiptId, saved)
            } else null,
        )
    }

    private const val MAX_MESSAGE_LENGTH = 64 * 1024
    private val uuid = Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
}
