package com.miamielio.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FavoritesTest {
    @Test
    fun keepsOnlyYachtsVillasCarsAndRestaurantsFromSearch() {
        val yacht = SearchResult(href = "/yachts/pershing-8x", title = "Pershing 8X", world = "yachts", location = "Miami Beach", image = "/images/y.jpg")
        val club = SearchResult(href = "/restaurants-nightlife/liv-miami", title = "LIV", world = "dining-nightlife", category = "nightlife")
        val tour = SearchResult(href = "/experiences/everglades", title = "Everglades", world = "experiences")
        val odd = SearchResult(href = "/yachts/Bad Slug", title = "Odd", world = "yachts")

        val kept = FavoriteRef.of(yacht)
        assertNotNull(kept)
        assertEquals("yacht:pershing-8x", kept!!.key)
        assertEquals("Miami Beach", kept.subtitle)
        assertEquals("nightlife", FavoriteRef.of(club)?.kind)
        assertNull(FavoriteRef.of(tour))
        assertNull(FavoriteRef.of(odd))
        assertNull(FavoriteRef.of("car", "x", "   "))
        assertNull(FavoriteRef.of("jet", "x", "Jet"))
    }

    @Test
    fun theScriptCarriesTheChangeAsData() {
        val favorite = FavoriteRef.of("car", "white-suv", "White \"SUV\" </script> ")!!
        val script = favorite.script(on = true)
        assertTrue(script.contains("window.__miamiFavorite"))
        assertTrue(script.contains(FavoriteRef.pendingKey))
        assertTrue(script.contains("\"on\":true"))
        // The title is JSON-escaped, never spliced into the code as text.
        assertFalse(script.contains("White \"SUV\""))
        // A line separator would end the statement in older engines.
        assertFalse(script.contains(" "))
        assertTrue(favorite.script(on = false).contains("\"on\":false"))
    }

    @Test
    fun readsTheListAPageReports() {
        assertEquals(setOf("yacht:a", "car:b"), FavoriteRef.keys("[\"yacht:a\", \"car:b\", 7, \"no-colon\"]"))
        assertEquals(emptySet<String>(), FavoriteRef.keys("[]"))
        assertNull(FavoriteRef.keys("\"yacht:a\""))
        assertNull(FavoriteRef.keys("not json"))
        assertNull(FavoriteRef.keys(null))
    }

    @Test
    fun aPlanItemCanBeKept() {
        val item = PlanItem(kind = "stay", slug = "villa-azure", title = "Villa Azure", subtitle = "Miami Beach", image = "https://x/y.jpg", href = "/vacation-rentals/villa-azure")
        assertEquals("stay:villa-azure", FavoriteRef.of(item)?.key)
    }
}
