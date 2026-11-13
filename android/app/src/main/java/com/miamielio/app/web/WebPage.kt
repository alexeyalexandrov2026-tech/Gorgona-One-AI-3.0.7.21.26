package com.miamielio.app.web

import android.view.View
import com.miamielio.app.core.RouteDecision
import kotlinx.coroutines.flow.StateFlow

/** Why a page could not be shown. */
data class LoadFailure(val url: String?, val isOffline: Boolean)

/** What a web tab is doing right now. */
data class WebState(
    /** 0..1 while a page loads. */
    val progress: Float = 0f,
    val isLoading: Boolean = false,
    val failure: LoadFailure? = null,
    /**
     * True once the first page is all but drawn, or has failed: either way
     * there is now something to look at. The splash waits for this.
     */
    val hasSettled: Boolean = false,
    /** There is an earlier page in this tab to step back to. */
    val canGoBack: Boolean = false,
)

/**
 * One tab showing the Miami Elio site. The router, the favourites and the
 * screens talk to this, so they can be tested without a real web view.
 */
interface WebPage {
    val state: StateFlow<WebState>

    /** Called for every link that should not load in this web view. */
    var onRoute: ((url: String, decision: RouteDecision) -> Unit)?

    /** The favourites a page reports ("kind:slug"), with the page they came from. */
    var onFavorites: ((keys: Set<String>, source: WebPage) -> Unit)?

    /** The view to put on screen, or null when there is none (tests). */
    fun hostView(): View?

    /**
     * The tab came on screen: load it the first time, and afterwards pick up
     * a sign-in or sign-out that happened in the other tab.
     */
    fun activate()

    fun load(url: String)

    fun returnToStart()

    fun retry()

    /** Steps back in the page history; false when there is nowhere to go. */
    fun goBack(): Boolean

    /** The language the site is showing, for native features that must match it. */
    fun currentSiteLocale(): String

    /** Runs a script only while a Miami Elio page is showing; reports false anywhere else. */
    fun runOnSite(script: String, done: (Boolean) -> Unit)

    /**
     * Evaluates a script on a Miami Elio page and hands back its result as
     * JSON text, or null when no such page is showing.
     */
    fun readFromSite(script: String, done: (String?) -> Unit)
}
