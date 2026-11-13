package com.miamielio.app.favorites

import com.miamielio.app.core.FavoriteRef
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class FavoritesStoreTest {
    private val yacht = requireNotNull(FavoriteRef.of("yacht", "azimut-55", "Azimut 55", "Miami", "/azimut.jpg"))
    private val stay = requireNotNull(FavoriteRef.of("stay", "villa-azure", "Villa Azure"))

    @Test
    fun guestSelectionsAndUnsentChangesSurviveReopening() = runTest {
        val disk = MemoryFavorites()
        val first = FavoritesStore(disk, this)

        first.toggle(yacht)
        first.toggle(stay)
        first.toggle(yacht)

        val delivered = mutableListOf<FavoriteChange>()
        val page = FavoritesPage { change -> delivered.add(change) }
        val reopened = FavoritesStore(disk, this, listOf(page))
        assertFalse(reopened.isSaved(yacht))
        assertTrue(reopened.isSaved(stay))
        reopened.retry()
        advanceUntilIdle()

        assertEquals(listOf(FavoriteChange(yacht, true), FavoriteChange(stay, true), FavoriteChange(yacht, false)), delivered)
        assertTrue(disk.snapshot.pending.isEmpty())
        assertEquals(setOf(stay.key), FavoritesStore(disk, this).keys.value)
    }

    @Test
    fun aStaleListCannotUndoASelectionWhileThePageIsAcceptingIt() = runTest {
        val disk = MemoryFavorites()
        val accepted = CompletableDeferred<Boolean>()
        val calls = mutableListOf<FavoriteChange>()
        val page = FavoritesPage { change -> calls.add(change); accepted.await() }
        val store = FavoritesStore(disk, this, listOf(page))

        store.toggle(yacht)
        runCurrent()
        store.received(emptySet(), page)
        store.toggle(stay)
        runCurrent()

        assertEquals(listOf(FavoriteChange(yacht, true)), calls)
        assertEquals(setOf(yacht.key, stay.key), store.keys.value)
        assertEquals(2, disk.snapshot.pending.size)

        accepted.complete(true)
        advanceUntilIdle()
        assertEquals(listOf(FavoriteChange(yacht, true), FavoriteChange(stay, true)), calls)
        assertTrue(disk.snapshot.pending.isEmpty())

        store.received(setOf(stay.key), page)
        assertEquals(setOf(stay.key), store.keys.value)
        assertEquals(setOf(stay.key), disk.snapshot.keys)
    }

    @Test
    fun aPageThatBecomesReadyRetriesTheOldestChangeFirst() = runTest {
        val disk = MemoryFavorites()
        val attempts = mutableListOf<FavoriteChange>()
        var ready = false
        val home = FavoritesPage { false }
        val account = FavoritesPage { change -> attempts.add(change); ready }
        val store = FavoritesStore(disk, this, listOf(home, account))

        store.toggle(yacht)
        store.toggle(stay)
        advanceUntilIdle()

        assertEquals(listOf(FavoriteChange(yacht, true)), attempts)
        assertEquals(2, disk.snapshot.pending.size)

        ready = true
        store.received(setOf("car:test"), account)
        advanceUntilIdle()
        assertEquals(listOf(FavoriteChange(yacht, true), FavoriteChange(yacht, true), FavoriteChange(stay, true)), attempts)
        assertEquals(setOf(yacht.key, stay.key), store.keys.value)
        assertTrue(disk.snapshot.pending.isEmpty())
    }

    @Test
    fun aLostWebViewCallbackDoesNotBlockTheOtherTab() = runTest {
        val disk = MemoryFavorites()
        val lost = FavoritesPage { CompletableDeferred<Boolean>().await() }
        val delivered = mutableListOf<FavoriteChange>()
        val ready = FavoritesPage { change -> delivered.add(change) }
        val store = FavoritesStore(disk, this, listOf(lost, ready))

        store.toggle(stay)
        advanceUntilIdle()

        assertEquals(listOf(FavoriteChange(stay, true)), delivered)
        assertTrue(disk.snapshot.pending.isEmpty())
        assertTrue(store.isSaved(stay))
    }
}

internal class MemoryFavorites : FavoritesPersistence {
    var snapshot = FavoritesSnapshot()
        private set

    override fun load() = snapshot
    override fun save(snapshot: FavoritesSnapshot) {
        this.snapshot = snapshot
    }
}

internal fun guestFavorites() = FavoritesStore(MemoryFavorites(), CoroutineScope(Dispatchers.Main.immediate))
