package com.miamielio.app.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.miamielio.app.core.SearchClient
import com.miamielio.app.core.SearchResult
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.IOException

sealed interface SearchPhase {
    /** Nothing typed yet: the popular sections are shown. */
    data object Idle : SearchPhase

    data object Searching : SearchPhase

    data class Results(val results: List<SearchResult>) : SearchPhase

    data object Empty : SearchPhase

    /** The server answered with something the app could not use. */
    data object Failed : SearchPhase

    /** The server could not be reached. */
    data object Offline : SearchPhase
}

data class SearchState(val query: String = "", val phase: SearchPhase = SearchPhase.Idle)

/** Inventory search as the guest types. */
class SearchViewModel(private val client: SearchClient) : ViewModel() {
    private val mutableState = MutableStateFlow(SearchState())
    val state: StateFlow<SearchState> = mutableState.asStateFlow()

    private var job: Job? = null

    fun setQuery(text: String) {
        if (text == mutableState.value.query) return
        mutableState.update { it.copy(query = text) }
        run(pause = true)
    }

    /** Asks again for what is typed, straight away: the retry button. */
    fun retry() = run(pause = false)

    fun imageUrl(result: SearchResult): String? = client.imageUrl(result)

    /**
     * Runs for the current query. Every keystroke starts this again and
     * cancels the previous run - request included - so only the last lands.
     */
    private fun run(pause: Boolean) {
        job?.cancel()
        val text = SearchClient.normalize(mutableState.value.query)
        if (text.codePointCount(0, text.length) < SearchClient.minimumQueryLength) {
            job = null
            mutableState.update { it.copy(phase = SearchPhase.Idle) }
            return
        }
        // Keep the previous hits on screen while the next ones load.
        if (mutableState.value.phase !is SearchPhase.Results) {
            mutableState.update { it.copy(phase = SearchPhase.Searching) }
        }
        job = viewModelScope.launch {
            // Wait for a pause in typing before asking the server.
            if (pause) delay(DEBOUNCE_MILLIS)
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
            mutableState.update { it.copy(phase = phase) }
        }
    }

    companion object {
        const val DEBOUNCE_MILLIS = 350L
    }
}
