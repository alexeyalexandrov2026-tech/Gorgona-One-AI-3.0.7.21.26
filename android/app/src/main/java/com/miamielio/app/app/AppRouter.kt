package com.miamielio.app.app

import com.miamielio.app.core.AppConfig
import com.miamielio.app.core.DeepLink
import com.miamielio.app.core.RouteDecision
import com.miamielio.app.core.RoutePolicy
import com.miamielio.app.core.WebAddress
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** The bar, left to right; the concierge's orb sits in the middle. */
enum class AppTab { Today, Catalog, Concierge, Exclusive, Account }

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

/**
 * Owns navigation: which tab is showing and where every link ends up.
 * [explore] shows the site pages that open over a tab; [account] and
 * [exclusive] are the pages of the two tabs that are the site.
 */
class AppRouter(
    private val config: AppConfig,
    private val policy: RoutePolicy,
    private val explore: WebPage,
    private val account: WebPage,
    private val exclusive: WebPage,
    private val external: ExternalOpener,
    private val onSeason: (String) -> Unit = {},
) {
    private val selected = MutableStateFlow(AppTab.Today)
    val selectedTab: StateFlow<AppTab> = selected.asStateFlow()

    private val events = MutableStateFlow(false)

    /**
     * True while the season's Events screen is open. It is no tab of the
     * bar: it hangs off Today (the next event's row and the menu open it,
     * "back" returns to Today), so Today stays the selected tab while it shows.
     */
    val eventsOpen: StateFlow<Boolean> = events.asStateFlow()

    private val layer = MutableStateFlow(false)

    /** True while a page of the site is shown over the current tab. */
    val webLayer: StateFlow<Boolean> = layer.asStateFlow()

    /** Puts the site page away; the tab underneath is where the guest left it. */
    fun closeLayer() {
        layer.value = false
    }

    init {
        val route: (String, RouteDecision) -> Unit = { url, decision -> follow(url, decision) }
        explore.onRoute = route
        account.onRoute = route
        exclusive.onRoute = route
    }

    /** Tab bar taps. Tapping the tab you are already on takes it back to its start. */
    fun select(tab: AppTab) {
        if (tab == selected.value && !layer.value && !events.value) pageOf(tab)?.returnToStart()
        show(tab)
    }

    /** Brings a tab forward without the "tap again to go home" meaning of [select]. */
    fun show(tab: AppTab) {
        layer.value = false
        events.value = false
        selected.value = tab
    }

    /** Opens the Events screen, from wherever the guest is; "back" and the Today tab lead home. */
    fun showEvents() {
        layer.value = false
        selected.value = AppTab.Today
        events.value = true
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
            is DeepLink.SeasonConcierge -> {
                show(AppTab.Concierge)
                onSeason(link.eventId)
            }
            DeepLink.Search -> show(AppTab.Catalog)
            DeepLink.Account -> show(AppTab.Account)
            is DeepLink.Open -> open(link.path)
            null -> Unit
        }
    }

    private fun follow(url: String, decision: RouteDecision) {
        when (decision) {
            RouteDecision.Web -> {
                val tab = ownTab(url)
                if (tab != null) {
                    show(tab)
                } else {
                    explore.load(url)
                    layer.value = true
                }
            }
            RouteDecision.Browser -> external.openBrowser(url)
            RouteDecision.System, RouteDecision.Restricted -> external.openSystem(url)
            RouteDecision.Ignored -> Unit
        }
    }

    /** The tabs that are a page of the site, so that tapping them again can go back to its start. */
    private fun pageOf(tab: AppTab): WebPage? = when (tab) {
        AppTab.Account -> account
        AppTab.Exclusive -> exclusive
        else -> null
    }

    /** Site pages the app shows in a tab of its own rather than over one. */
    private fun ownTab(url: String): AppTab? {
        val path = WebAddress.parse(url)?.path?.lowercase()?.trimEnd('/') ?: return null
        return when (path) {
            "/profile" -> AppTab.Account
            "/search" -> AppTab.Catalog
            "/exclusive-destinations" -> AppTab.Exclusive
            else -> null
        }
    }
}
