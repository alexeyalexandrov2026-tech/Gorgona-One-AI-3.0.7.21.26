package com.miamielio.app.app

import android.app.Activity
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
import com.miamielio.app.core.SiteLocale
import com.miamielio.app.net.OkHttpTransport
import com.miamielio.app.web.WebHost
import com.miamielio.app.web.WebTabController

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

    fun onResume() {
        explore.onResume()
        account.onResume()
    }

    fun onPause() {
        explore.onPause()
        account.onPause()
    }

    fun destroy() {
        viewModels.clear()
        explore.destroy()
        account.destroy()
    }
}
