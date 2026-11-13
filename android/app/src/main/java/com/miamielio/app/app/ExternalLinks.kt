package com.miamielio.app.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.graphics.toColorInt
import androidx.core.net.toUri

/** The ways out of the app, on Android. */
class ExternalLinks(private val activity: Activity) : ExternalOpener {
    /**
     * A partner's or ticket seller's page in a browser tab over the app,
     * in the app's colours, so closing it returns the guest to exactly
     * where they were.
     */
    override fun openBrowser(url: String) {
        val address = url.toUri()
        val scheme = address.scheme?.lowercase()
        if (scheme != "https" && scheme != "http") return
        val colours = CustomTabColorSchemeParams.Builder()
            .setToolbarColor(PAPER)
            .setNavigationBarColor(PAPER)
            .build()
        val tab = CustomTabsIntent.Builder()
            .setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
            .setDefaultColorSchemeParams(colours)
            .setShowTitle(true)
            .build()
        try {
            tab.launchUrl(activity, address)
        } catch (_: ActivityNotFoundException) {
            openSystem(url)
        }
    }

    /** Phone, mail, WhatsApp, maps, the store - whatever app owns the link. */
    override fun openSystem(url: String) {
        val address = url.toUri()
        val intent = when (address.scheme?.lowercase()) {
            // Shows the dialler with the number in it; the guest places the call.
            "tel" -> Intent(Intent.ACTION_DIAL, address)
            "mailto" -> Intent(Intent.ACTION_SENDTO, address)
            // Only activities that declare themselves safe to open from a link.
            else -> Intent(Intent.ACTION_VIEW, address).addCategory(Intent.CATEGORY_BROWSABLE)
        }
        try {
            activity.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            // No app on this phone opens such a link.
        } catch (_: SecurityException) {
            // The app that claims the link does not let others start it.
        }
    }

    private companion object {
        val PAPER = "#0A1218".toColorInt()
    }
}
