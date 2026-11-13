package com.miamielio.app.app

import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.RouteDecision
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.core.WebAddress
import com.miamielio.app.web.WebPage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.net.URLDecoder

enum class AppTab { Explore, Concierge, Search, Account }

/** Where links that leave the app's own screens are sent. */
interface Outside {
    /** Someone else's page, in an in-app browser tab the guest can close. */
    fun openBrowser(url: String)

    /** A link Android or another app owns: phone, mail, WhatsApp, the browser. */
    fun openSystem(url: String)
}

/** Owns navigation: which tab is showing and where every link ends up. */
class AppRouter(
    private val config: AppConfig,
    private val policy: RoutePolicy,
    val explore: WebPage,
    val account: WebPage,
    private val outside: Outside,
) {
    private val selected = MutableStateFlow(AppTab.Explore)
    val selectedTab: StateFlow<AppTab> = selected.asStateFlow()

    /** Gets the id of the season week a tapped reminder is about. */
    var onSeasonReminder: ((String) -> Unit)? = null

    init {
        val route: (String, RouteDecision) -> Unit = { url, decision -> follow(url, decision) }
        explore.onRoute = route
        account.onRoute = route
    }

    /** Tab bar taps. Tapping the tab you are already on takes it back to its start. */
    fun select(tab: AppTab) {
        if (tab == selected.value) {
            when (tab) {
                AppTab.Explore -> explore.returnToStart()
                AppTab.Account -> account.returnToStart()
                AppTab.Concierge, AppTab.Search -> Unit
            }
        }
        show(tab)
    }

    /** Brings a tab on screen without the "tap again" behaviour. */
    fun show(tab: AppTab) {
        selected.value = tab
    }

    /**
     * The system back button. Web tabs step back through their pages; from
     * any other tab it returns to Home. False when Android should take over
     * (and put the app away).
     */
    fun back(): Boolean = when (selected.value) {
        AppTab.Explore -> explore.goBack()
        AppTab.Account -> account.goBack() || home()
        AppTab.Concierge, AppTab.Search -> home()
    }

    private fun home(): Boolean {
        selected.value = AppTab.Explore
        return true
    }

    /** A link from the site's own JSON ("/yachts/azimut-55"). */
    fun openReference(reference: String) {
        open(config.resolve(reference) ?: return)
    }

    fun open(url: String) = follow(url, policy.decide(url))

    /**
     * `miamielio://open?path=/yachts`, `miamielio://concierge`,
     * `miamielio://search`, `miamielio://account`, and the reminder's own
     * `miamielio://season?event=art-basel`.
     */
    fun handleDeepLink(link: String) {
        val address = WebAddress.parse(link) ?: return
        if (address.scheme != "miamielio") return
        when (address.host) {
            "concierge" -> show(AppTab.Concierge)
            "search" -> show(AppTab.Search)
            "account" -> show(AppTab.Account)
            "season" -> {
                show(AppTab.Concierge)
                query(link, "event")?.let { onSeasonReminder?.invoke(it) }
            }
            "open", "" -> {
                val path = query(link, "path") ?: "/"
                // Only site-relative paths: a deep link can never point the app elsewhere.
                if (path.startsWith("/") && !path.startsWith("//")) openReference(path)
            }
            else -> Unit
        }
    }

    private fun follow(url: String, decision: RouteDecision) {
        when (decision) {
            RouteDecision.Web -> {
                explore.load(url)
                selected.value = AppTab.Explore
            }
            RouteDecision.Browser -> outside.openBrowser(url)
            RouteDecision.System, RouteDecision.Restricted -> outside.openSystem(url)
            RouteDecision.Ignored -> Unit
        }
    }

    private fun query(link: String, name: String): String? {
        val text = link.substringAfter('?', "").substringBefore('#')
        if (text.isEmpty()) return null
        for (pair in text.split('&')) {
            val key = pair.substringBefore('=')
            if (key != name) continue
            return try {
                URLDecoder.decode(pair.substringAfter('=', ""), "UTF-8")
            } catch (_: Exception) {
                null
            }
        }
        return null
    }
}
