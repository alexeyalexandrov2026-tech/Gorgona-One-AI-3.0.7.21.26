package com.miamielio.app.app

import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.DeepLink
import com.miamielio.app.core.RouteDecision
import com.miamielio.app.core.RoutePolicy
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class AppTab { Explore, Concierge, Search, Account }

/** A tab that shows part of the site, as the router sees it. */
interface WebPage {
    /** Called for every link that should not load in this page's own web view. */
    var onRoute: ((url: String, decision: RouteDecision) -> Unit)?

    fun load(url: String)

    fun returnToStart()
}

/** The ways out of the app. */
interface ExternalOpener {
    /** Someone else's page, shown over the app so "back" returns the guest to where they were. */
    fun openBrowser(url: String)

    /** A link another app owns: phone, mail, WhatsApp, the browser itself. */
    fun openSystem(url: String)
}

/** Owns navigation: which tab is showing and where every link ends up. */
class AppRouter(
    private val config: AppConfig,
    private val policy: RoutePolicy,
    private val explore: WebPage,
    private val account: WebPage,
    private val external: ExternalOpener,
) {
    private val selected = MutableStateFlow(AppTab.Explore)
    val selectedTab: StateFlow<AppTab> = selected.asStateFlow()

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
        selected.value = tab
    }

    /** Brings a tab forward without the "tap again to go home" meaning of [select]. */
    fun show(tab: AppTab) {
        selected.value = tab
    }

    /** A link from the site's own JSON ("/yachts/azimut-55") or a full address. */
    fun open(reference: String) {
        val url = config.resolve(reference) ?: return
        follow(url, policy.decide(url))
    }

    /** `miamielio://open?path=/yachts`, `miamielio://concierge`, `miamielio://search`, `miamielio://account`. */
    fun handle(deepLink: String) {
        when (val link = DeepLink.parse(deepLink)) {
            DeepLink.Concierge -> show(AppTab.Concierge)
            DeepLink.Search -> show(AppTab.Search)
            DeepLink.Account -> show(AppTab.Account)
            is DeepLink.Open -> open(link.path)
            null -> Unit
        }
    }

    private fun follow(url: String, decision: RouteDecision) {
        when (decision) {
            RouteDecision.Web -> {
                explore.load(url)
                show(AppTab.Explore)
            }
            RouteDecision.Browser -> external.openBrowser(url)
            RouteDecision.System, RouteDecision.Restricted -> external.openSystem(url)
            RouteDecision.Ignored -> Unit
        }
    }
}
