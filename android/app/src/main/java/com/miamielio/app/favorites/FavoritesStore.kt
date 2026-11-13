package com.miamielio.app.favorites

import com.miamielio.app.core.FavoriteRef
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

internal data class FavoriteChange(val favorite: FavoriteRef, val on: Boolean, val owner: String? = null)

/** True after the page confirms it persisted the edit. */
internal fun interface FavoritesPage {
    suspend fun deliver(change: FavoriteChange): Boolean
}

internal data class FavoritesSnapshot(
    val keys: Set<String> = emptySet(),
    val pending: List<FavoriteChange> = emptyList(),
    val owner: String? = null,
)

internal interface FavoritesPersistence {
    fun load(): FavoritesSnapshot
    fun save(snapshot: FavoritesSnapshot)
}

/**
 * One store for both native screens. All calls and delivery callbacks run on
 * the main thread, using a scope that ends with the Activity and its web views.
 */
internal class FavoritesStore(
    private val persistence: FavoritesPersistence,
    private val scope: CoroutineScope,
    private val pages: List<FavoritesPage> = emptyList(),
) {
    private val initial = persistence.load()
    private var owner: String? = null
    private val pending = ArrayDeque(initial.pending)
    private val mutableKeys = MutableStateFlow(if (initial.owner == null) initial.keys else emptySet())
    val keys: StateFlow<Set<String>> = mutableKeys.asStateFlow()

    private var delivery: Job? = null
    private var nextTargets: List<FavoritesPage>? = null

    fun isSaved(favorite: FavoriteRef): Boolean = favorite.key in keys.value

    fun toggle(favorite: FavoriteRef) {
        val on = !isSaved(favorite)
        mutableKeys.value = if (on) keys.value + favorite.key else keys.value - favorite.key
        pending.addLast(FavoriteChange(favorite, on, owner))
        save()
        retry()
    }

    fun received(reported: Set<String>, from: FavoritesPage, reportedOwner: String? = null) {
        if (reportedOwner != owner) {
            if (owner == null && reportedOwner != null) {
                // Sign-in carries unsent guest saves into this account. Guest
                // removals must not remove an independently saved account item.
                val guestChanges = pending.filter { it.owner == null }.associateBy { it.favorite.key }
                pending.removeAll { it.owner == null }
                guestChanges.values.filter(FavoriteChange::on).forEach { pending.addLast(it.copy(owner = reportedOwner)) }
            }
            owner = reportedOwner
            mutableKeys.value = pending.filter { it.owner == owner }.fold(reported) { saved, change ->
                if (change.on) saved + change.favorite.key else saved - change.favorite.key
            }
            save()
        } else if (pending.none { it.owner == owner } && keys.value != reported) {
            mutableKeys.value = reported
            save()
        }
        retry(from)
    }

    /**
     * Try the page that just became available first, then the other tab.
     * Remember a new opportunity even when a previous attempt is in flight.
     */
    fun retry(preferred: FavoritesPage? = null) {
        if (pending.none { it.owner == owner } || pages.isEmpty()) return
        if (preferred != null) nextTargets = listOf(preferred) + pages.filter { it !== preferred }
        else if (nextTargets == null) nextTargets = pages
        if (delivery?.isActive == true) return
        delivery = scope.launch(start = CoroutineStart.LAZY) {
            while (true) {
                val targets = nextTargets ?: break
                nextTargets = null
                for (page in targets) {
                    while (true) {
                        val change = pending.firstOrNull { it.owner == owner } ?: break
                        // A replaced WebView may never call back. Setting a value
                        // (rather than toggling on the page) makes a retry safe.
                        if (withTimeoutOrNull(DELIVERY_TIMEOUT_MILLIS) { page.deliver(change) } != true) break
                        pending.remove(change)
                        save()
                    }
                }
            }
            nextTargets = null
        }
        delivery?.start()
    }

    private fun save() = persistence.save(FavoritesSnapshot(keys.value, pending.toList(), owner))

    private companion object {
        const val DELIVERY_TIMEOUT_MILLIS = 20_000L
    }
}
