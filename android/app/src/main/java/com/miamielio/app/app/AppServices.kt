package com.miamielio.app.app

import android.app.Activity
import com.miamielio.app.BuildConfig
import com.miamielio.app.R
import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.core.SiteLocale
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

    fun onResume() {
        explore.onResume()
        account.onResume()
    }

    fun onPause() {
        explore.onPause()
        account.onPause()
    }

    fun destroy() {
        explore.destroy()
        account.destroy()
    }
}
