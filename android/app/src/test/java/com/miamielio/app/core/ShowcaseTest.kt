package com.miamielio.app.core

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class ShowcaseTest {
    private fun item(category: ShowcaseCategory, href: String) =
        ShowcaseItem(category, href, title = href, image = "https://gorgona-one.com/images$href.jpg")

    private val pool = listOf(
        item(ShowcaseCategory.Car, "/rentals/a"),
        item(ShowcaseCategory.Car, "/rentals/b"),
        item(ShowcaseCategory.Yacht, "/yachts/c"),
        item(ShowcaseCategory.Stay, "/vacation-rentals/d"),
        item(ShowcaseCategory.Jet, "/private-jets"),
        item(ShowcaseCategory.Event, "/events/category/nba"),
    )

    /**
     * The generator the expected steps below were made with, by running the
     * site's own `nextShowcaseStep(pool, state, rnd, true)` in Node. It is
     * computed in doubles, as JavaScript computes it.
     */
    private fun generator(): () -> Double {
        var seed = 20261119.0
        return {
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0
            seed / 2147483648.0
        }
    }

    @Test
    fun takesTheSameStepsAsTheSite() {
        val expected = listOf(
            "/yachts/c|tl|slideL|outL|-6.1713",
            "/events/category/nba|tr|rise|outUp|8.9618",
            "/rentals/a|tl|focus|outFade|-6.8170",
            "/private-jets|tr|slideR|outFade|2.7040",
            "/rentals/b|tl|swing|outDown|-6.4381",
            "/vacation-rentals/d|tr|rise|outR|6.7048",
            "/yachts/c|tl|focus|outDown|-8.9785",
            "/private-jets|tr|swing|outFade|2.9394",
            "/vacation-rentals/d|tl|focus|outL|-4.1219",
            "/rentals/a|tr|slideR|outR|8.9431",
            "/events/category/nba|tl|rise|outFade|-6.4807",
            "/rentals/b|tr|focus|outFade|7.7868",
            "/vacation-rentals/d|tl|slideL|outUp|-5.0699",
            "/yachts/c|tr|rise|outDown|7.9155",
        )
        val random = generator()
        var state = ShowcaseState()
        val steps = expected.map {
            val step = nextShowcaseStep(pool, state, random)!!
            state = step.state
            step
        }
        val sitesEnter = mapOf(
            ShowcaseEnter.Swing to "swing", ShowcaseEnter.Rise to "rise", ShowcaseEnter.Focus to "focus",
            ShowcaseEnter.SlideFromStart to "slideL", ShowcaseEnter.SlideFromEnd to "slideR",
        )
        val sitesExit = mapOf(
            ShowcaseExit.Up to "outUp", ShowcaseExit.Down to "outDown", ShowcaseExit.Fade to "outFade",
            ShowcaseExit.ToStart to "outL", ShowcaseExit.ToEnd to "outR",
        )
        expected.zip(steps).forEach { (line, step) ->
            val (href, corner, enter, exit, rotation) = line.split("|")
            assertEquals(line, href, step.item.href)
            assertEquals(line, corner, step.corner.site)
            assertEquals(line, enter, sitesEnter[step.enter])
            assertEquals(line, exit, sitesExit[step.exit])
            assertEquals(line, rotation.toDouble(), step.rotation.toDouble(), 1e-3)
        }
    }

    @Test
    fun neverRepeatsAKindACornerOrAnEntranceAndShowsEveryCardEachRound() {
        val random = kotlin.random.Random(7)
        var state = ShowcaseState()
        var last: ShowcaseStep? = null
        val round = mutableSetOf<String>()
        repeat(60) {
            val left = pool.filter { it.href !in round }.ifEmpty { pool }
            val step = nextShowcaseStep(pool, state, random::nextDouble)!!
            last?.let { before ->
                // The same kind twice only when every card left in the round is of that kind, as on the site.
                if (left.any { it.category != before.item.category }) {
                    assertNotEquals(before.item.category, step.item.category)
                }
                assertNotEquals(before.corner, step.corner)
                assertNotEquals(before.state.lastEnter, step.state.lastEnter)
            }
            // The tilt leans out of its own corner: 2 to 9 degrees.
            val tilt = if (step.corner.startSide) -step.rotation else step.rotation
            assertTrue(tilt in 2f..9f)
            if (step.item.href in round) {
                // A card comes back only once all of them were shown.
                assertEquals(pool.size, round.size)
                round.clear()
            }
            round += step.item.href
            last = step
            state = step.state
        }
    }

    @Test
    fun slidesGoTowardsTheirOwnSide() {
        val random = kotlin.random.Random(3)
        var state = ShowcaseState()
        repeat(80) {
            val step = nextShowcaseStep(pool, state, random::nextDouble)!!
            if (step.enter == ShowcaseEnter.SlideFromStart || step.enter == ShowcaseEnter.SlideFromEnd) {
                assertEquals(step.corner.startSide, step.enter == ShowcaseEnter.SlideFromStart)
            }
            if (step.exit == ShowcaseExit.ToStart || step.exit == ShowcaseExit.ToEnd) {
                assertEquals(step.corner.startSide, step.exit == ShowcaseExit.ToStart)
            }
            state = step.state
        }
    }

    @Test
    fun aSingleKindStillMoves() {
        val cars = pool.filter { it.category == ShowcaseCategory.Car }
        val random = kotlin.random.Random(1)
        var state = ShowcaseState()
        val shown = (1..4).map {
            val step = nextShowcaseStep(cars, state, random::nextDouble)!!
            state = step.state
            step.item.href
        }
        assertEquals(setOf("/rentals/a", "/rentals/b"), shown.take(2).toSet())
        assertNull(nextShowcaseStep(emptyList(), ShowcaseState()) { 0.5 })
    }

    @Test
    fun withoutMotionTheFirstCardStandsStill() {
        val step = stillShowcaseStep(pool)!!
        assertEquals("/rentals/a", step.item.href)
        assertEquals(ShowcaseCorner.TopEnd, step.corner)
        assertEquals(4f, step.rotation)
        assertNull(stillShowcaseStep(emptyList()))
    }

    @Test
    fun pricesAreShownOnlyWhenTheyAreAmounts() {
        assertEquals("$2,000", ShowcaseItem.price(" $2,000 "))
        assertEquals("$ 950 / day", ShowcaseItem.price("$ 950 / day"))
        assertNull(ShowcaseItem.price("On request"))
        assertNull(ShowcaseItem.price("$ on request"))
        assertNull(ShowcaseItem.price("Enquire for $"))
        assertNull(ShowcaseItem.price(""))
        assertNull(ShowcaseItem.price(null))
    }

    // region The feed

    private val sample = """
        {"intervalMs": 6500, "items": [
          {"cat":"car","href":"/rentals/lamborghini-urus-se","title":"Lamborghini Urus SE",
           "image":"https://gorgona-one.com/images/rentals/lamborghini-urus-se/cover.jpg",
           "company":"MIAMI ELIO Fleet","location":"Sunny Isles Beach","category":"SUVs","price":"$1,800"},
          {"cat":"stay","href":"/vacation-rentals/villa","title":"Villa","image":"https://gorgona-one.com/v.jpg","bedrooms":4},
          {"cat":"event","href":"/events/category/nba","title":"NBA","image":"https://gorgona-one.com/t.jpg","kicker":"NBA","lineId":"nba"},
          {"cat":"submarine","href":"/x","title":"Unknown kind","image":"https://gorgona-one.com/x.jpg"},
          {"cat":"yacht","href":"/yachts/no-photo","title":"No photo"},
          {"cat":"yacht","href":"/yachts/plain","title":"Plain http","image":"http://gorgona-one.com/y.jpg"},
          {"cat":"car","href":"/rentals/lamborghini-urus-se","title":"Twice","image":"https://gorgona-one.com/c.jpg"},
          {"cat":"jet","href":"https://elsewhere.example/jets","title":"Off site","image":"https://gorgona-one.com/j.jpg"}
        ]}
    """.trimIndent()

    private class MemoryCache(var body: ByteArray? = null) : ShowcaseCache {
        override fun read(): ByteArray? = body
        override fun write(body: ByteArray) {
            this.body = body
        }
    }

    @Test
    fun asksTheSiteForItsShowcase() {
        val request = ShowcaseClient(transport = MockTransport()).makeRequest()
        assertEquals("https://gorgona-one.com/api/showcase", request.url)
        assertEquals("GET", request.method)
        assertEquals("MiamiElioApp/1.0", request.headers["User-Agent"])
        assertNull(request.body)
    }

    @Test
    fun keepsOnlyTheCardsItCanShow() = runTest {
        val feed = ShowcaseClient(transport = MockTransport(json = sample)).load()
        assertEquals(
            // The villa goes: stays are only booked through the partner.
            listOf("/rentals/lamborghini-urus-se", "/events/category/nba"),
            feed.items.map { it.href },
        )
        val car = feed.items[0]
        assertEquals(ShowcaseCategory.Car, car.category)
        assertEquals("Lamborghini Urus SE", car.title)
        assertEquals("MIAMI ELIO Fleet", car.company)
        assertEquals("SUVs", car.kind)
        assertEquals("$1,800", car.price)
        assertEquals("NBA", feed.items[1].kicker)
        assertEquals(6_500L, feed.intervalMillis)
    }

    @Test
    fun yachtsAndVillasAreOnlyThePartnersPages() {
        assertTrue(PartnerOnly.isRetiredListing("/yachts/azure-72"))
        assertTrue(PartnerOnly.isRetiredListing("https://gorgona-one.com/vacation-rentals/star-island-estate?x=1"))
        assertFalse(PartnerOnly.isRetiredListing("/yachts"))
        assertFalse(PartnerOnly.isRetiredListing("/vacation-rentals"))
        assertFalse(PartnerOnly.isRetiredListing("/rentals/lamborghini-urus-se"))
        val yacht = """{"items":[{"cat":"yacht","href":"/yachts/a","title":"A","image":"https://x/a.jpg"}]}"""
        assertTrue(ShowcaseFeed.decode(yacht.toByteArray())!!.items.isEmpty())
    }

    @Test
    fun theIntervalStaysWithinReason() = runTest {
        fun feed(interval: String) = """{"intervalMs": $interval, "items": []}""".toByteArray()
        assertEquals(3_000L, ShowcaseFeed.decode(feed("500"))!!.intervalMillis)
        assertEquals(20_000L, ShowcaseFeed.decode(feed("900000"))!!.intervalMillis)
        assertEquals(6_500L, ShowcaseFeed.decode("""{"items": []}""".toByteArray())!!.intervalMillis)
        assertNull(ShowcaseFeed.decode("""{"cards": []}""".toByteArray()))
        assertNull(ShowcaseFeed.decode("not json".toByteArray()))
    }

    @Test
    fun aSiteWithoutTheFeedShowsNoCard() = runTest {
        val feed = ShowcaseClient(transport = MockTransport(status = 404, json = "<html>")).load()
        assertTrue(feed.items.isEmpty())
    }

    @Test
    fun withoutAConnectionTheLastGoodAnswerIsShown() = runTest {
        val cache = MemoryCache()
        ShowcaseClient(transport = MockTransport(json = sample), cache = cache).load()

        // The app starts again, offline.
        val offline = ShowcaseClient(transport = MockTransport(failure = IOException("offline")), cache = cache)
        assertEquals(2, offline.cached()!!.items.size)
        assertEquals(2, offline.load().items.size)
        // A server error falls back on it too, and an empty answer does not replace it.
        assertEquals(2, ShowcaseClient(transport = MockTransport(status = 500), cache = cache).load().items.size)
        assertEquals(2, ShowcaseClient(transport = MockTransport(json = """{"items":[]}"""), cache = cache).load().items.size)
        assertEquals(2, ShowcaseClient(transport = MockTransport(), cache = cache).cached()!!.items.size)
    }

    @Test
    fun withNothingKeptAnOfflineStartShowsNoCard() = runTest {
        val feed = ShowcaseClient(transport = MockTransport(failure = IOException("offline")), cache = MemoryCache()).load()
        assertTrue(feed.items.isEmpty())
    }

    // endregion
}
