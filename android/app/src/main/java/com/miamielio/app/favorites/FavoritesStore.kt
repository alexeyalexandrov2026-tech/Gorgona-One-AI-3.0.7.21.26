package com.miamielio.app.favorites

import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.web.PageScripts
import com.miamielio.app.web.WebPage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Where the hearts are remembered on the phone between launches. */
interface FavoriteMemory {
    fun load(): Set<String>

    fun save(keys: Set<String>)
}

/**
 * The hearts on native screens. The website keeps the list ("My Miami"): in
 * the account when the guest is signed in on the site, on this device
 * otherwise. This store hands each change to a page and takes the list a
 * page reports back, so the site and the app show the same favourites.
 *
 * Until a page reports - before the first one loads, or when the site's
 * favourites are not switched on - the hearts show what the phone itself
 * remembers, so a guest's choices never vanish.
 */
class FavoritesStore(
    private val page: WebPage,
    private val memory: FavoriteMemory,
) {
    private class Change(val favorite: FavoriteRef, val on: Boolean)

    private val mutableKeys = MutableStateFlow(memory.load())
    val keys: StateFlow<Set<String>> = mutableKeys.asStateFlow()

    private val pending = ArrayDeque<Change>()
    private var delivering = false

    fun isSaved(favorite: FavoriteRef): Boolean = favorite.key in mutableKeys.value

    fun toggle(favorite: FavoriteRef) {
        val on = favorite.key !in mutableKeys.value
        remember(if (on) mutableKeys.value + favorite.key else mutableKeys.value - favorite.key)
        pending.addLast(Change(favorite, on))
        deliver(page)
    }

    /** A page reported its list, so it is ready: anything still waiting goes to it. */
    fun received(reported: Set<String>, source: WebPage) {
        if (pending.isEmpty()) remember(reported)
        deliver(source)
    }

    /**
     * A tab came on screen. A guest's device list can be read straight from
     * the site's storage, which also covers a site that does not report to
     * this app yet; a signed-in guest's list comes only from the page.
     */
    fun sync(source: WebPage) {
        deliver(source)
        source.readFromSite(PageScripts.deviceFavorites) { json ->
            val list = FavoriteRef.keys(json) ?: return@readFromSite
            if (pending.isEmpty() && !delivering) remember(list)
        }
    }

    private fun remember(keys: Set<String>) {
        if (keys == mutableKeys.value) return
        mutableKeys.value = keys
        memory.save(keys)
    }

    /** One change at a time, in order; a change stays queued until a page has it. */
    private fun deliver(target: WebPage) {
        if (delivering) return
        val next = pending.firstOrNull() ?: return
        delivering = true
        target.runOnSite(next.favorite.script(next.on)) { delivered ->
            delivering = false
            if (delivered) {
                pending.removeFirstOrNull()
                deliver(target)
            }
        }
    }
}
