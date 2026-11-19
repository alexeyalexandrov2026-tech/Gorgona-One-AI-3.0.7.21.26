package com.miamielio.app.today

import android.content.SharedPreferences
import com.miamielio.app.core.ShowcaseCache
import com.miamielio.app.core.ShowcaseClient
import com.miamielio.app.core.ShowcaseFeed
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * The cards that float over Today's hero. It starts with what was kept from
 * the last time, so they show at once and without a connection, and asks the
 * site again at most every [freshFor] milliseconds.
 */
class ShowcaseModel(
    private val client: ShowcaseClient,
    private val scope: CoroutineScope,
    private val clock: () -> Long = System::currentTimeMillis,
    private val freshFor: Long = TEN_MINUTES,
) {
    private val current = MutableStateFlow(client.cached() ?: ShowcaseFeed())
    val feed: StateFlow<ShowcaseFeed> = current.asStateFlow()

    private var loadedAt: Long? = null
    private var loading: Job? = null

    /** Asks the site for the cards, unless it was asked a moment ago or is being asked now. */
    fun refresh() {
        if (loading?.isActive == true) return
        loadedAt?.let { if (clock() - it < freshFor) return }
        loading = scope.launch {
            try {
                current.value = client.load()
                loadedAt = clock()
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                // Nothing to show is no reason to trouble the guest: the cards stay as they were.
            }
        }
    }

    companion object {
        const val TEN_MINUTES = 10 * 60 * 1000L
    }
}

/** The last good answer of the feed, on the device. */
internal class ShowcasePreferences(private val preferences: SharedPreferences) : ShowcaseCache {
    override fun read(): ByteArray? = try {
        preferences.getString(KEY, null)?.toByteArray(Charsets.UTF_8)
    } catch (_: ClassCastException) {
        null
    }

    override fun write(body: ByteArray) {
        preferences.edit().putString(KEY, body.toString(Charsets.UTF_8)).apply()
    }

    private companion object {
        const val KEY = "feed"
    }
}
