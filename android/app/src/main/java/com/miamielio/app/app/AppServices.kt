package com.miamielio.app.app

import android.app.Activity
import android.content.Context
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.miamielio.app.BuildConfig
import com.miamielio.app.R
import com.miamielio.app.concierge.ConciergeViewModel
import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.PlanClient
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.core.SearchClient
import com.miamielio.app.core.SiteLocale
import com.miamielio.app.favorites.FavoritesPage
import com.miamielio.app.favorites.FavoritesPreferences
import com.miamielio.app.favorites.FavoritesStore
import com.miamielio.app.net.OkHttpTransport
import com.miamielio.app.search.SearchViewModel
import com.miamielio.app.web.WebHost
import com.miamielio.app.web.WebTabController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Builds the app's long-lived objects once and wires them together. They
 * live as long as the Activity: the web views need it for their dialogs.
 */
class AppServices(
    activity: Activity,
    host: WebHost,
    val config: AppConfig = AppConfig.fromBuild(BuildConfig.BASE_URL, BuildConfig.ADDITIONAL_HOSTS),
    external: ExternalOpener = ExternalLinks(activity),
) {
    val policy = RoutePolicy(config)

    /** The language the app's own strings are showing in, as a site code. */
    val deviceLocale: String =
        SiteLocale.normalize(activity.getString(R.string.locale_code)) ?: SiteLocale.fallback

    val explore = WebTabController(activity, config, policy, startPath = "/", deviceLocale = deviceLocale, host = host)
    val account = WebTabController(activity, config, policy, startPath = "/profile", deviceLocale = deviceLocale, host = host)
    val router = AppRouter(config, policy, explore, account, external)

    private val favoritesScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val exploreFavorites = explore.favoritesPage()
    private val accountFavorites = account.favoritesPage()
    internal val favorites = FavoritesStore(
        FavoritesPreferences(activity.getSharedPreferences("miami-elio-favorites", Context.MODE_PRIVATE)),
        favoritesScope,
        listOf(exploreFavorites, accountFavorites),
    )

    init {
        explore.connectFavorites(exploreFavorites)
        account.connectFavorites(accountFavorites)
    }

    /**
     * The native screens' state. It lives in a store of its own, cleared in
     * [destroy], rather than in the Activity's: it reads the site's
     * language from [explore], which belongs to this Activity. The
     * conversation therefore survives tab switches and rotation, and starts
     * afresh only when the phone's language changes - with the web tabs.
     */
    private val viewModels = ViewModelStore()

    val concierge: ConciergeViewModel = ViewModelProvider.create(
        viewModels,
        viewModelFactory {
            initializer {
                ConciergeViewModel(
                    client = ConciergeClient(config, policy, OkHttpTransport.chat()),
                    planClient = PlanClient(config, OkHttpTransport.plan()),
                    // Nowhere to deliver a report yet (handoff, open question 1),
                    // so "report this answer" is not offered.
                    reporter = null,
                    locale = { explore.currentSiteLocale() },
                )
            }
        },
    )[ConciergeViewModel::class]

    /** Whether the phone has a connection; "no internet" screens ask again when it is back. */
    val connectivity = Connectivity(activity.applicationContext)

    val search: SearchViewModel = ViewModelProvider.create(
        viewModels,
        viewModelFactory {
            initializer { SearchViewModel(SearchClient(config, policy, OkHttpTransport.search()), connectivity.online) }
        },
    )[SearchViewModel::class]

    fun onResume() {
        explore.onResume()
        account.onResume()
        favorites.retry()
    }

    fun onPause() {
        explore.onPause()
        account.onPause()
    }

    fun destroy() {
        viewModels.clear()
        connectivity.close()
        favoritesScope.cancel()
        explore.destroy()
        account.destroy()
    }

    private fun WebTabController.favoritesPage(): FavoritesPage = FavoritesPage { change ->
        suspendCancellableCoroutine { continuation ->
            runOnSite(change.favorite.script(change.on)) { delivered ->
                if (continuation.isActive) continuation.resume(delivered)
            }
        }
    }

    private fun WebTabController.connectFavorites(page: FavoritesPage) {
        onFavorites = { keys, _ -> favorites.received(keys, page) }
        onFavoritesPageReady = { favorites.retry(page) }
    }
}
