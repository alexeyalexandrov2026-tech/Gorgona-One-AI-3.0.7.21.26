package com.miamielio.app.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.miamielio.app.core.SearchClient
import com.miamielio.app.core.SearchResult
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.IOException

sealed interface SearchPhase {
    /** Nothing typed yet: the popular sections are shown. */
    data object Idle : SearchPhase

    data object Searching : SearchPhase

    data class Results(val results: List<SearchResult>) : SearchPhase

    /** The server looked and found nothing. */
    data object Empty : SearchPhase

    /** The server answered with something the app could not use. */
    data object Failed : SearchPhase

    /** The server could not be reached at all. */
    data object Offline : SearchPhase
}

data class SearchState(val query: String = "", val phase: SearchPhase = SearchPhase.Idle)

/**
 * Inventory search as the guest types. Mirrors the iPhone app's
 * `SearchStore`, with "no internet" told apart from other failures.
 *
 * @param online whether the phone has a connection; when it comes back
 *   while "no internet" is showing, the search runs again by itself.
 */
class SearchViewModel(
    private val client: SearchClient,
    online: Flow<Boolean> = flowOf(true),
    private val pauseMillis: Long = TYPING_PAUSE_MILLIS,
) : ViewModel() {
    private val mutableState = MutableStateFlow(SearchState())
    val state: StateFlow<SearchState> = mutableState.asStateFlow()

    private var job: Job? = null

    init {
        viewModelScope.launch {
            online.distinctUntilChanged().filter { it }.collect {
                if (mutableState.value.phase == SearchPhase.Offline) run(pause = false)
            }
        }
    }

    /** Every keystroke. The server is asked once the guest pauses. */
    fun setQuery(text: String) {
        if (text == mutableState.value.query) return
        mutableState.update { it.copy(query = text) }
        run(pause = true)
    }

    /** Asks again for what is typed, straight away: the retry button and the keyboard's search key. */
    fun retry() = run(pause = false)

    fun imageUrl(result: SearchResult): String? = client.imageUrl(result)

    /**
     * Runs for the current query. Each run cancels the one before it,
     * request included, so only the last one lands.
     */
    private fun run(pause: Boolean) {
        job?.cancel()
        val text = SearchClient.normalize(mutableState.value.query)
        if (text.codePointCount(0, text.length) < SearchClient.minimumQueryLength) {
            job = null
            mutableState.update { it.copy(phase = SearchPhase.Idle) }
            return
        }
        // The previous hits stay on screen while the next ones load.
        if (mutableState.value.phase !is SearchPhase.Results) {
            mutableState.update { it.copy(phase = SearchPhase.Searching) }
        }
        job = viewModelScope.launch {
            // A pause in typing before the server is asked.
            if (pause) delay(pauseMillis)
            val phase = try {
                val found = client.search(text)
                if (found.isEmpty()) SearchPhase.Empty else SearchPhase.Results(found)
            } catch (e: CancellationException) {
                throw e
            } catch (_: IOException) {
                SearchPhase.Offline
            } catch (_: Exception) {
                SearchPhase.Failed
            }
            ensureActive()
            mutableState.update { it.copy(phase = phase) }
        }
    }

    companion object {
        const val TYPING_PAUSE_MILLIS = 350L
    }
}
