package com.miamielio.app.search

import com.miamielio.app.concierge.ScriptedTransport
import com.miamielio.app.core.SearchClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SearchViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val server = ScriptedTransport()
    private val online = MutableStateFlow(true)

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    private fun model() = SearchViewModel(SearchClient(transport = server), online)

    private fun test(block: suspend TestScope.() -> Unit) = runTest(dispatcher) { block() }

    private val SearchViewModel.phase get() = state.value.phase

    private val queries get() = server.requests.map { it.url.substringAfter("q=").substringBefore("&") }

    companion object {
        val yachts = """
            {"results":[
              {"href":"/yachts/azimut-55","title":"Azimut 55","subtitle":"MIAMI ELIO Fleet","location":"Sunny Isles Beach","price":"from ${'$'}2,400","image":"/images/yachts/azimut.jpg"},
              {"href":"https://elsewhere.example.com/x","title":"Not ours"}]}
        """.trimIndent()
    }

    @Test
    fun aShortQueryShowsTheSectionsWithoutAsking() = test {
        val model = model()
        model.setQuery(" y ")
        advanceUntilIdle()
        assertEquals(SearchPhase.Idle, model.phase)
        assertTrue(server.requests.isEmpty())
    }

    @Test
    fun theServerIsAskedOnceTheGuestPauses() = test {
        val model = model()
        server.reply(yachts)
        model.setQuery("ya")
        advanceTimeBy(100)
        model.setQuery("yac")
        advanceTimeBy(100)
        model.setQuery("yacht")
        assertEquals(SearchPhase.Searching, model.phase)
        advanceTimeBy(349)
        assertTrue(server.requests.isEmpty())
        advanceTimeBy(2)
        runCurrent()
        assertEquals(listOf("yacht"), queries)

        val results = (model.phase as SearchPhase.Results).results
        // Only results the app can open are kept.
        assertEquals(listOf("Azimut 55"), results.map { it.title })
        assertEquals("MIAMI ELIO Fleet · Sunny Isles Beach", results.single().detailLine)
        assertEquals("https://gorgona-one.com/images/yachts/azimut.jpg", model.imageUrl(results.single()))
    }

    @Test
    fun aNewQueryCancelsTheOneOnItsWay() = test {
        val model = model()
        val slow = server.hold()
        server.reply("""{"results":[{"href":"/yachts/sunseeker","title":"Sunseeker"}]}""")
        model.setQuery("yac")
        advanceUntilIdle()
        assertEquals(1, server.requests.size)

        model.setQuery("yacht")
        advanceUntilIdle()
        slow.release(ScriptedTransport.Answer.Json(200, yachts))
        advanceUntilIdle()

        assertEquals(listOf("Sunseeker"), (model.phase as SearchPhase.Results).results.map { it.title })
        assertEquals(listOf("yac", "yacht"), queries)
    }

    @Test
    fun earlierResultsStayWhileTheNextLoad() = test {
        val model = model()
        server.reply(yachts).reply("""{"results":[]}""")
        model.setQuery("yacht")
        advanceUntilIdle()
        model.setQuery("yachtzz")
        advanceTimeBy(100)
        assertTrue(model.phase is SearchPhase.Results)
        advanceUntilIdle()
        assertEquals(SearchPhase.Empty, model.phase)

        model.setQuery("")
        assertEquals(SearchPhase.Idle, model.phase)
    }

    @Test
    fun noInternetIsToldApartFromAServerFailure() = test {
        val model = model()
        server.reply("""{"error":"boom"}""", status = 500).offline().reply(yachts)
        model.setQuery("villa")
        advanceUntilIdle()
        assertEquals(SearchPhase.Failed, model.phase)

        model.retry()
        runCurrent()
        assertEquals(SearchPhase.Offline, model.phase)

        // The retry button asks straight away, without the typing pause.
        model.retry()
        runCurrent()
        assertTrue(model.phase is SearchPhase.Results)
        assertEquals(3, server.requests.size)
    }

    @Test
    fun aConnectionComingBackRepeatsTheSearch() = test {
        val model = model()
        online.value = false
        server.offline().reply(yachts)
        model.setQuery("azimut")
        advanceUntilIdle()
        assertEquals(SearchPhase.Offline, model.phase)

        online.value = true
        advanceUntilIdle()
        assertTrue(model.phase is SearchPhase.Results)
        assertEquals(listOf("azimut", "azimut"), queries)

        // Back online when nothing was missed: nothing is asked again.
        online.value = false
        advanceUntilIdle()
        online.value = true
        advanceUntilIdle()
        assertEquals(2, server.requests.size)
    }
}
