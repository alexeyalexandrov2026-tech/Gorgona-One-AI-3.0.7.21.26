package com.miamielio.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.miamielio.app.app.AppRoot
import com.miamielio.app.app.AppRouter
import com.miamielio.app.app.AppScreens
import com.miamielio.app.app.Outside
import com.miamielio.app.concierge.ConciergeViewModel
import com.miamielio.app.concierge.Dictation
import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.PlanClient
import com.miamielio.app.core.ReportClient
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.core.SearchClient
import com.miamielio.app.core.Season
import com.miamielio.app.core.SeasonEvent
import com.miamielio.app.core.SiteLocale
import com.miamielio.app.favorites.FavoriteMemory
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.net.OkHttpTransport
import com.miamielio.app.search.SearchViewModel
import com.miamielio.app.season.AlarmReminders
import com.miamielio.app.season.SeasonStore
import com.miamielio.app.ui.MiamiElioTheme
import com.miamielio.app.ui.filled
import com.miamielio.app.web.WebHost
import com.miamielio.app.web.WebTabController

class MainActivity : ComponentActivity(), WebHost, Outside {
    private val config = AppConfig.fromBuild(BuildConfig.BASE_URL, BuildConfig.ADDITIONAL_HOSTS)
    private val policy = RoutePolicy(config)

    private lateinit var router: AppRouter
    private lateinit var season: SeasonStore
    private lateinit var dictation: Dictation

    private var siteLocale: () -> String = { SiteLocale.fallback }

    private val concierge: ConciergeViewModel by viewModels { Models() }
    private val search: SearchViewModel by viewModels { Models() }

    private var filesDone: ((Array<Uri>?) -> Unit)? = null
    private val files = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val done = filesDone
        filesDone = null
        done?.invoke(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
    }

    private var microphoneDone: ((Boolean) -> Unit)? = null
    private val microphone = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val done = microphoneDone
        microphoneDone = null
        done?.invoke(granted)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // One appearance, dark: light icons in both system bars, always.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)

        val deviceLocale = SiteLocale.resolve(
            (0 until resources.configuration.locales.size()).map { resources.configuration.locales[it].toLanguageTag() },
        )
        val explore = WebTabController(this, config, policy, "/", deviceLocale, this, BuildConfig.DEBUG)
        val account = WebTabController(this, config, policy, "/profile", deviceLocale, this, BuildConfig.DEBUG)
        // Answer in whatever language the guest last chose on the site.
        siteLocale = { explore.currentSiteLocale() }
        router = AppRouter(config, policy, explore, account, this)

        // Both web views share one storage; either may report the list.
        val favorites = FavoritesStore(explore, PhoneFavorites(this))
        explore.onFavorites = favorites::received
        account.onFavorites = favorites::received

        season = SeasonStore(readSeason(), AlarmReminders(applicationContext))
        season.refresh()
        // A tapped season reminder opens the concierge with the week's
        // request ready in the composer, for the guest to send or change.
        router.onSeasonReminder = { id ->
            season.event(id)?.let { event ->
                concierge.prepare(
                    getString(R.string.season_ask).filled("name" to event.name, "dates" to Season.range(event)),
                )
            }
        }

        dictation = Dictation(applicationContext)
        val screens = AppScreens(router, concierge, search, favorites, season, dictation)
        setContent { MiamiElioTheme { AppRoot(screens) } }

        if (savedInstanceState == null) follow(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        follow(intent)
    }

    override fun onDestroy() {
        dictation.cancel()
        super.onDestroy()
    }

    /** `miamielio://…` links, from another app or from one of the app's own reminders. */
    private fun follow(intent: Intent?) {
        val link = intent?.takeIf { it.action == Intent.ACTION_VIEW }?.dataString ?: return
        router.handleDeepLink(link)
    }

    private fun readSeason(): List<SeasonEvent> = try {
        Season.decode(assets.open("season.json").bufferedReader(Charsets.UTF_8).use { it.readText() })
    } catch (_: Exception) {
        emptyList()
    }

    // region WebHost

    override fun chooseFiles(params: WebChromeClient.FileChooserParams, done: (Array<Uri>?) -> Unit) {
        // A page that asks twice gets no answer to its first question.
        filesDone?.invoke(null)
        filesDone = done
        try {
            files.launch(params.createIntent())
        } catch (_: ActivityNotFoundException) {
            filesDone = null
            done(null)
        }
    }

    override fun requestMicrophone(done: (Boolean) -> Unit) {
        microphoneDone?.invoke(false)
        microphoneDone = done
        microphone.launch(Manifest.permission.RECORD_AUDIO)
    }

    // endregion

    // region Outside

    override fun openBrowser(url: String) {
        val colors = CustomTabColorSchemeParams.Builder()
            .setToolbarColor(PAPER)
            .setNavigationBarColor(PAPER)
            .build()
        val tab = CustomTabsIntent.Builder()
            .setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
            .setDefaultColorSchemeParams(colors)
            .setShowTitle(true)
            .setShareState(CustomTabsIntent.SHARE_STATE_ON)
            .build()
        try {
            tab.launchUrl(this, Uri.parse(url))
        } catch (_: Exception) {
            openSystem(url)
        }
    }

    override fun openSystem(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: Exception) {
            // Nothing on the phone opens this kind of link.
        }
    }

    // endregion

    /** Builds the view models with the app's clients; they outlive a redrawn screen. */
    private inner class Models : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = when (modelClass) {
            ConciergeViewModel::class.java -> ConciergeViewModel(
                client = ConciergeClient(config, policy, OkHttpTransport.chat()),
                planClient = PlanClient(config, OkHttpTransport.plan()),
                reportClient = BuildConfig.REPORT_PATH.takeIf { it.startsWith("/") }
                    ?.let { ReportClient(config, it, OkHttpTransport.plan()) },
                locale = { siteLocale() },
            )
            SearchViewModel::class.java -> SearchViewModel(SearchClient(config, policy, OkHttpTransport.search()))
            else -> throw IllegalArgumentException(modelClass.name)
        } as T
    }

    private companion object {
        const val PAPER = 0xFF0A1218.toInt()
    }
}

/** The hearts as the phone remembers them, for when no page has reported yet. */
private class PhoneFavorites(context: Context) : FavoriteMemory {
    private val store = context.getSharedPreferences("favorites", Context.MODE_PRIVATE)

    override fun load(): Set<String> = store.getStringSet(KEY, emptySet()).orEmpty().toSet()

    override fun save(keys: Set<String>) = store.edit().putStringSet(KEY, keys.toSet()).apply()

    private companion object {
        const val KEY = "keys"
    }
}
