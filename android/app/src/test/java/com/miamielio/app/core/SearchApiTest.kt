package com.miamielio.app.core

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Test
import java.io.IOException
import java.net.URI
import java.net.URLDecoder

class SearchApiTest {
    private suspend fun failureOf(block: suspend () -> Unit): Throwable? = try {
        block()
        null
    } catch (error: Throwable) {
        error
    }

    @Test
    fun buildsTheSearchRequest() {
        val client = SearchClient(transport = MockTransport())
        val request = client.makeRequest("  urus & co  ", limit = 500)

        val uri = URI(request.url)
        val query = uri.rawQuery.split("&").associate { pair ->
            val (name, value) = pair.split("=", limit = 2)
            name to URLDecoder.decode(value, "UTF-8")
        }
        assertEquals("gorgona-one.com", uri.host)
        assertEquals("/api/search", uri.path)
        assertEquals("urus & co", query["q"])
        assertEquals("20", query["limit"])
        assertEquals("GET", request.method)
        assertNull(request.body)
        assertEquals("MiamiElioApp/1.0", request.headers["User-Agent"])
        // The ampersand must travel as data, not as a second parameter.
        assertFalse(request.url.contains("& co"))
        assertFalse(request.url.contains("+"))
    }

    @Test
    fun shortQueriesNeverReachTheNetwork() = runTest {
        val transport = MockTransport()
        val client = SearchClient(transport = transport)

        assertEquals(emptyList<SearchResult>(), client.search(" a "))
        assertEquals(0, transport.requests.size)
        assertSame(ApiError.InvalidRequest, assertThrows(ApiError::class.java) { client.makeRequest("a") })
    }

    @Test
    fun trimsOverlongQueries() {
        val long = "y".repeat(200)
        assertEquals(SearchClient.maximumQueryLength, SearchClient.normalize(long).length)

        // An emoji is one letter to the guest and is never cut in half.
        val faces = "😀".repeat(200)
        val kept = SearchClient.normalize(faces)
        assertEquals(SearchClient.maximumQueryLength, kept.codePointCount(0, kept.length))
        assertFalse(Character.isHighSurrogate(kept.last()))
    }

    @Test
    fun readsResults() = runTest {
        val transport = MockTransport(
            json = """
            {
              "query": "urus",
              "results": [
                {
                  "world": "car-rentals", "slug": "lamborghini-urus-se", "title": "Lamborghini Urus SE",
                  "subtitle": "MIAMI ELIO Fleet", "category": "SUVs", "location": "Sunny Isles Beach",
                  "description": "Hybrid super SUV.", "price": "On request",
                  "image": "/images/rentals/lamborghini-urus-se/cover.jpg", "featured": true,
                  "href": "/rentals/lamborghini-urus-se"
                },
                {
                  "world": "dining-nightlife", "slug": "papi-steak", "title": "Papi Steak",
                  "subtitle": null, "category": "Steakhouse", "location": "Miami Beach",
                  "description": null, "price": null, "image": "https://cdn.example.com/papi.jpg", "featured": false,
                  "href": "/restaurants-nightlife/papi-steak"
                },
                {"title": "No link"},
                {"world": "x", "title": "Elsewhere", "href": "https://example.com/elsewhere"},
                {"world": "x", "title": "Sportsbook", "href": "/sportsbook"}
              ]
            }
            """.trimIndent(),
        )
        val client = SearchClient(transport = transport)

        val results = client.search("urus")

        assertEquals(2, results.size)
        val car = results[0]
        assertEquals("Lamborghini Urus SE", car.title)
        assertEquals("/rentals/lamborghini-urus-se", car.href)
        assertEquals("On request", car.price)
        assertEquals("MIAMI ELIO Fleet · Sunny Isles Beach", car.detailLine)
        assertEquals("https://gorgona-one.com/images/rentals/lamborghini-urus-se/cover.jpg", client.imageUrl(car))

        val venue = results[1]
        assertNull(venue.price)
        assertEquals("Steakhouse · Miami Beach", venue.detailLine)
        assertEquals("https://cdn.example.com/papi.jpg", client.imageUrl(venue))
    }

    @Test
    fun acceptsNumericPrices() = runTest {
        val transport = MockTransport(json = """{"query":"x","results":[{"title":"Day charter","href":"/yachts/day","price":4500}]}""")
        val client = SearchClient(transport = transport)
        val results = client.search("day charter")
        assertEquals("4500", results.first().price)
        assertNull(client.imageUrl(results.first()))
    }

    @Test
    fun anEmptyResultListIsNotAnError() = runTest {
        val results = SearchClient(transport = MockTransport(json = """{"query":"zzz","results":[]}""")).search("zzz")
        assertEquals(emptyList<SearchResult>(), results)
    }

    @Test
    fun reportsServerAndFormatFailures() = runTest {
        assertEquals(
            ApiError.Status(500),
            failureOf { SearchClient(transport = MockTransport(status = 500)).search("yacht") },
        )
        assertSame(
            ApiError.Decoding,
            failureOf { SearchClient(transport = MockTransport(json = """{"error":"nope"}""")).search("yacht") },
        )
        assertSame(
            ApiError.Decoding,
            failureOf { SearchClient(transport = MockTransport(json = "<html>")).search("yacht") },
        )
    }

    @Test
    fun passesOnANetworkFailureAsItIs() = runTest {
        val offline = IOException("offline")
        assertSame(offline, failureOf { SearchClient(transport = MockTransport(failure = offline)).search("yacht") })
    }
}
